const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { getPool, sql } = require('../config/db');
const {
  listProspectTypes,
  getProspectTypeByName,
  getImportLayoutByKey,
  toImportParserConfig,
} = require('../services/prospectTypes');

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/excel');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `prospects-${Date.now()}${path.extname(file.originalname) || '.xlsx'}`);
  },
});
const uploadExcel = multer({
  storage: excelStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) return cb(null, true);
    cb(new Error('Only .xlsx or .xls files are allowed'));
  },
});

const PROSPECT_SELECT_FIELDS = `
  Id, FirstName, LastName, FullName, Email, Source, CityArea, Phone, Gender, DateOfBirth,
  ScreeningAnswers, InterviewDate, InterviewTime, InterviewStatus, Notes,
  SlotConfirmed, Sent, ZoomLink, VideoSwimCert, OverallInterviewVerdict, OfferStatus, JoiningCommitment, ExpectedStartDate,
  ProspectType, CreatedAt, ConvertedToEmployeeId
`;
const WHERE_NOT_DELETED = ' AND (IsDeleted = 0 OR IsDeleted IS NULL)';

function splitName(fullName) {
  if (!fullName || typeof fullName !== 'string') return { firstName: '', lastName: '' };
  const trimmed = String(fullName).trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncate(s, maxLen) {
  if (s == null || typeof s !== 'string') return s;
  if (maxLen <= 0) return s;
  return s.length <= maxLen ? s : s.slice(0, maxLen);
}

function toNullableString(value, maxLen) {
  const trimmed = toTrimmedString(value);
  if (!trimmed) return null;
  return truncate(trimmed, maxLen);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeScreeningAnswers(value) {
  if (value == null) {
    return { screeningAnswers: null, errors: [] };
  }
  if (!Array.isArray(value)) {
    return {
      screeningAnswers: null,
      errors: ['Screening answers must be an array of question and answer pairs.'],
    };
  }

  const screeningAnswers = [];
  const errors = [];

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Screening answer ${index + 1} is invalid.`);
      return;
    }

    const question = toNullableString(item.question, 200);
    const answer = toNullableString(item.answer, 1000);

    if (!question && !answer) return;
    if (!question || !answer) {
      errors.push(`Screening answer ${index + 1} must include both a question and an answer.`);
      return;
    }

    screeningAnswers.push({ question, answer });
  });

  if (screeningAnswers.length > 25) {
    errors.push('No more than 25 screening answers can be saved.');
  }

  return {
    screeningAnswers: screeningAnswers.length ? screeningAnswers.slice(0, 25) : null,
    errors,
  };
}

function normalizeProspectSummary(row) {
  const { firstName, lastName } = splitName(row.fullName || '');

  return {
    firstName: truncate(firstName, 100) || null,
    lastName: truncate(lastName, 100) || null,
    fullName: row.fullName || null,
    cityArea: row.cityArea || null,
    phone: row.phone || null,
    email: row.email || null,
    gender: row.gender || null,
  };
}

function parseDateOfBirth(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  const num = Number(value);
  let date;
  if (Number.isFinite(num) && num > 0) {
    const excelEpoch = new Date(1899, 11, 30);
    date = new Date(excelEpoch.getTime() + num * 86400000);
  } else {
    date = new Date(s);
  }
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 1 || year > 9999) return null;
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateManualProspect(body, prospectTypeRecord) {
  const requestedProspectType = toNullableString(body.prospectType, 100);
  const fullName = toNullableString(body.fullName, 200);
  const phone = toNullableString(body.phone, 50);
  const email = toNullableString(body.email, 255);
  const cityArea = toNullableString(body.cityArea, 200);
  const gender = toNullableString(body.gender, 50);
  const source = toNullableString(body.source, 100) || 'manual_entry';
  const rawDateOfBirth = toTrimmedString(body.dateOfBirth);
  const dateOfBirth = rawDateOfBirth ? parseDateOfBirth(rawDateOfBirth) : null;
  const { screeningAnswers, errors } = normalizeScreeningAnswers(body.screeningAnswers);

  if (!requestedProspectType) {
    errors.push('Prospect type is required.');
  } else if (!prospectTypeRecord) {
    errors.push('Selected prospect type is not active. Configure it in settings first.');
  }
  if (!fullName) {
    errors.push('Full name is required.');
  }
  if (!phone && !email) {
    errors.push('Provide at least a phone number or email address.');
  }
  if (email && !isValidEmail(email)) {
    errors.push('Email address is invalid.');
  }
  if (rawDateOfBirth && !dateOfBirth) {
    errors.push('Date of birth must be a valid date.');
  }

  const names = normalizeProspectSummary({
    fullName,
    cityArea,
    phone,
    email,
    gender,
  });

  return {
    errors,
    prospect: {
      ...names,
      source,
      prospectType: prospectTypeRecord?.Name || requestedProspectType,
      dateOfBirth,
      screeningAnswers: screeningAnswers ? JSON.stringify(screeningAnswers) : null,
    },
  };
}

function getHeaderText(headerRow, index) {
  const raw = headerRow[index] != null ? String(headerRow[index]).trim() : '';
  return raw || `Question ${index + 1}`;
}

function getCell(row, index) {
  if (index < 0 || !row) return '';
  const v = row[index];
  if (v == null || v === '') return '';
  return String(v).trim();
}

function getQuestionLabel(headerRow, index, fallbackLabel) {
  const raw = getHeaderText(headerRow, index);
  const isGeneric = !raw || /^Question\s*\d+$/i.test(raw.trim());
  if (isGeneric && fallbackLabel) return fallbackLabel;
  return raw || fallbackLabel || `Question ${index + 1}`;
}

function parseExcelRow(headerRow, row, config) {
  const screeningAnswers = [];
  for (let k = 0; k < config.screeningIndices.length; k++) {
    const i = config.screeningIndices[k];
    const question = getQuestionLabel(headerRow, i, config.defaultQuestionLabels?.[k]);
    const answer = getCell(row, i);
    screeningAnswers.push({ question, answer });
  }
  const genderRaw = getCell(row, config.gender);
  const gender = truncate(genderRaw, 50);
  return {
    screeningAnswers,
    cityArea: config.cityArea >= 0 ? truncate(getCell(row, config.cityArea), 200) : '',
    fullName: truncate(getCell(row, config.fullName), 200),
    phone: truncate(getCell(row, config.phone), 50),
    email: config.email >= 0 ? truncate(getCell(row, config.email), 255) : '',
    gender: gender || null,
    dateOfBirth: getCell(row, config.dob) || null,
  };
}

function isBlankRow(parsed) {
  const hasName = !!parsed.fullName;
  const hasPhone = !!parsed.phone;
  const hasScreening = parsed.screeningAnswers.some((q) => !!q.answer);
  return !hasName && !hasPhone && !hasScreening;
}

function getRowsFromSheet(workbook, parserConfig) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { headerRow: [], rows: [] };
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerRow = data[0] || [];
  const config = parserConfig;
  if (!config || !Array.isArray(config.screeningIndices) || config.fullName < 0 || config.phone < 0) {
    throw new Error('No Excel column configuration is defined for this prospect type.');
  }
  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const parsed = parseExcelRow(headerRow, row, config);
    if (!isBlankRow(parsed)) {
      rows.push(parsed);
    }
  }
  return { headerRow, rows };
}

async function loadProspectById(pool, id, options = {}) {
  const includeDeleted = options.includeDeleted === true;
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT ${PROSPECT_SELECT_FIELDS}
      FROM Prospects
      WHERE Id = @id
    ` + (includeDeleted ? '' : WHERE_NOT_DELETED));

  return result.recordset[0] || null;
}

router.get('/types', async (req, res) => {
  try {
    const types = await listProspectTypes({ activeOnly: true, importableOnly: true });
    res.json(types.map((type) => type.Name));
  } catch (error) {
    console.error('Error fetching prospect types:', error);
    res.status(500).json({ error: 'Failed to fetch prospect types' });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const sort = ['CreatedAt', 'FullName', 'Phone', 'InterviewDate', 'InterviewStatus', 'ProspectType'].includes(req.query.sort)
      ? req.query.sort
      : 'CreatedAt';
    const order = (req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    const prospectType = toTrimmedString(req.query.type);

    const pool = await getPool();
    let countSql = 'SELECT COUNT(*) AS Total FROM Prospects WHERE 1=1' + WHERE_NOT_DELETED;
    let listSql = `
      SELECT ${PROSPECT_SELECT_FIELDS}
      FROM Prospects WHERE 1=1
    ` + WHERE_NOT_DELETED;
    if (prospectType) {
      countSql += ' AND ProspectType = @type';
      listSql += ' AND ProspectType = @type';
    }
    listSql += ` ORDER BY [${sort}] ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const countReq = pool.request();
    if (prospectType) countReq.input('type', sql.NVarChar, prospectType);
    const countResult = await countReq.query(countSql);
    const total = countResult.recordset[0].Total;

    const listReq = pool.request().input('limit', sql.Int, limit).input('offset', sql.Int, offset);
    if (prospectType) listReq.input('type', sql.NVarChar, prospectType);
    const result = await listReq.query(listSql);

    res.json({
      data: result.recordset,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('Error fetching prospects:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

router.post('/', async (req, res) => {
  try {
    const prospectTypeRecord = await getProspectTypeByName(req.body?.prospectType);
    const { errors, prospect } = validateManualProspect(req.body || {}, prospectTypeRecord);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    const pool = await getPool();
    const insertResult = await pool
      .request()
      .input('firstName', sql.NVarChar, prospect.firstName)
      .input('lastName', sql.NVarChar, prospect.lastName)
      .input('fullName', sql.NVarChar, prospect.fullName)
      .input('cityArea', sql.NVarChar, prospect.cityArea)
      .input('phone', sql.NVarChar, prospect.phone)
      .input('email', sql.NVarChar, prospect.email)
      .input('gender', sql.NVarChar, prospect.gender)
      .input('dateOfBirth', sql.Date, prospect.dateOfBirth || null)
      .input('screeningAnswers', sql.NVarChar, prospect.screeningAnswers)
      .input('source', sql.NVarChar, prospect.source)
      .input('prospectType', sql.NVarChar, prospect.prospectType)
      .query(`
        INSERT INTO Prospects (FirstName, LastName, FullName, CityArea, Phone, Email, Gender, DateOfBirth, ScreeningAnswers, Source, ProspectType)
        OUTPUT INSERTED.Id
        VALUES (@firstName, @lastName, @fullName, @cityArea, @phone, @email, @gender, @dateOfBirth, @screeningAnswers, @source, @prospectType)
      `);

    const createdProspectId = insertResult.recordset[0]?.Id;
    const createdProspect = await loadProspectById(pool, createdProspectId);
    res.status(201).json(createdProspect || { Id: createdProspectId });
  } catch (error) {
    console.error('Error creating prospect:', error);
    res.status(500).json({ error: 'Failed to create prospect' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const prospect = await loadProspectById(pool, req.params.id);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    res.json(prospect);
  } catch (error) {
    console.error('Error fetching prospect:', error);
    res.status(500).json({ error: 'Failed to fetch prospect' });
  }
});

router.post('/upload', uploadExcel.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const requestedProspectType = toTrimmedString(req.body?.prospectType);
  if (!requestedProspectType) {
    return res.status(400).json({ error: 'prospectType is required' });
  }

  try {
    const prospectTypeRecord = await getProspectTypeByName(requestedProspectType);
    if (!prospectTypeRecord) {
      return res.status(400).json({
        error: 'Selected prospect type is not active. Configure it in settings first.',
      });
    }

    const importLayout = await getImportLayoutByKey(prospectTypeRecord.ImportLayoutKey);
    if (!importLayout) {
      return res.status(400).json({
        error: 'Selected prospect type does not support Excel import. Assign an Excel template in prospect type settings first.',
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const { rows } = getRowsFromSheet(workbook, toImportParserConfig(importLayout));
    fs.unlink(req.file.path, () => {});

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'No valid rows found. First row must be headers. Rows with no name, phone, or screening answers are skipped.',
      });
    }

    const pool = await getPool();
    let inserted = 0;
    for (const row of rows) {
      const summary = normalizeProspectSummary(row);
      const screeningJson = row.screeningAnswers.length ? JSON.stringify(row.screeningAnswers) : null;
      const dob = parseDateOfBirth(row.dateOfBirth);

      await pool
        .request()
        .input('firstName', sql.NVarChar, summary.firstName)
        .input('lastName', sql.NVarChar, summary.lastName)
        .input('fullName', sql.NVarChar, summary.fullName)
        .input('cityArea', sql.NVarChar, summary.cityArea)
        .input('phone', sql.NVarChar, summary.phone)
        .input('email', sql.NVarChar, summary.email)
        .input('gender', sql.NVarChar, summary.gender)
        .input('dateOfBirth', sql.Date, dob)
        .input('screeningAnswers', sql.NVarChar, screeningJson)
        .input('source', sql.NVarChar, 'excel_import')
        .input('prospectType', sql.NVarChar, prospectTypeRecord.Name)
        .query(`
          INSERT INTO Prospects (FirstName, LastName, FullName, CityArea, Phone, Email, Gender, DateOfBirth, ScreeningAnswers, Source, ProspectType)
          VALUES (@firstName, @lastName, @fullName, @cityArea, @phone, @email, @gender, @dateOfBirth, @screeningAnswers, @source, @prospectType)
        `);
      inserted++;
    }

    res.status(201).json({ message: `${inserted} prospect(s) imported.`, count: inserted });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error uploading prospects:', error);
    res.status(500).json({ error: error.message || 'Failed to import Excel' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const {
      slotConfirmed,
      sent,
      interviewDate,
      interviewTime,
      interviewStatus,
      zoomLink,
      videoSwimCert,
      overallInterviewVerdict,
      offerStatus,
      joiningCommitment,
      expectedStartDate,
      notes,
    } = req.body;
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('slotConfirmed', sql.NVarChar, slotConfirmed ?? null)
      .input('sent', sql.NVarChar, sent ?? null)
      .input('interviewDate', sql.Date, interviewDate || null)
      .input('interviewTime', sql.NVarChar, interviewTime || null)
      .input('interviewStatus', sql.NVarChar, interviewStatus || null)
      .input('zoomLink', sql.NVarChar, zoomLink ?? null)
      .input('videoSwimCert', sql.NVarChar, videoSwimCert ?? null)
      .input('overallInterviewVerdict', sql.NVarChar, overallInterviewVerdict ?? null)
      .input('offerStatus', sql.NVarChar, offerStatus ?? null)
      .input('joiningCommitment', sql.NVarChar, joiningCommitment ?? null)
      .input('expectedStartDate', sql.Date, expectedStartDate || null)
      .input('notes', sql.NVarChar, notes ?? null)
      .query(`
        UPDATE Prospects
        SET SlotConfirmed = @slotConfirmed, Sent = @sent,
            InterviewDate = @interviewDate, InterviewTime = @interviewTime, InterviewStatus = @interviewStatus,
            ZoomLink = @zoomLink, VideoSwimCert = @videoSwimCert, OverallInterviewVerdict = @overallInterviewVerdict,
            OfferStatus = @offerStatus, JoiningCommitment = @joiningCommitment, ExpectedStartDate = @expectedStartDate,
            Notes = @notes
        WHERE Id = @id
      `);
    const prospect = await loadProspectById(pool, req.params.id, { includeDeleted: true });
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
    res.json(prospect);
  } catch (error) {
    console.error('Error updating prospect:', error);
    res.status(500).json({ error: 'Failed to update prospect' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE Prospects SET IsDeleted = 1 WHERE Id = @id AND (IsDeleted = 0 OR IsDeleted IS NULL); SELECT @@ROWCOUNT AS Deleted');
    if (result.recordset[0].Deleted === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting prospect:', error);
    res.status(500).json({ error: 'Failed to delete prospect' });
  }
});

router.post('/delete-selected', async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.filter((x) => Number.isInteger(Number(x))) : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No valid ids provided' });
    }
    const pool = await getPool();
    const placeholders = ids.map((_, i) => `@id${i}`).join(',');
    const request = pool.request();
    ids.forEach((id, i) => request.input(`id${i}`, sql.Int, id));
    const result = await request.query(`UPDATE Prospects SET IsDeleted = 1 WHERE Id IN (${placeholders}) AND (IsDeleted = 0 OR IsDeleted IS NULL); SELECT @@ROWCOUNT AS Deleted`);
    const deleted = result.recordset[0].Deleted;
    res.json({ message: `${deleted} prospect(s) deleted.`, deleted });
  } catch (error) {
    console.error('Error deleting prospects:', error);
    res.status(500).json({ error: 'Failed to delete prospects' });
  }
});

/**
 * Parse date for SQL Server (YYYY-MM-DD or ISO string); returns null if invalid.
 */
function parseDateForDb(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

router.post('/:id/to-employee', async (req, res) => {
  try {
    const pool = await getPool();
    const prospectResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT Id, FirstName, LastName, FullName, Email, Phone, DateOfBirth
        FROM Prospects WHERE Id = @id AND ConvertedToEmployeeId IS NULL
      ` + WHERE_NOT_DELETED);
    if (prospectResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Prospect not found or already converted to employee' });
    }
    const p = prospectResult.recordset[0];
    const firstName = truncate(p.FirstName || (p.FullName ? splitName(p.FullName).firstName : ''), 100) || null;
    const lastName = truncate(p.LastName || (p.FullName ? splitName(p.FullName).lastName : ''), 100) || null;
    const email = (p.Email && toTrimmedString(p.Email)) || `prospect-${p.Id}@stingrays.local`;
    const phone = (p.Phone && toTrimmedString(p.Phone)) ? truncate(p.Phone, 20) : null;
    const dob = parseDateForDb(p.DateOfBirth);

    const empResult = await pool
      .request()
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('dob', sql.Date, dob)
      .input('phone', sql.NVarChar, phone)
      .query(`
        INSERT INTO Employees (
          FirstName, LastName, Email, DOB, NIC, Phone, Address, City, PostalCode,
          Position, Department, EmergencyContactName, EmergencyContactPhone, OnboardingStatus, IsActive
        )
        OUTPUT INSERTED.Id
        VALUES (
          @firstName, @lastName, @email, @dob, NULL, @phone, NULL, NULL, NULL,
          NULL, NULL, NULL, NULL, 'pending', 1
        )
      `);
    const employeeId = empResult.recordset[0].Id;

    // Create onboarding checklist items so the onboarding flow has the same structure as a manually created employee
    await pool
      .request()
      .input('employeeId', sql.Int, employeeId)
      .input('itemName', sql.NVarChar, 'Personal Information')
      .input('itemType', sql.NVarChar, 'information')
      .input('isRequired', sql.Bit, 1)
      .query(`
        INSERT INTO OnboardingChecklist (EmployeeId, ItemName, ItemType, IsRequired)
        VALUES (@employeeId, @itemName, @itemType, @isRequired)
      `);

    const docTypesResult = await pool.request().query(`
      SELECT Name, IsRequired FROM OnboardingDocumentTypes WHERE IsActive = 1 ORDER BY SortOrder ASC, Id ASC
    `);
    for (const row of docTypesResult.recordset) {
      await pool
        .request()
        .input('employeeId', sql.Int, employeeId)
        .input('itemName', sql.NVarChar, row.Name)
        .input('itemType', sql.NVarChar, 'document')
        .input('isRequired', sql.Bit, row.IsRequired ? 1 : 0)
        .query(`
          INSERT INTO OnboardingChecklist (EmployeeId, ItemName, ItemType, IsRequired)
          VALUES (@employeeId, @itemName, @itemType, @isRequired)
        `);
    }

    await pool
      .request()
      .input('prospectId', sql.Int, req.params.id)
      .input('employeeId', sql.Int, employeeId)
      .query('UPDATE Prospects SET ConvertedToEmployeeId = @employeeId WHERE Id = @prospectId');

    res.status(201).json({
      message: 'Employee created from prospect. Complete onboarding for this employee.',
      employeeId,
      prospectId: p.Id,
    });
  } catch (error) {
    console.error('Error converting prospect to employee:', error);

    const code = error.code || error.number;
    const message = (error.message || '').toLowerCase();
    const isUniqueViolation =
      code === 2627 ||
      code === 2601 ||
      message.includes('unique') ||
      message.includes('duplicate key');

    if (isUniqueViolation) {
      return res.status(409).json({
        error: 'An employee with this email already exists. Use a different prospect or update the existing employee.',
      });
    }

    res.status(500).json({
      error: 'Failed to create employee from prospect',
      detail: process.env.NODE_ENV === 'development' ? (error.message || String(error)) : undefined,
    });
  }
});

module.exports = router;

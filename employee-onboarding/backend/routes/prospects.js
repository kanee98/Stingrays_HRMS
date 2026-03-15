const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { getPool, sql } = require('../config/db');

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

function splitName(fullName) {
  if (!fullName || typeof fullName !== 'string') return { firstName: '', lastName: '' };
  const trimmed = String(fullName).trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

/** Parse Excel date (string or serial) to YYYY-MM-DD in SQL Server range (0001–9999), or null if invalid. */
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

const VALID_PROSPECT_TYPES = ['Swimming Instructor', 'Customer Service Assistant', 'Assistant Coordinator'];

/** Use actual header text from Excel; only use "Question N" when header is empty. */
function getHeaderText(headerRow, index) {
  const raw = headerRow[index] != null ? String(headerRow[index]).trim() : '';
  return raw || `Question ${index + 1}`;
}

/**
 * Type-specific column layout:
 * - Swimming Instructor (Coach): 4 questions (0-3), city 4, full name 5, phone 6, gender 7, dob 8
 *   (India - Chennai Contractors - Coach.xlsx)
 * - CSA: 6 questions (0-5), full name 6, 7th question 7, phone 8, email 9, dob 10, gender 11
 *   (India - Chennai Contractors - CSA.xlsx)
 * - Assistant Coordinator: 8 questions (0-7), full name 8, phone 9, email 10, city 11, dob 12, gender 13
 *   (India - Chennai Contractors - Ass Cordinator.xlsx)
 */
function getColumnConfig(prospectType) {
  switch (prospectType) {
    case 'Swimming Instructor':
      return {
        screeningIndices: [0, 1, 2, 3],
        cityArea: 4,
        fullName: 5,
        phone: 6,
        email: -1,
        gender: 7,
        dob: 8,
      };
    case 'Customer Service Assistant':
      return {
        screeningIndices: [0, 1, 2, 3, 4, 5, 7],
        cityArea: -1,
        fullName: 6,
        phone: 8,
        email: 9,
        gender: 11,
        dob: 10,
      };
    case 'Assistant Coordinator':
      return {
        screeningIndices: [0, 1, 2, 3, 4, 5, 6, 7],
        cityArea: 11,
        fullName: 8,
        phone: 9,
        email: 10,
        gender: 13,
        dob: 12,
      };
    default:
      return {
        screeningIndices: [0, 1, 2, 3],
        cityArea: 4,
        fullName: 5,
        phone: 6,
        email: -1,
        gender: 7,
        dob: 8,
      };
  }
}

function getCell(row, index) {
  if (index < 0 || !row) return '';
  const v = row[index];
  if (v == null || v === '') return '';
  return String(v).trim();
}

/** Truncate to max length to avoid DB "String or binary data would be truncated". */
function truncate(s, maxLen) {
  if (s == null || typeof s !== 'string') return s;
  if (maxLen <= 0) return s;
  return s.length <= maxLen ? s : s.slice(0, maxLen);
}

/** Default question labels when Excel header is empty or generic "Question N" (per type, 0-based index). */
const DEFAULT_QUESTION_LABELS = {
  'Swimming Instructor': [
    'Can you swim?',
    'Do you have prior teaching or coaching experience?',
    'Are you available for the required schedule?',
    'Why do you want to work as a swimming instructor?',
  ],
  'Customer Service Assistant': [],
  'Assistant Coordinator': [],
};

function getQuestionLabel(prospectType, headerRow, index) {
  const raw = getHeaderText(headerRow, index);
  const isGeneric = !raw || /^Question\s*\d+$/i.test(raw.trim());
  const defaults = DEFAULT_QUESTION_LABELS[prospectType];
  if (isGeneric && defaults && index < defaults.length) return defaults[index];
  return raw || `Question ${index + 1}`;
}

function parseExcelRow(headerRow, row, config, prospectType) {
  const screeningAnswers = [];
  for (let k = 0; k < config.screeningIndices.length; k++) {
    const i = config.screeningIndices[k];
    const question = getQuestionLabel(prospectType, headerRow, i);
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

function getRowsFromSheet(workbook, prospectType) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { headerRow: [], rows: [] };
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerRow = data[0] || [];
  const config = getColumnConfig(prospectType);
  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const parsed = parseExcelRow(headerRow, row, config, prospectType);
    if (!isBlankRow(parsed)) {
      rows.push(parsed);
    }
  }
  return { headerRow, rows };
}

const WHERE_NOT_DELETED = ' AND (IsDeleted = 0 OR IsDeleted IS NULL)';

// GET /api/prospects/types – list of prospect types for upload filter
router.get('/types', (req, res) => {
  res.json(VALID_PROSPECT_TYPES);
});

// GET /api/prospects – list with pagination (excludes soft-deleted)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const sort = ['CreatedAt', 'FullName', 'Phone', 'InterviewDate', 'InterviewStatus', 'ProspectType'].includes(req.query.sort)
      ? req.query.sort
      : 'CreatedAt';
    const order = (req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    const prospectType = req.query.type ? String(req.query.type).trim() : null;

    const pool = await getPool();
    let countSql = 'SELECT COUNT(*) AS Total FROM Prospects WHERE 1=1' + WHERE_NOT_DELETED;
    let listSql = `
      SELECT Id, FirstName, LastName, FullName, Email, Source, CityArea, Phone, Gender, DateOfBirth,
             ScreeningAnswers, InterviewDate, InterviewTime, InterviewStatus, Notes,
             SlotConfirmed, Sent, ZoomLink, VideoSwimCert, OverallInterviewVerdict, OfferStatus, JoiningCommitment, ExpectedStartDate,
             ProspectType, CreatedAt, ConvertedToEmployeeId
      FROM Prospects WHERE 1=1
    ` + WHERE_NOT_DELETED;
    if (prospectType && VALID_PROSPECT_TYPES.includes(prospectType)) {
      countSql += ' AND ProspectType = @type';
      listSql += ' AND ProspectType = @type';
    }
    listSql += ` ORDER BY [${sort}] ${order} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const countReq = pool.request();
    if (prospectType && VALID_PROSPECT_TYPES.includes(prospectType)) countReq.input('type', sql.NVarChar, prospectType);
    const countResult = await countReq.query(countSql);
    const total = countResult.recordset[0].Total;

    const listReq = pool.request().input('limit', sql.Int, limit).input('offset', sql.Int, offset);
    if (prospectType && VALID_PROSPECT_TYPES.includes(prospectType)) listReq.input('type', sql.NVarChar, prospectType);
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

// GET /api/prospects/:id – single prospect (for checklist view)
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT Id, FirstName, LastName, FullName, Email, Source, CityArea, Phone, Gender, DateOfBirth,
               ScreeningAnswers, InterviewDate, InterviewTime, InterviewStatus, Notes,
               SlotConfirmed, Sent, ZoomLink, VideoSwimCert, OverallInterviewVerdict, OfferStatus, JoiningCommitment, ExpectedStartDate,
               ProspectType, CreatedAt, ConvertedToEmployeeId
        FROM Prospects
        WHERE Id = @id
      ` + WHERE_NOT_DELETED);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching prospect:', error);
    res.status(500).json({ error: 'Failed to fetch prospect' });
  }
});

// POST /api/prospects/upload – upload Excel; prospectType required (Swimming Instructor | Customer Service Assistant | Assistant Coordinator)
router.post('/upload', uploadExcel.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const prospectType = (req.body && req.body.prospectType) ? String(req.body.prospectType).trim() : null;
  if (!prospectType || !VALID_PROSPECT_TYPES.includes(prospectType)) {
    return res.status(400).json({
      error: `prospectType required: one of ${VALID_PROSPECT_TYPES.join(', ')}`,
    });
  }
  try {
    const workbook = XLSX.readFile(req.file.path);
    const { rows } = getRowsFromSheet(workbook, prospectType);
    fs.unlink(req.file.path, () => {});

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'No valid rows found. First row must be headers. Rows with no name, phone, or screening answers are skipped.',
      });
    }

    const pool = await getPool();
    let inserted = 0;
    for (const row of rows) {
      const { firstName, lastName } = splitName(row.fullName);
      const screeningJson = row.screeningAnswers.length ? JSON.stringify(row.screeningAnswers) : null;
      const dob = parseDateOfBirth(row.dateOfBirth);

      await pool
        .request()
        .input('firstName', sql.NVarChar, firstName)
        .input('lastName', sql.NVarChar, lastName)
        .input('fullName', sql.NVarChar, row.fullName || null)
        .input('cityArea', sql.NVarChar, row.cityArea || null)
        .input('phone', sql.NVarChar, row.phone || null)
        .input('email', sql.NVarChar, row.email || null)
        .input('gender', sql.NVarChar, row.gender || null)
        .input('dateOfBirth', sql.Date, dob)
        .input('screeningAnswers', sql.NVarChar, screeningJson)
        .input('source', sql.NVarChar, 'excel_import')
        .input('prospectType', sql.NVarChar, prospectType)
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

// PATCH /api/prospects/:id – update interview & offer details (system-captured)
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
    const result = await pool.request().input('id', sql.Int, req.params.id).query(`
      SELECT Id, FirstName, LastName, FullName, Email, Source, CityArea, Phone, Gender, DateOfBirth,
             ScreeningAnswers, InterviewDate, InterviewTime, InterviewStatus, Notes,
             SlotConfirmed, Sent, ZoomLink, VideoSwimCert, OverallInterviewVerdict, OfferStatus, JoiningCommitment, ExpectedStartDate,
             ProspectType, CreatedAt, ConvertedToEmployeeId
      FROM Prospects WHERE Id = @id
    `);
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Prospect not found' });
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating prospect:', error);
    res.status(500).json({ error: 'Failed to update prospect' });
  }
});

// DELETE /api/prospects/:id – soft delete
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

// POST /api/prospects/delete-selected – bulk soft delete
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

// POST /api/prospects/:id/to-employee – create employee from prospect (send to onboarding)
router.post('/:id/to-employee', async (req, res) => {
  try {
    const pool = await getPool();
    const prospectResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT Id, FirstName, LastName, FullName, Email, Phone
        FROM Prospects WHERE Id = @id AND ConvertedToEmployeeId IS NULL
      ` + WHERE_NOT_DELETED);
    if (prospectResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Prospect not found or already converted to employee' });
    }
    const p = prospectResult.recordset[0];
    const firstName = p.FirstName || (p.FullName ? splitName(p.FullName).firstName : '');
    const lastName = p.LastName || (p.FullName ? splitName(p.FullName).lastName : '');
    const email = p.Email || `prospect-${p.Id}@stingrays.local`;

    const empResult = await pool
      .request()
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .query(`
        INSERT INTO Employees (FirstName, LastName, Email, NIC, Phone, Address, City, PostalCode,
          Position, Department, EmergencyContactName, EmergencyContactPhone, OnboardingStatus, IsActive)
        OUTPUT INSERTED.Id
        VALUES (@firstName, @lastName, @email, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 1)
      `);
    const employeeId = empResult.recordset[0].Id;
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
    res.status(500).json({ error: 'Failed to create employee from prospect' });
  }
});

module.exports = router;

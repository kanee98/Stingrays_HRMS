const { getPool, sql } = require('../config/db');

const DEFAULT_IMPORT_TEMPLATES = [
  {
    templateKey: 'swimming-instructor',
    name: 'Swimming Instructor template',
    description: '4 screening answers, city or area, full name, phone, gender, and date of birth.',
    sortOrder: 1,
    screeningColumnNumbers: [1, 2, 3, 4],
    cityAreaColumnNumber: 5,
    fullNameColumnNumber: 6,
    phoneColumnNumber: 7,
    emailColumnNumber: null,
    genderColumnNumber: 8,
    dateOfBirthColumnNumber: 9,
    defaultQuestionLabels: [
      'Can you swim?',
      'Do you have prior teaching or coaching experience?',
      'Are you available for the required schedule?',
      'Why do you want to work as a swimming instructor?',
    ],
  },
  {
    templateKey: 'customer-service-assistant',
    name: 'Customer Service Assistant template',
    description: '7 screening answers, full name, phone, email, date of birth, and gender.',
    sortOrder: 2,
    screeningColumnNumbers: [1, 2, 3, 4, 5, 6, 8],
    cityAreaColumnNumber: null,
    fullNameColumnNumber: 7,
    phoneColumnNumber: 9,
    emailColumnNumber: 10,
    genderColumnNumber: 12,
    dateOfBirthColumnNumber: 11,
    defaultQuestionLabels: [],
  },
  {
    templateKey: 'assistant-coordinator',
    name: 'Assistant Coordinator template',
    description: '8 screening answers, full name, phone, email, city or area, date of birth, and gender.',
    sortOrder: 3,
    screeningColumnNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    cityAreaColumnNumber: 12,
    fullNameColumnNumber: 9,
    phoneColumnNumber: 10,
    emailColumnNumber: 11,
    genderColumnNumber: 14,
    dateOfBirthColumnNumber: 13,
    defaultQuestionLabels: [],
  },
];

const DEFAULT_PROSPECT_TYPES = [
  { name: 'Swimming Instructor', sortOrder: 1, importLayoutKey: 'swimming-instructor' },
  { name: 'Customer Service Assistant', sortOrder: 2, importLayoutKey: 'customer-service-assistant' },
  { name: 'Assistant Coordinator', sortOrder: 3, importLayoutKey: 'assistant-coordinator' },
];

function normalizeProspectTypeName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 100);
}

function normalizeImportTemplateName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 150);
}

function normalizeImportLayoutKey(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 100) : null;
}

function normalizeOptionalText(value, maxLen) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return maxLen > 0 && trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function normalizePositiveColumnNumber(value) {
  if (value == null || value === '') return null;
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeQuestionLabels(value) {
  const trimTrailingEmptyLabels = (labels) => {
    const normalized = labels.slice(0, 50);
    while (normalized.length > 0 && !normalized[normalized.length - 1]) {
      normalized.pop();
    }
    return normalized;
  };

  if (value == null) return [];

  if (Array.isArray(value)) {
    return trimTrailingEmptyLabels(value
      .map((item) => (typeof item === 'string' ? item.trim().slice(0, 200) : ''))
    );
  }

  if (typeof value === 'string') {
    return trimTrailingEmptyLabels(value
      .split(/\r?\n/)
      .map((item) => item.trim().slice(0, 200))
    );
  }

  return [];
}

function normalizeScreeningColumnNumbers(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const parsed = rawValues
    .map((item) => normalizePositiveColumnNumber(item))
    .filter((item) => item != null);

  return Array.from(new Set(parsed));
}

function validateUniqueColumnAssignments(template) {
  const assignments = [
    ...template.screeningColumnNumbers.map((columnNumber, index) => ({
      columnNumber,
      label: `screening question ${index + 1}`,
    })),
    { columnNumber: template.cityAreaColumnNumber, label: 'city or area' },
    { columnNumber: template.fullNameColumnNumber, label: 'full name' },
    { columnNumber: template.phoneColumnNumber, label: 'phone' },
    { columnNumber: template.emailColumnNumber, label: 'email' },
    { columnNumber: template.genderColumnNumber, label: 'gender' },
    { columnNumber: template.dateOfBirthColumnNumber, label: 'date of birth' },
  ].filter((item) => item.columnNumber != null);

  const columnsToLabels = new Map();
  for (const assignment of assignments) {
    const labels = columnsToLabels.get(assignment.columnNumber) || [];
    labels.push(assignment.label);
    columnsToLabels.set(assignment.columnNumber, labels);
  }

  return Array.from(columnsToLabels.entries())
    .filter(([, labels]) => labels.length > 1)
    .sort((a, b) => a[0] - b[0])
    .map(([columnNumber, labels]) => `Column ${columnNumber} is mapped more than once (${labels.join(', ')}). Each Excel column can only be assigned once.`);
}

function slugifyTemplateKey(value) {
  const base = normalizeImportTemplateName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || 'import-template';
}

function toParserColumnIndex(value) {
  return Number.isInteger(value) && value > 0 ? value - 1 : -1;
}

function parseJsonArray(value) {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapImportTemplateRecord(record) {
  const screeningColumnNumbers = parseJsonArray(record.ScreeningColumnNumbersJson)
    .map((item) => normalizePositiveColumnNumber(item))
    .filter((item) => item != null);

  const defaultQuestionLabels = normalizeQuestionLabels(parseJsonArray(record.DefaultQuestionLabelsJson));

  return {
    Id: record.Id,
    TemplateKey: record.TemplateKey,
    Name: record.Name,
    Description: record.Description,
    SortOrder: record.SortOrder,
    IsActive: !!record.IsActive,
    ScreeningColumnNumbers: screeningColumnNumbers,
    DefaultQuestionLabels: defaultQuestionLabels,
    CityAreaColumnNumber: record.CityAreaColumnNumber,
    FullNameColumnNumber: record.FullNameColumnNumber,
    PhoneColumnNumber: record.PhoneColumnNumber,
    EmailColumnNumber: record.EmailColumnNumber,
    GenderColumnNumber: record.GenderColumnNumber,
    DateOfBirthColumnNumber: record.DateOfBirthColumnNumber,
    CreatedAt: record.CreatedAt,
    UpdatedAt: record.UpdatedAt,
  };
}

function validateImportTemplatePayload(payload) {
  const name = normalizeImportTemplateName(payload?.name ?? payload?.Name);
  const description = normalizeOptionalText(payload?.description ?? payload?.Description, 500);
  const screeningColumnNumbers = normalizeScreeningColumnNumbers(payload?.screeningColumnNumbers ?? payload?.ScreeningColumnNumbers);
  const defaultQuestionLabels = normalizeQuestionLabels(payload?.defaultQuestionLabels ?? payload?.DefaultQuestionLabels);
  const cityAreaColumnNumber = normalizePositiveColumnNumber(payload?.cityAreaColumnNumber ?? payload?.CityAreaColumnNumber);
  const fullNameColumnNumber = normalizePositiveColumnNumber(payload?.fullNameColumnNumber ?? payload?.FullNameColumnNumber);
  const phoneColumnNumber = normalizePositiveColumnNumber(payload?.phoneColumnNumber ?? payload?.PhoneColumnNumber);
  const emailColumnNumber = normalizePositiveColumnNumber(payload?.emailColumnNumber ?? payload?.EmailColumnNumber);
  const genderColumnNumber = normalizePositiveColumnNumber(payload?.genderColumnNumber ?? payload?.GenderColumnNumber);
  const dateOfBirthColumnNumber = normalizePositiveColumnNumber(payload?.dateOfBirthColumnNumber ?? payload?.DateOfBirthColumnNumber);
  const sortOrderRaw = payload?.sortOrder ?? payload?.SortOrder;
  const sortOrder = Number.isInteger(parseInt(sortOrderRaw, 10)) ? Math.max(0, parseInt(sortOrderRaw, 10)) : 0;
  const errors = [];

  if (!name) {
    errors.push('Template name is required.');
  }

  if (screeningColumnNumbers.length === 0) {
    errors.push('Add at least one screening column.');
  }

  if (screeningColumnNumbers.length > 25) {
    errors.push('No more than 25 screening columns can be configured.');
  }

  if (!fullNameColumnNumber) {
    errors.push('Full name column is required.');
  }

  if (!phoneColumnNumber) {
    errors.push('Phone column is required.');
  }

  if (defaultQuestionLabels.length > screeningColumnNumbers.length) {
    errors.push('Default question labels cannot exceed the number of screening columns.');
  }

  errors.push(...validateUniqueColumnAssignments({
    screeningColumnNumbers,
    cityAreaColumnNumber,
    fullNameColumnNumber,
    phoneColumnNumber,
    emailColumnNumber,
    genderColumnNumber,
    dateOfBirthColumnNumber,
  }));

  return {
    errors,
    template: {
      name,
      description,
      screeningColumnNumbers,
      defaultQuestionLabels,
      cityAreaColumnNumber,
      fullNameColumnNumber,
      phoneColumnNumber,
      emailColumnNumber,
      genderColumnNumber,
      dateOfBirthColumnNumber,
      sortOrder,
    },
  };
}

function toImportTemplateOption(template) {
  return {
    key: template.TemplateKey,
    label: template.Name,
    description: template.Description || 'Imported spreadsheets will use this template mapping.',
  };
}

function toImportParserConfig(template) {
  return {
    screeningIndices: template.ScreeningColumnNumbers.map(toParserColumnIndex).filter((item) => item >= 0),
    cityArea: toParserColumnIndex(template.CityAreaColumnNumber),
    fullName: toParserColumnIndex(template.FullNameColumnNumber),
    phone: toParserColumnIndex(template.PhoneColumnNumber),
    email: toParserColumnIndex(template.EmailColumnNumber),
    gender: toParserColumnIndex(template.GenderColumnNumber),
    dob: toParserColumnIndex(template.DateOfBirthColumnNumber),
    defaultQuestionLabels: template.DefaultQuestionLabels,
  };
}

async function ensureProspectTypesTable() {
  try {
    const pool = await getPool();
    await ensureProspectImportTemplatesTable(pool);

    const check = await pool.request().query(
      "SELECT OBJECT_ID('ProspectTypes', 'U') AS TableId"
    );

    if (check.recordset[0]?.TableId == null) {
      await pool.request().query(`
        CREATE TABLE ProspectTypes (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(100) NOT NULL,
          SortOrder INT NOT NULL DEFAULT 0,
          IsActive BIT NOT NULL DEFAULT 1,
          ImportLayoutKey NVARCHAR(100) NULL,
          CreatedAt DATETIME DEFAULT GETDATE(),
          UpdatedAt DATETIME NULL
        )
      `);
      console.log('ProspectTypes table created');
    }

    await ensureImportLayoutKeyColumn(pool);
    await ensureProspectTypesUniqueIndex(pool);
    await seedDefaultProspectTypes(pool);
  } catch (err) {
    console.error('Failed to ensure ProspectTypes table:', err.message);
  }
}

async function ensureProspectImportTemplatesTable(existingPool) {
  const pool = existingPool || await getPool();
  const check = await pool.request().query(
    "SELECT OBJECT_ID('ProspectImportTemplates', 'U') AS TableId"
  );

  if (check.recordset[0]?.TableId == null) {
    await pool.request().query(`
      CREATE TABLE ProspectImportTemplates (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TemplateKey NVARCHAR(100) NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        Description NVARCHAR(500) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        ScreeningColumnNumbersJson NVARCHAR(MAX) NOT NULL,
        DefaultQuestionLabelsJson NVARCHAR(MAX) NULL,
        CityAreaColumnNumber INT NULL,
        FullNameColumnNumber INT NOT NULL,
        PhoneColumnNumber INT NOT NULL,
        EmailColumnNumber INT NULL,
        GenderColumnNumber INT NULL,
        DateOfBirthColumnNumber INT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
      )
    `);
    console.log('ProspectImportTemplates table created');
  }

  await ensureProspectImportTemplatesIndexes(pool);
  await seedDefaultImportTemplates(pool);
}

async function ensureImportLayoutKeyColumn(pool) {
  const result = await pool.request().query(`
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ProspectTypes' AND COLUMN_NAME = 'ImportLayoutKey'
  `);

  if (result.recordset.length > 0) return;

  await pool.request().query(`
    ALTER TABLE ProspectTypes ADD ImportLayoutKey NVARCHAR(100) NULL
  `);
  console.log('ProspectTypes: added column ImportLayoutKey');
}

async function ensureProspectTypesUniqueIndex(pool) {
  try {
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_ProspectTypes_Name'
          AND object_id = OBJECT_ID('ProspectTypes')
      )
      BEGIN
        IF NOT EXISTS (
          SELECT Name
          FROM ProspectTypes
          GROUP BY Name
          HAVING COUNT(*) > 1
        )
        BEGIN
          CREATE UNIQUE INDEX UX_ProspectTypes_Name ON ProspectTypes(Name);
        END
      END
    `);
  } catch (err) {
    console.error('ProspectTypes: ensure unique index:', err.message);
  }
}

async function ensureProspectImportTemplatesIndexes(pool) {
  try {
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_ProspectImportTemplates_TemplateKey'
          AND object_id = OBJECT_ID('ProspectImportTemplates')
      )
      BEGIN
        CREATE UNIQUE INDEX UX_ProspectImportTemplates_TemplateKey ON ProspectImportTemplates(TemplateKey);
      END

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_ProspectImportTemplates_Name'
          AND object_id = OBJECT_ID('ProspectImportTemplates')
      )
      BEGIN
        IF NOT EXISTS (
          SELECT Name
          FROM ProspectImportTemplates
          GROUP BY Name
          HAVING COUNT(*) > 1
        )
        BEGIN
          CREATE UNIQUE INDEX UX_ProspectImportTemplates_Name ON ProspectImportTemplates(Name);
        END
      END
    `);
  } catch (err) {
    console.error('ProspectImportTemplates: ensure indexes:', err.message);
  }
}

async function seedDefaultImportTemplates(pool) {
  for (const template of DEFAULT_IMPORT_TEMPLATES) {
    await pool
      .request()
      .input('templateKey', sql.NVarChar, template.templateKey)
      .input('name', sql.NVarChar, template.name)
      .input('description', sql.NVarChar, template.description)
      .input('sortOrder', sql.Int, template.sortOrder)
      .input('screeningColumnNumbersJson', sql.NVarChar(sql.MAX), JSON.stringify(template.screeningColumnNumbers))
      .input('defaultQuestionLabelsJson', sql.NVarChar(sql.MAX), template.defaultQuestionLabels.length ? JSON.stringify(template.defaultQuestionLabels) : null)
      .input('cityAreaColumnNumber', sql.Int, template.cityAreaColumnNumber)
      .input('fullNameColumnNumber', sql.Int, template.fullNameColumnNumber)
      .input('phoneColumnNumber', sql.Int, template.phoneColumnNumber)
      .input('emailColumnNumber', sql.Int, template.emailColumnNumber)
      .input('genderColumnNumber', sql.Int, template.genderColumnNumber)
      .input('dateOfBirthColumnNumber', sql.Int, template.dateOfBirthColumnNumber)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM ProspectImportTemplates WHERE TemplateKey = @templateKey)
        BEGIN
          INSERT INTO ProspectImportTemplates (
            TemplateKey, Name, Description, SortOrder, IsActive,
            ScreeningColumnNumbersJson, DefaultQuestionLabelsJson,
            CityAreaColumnNumber, FullNameColumnNumber, PhoneColumnNumber,
            EmailColumnNumber, GenderColumnNumber, DateOfBirthColumnNumber
          )
          VALUES (
            @templateKey, @name, @description, @sortOrder, 1,
            @screeningColumnNumbersJson, @defaultQuestionLabelsJson,
            @cityAreaColumnNumber, @fullNameColumnNumber, @phoneColumnNumber,
            @emailColumnNumber, @genderColumnNumber, @dateOfBirthColumnNumber
          );
        END
      `);
  }
}

async function seedDefaultProspectTypes(pool) {
  for (const prospectType of DEFAULT_PROSPECT_TYPES) {
    await pool
      .request()
      .input('name', sql.NVarChar, prospectType.name)
      .input('sortOrder', sql.Int, prospectType.sortOrder)
      .input('importLayoutKey', sql.NVarChar, prospectType.importLayoutKey)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM ProspectTypes WHERE Name = @name)
        BEGIN
          INSERT INTO ProspectTypes (Name, SortOrder, IsActive, ImportLayoutKey)
          VALUES (@name, @sortOrder, 1, @importLayoutKey);
        END
        ELSE
        BEGIN
          UPDATE ProspectTypes
          SET ImportLayoutKey = CASE
                WHEN ImportLayoutKey IS NULL OR LTRIM(RTRIM(ImportLayoutKey)) = '' THEN @importLayoutKey
                ELSE ImportLayoutKey
              END
          WHERE Name = @name;
        END
      `);
  }
}

async function listProspectTypes(options = {}) {
  const activeOnly = options.activeOnly !== false;
  const importableOnly = options.importableOnly === true;
  const pool = await getPool();
  const filters = [];

  if (activeOnly) filters.push('IsActive = 1');
  if (importableOnly) filters.push("ImportLayoutKey IS NOT NULL AND LTRIM(RTRIM(ImportLayoutKey)) <> ''");

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await pool.request().query(`
    SELECT Id, Name, SortOrder, IsActive, ImportLayoutKey, CreatedAt, UpdatedAt
    FROM ProspectTypes
    ${whereClause}
    ORDER BY SortOrder ASC, Id ASC
  `);

  return result.recordset;
}

async function getProspectTypeByName(name, options = {}) {
  const normalizedName = normalizeProspectTypeName(name);
  if (!normalizedName) return null;

  const activeOnly = options.activeOnly !== false;
  const pool = await getPool();
  const result = await pool
    .request()
    .input('name', sql.NVarChar, normalizedName)
    .query(`
      SELECT TOP 1 Id, Name, SortOrder, IsActive, ImportLayoutKey, CreatedAt, UpdatedAt
      FROM ProspectTypes
      WHERE Name = @name
      ${activeOnly ? 'AND IsActive = 1' : ''}
      ORDER BY Id ASC
    `);

  return result.recordset[0] || null;
}

async function listImportTemplates(options = {}) {
  const activeOnly = options.activeOnly !== false;
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      Id, TemplateKey, Name, Description, SortOrder, IsActive,
      ScreeningColumnNumbersJson, DefaultQuestionLabelsJson,
      CityAreaColumnNumber, FullNameColumnNumber, PhoneColumnNumber,
      EmailColumnNumber, GenderColumnNumber, DateOfBirthColumnNumber,
      CreatedAt, UpdatedAt
    FROM ProspectImportTemplates
    ${activeOnly ? 'WHERE IsActive = 1' : ''}
    ORDER BY SortOrder ASC, Id ASC
  `);

  return result.recordset.map(mapImportTemplateRecord);
}

async function getImportTemplateById(id, options = {}) {
  if (!Number.isInteger(Number(id))) return null;
  const activeOnly = options.activeOnly !== false;
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, Number(id))
    .query(`
      SELECT TOP 1
        Id, TemplateKey, Name, Description, SortOrder, IsActive,
        ScreeningColumnNumbersJson, DefaultQuestionLabelsJson,
        CityAreaColumnNumber, FullNameColumnNumber, PhoneColumnNumber,
        EmailColumnNumber, GenderColumnNumber, DateOfBirthColumnNumber,
        CreatedAt, UpdatedAt
      FROM ProspectImportTemplates
      WHERE Id = @id
      ${activeOnly ? 'AND IsActive = 1' : ''}
    `);

  return result.recordset[0] ? mapImportTemplateRecord(result.recordset[0]) : null;
}

async function getImportLayoutByKey(value, options = {}) {
  const normalized = normalizeImportLayoutKey(value);
  if (!normalized) return null;

  const activeOnly = options.activeOnly !== false;
  const pool = await getPool();
  const result = await pool
    .request()
    .input('templateKey', sql.NVarChar, normalized)
    .query(`
      SELECT TOP 1
        Id, TemplateKey, Name, Description, SortOrder, IsActive,
        ScreeningColumnNumbersJson, DefaultQuestionLabelsJson,
        CityAreaColumnNumber, FullNameColumnNumber, PhoneColumnNumber,
        EmailColumnNumber, GenderColumnNumber, DateOfBirthColumnNumber,
        CreatedAt, UpdatedAt
      FROM ProspectImportTemplates
      WHERE TemplateKey = @templateKey
      ${activeOnly ? 'AND IsActive = 1' : ''}
    `);

  return result.recordset[0] ? mapImportTemplateRecord(result.recordset[0]) : null;
}

async function generateUniqueTemplateKey(name, options = {}) {
  const excludeId = Number.isInteger(Number(options.excludeId)) ? Number(options.excludeId) : null;
  const pool = await getPool();
  const base = slugifyTemplateKey(name);
  let suffix = 0;

  while (suffix < 1000) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const request = pool
      .request()
      .input('candidate', sql.NVarChar, candidate);

    let query = `
      SELECT TOP 1 Id
      FROM ProspectImportTemplates
      WHERE TemplateKey = @candidate
    `;

    if (excludeId != null) {
      request.input('excludeId', sql.Int, excludeId);
      query += ' AND Id <> @excludeId';
    }

    const result = await request.query(query);
    if (result.recordset.length === 0) {
      return candidate;
    }

    suffix += 1;
  }

  throw new Error('Failed to generate a unique template key');
}

module.exports = {
  DEFAULT_IMPORT_TEMPLATES,
  DEFAULT_PROSPECT_TYPES,
  ensureProspectTypesTable,
  listProspectTypes,
  getProspectTypeByName,
  listImportTemplates,
  getImportTemplateById,
  getImportLayoutByKey,
  generateUniqueTemplateKey,
  validateImportTemplatePayload,
  normalizeProspectTypeName,
  normalizeImportTemplateName,
  normalizeImportLayoutKey,
  toImportTemplateOption,
  toImportParserConfig,
};

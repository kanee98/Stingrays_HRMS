/**
 * Add missing columns to Prospects table (safe to run multiple times).
 * Run after ensureProspectsTable so existing DBs get new columns.
 */
const { getPool } = require('../config/db');

const COLUMNS = [
  { name: 'Email', type: 'NVARCHAR(255) NULL' },
  { name: 'ScreeningAnswers', type: 'NVARCHAR(MAX) NULL' },
  { name: 'CityArea', type: 'NVARCHAR(200) NULL' },
  { name: 'FullName', type: 'NVARCHAR(200) NULL' },
  { name: 'Phone', type: 'NVARCHAR(50) NULL' },
  { name: 'Gender', type: 'NVARCHAR(50) NULL' },
  { name: 'DateOfBirth', type: 'DATE NULL' },
  { name: 'InterviewDate', type: 'DATE NULL' },
  { name: 'InterviewTime', type: 'NVARCHAR(20) NULL' },
  { name: 'InterviewStatus', type: 'NVARCHAR(50) NULL' },
  { name: 'Notes', type: 'NVARCHAR(MAX) NULL' },
  { name: 'SlotConfirmed', type: 'NVARCHAR(200) NULL' },
  { name: 'Sent', type: 'NVARCHAR(200) NULL' },
  { name: 'ZoomLink', type: 'NVARCHAR(500) NULL' },
  { name: 'VideoSwimCert', type: 'NVARCHAR(500) NULL' },
  { name: 'OverallInterviewVerdict', type: 'NVARCHAR(200) NULL' },
  { name: 'OfferStatus', type: 'NVARCHAR(100) NULL' },
  { name: 'JoiningCommitment', type: 'NVARCHAR(200) NULL' },
  { name: 'ExpectedStartDate', type: 'DATE NULL' },
  { name: 'ProspectType', type: 'NVARCHAR(100) NULL' },
  { name: 'IsDeleted', type: 'BIT NOT NULL DEFAULT 0' },
];

async function ensureProspectsColumns() {
  const pool = await getPool();
  for (const col of COLUMNS) {
    try {
      const check = await pool.request().query(`
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Prospects' AND COLUMN_NAME = '${col.name}'
      `);
      if (check.recordset.length > 0) continue;
      await pool.request().query(`
        ALTER TABLE Prospects ADD [${col.name}] ${col.type}
      `);
      console.log(`Prospects: added column ${col.name}`);
    } catch (err) {
      console.error(`Prospects: add column ${col.name}:`, err.message);
    }
  }
}

module.exports = { ensureProspectsColumns };

/**
 * Add missing columns to Employees table (safe to run multiple times).
 * Ensures all columns required for onboarding exist.
 */
const { getPool } = require('../config/db');

const COLUMNS = [
  { name: 'NIC', type: 'NVARCHAR(20) NULL' },
  { name: 'Phone', type: 'NVARCHAR(20) NULL' },
  { name: 'Address', type: 'NVARCHAR(500) NULL' },
  { name: 'City', type: 'NVARCHAR(100) NULL' },
  { name: 'PostalCode', type: 'NVARCHAR(20) NULL' },
  { name: 'EmergencyContactName', type: 'NVARCHAR(200) NULL' },
  { name: 'EmergencyContactPhone', type: 'NVARCHAR(20) NULL' },
  { name: 'OnboardingStatus', type: 'NVARCHAR(50) NULL' },
  { name: 'OnboardingCompletedAt', type: 'DATETIME NULL' },
  { name: 'IsActive', type: 'BIT NOT NULL DEFAULT 1' },
];

async function ensureEmployeesColumns() {
  try {
    const pool = await getPool();
    const tableCheck = await pool.request().query(
      "SELECT OBJECT_ID('Employees', 'U') AS TableId"
    );
    if (tableCheck.recordset[0]?.TableId == null) {
      console.log('Employees table does not exist; ensure init.sql has been run.');
      return;
    }
    for (const col of COLUMNS) {
      try {
        const check = await pool.request().query(`
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'Employees' AND COLUMN_NAME = '${col.name}'
        `);
        if (check.recordset.length > 0) continue;
        await pool.request().query(`
          ALTER TABLE Employees ADD [${col.name}] ${col.type}
        `);
        console.log(`Employees: added column ${col.name}`);
      } catch (err) {
        console.error(`Employees: add column ${col.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error('ensureEmployeesColumns:', err.message);
  }
}

module.exports = { ensureEmployeesColumns };

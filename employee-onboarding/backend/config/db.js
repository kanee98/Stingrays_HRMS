const sql = require('mssql');

const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Kanishka#9810',
  database: process.env.DB_NAME || 'StingraysHRMS',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool = null;

const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
    console.log('Connected to MSSQL');
  }
  return pool;
};

module.exports = { getPool, sql };

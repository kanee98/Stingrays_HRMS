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

const globalSqlState = global;

const getPool = async () => {
  if (!globalSqlState.__stingraysHrmsSqlPoolPromise) {
    globalSqlState.__stingraysHrmsSqlPoolPromise = new sql.ConnectionPool(sqlConfig)
      .connect()
      .then((connectedPool) => {
        console.log('Connected to MSSQL');
        return connectedPool;
      })
      .catch((error) => {
        delete globalSqlState.__stingraysHrmsSqlPoolPromise;
        throw error;
      });
  }

  return globalSqlState.__stingraysHrmsSqlPoolPromise;
};

module.exports = { getPool, sql };

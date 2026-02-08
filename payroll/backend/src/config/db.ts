import sql from "mssql";

export const sqlConfig: sql.config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  server: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT!),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then((pool) => {
    console.log("Payroll service connected to MSSQL");
    return pool;
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    throw err;
  });

export const ensureDbConnection = async () => {
  try {
    await poolPromise;
  } catch (err) {
    console.error("Failed to establish database connection:", err);
    throw err;
  }
};

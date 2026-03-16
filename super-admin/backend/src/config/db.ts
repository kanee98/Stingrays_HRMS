import sql from "mssql";

export const sqlConfig: sql.config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  server: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT || "1433"),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then((pool) => {
    console.log("Super Admin API connected to MSSQL");
    return pool;
  })
  .catch((err) => {
    console.error("Super Admin DB connection failed:", err);
    throw err;
  });

export const ensureDbConnection = async () => {
  await poolPromise;
};

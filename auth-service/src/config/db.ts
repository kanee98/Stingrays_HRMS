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
    console.log("Connected to MSSQL");
    return pool;
  })
  .catch((err) => {
    console.error("Database Connection Failed! Bad Config: ", err);
    throw err;
  });
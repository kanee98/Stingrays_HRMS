"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDbConnection = exports.poolPromise = exports.sqlConfig = void 0;
const mssql_1 = __importDefault(require("mssql"));
exports.sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};
exports.poolPromise = new mssql_1.default.ConnectionPool(exports.sqlConfig)
    .connect()
    .then((pool) => {
    console.log("Connected to MSSQL");
    return pool;
})
    .catch((err) => {
    console.error("Database Connection Failed! Bad Config: ", err);
    throw err;
});
// Helper function to ensure database is connected
const ensureDbConnection = async () => {
    try {
        await exports.poolPromise;
    }
    catch (err) {
        console.error("Failed to establish database connection:", err);
        throw err;
    }
};
exports.ensureDbConnection = ensureDbConnection;

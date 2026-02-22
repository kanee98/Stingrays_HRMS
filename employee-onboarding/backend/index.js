const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { getPool } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
const employeesRouter = require("./routes/employees");
const prospectsRouter = require("./routes/prospects");
app.use("/api/employees", employeesRouter);
app.use("/api/prospects", prospectsRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4000;

const { ensureProspectsColumns } = require("./migrations/ensure-prospects-columns");

// Ensure Prospects table exists (create if DB was initialized before table was added)
async function ensureProspectsTable() {
  try {
    const pool = await getPool();
    const check = await pool.request().query(
      "SELECT OBJECT_ID('Prospects', 'U') AS TableId"
    );
    const tableId = check.recordset[0]?.TableId;
    if (tableId != null) {
      await ensureProspectsColumns();
      return;
    }
    await pool.request().query(`
      CREATE TABLE Prospects (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(100),
        LastName NVARCHAR(100),
        Email NVARCHAR(255) NULL,
        Source NVARCHAR(100) DEFAULT 'excel_import',
        CreatedAt DATETIME DEFAULT GETDATE(),
        ConvertedToEmployeeId INT NULL,
        ScreeningAnswers NVARCHAR(MAX) NULL,
        CityArea NVARCHAR(200) NULL,
        FullName NVARCHAR(200) NULL,
        Phone NVARCHAR(50) NULL,
        Gender NVARCHAR(50) NULL,
        DateOfBirth DATE NULL,
        InterviewDate DATE NULL,
        InterviewTime NVARCHAR(20) NULL,
        InterviewStatus NVARCHAR(50) NULL,
        Notes NVARCHAR(MAX) NULL,
        SlotConfirmed NVARCHAR(200) NULL,
        Sent NVARCHAR(200) NULL,
        ZoomLink NVARCHAR(500) NULL,
        VideoSwimCert NVARCHAR(500) NULL,
        OverallInterviewVerdict NVARCHAR(200) NULL,
        OfferStatus NVARCHAR(100) NULL,
        JoiningCommitment NVARCHAR(200) NULL,
        ExpectedStartDate DATE NULL,
        ProspectType NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_Prospects_Employees FOREIGN KEY (ConvertedToEmployeeId) REFERENCES Employees(Id)
      )
    `);
    console.log("Prospects table created");
  } catch (err) {
    console.error("Failed to ensure Prospects table:", err.message);
  }
}

ensureProspectsTable()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Employee API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
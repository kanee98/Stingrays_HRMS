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
const settingsRouter = require("./routes/settings");
app.use("/api/employees", employeesRouter);
app.use("/api/prospects", prospectsRouter);
app.use("/api/settings", settingsRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4000;

const { ensureProspectsColumns } = require("./migrations/ensure-prospects-columns");
const { ensureEmployeesColumns } = require("./migrations/ensure-employees-columns");
const { ensureProspectTypesTable } = require("./services/prospectTypes");

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

// Create OnboardingSettings and OnboardingDocumentTypes if missing (so settings UI works without manual init-sql)
async function ensureOnboardingSettingsTable() {
  try {
    const pool = await getPool();
    const check = await pool.request().query(
      "SELECT OBJECT_ID('OnboardingSettings', 'U') AS TableId"
    );
    if (check.recordset[0]?.TableId != null) return;
    await pool.request().query(`
      CREATE TABLE OnboardingSettings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ShowGramasevakaStep BIT NOT NULL DEFAULT 1,
        ShowPoliceReportStep BIT NOT NULL DEFAULT 1,
        UpdatedAt DATETIME NULL
      );
      INSERT INTO OnboardingSettings (ShowGramasevakaStep, ShowPoliceReportStep) VALUES (1, 1);
    `);
    console.log("OnboardingSettings table created");
  } catch (err) {
    console.error("Failed to ensure OnboardingSettings table:", err.message);
  }
}

async function ensureOnboardingDocumentTypesTable() {
  try {
    const pool = await getPool();
    const check = await pool.request().query(
      "SELECT OBJECT_ID('OnboardingDocumentTypes', 'U') AS TableId"
    );
    if (check.recordset[0]?.TableId != null) return;
    await pool.request().query(`
      CREATE TABLE OnboardingDocumentTypes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        IsRequired BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        Description NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
      );
    `);
    console.log("OnboardingDocumentTypes table created");
  } catch (err) {
    console.error("Failed to ensure OnboardingDocumentTypes table:", err.message);
  }
}

async function ensureDepartmentsTable() {
  try {
    const pool = await getPool();
    const check = await pool.request().query(
      "SELECT OBJECT_ID('Departments', 'U') AS TableId"
    );
    if (check.recordset[0]?.TableId != null) return;
    await pool.request().query(`
      CREATE TABLE Departments (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
      );
    `);
    await pool.request().query(`
      INSERT INTO Departments (Name, SortOrder, IsActive) VALUES
      ('Engineering', 1, 1),
      ('Human Resources', 2, 1),
      ('Finance', 3, 1),
      ('Marketing', 4, 1),
      ('Sales', 5, 1),
      ('Operations', 6, 1);
    `);
    console.log("Departments table created and seeded");
  } catch (err) {
    console.error("Failed to ensure Departments table:", err.message);
  }
}

ensureProspectsTable()
  .then(ensureOnboardingSettingsTable)
  .then(ensureOnboardingDocumentTypesTable)
  .then(ensureProspectTypesTable)
  .then(ensureDepartmentsTable)
  .then(ensureEmployeesColumns)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Employee API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });

USE [$(DB_NAME)];
GO

-- Add additional columns to Employees table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'NIC')
BEGIN
    ALTER TABLE Employees ADD NIC NVARCHAR(20);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'Phone')
BEGIN
    ALTER TABLE Employees ADD Phone NVARCHAR(20);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'Address')
BEGIN
    ALTER TABLE Employees ADD Address NVARCHAR(500);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'City')
BEGIN
    ALTER TABLE Employees ADD City NVARCHAR(100);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'PostalCode')
BEGIN
    ALTER TABLE Employees ADD PostalCode NVARCHAR(20);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'EmergencyContactName')
BEGIN
    ALTER TABLE Employees ADD EmergencyContactName NVARCHAR(200);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'EmergencyContactPhone')
BEGIN
    ALTER TABLE Employees ADD EmergencyContactPhone NVARCHAR(20);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'OnboardingStatus')
BEGIN
    ALTER TABLE Employees ADD OnboardingStatus NVARCHAR(50) DEFAULT 'pending';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'OnboardingCompletedAt')
BEGIN
    ALTER TABLE Employees ADD OnboardingCompletedAt DATETIME NULL;
END
GO

-- Status: 1 = active, 0 = soft-deleted. Use for listing/editing; future RBAC will use Roles/UserRoles for permission checks.
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'IsActive')
BEGIN
    ALTER TABLE Employees ADD IsActive BIT NOT NULL DEFAULT 1;
END
GO

-- Create OnboardingDocuments table
IF OBJECT_ID('OnboardingDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE OnboardingDocuments (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        DocumentType NVARCHAR(100) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        FilePath NVARCHAR(500) NOT NULL,
        FileSize INT,
        MimeType NVARCHAR(100),
        UploadedAt DATETIME DEFAULT GETDATE(),
        Status NVARCHAR(50) DEFAULT 'pending',
        VerifiedBy INT NULL,
        VerifiedAt DATETIME NULL,
        CONSTRAINT FK_OnboardingDocuments_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(Id) ON DELETE CASCADE,
        CONSTRAINT FK_OnboardingDocuments_Users FOREIGN KEY (VerifiedBy) REFERENCES Users(Id)
    );
    PRINT 'Table OnboardingDocuments created';
END
ELSE
BEGIN
    PRINT 'Table OnboardingDocuments already exists';
END
GO

-- Create OnboardingChecklist table
IF OBJECT_ID('OnboardingChecklist', 'U') IS NULL
BEGIN
    CREATE TABLE OnboardingChecklist (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        ItemName NVARCHAR(200) NOT NULL,
        ItemType NVARCHAR(50) NOT NULL, -- 'document', 'information', 'verification'
        IsRequired BIT DEFAULT 1,
        IsCompleted BIT DEFAULT 0,
        CompletedAt DATETIME NULL,
        Notes NVARCHAR(1000) NULL,
        CONSTRAINT FK_OnboardingChecklist_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(Id) ON DELETE CASCADE
    );
    PRINT 'Table OnboardingChecklist created';
END
ELSE
BEGIN
    PRINT 'Table OnboardingChecklist already exists';
END
GO

-- Create GramasevakaDetails table
IF OBJECT_ID('GramasevakaDetails', 'U') IS NULL
BEGIN
    CREATE TABLE GramasevakaDetails (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL UNIQUE,
        GramasevakaName NVARCHAR(200),
        GramasevakaOffice NVARCHAR(200),
        GramasevakaPhone NVARCHAR(20),
        CertificateNumber NVARCHAR(100),
        CertificateDate DATE,
        DocumentPath NVARCHAR(500),
        Verified BIT DEFAULT 0,
        VerifiedBy INT NULL,
        VerifiedAt DATETIME NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_GramasevakaDetails_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(Id) ON DELETE CASCADE,
        CONSTRAINT FK_GramasevakaDetails_Users FOREIGN KEY (VerifiedBy) REFERENCES Users(Id)
    );
    PRINT 'Table GramasevakaDetails created';
END
ELSE
BEGIN
    PRINT 'Table GramasevakaDetails already exists';
END
GO

-- Create PoliceReportDetails table
IF OBJECT_ID('PoliceReportDetails', 'U') IS NULL
BEGIN
    CREATE TABLE PoliceReportDetails (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL UNIQUE,
        ReportNumber NVARCHAR(100),
        PoliceStation NVARCHAR(200),
        ReportDate DATE,
        DocumentPath NVARCHAR(500),
        Verified BIT DEFAULT 0,
        VerifiedBy INT NULL,
        VerifiedAt DATETIME NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_PoliceReportDetails_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(Id) ON DELETE CASCADE,
        CONSTRAINT FK_PoliceReportDetails_Users FOREIGN KEY (VerifiedBy) REFERENCES Users(Id)
    );
    PRINT 'Table PoliceReportDetails created';
END
ELSE
BEGIN
    PRINT 'Table PoliceReportDetails already exists';
END
GO

-- Update Contracts table with more details
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Contracts') AND name = 'ContractType')
BEGIN
    ALTER TABLE Contracts ADD ContractType NVARCHAR(50) DEFAULT 'permanent';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Contracts') AND name = 'Salary')
BEGIN
    ALTER TABLE Contracts ADD Salary DECIMAL(18,2);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Contracts') AND name = 'Status')
BEGIN
    ALTER TABLE Contracts ADD Status NVARCHAR(50) DEFAULT 'draft';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Contracts') AND name = 'DocumentPath')
BEGIN
    ALTER TABLE Contracts ADD DocumentPath NVARCHAR(500);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Contracts') AND name = 'SignedByEmployee')
BEGIN
    ALTER TABLE Contracts ADD SignedByEmployee BIT DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Contracts') AND name = 'SignedByHR')
BEGIN
    ALTER TABLE Contracts ADD SignedByHR BIT DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Contracts') AND name = 'SignedAt')
BEGIN
    ALTER TABLE Contracts ADD SignedAt DATETIME NULL;
END
GO

-- Prospects: candidate pipeline (e.g. from Excel upload); "do the rest" = start onboarding as employee
IF OBJECT_ID('Prospects', 'U') IS NULL
BEGIN
    CREATE TABLE Prospects (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(100),
        LastName NVARCHAR(100),
        Email NVARCHAR(255) NULL,
        Source NVARCHAR(100) DEFAULT 'excel_import',
        CreatedAt DATETIME DEFAULT GETDATE(),
        ConvertedToEmployeeId INT NULL,
        CONSTRAINT FK_Prospects_Employees FOREIGN KEY (ConvertedToEmployeeId) REFERENCES Employees(Id)
    );
    PRINT 'Table Prospects created';
END
ELSE
BEGIN
    PRINT 'Table Prospects already exists';
END
GO

PRINT 'Onboarding schema updates completed';
GO

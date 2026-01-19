IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'StingraysHRMS')
BEGIN
    CREATE DATABASE StingraysHRMS;
END
GO

USE StingraysHRMS;
GO

IF OBJECT_ID('Users', 'U') IS NULL
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL DEFAULT 'employee',
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table Users created';
END
ELSE
BEGIN
    PRINT 'Table Users already exists';
END
GO

IF OBJECT_ID('Employees', 'U') IS NULL
BEGIN
    CREATE TABLE Employees (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(100),
        LastName NVARCHAR(100),
        Email NVARCHAR(255) UNIQUE,
        DOB DATE,
        Position NVARCHAR(100),
        Department NVARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table Employees created';
END
ELSE
BEGIN
    PRINT 'Table Employees already exists';
END
GO


IF OBJECT_ID('Contracts', 'U') IS NULL
BEGIN
    CREATE TABLE Contracts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        ContractStart DATE,
        ContractEnd DATE,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Contracts_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(Id)
    );
    PRINT 'Table Contracts created';
END
ELSE
BEGIN
    PRINT 'Table Contracts already exists';
END
GO

INSERT INTO Users (Name, Email, PasswordHash, Role)
VALUES ('admin', 'admin@stingrays.com', '$2a$12$e/6/XT8z856NKg7xB2QS9OBXXAzspRyOTh9SrKJhlBw0GicIREc22', 'admin');
GO
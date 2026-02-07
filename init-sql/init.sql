-- StingraysHRMS: Roles/UserRoles define app access (admin, hr, employee). Use for future RBAC on API routes.
-- Create database if it doesn't exist
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'StingraysHRMS')
BEGIN
    CREATE DATABASE StingraysHRMS;
    PRINT 'Database StingraysHRMS created';
END
ELSE
BEGIN
    PRINT 'Database StingraysHRMS already exists';
END
GO

-- Switch to the database
USE StingraysHRMS;
GO

-- Create Roles table first
IF OBJECT_ID('Roles', 'U') IS NULL
BEGIN
    CREATE TABLE Roles (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL UNIQUE
    );
    PRINT 'Table Roles created';
END
ELSE
BEGIN
    PRINT 'Table Roles already exists';
END
GO

-- Create Users table
IF OBJECT_ID('Users', 'U') IS NULL
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table Users created';
END
ELSE
BEGIN
    PRINT 'Table Users already exists';
END
GO

-- Create UserRoles junction table
IF OBJECT_ID('UserRoles', 'U') IS NULL
BEGIN
    CREATE TABLE UserRoles (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE
    );
    PRINT 'Table UserRoles created';
END
ELSE
BEGIN
    PRINT 'Table UserRoles already exists';
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

-- Insert default roles
IF NOT EXISTS(SELECT * FROM Roles WHERE Name = 'admin')
BEGIN
    INSERT INTO Roles (Name) VALUES ('admin');
END
GO

IF NOT EXISTS(SELECT * FROM Roles WHERE Name = 'employee')
BEGIN
    INSERT INTO Roles (Name) VALUES ('employee');
END
GO

IF NOT EXISTS(SELECT * FROM Roles WHERE Name = 'hr')
BEGIN
    INSERT INTO Roles (Name) VALUES ('hr');
END
GO

-- Insert admin user if not exists
IF NOT EXISTS(SELECT * FROM Users WHERE Email = 'admin@stingrays.com')
BEGIN
    DECLARE @AdminUserId INT;
    INSERT INTO Users (Email, PasswordHash, IsActive)
    VALUES ('admin@stingrays.com', '$2a$12$e/6/XT8z856NKg7xB2QS9OBXXAzspRyOTh9SrKJhlBw0GicIREc22', 1);
    SET @AdminUserId = SCOPE_IDENTITY();
    
    -- Assign admin role
    INSERT INTO UserRoles (UserId, RoleId)
    SELECT @AdminUserId, Id FROM Roles WHERE Name = 'admin';
END
GO
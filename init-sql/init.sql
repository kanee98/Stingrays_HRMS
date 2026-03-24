-- StingraysHRMS: Roles/UserRoles define app access (admin, hr, employee). Use for future RBAC on API routes.
-- Create database if it doesn't exist
IF DB_ID(N'$(DB_NAME)') IS NULL
BEGIN
    DECLARE @CreateDatabaseSql NVARCHAR(MAX) = N'CREATE DATABASE ' + QUOTENAME(N'$(DB_NAME)');
    EXEC (@CreateDatabaseSql);
    PRINT 'Database $(DB_NAME) created';
END
ELSE
BEGIN
    PRINT 'Database $(DB_NAME) already exists';
END
GO

-- Switch to the database
USE [$(DB_NAME)];
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
        FullName NVARCHAR(150) NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        MustChangePassword BIT NOT NULL DEFAULT 0,
        PasswordChangedAt DATETIME2 NULL,
        LastPasswordResetAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
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

IF OBJECT_ID('UserSessions', 'U') IS NULL
BEGIN
    CREATE TABLE UserSessions (
        SessionId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        LastSeenAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ExpiresAt DATETIME2 NOT NULL,
        RevokedAt DATETIME2 NULL,
        RevokedReason NVARCHAR(100) NULL,
        UserAgent NVARCHAR(512) NULL,
        IpAddress NVARCHAR(64) NULL,
        CONSTRAINT FK_UserSessions_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_UserSessions_UserId_RevokedAt_ExpiresAt
    ON UserSessions (UserId, RevokedAt, ExpiresAt);

    PRINT 'Table UserSessions created';
END
ELSE
BEGIN
    PRINT 'Table UserSessions already exists';
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

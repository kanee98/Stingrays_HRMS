import bcrypt from "bcrypt";
import sql from "mssql";
import { poolPromise } from "../config/db";

const DEFAULT_ADMIN_EMAIL = process.env.AUTH_SEED_EMAIL || "admin@stingrays.com";
const DEFAULT_ADMIN_PASSWORD = process.env.AUTH_SEED_PASSWORD || "Admin@123";
const DEFAULT_ADMIN_NAME = process.env.AUTH_SEED_NAME || "Platform Administrator";

export async function ensureAuthSchema(): Promise<void> {
  const pool = await poolPromise;

  await pool.request().batch(`
    IF OBJECT_ID('Roles', 'U') IS NULL
    BEGIN
      CREATE TABLE Roles (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL UNIQUE
      );
    END;

    IF OBJECT_ID('Users', 'U') IS NULL
    BEGIN
      CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        FullName NVARCHAR(150) NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        MustChangePassword BIT NOT NULL CONSTRAINT DF_Users_MustChangePassword DEFAULT 0,
        PasswordChangedAt DATETIME2 NULL,
        LastPasswordResetAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('UserRoles', 'U') IS NULL
    BEGIN
      CREATE TABLE UserRoles (
        UserId INT NOT NULL,
        RoleId INT NOT NULL,
        PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE
      );
    END;

    IF COL_LENGTH('Users', 'FullName') IS NULL
    BEGIN
      ALTER TABLE Users ADD FullName NVARCHAR(150) NULL;
    END;

    IF COL_LENGTH('Users', 'MustChangePassword') IS NULL
    BEGIN
      ALTER TABLE Users ADD MustChangePassword BIT NOT NULL CONSTRAINT DF_Users_MustChangePassword_Legacy DEFAULT 0 WITH VALUES;
    END;

    IF COL_LENGTH('Users', 'PasswordChangedAt') IS NULL
    BEGIN
      ALTER TABLE Users ADD PasswordChangedAt DATETIME2 NULL;
    END;

    IF COL_LENGTH('Users', 'LastPasswordResetAt') IS NULL
    BEGIN
      ALTER TABLE Users ADD LastPasswordResetAt DATETIME2 NULL;
    END;

    IF COL_LENGTH('Users', 'UpdatedAt') IS NULL
    BEGIN
      ALTER TABLE Users ADD UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt_Legacy DEFAULT SYSUTCDATETIME() WITH VALUES;
    END;

    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'admin')
    BEGIN
      INSERT INTO Roles (Name) VALUES ('admin');
    END;

    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'employee')
    BEGIN
      INSERT INTO Roles (Name) VALUES ('employee');
    END;

    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'hr')
    BEGIN
      INSERT INTO Roles (Name) VALUES ('hr');
    END;
  `);

  const existingAdmin = await pool
    .request()
    .input("email", sql.NVarChar(255), DEFAULT_ADMIN_EMAIL)
    .query(`SELECT TOP 1 Id FROM Users WHERE Email = @email`);

  if (existingAdmin.recordset.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  const insertResult = await pool
    .request()
    .input("email", sql.NVarChar(255), DEFAULT_ADMIN_EMAIL)
    .input("fullName", sql.NVarChar(150), DEFAULT_ADMIN_NAME)
    .input("passwordHash", sql.NVarChar(255), passwordHash)
    .query(`
      INSERT INTO Users (Email, FullName, PasswordHash, IsActive, MustChangePassword, PasswordChangedAt, UpdatedAt)
      OUTPUT INSERTED.Id
      VALUES (@email, @fullName, @passwordHash, 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME())
    `);

  const userId = Number(insertResult.recordset[0]?.Id);
  if (!Number.isInteger(userId)) {
    throw new Error("Failed to seed default admin user");
  }

  const adminRole = await pool.request().query(`SELECT TOP 1 Id FROM Roles WHERE Name = 'admin'`);
  const roleId = Number(adminRole.recordset[0]?.Id);
  if (!Number.isInteger(roleId)) {
    throw new Error("Failed to resolve admin role");
  }

  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("roleId", sql.Int, roleId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @userId AND RoleId = @roleId)
      BEGIN
        INSERT INTO UserRoles (UserId, RoleId)
        VALUES (@userId, @roleId);
      END
    `);
}

import bcrypt from "bcrypt";
import sql from "mssql";
import { poolPromise } from "../config/db";

interface ServiceSeed {
  key: string;
  name: string;
  description: string;
  defaultPort: number;
  sortOrder: number;
  defaultEnabled: boolean;
  sections: SectionSeed[];
}

interface SectionSeed {
  key: string;
  name: string;
  description: string;
  sortOrder: number;
  defaultEnabled: boolean;
}

const DEFAULT_CLIENT_KEY = process.env.SUPER_ADMIN_DEFAULT_CLIENT_KEY || "stingrays";
const DEFAULT_CLIENT_NAME = process.env.SUPER_ADMIN_DEFAULT_CLIENT_NAME || "Stingrays";
const LEGACY_SUPER_ADMIN_EMAIL = "superadmin@stingrays.com";
const LEGACY_SUPER_ADMIN_NAME = "Platform Super Admin";
const DEFAULT_SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_SEED_EMAIL || "superadmin@fusionlabz.lk";
const DEFAULT_SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_SEED_PASSWORD || "SuperAdmin@123";
const DEFAULT_SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_SEED_NAME || "FusionLabz Platform Super Admin";

interface SuperAdminUserRecord {
  Id: number;
  Email: string;
  FullName: string;
  PasswordHash: string;
  IsActive: boolean;
  LastLoginAt: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

const SERVICE_SEEDS: ServiceSeed[] = [
  {
    key: "hrms",
    name: "HRMS",
    description: "Core HRMS application",
    defaultPort: 3002,
    sortOrder: 1,
    defaultEnabled: false,
    sections: [
      { key: "dashboard", name: "Dashboard", description: "Primary HRMS dashboard", sortOrder: 1, defaultEnabled: false },
      { key: "users", name: "Users", description: "User administration", sortOrder: 2, defaultEnabled: false },
      { key: "payroll", name: "Payroll", description: "Embedded payroll shortcuts", sortOrder: 3, defaultEnabled: false },
      { key: "leave-management", name: "Leave Management", description: "Leave workflows", sortOrder: 4, defaultEnabled: false },
      { key: "attendance", name: "Attendance", description: "Attendance workflows", sortOrder: 5, defaultEnabled: false },
      { key: "recruitment", name: "Recruitment", description: "Recruitment workflows", sortOrder: 6, defaultEnabled: false },
      { key: "performance", name: "Performance", description: "Performance workflows", sortOrder: 7, defaultEnabled: false },
      { key: "reports", name: "Reports", description: "HRMS reports", sortOrder: 8, defaultEnabled: false },
      { key: "settings", name: "Settings", description: "HRMS settings", sortOrder: 9, defaultEnabled: false },
    ],
  },
  {
    key: "employee-onboarding",
    name: "Employee Onboarding",
    description: "Prospects and onboarding workflows",
    defaultPort: 3001,
    sortOrder: 2,
    defaultEnabled: false,
    sections: [
      { key: "dashboard", name: "Dashboard", description: "Onboarding dashboard", sortOrder: 1, defaultEnabled: false },
      { key: "prospects", name: "Prospects", description: "Prospect management", sortOrder: 2, defaultEnabled: false },
      { key: "employee-onboarding", name: "Employee Onboarding", description: "Onboarding workflow", sortOrder: 3, defaultEnabled: false },
      { key: "document-templates", name: "Document Templates", description: "Template management", sortOrder: 4, defaultEnabled: false },
      { key: "reports", name: "Reports", description: "Onboarding reporting", sortOrder: 5, defaultEnabled: false },
      { key: "onboarding-checklists", name: "Onboarding Checklists", description: "Checklist tracking", sortOrder: 6, defaultEnabled: false },
      { key: "document-types", name: "Document Types", description: "Supported document metadata", sortOrder: 7, defaultEnabled: false },
      { key: "prospect-types", name: "Prospect Types", description: "Prospect type configuration", sortOrder: 8, defaultEnabled: false },
      { key: "departments", name: "Departments", description: "Department management", sortOrder: 9, defaultEnabled: false },
      { key: "onboarding-steps", name: "Onboarding Steps", description: "Step configuration", sortOrder: 10, defaultEnabled: false },
    ],
  },
  {
    key: "payroll",
    name: "Payroll",
    description: "Payroll processing and reporting",
    defaultPort: 3010,
    sortOrder: 3,
    defaultEnabled: false,
    sections: [
      { key: "dashboard", name: "Dashboard", description: "Payroll dashboard", sortOrder: 1, defaultEnabled: false },
      { key: "payruns", name: "Pay Runs", description: "Pay run execution", sortOrder: 2, defaultEnabled: false },
      { key: "config", name: "Config", description: "Tax and deduction configuration", sortOrder: 3, defaultEnabled: false },
      { key: "reports", name: "Reports", description: "Payroll reporting", sortOrder: 4, defaultEnabled: false },
    ],
  },
];

async function ensureSchema() {
  const pool = await poolPromise;

  await pool.request().batch(`
    IF OBJECT_ID('Clients', 'U') IS NULL
    BEGIN
      CREATE TABLE Clients (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ClientKey NVARCHAR(100) NOT NULL UNIQUE,
        Name NVARCHAR(150) NOT NULL,
        Description NVARCHAR(500) NULL,
        ContactEmail NVARCHAR(255) NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'active',
        DefaultTimezone NVARCHAR(100) NOT NULL DEFAULT 'Asia/Colombo',
        MaintenanceMessage NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('ServiceCatalog', 'U') IS NULL
    BEGIN
      CREATE TABLE ServiceCatalog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServiceKey NVARCHAR(100) NOT NULL UNIQUE,
        Name NVARCHAR(150) NOT NULL,
        Description NVARCHAR(500) NULL,
        DefaultPort INT NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        DefaultEnabled BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('ServiceSections', 'U') IS NULL
    BEGIN
      CREATE TABLE ServiceSections (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ServiceId INT NOT NULL,
        SectionKey NVARCHAR(100) NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        Description NVARCHAR(500) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        DefaultEnabled BIT NOT NULL DEFAULT 0,
        ConfigSchemaJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ServiceSections_ServiceCatalog FOREIGN KEY (ServiceId) REFERENCES ServiceCatalog(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_ServiceSections_ServiceId_SectionKey UNIQUE (ServiceId, SectionKey)
      );
    END;

    IF OBJECT_ID('ClientServices', 'U') IS NULL
    BEGIN
      CREATE TABLE ClientServices (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ClientId INT NOT NULL,
        ServiceId INT NOT NULL,
        IsEnabled BIT NOT NULL DEFAULT 0,
        ConfigJson NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ClientServices_Clients FOREIGN KEY (ClientId) REFERENCES Clients(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ClientServices_ServiceCatalog FOREIGN KEY (ServiceId) REFERENCES ServiceCatalog(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_ClientServices_ClientId_ServiceId UNIQUE (ClientId, ServiceId)
      );
    END;

    IF OBJECT_ID('ClientAdminAccounts', 'U') IS NULL
    BEGIN
      CREATE TABLE ClientAdminAccounts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ClientId INT NOT NULL,
        UserId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ClientAdminAccounts_Clients FOREIGN KEY (ClientId) REFERENCES Clients(Id) ON DELETE CASCADE,
        CONSTRAINT UQ_ClientAdminAccounts_ClientId UNIQUE (ClientId),
        CONSTRAINT UQ_ClientAdminAccounts_UserId UNIQUE (UserId)
      );
    END;

    IF OBJECT_ID('ClientServiceSections', 'U') IS NULL
    BEGIN
      CREATE TABLE ClientServiceSections (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ClientServiceId INT NOT NULL,
        SectionId INT NOT NULL,
        IsEnabled BIT NOT NULL DEFAULT 0,
        ConfigJson NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ClientServiceSections_ClientServices FOREIGN KEY (ClientServiceId) REFERENCES ClientServices(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ClientServiceSections_ServiceSections FOREIGN KEY (SectionId) REFERENCES ServiceSections(Id),
        CONSTRAINT UQ_ClientServiceSections_ClientServiceId_SectionId UNIQUE (ClientServiceId, SectionId)
      );
    END;

    IF OBJECT_ID('SuperAdminUsers', 'U') IS NULL
    BEGIN
      CREATE TABLE SuperAdminUsers (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        FullName NVARCHAR(150) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        LastLoginAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID('SuperAdminAuditLogs', 'U') IS NULL
    BEGIN
      CREATE TABLE SuperAdminAuditLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        Action NVARCHAR(100) NOT NULL,
        EntityType NVARCHAR(100) NOT NULL,
        EntityKey NVARCHAR(150) NULL,
        Summary NVARCHAR(500) NOT NULL,
        PayloadJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_SuperAdminAuditLogs_SuperAdminUsers FOREIGN KEY (UserId) REFERENCES SuperAdminUsers(Id)
      );
    END;

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
        IsActive BIT NOT NULL DEFAULT 1,
        MustChangePassword BIT NOT NULL DEFAULT 0,
        PasswordChangedAt DATETIME2 NULL,
        LastPasswordResetAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
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

    IF OBJECT_ID('Users', 'U') IS NOT NULL
    BEGIN
      IF COL_LENGTH('Users', 'FullName') IS NULL
      BEGIN
        ALTER TABLE Users ADD FullName NVARCHAR(150) NULL;
      END;

      IF COL_LENGTH('Users', 'MustChangePassword') IS NULL
      BEGIN
        ALTER TABLE Users ADD MustChangePassword BIT NOT NULL CONSTRAINT DF_Users_MustChangePassword_SuperAdmin DEFAULT 0 WITH VALUES;
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
        ALTER TABLE Users ADD UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt_SuperAdmin DEFAULT SYSUTCDATETIME() WITH VALUES;
      END;
    END;

    IF OBJECT_ID('ClientAdminAccounts', 'U') IS NOT NULL
      AND OBJECT_ID('Users', 'U') IS NOT NULL
      AND OBJECT_ID('FK_ClientAdminAccounts_Users', 'F') IS NULL
    BEGIN
      ALTER TABLE ClientAdminAccounts WITH CHECK
      ADD CONSTRAINT FK_ClientAdminAccounts_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE;
    END;
  `);
}

async function upsertService(service: ServiceSeed): Promise<number> {
  const pool = await poolPromise;

  await pool
    .request()
    .input("serviceKey", sql.NVarChar, service.key)
    .input("name", sql.NVarChar, service.name)
    .input("description", sql.NVarChar, service.description)
    .input("defaultPort", sql.Int, service.defaultPort)
    .input("sortOrder", sql.Int, service.sortOrder)
    .input("defaultEnabled", sql.Bit, service.defaultEnabled)
    .query(`
      IF EXISTS (SELECT 1 FROM ServiceCatalog WHERE ServiceKey = @serviceKey)
      BEGIN
        UPDATE ServiceCatalog
        SET Name = @name,
            Description = @description,
            DefaultPort = @defaultPort,
            SortOrder = @sortOrder,
            DefaultEnabled = @defaultEnabled,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ServiceKey = @serviceKey;
      END
      ELSE
      BEGIN
        INSERT INTO ServiceCatalog (ServiceKey, Name, Description, DefaultPort, SortOrder, DefaultEnabled)
        VALUES (@serviceKey, @name, @description, @defaultPort, @sortOrder, @defaultEnabled);
      END
    `);

  const result = await pool
    .request()
    .input("serviceKey", sql.NVarChar, service.key)
    .query(`SELECT Id FROM ServiceCatalog WHERE ServiceKey = @serviceKey`);

  return Number(result.recordset[0]?.Id);
}

async function upsertSection(serviceId: number, section: SectionSeed) {
  const pool = await poolPromise;

  await pool
    .request()
    .input("serviceId", sql.Int, serviceId)
    .input("sectionKey", sql.NVarChar, section.key)
    .input("name", sql.NVarChar, section.name)
    .input("description", sql.NVarChar, section.description)
    .input("sortOrder", sql.Int, section.sortOrder)
    .input("defaultEnabled", sql.Bit, section.defaultEnabled)
    .query(`
      IF EXISTS (SELECT 1 FROM ServiceSections WHERE ServiceId = @serviceId AND SectionKey = @sectionKey)
      BEGIN
        UPDATE ServiceSections
        SET Name = @name,
            Description = @description,
            SortOrder = @sortOrder,
            DefaultEnabled = @defaultEnabled,
            UpdatedAt = SYSUTCDATETIME()
        WHERE ServiceId = @serviceId AND SectionKey = @sectionKey;
      END
      ELSE
      BEGIN
        INSERT INTO ServiceSections (ServiceId, SectionKey, Name, Description, SortOrder, DefaultEnabled)
        VALUES (@serviceId, @sectionKey, @name, @description, @sortOrder, @defaultEnabled);
      END
    `);
}

async function ensureClient(clientKey: string, name: string): Promise<number> {
  const pool = await poolPromise;

  await pool
    .request()
    .input("clientKey", sql.NVarChar, clientKey)
    .input("name", sql.NVarChar, name)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM Clients WHERE ClientKey = @clientKey)
      BEGIN
        INSERT INTO Clients (ClientKey, Name, Description, ContactEmail, Status)
        VALUES (@clientKey, @name, 'Default tenant workspace', 'ops@stingrays.com', 'active');
      END
      ELSE
      BEGIN
        UPDATE Clients
        SET Description = CASE
              WHEN Description IS NULL OR Description = 'Default platform client' THEN 'Default tenant workspace'
              ELSE Description
            END,
            UpdatedAt = CASE
              WHEN Description IS NULL OR Description = 'Default platform client' THEN SYSUTCDATETIME()
              ELSE UpdatedAt
            END
        WHERE ClientKey = @clientKey;
      END
    `);

  const result = await pool
    .request()
    .input("clientKey", sql.NVarChar, clientKey)
    .query(`SELECT Id FROM Clients WHERE ClientKey = @clientKey`);

  return Number(result.recordset[0]?.Id);
}

function shouldRefreshSuperAdminName(fullName: string | null | undefined) {
  const normalized = (fullName || "").trim();
  return normalized.length === 0 || normalized === LEGACY_SUPER_ADMIN_NAME;
}

function pickLatestDate(...values: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (!latest || value.getTime() > latest.getTime()) {
      latest = value;
    }
  }

  return latest;
}

function chooseRetainedSuperAdminUser(
  legacyUser: SuperAdminUserRecord,
  canonicalUser: SuperAdminUserRecord,
): SuperAdminUserRecord {
  const legacyLastLogin = legacyUser.LastLoginAt?.getTime() ?? -1;
  const canonicalLastLogin = canonicalUser.LastLoginAt?.getTime() ?? -1;

  if (legacyLastLogin !== canonicalLastLogin) {
    return legacyLastLogin > canonicalLastLogin ? legacyUser : canonicalUser;
  }

  const legacyCreatedAt = legacyUser.CreatedAt?.getTime?.() ?? 0;
  const canonicalCreatedAt = canonicalUser.CreatedAt?.getTime?.() ?? 0;

  if (legacyCreatedAt !== canonicalCreatedAt) {
    return legacyCreatedAt <= canonicalCreatedAt ? legacyUser : canonicalUser;
  }

  return legacyUser;
}

async function rewriteSuperAdminAuditEmail(pool: sql.ConnectionPool, fromEmail: string, toEmail: string) {
  if (!fromEmail || !toEmail || fromEmail === toEmail) {
    return;
  }

  await pool
    .request()
    .input("fromEmail", sql.NVarChar, fromEmail)
    .input("toEmail", sql.NVarChar, toEmail)
    .query(`
      UPDATE SuperAdminAuditLogs
      SET EntityKey = CASE WHEN EntityKey = @fromEmail THEN @toEmail ELSE EntityKey END,
          Summary = CASE
            WHEN Summary LIKE '%' + @fromEmail + '%' THEN REPLACE(Summary, @fromEmail, @toEmail)
            ELSE Summary
          END,
          PayloadJson = CASE
            WHEN PayloadJson LIKE '%' + @fromEmail + '%' THEN REPLACE(PayloadJson, @fromEmail, @toEmail)
            ELSE PayloadJson
          END
      WHERE EntityKey = @fromEmail
        OR Summary LIKE '%' + @fromEmail + '%'
        OR PayloadJson LIKE '%' + @fromEmail + '%';
    `);
}

async function ensureSeedSuperAdminUser() {
  const pool = await poolPromise;
  const userResult = await pool
    .request()
    .input("legacyEmail", sql.NVarChar, LEGACY_SUPER_ADMIN_EMAIL)
    .input("email", sql.NVarChar, DEFAULT_SUPER_ADMIN_EMAIL)
    .query(`
      SELECT Id, Email, FullName, PasswordHash, IsActive, LastLoginAt, CreatedAt, UpdatedAt
      FROM SuperAdminUsers
      WHERE Email IN (@legacyEmail, @email)
    `);

  const users = userResult.recordset as SuperAdminUserRecord[];
  const legacyUser = users.find((user) => user.Email.toLowerCase() === LEGACY_SUPER_ADMIN_EMAIL.toLowerCase());
  const canonicalUser = users.find((user) => user.Email.toLowerCase() === DEFAULT_SUPER_ADMIN_EMAIL.toLowerCase());

  if (legacyUser && canonicalUser) {
    const retainedUser = chooseRetainedSuperAdminUser(legacyUser, canonicalUser);
    const duplicateUser = retainedUser.Id === legacyUser.Id ? canonicalUser : legacyUser;
    const retainedName = shouldRefreshSuperAdminName(retainedUser.FullName) ? DEFAULT_SUPER_ADMIN_NAME : retainedUser.FullName;

    await pool
      .request()
      .input("retainedId", sql.Int, retainedUser.Id)
      .input("duplicateId", sql.Int, duplicateUser.Id)
      .query(`
        UPDATE SuperAdminAuditLogs
        SET UserId = @retainedId
        WHERE UserId = @duplicateId;
      `);

    await rewriteSuperAdminAuditEmail(pool, LEGACY_SUPER_ADMIN_EMAIL, DEFAULT_SUPER_ADMIN_EMAIL);

    await pool
      .request()
      .input("id", sql.Int, retainedUser.Id)
      .input("email", sql.NVarChar, DEFAULT_SUPER_ADMIN_EMAIL)
      .input("fullName", sql.NVarChar, retainedName)
      .input("isActive", sql.Bit, retainedUser.IsActive || duplicateUser.IsActive)
      .input("lastLoginAt", sql.DateTime2, pickLatestDate(retainedUser.LastLoginAt, duplicateUser.LastLoginAt))
      .query(`
        UPDATE SuperAdminUsers
        SET Email = @email,
            FullName = @fullName,
            IsActive = @isActive,
            LastLoginAt = @lastLoginAt,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @id
      `);

    await pool
      .request()
      .input("id", sql.Int, duplicateUser.Id)
      .query(`DELETE FROM SuperAdminUsers WHERE Id = @id`);

    return;
  }

  if (legacyUser) {
    await rewriteSuperAdminAuditEmail(pool, LEGACY_SUPER_ADMIN_EMAIL, DEFAULT_SUPER_ADMIN_EMAIL);

    await pool
      .request()
      .input("id", sql.Int, legacyUser.Id)
      .input("email", sql.NVarChar, DEFAULT_SUPER_ADMIN_EMAIL)
      .input("fullName", sql.NVarChar, shouldRefreshSuperAdminName(legacyUser.FullName) ? DEFAULT_SUPER_ADMIN_NAME : legacyUser.FullName)
      .query(`
        UPDATE SuperAdminUsers
        SET Email = @email,
            FullName = @fullName,
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @id
      `);

    return;
  }

  if (canonicalUser) {
    if (shouldRefreshSuperAdminName(canonicalUser.FullName)) {
      await pool
        .request()
        .input("id", sql.Int, canonicalUser.Id)
        .input("fullName", sql.NVarChar, DEFAULT_SUPER_ADMIN_NAME)
        .query(`
          UPDATE SuperAdminUsers
          SET FullName = @fullName,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @id
        `);
    }

    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_SUPER_ADMIN_PASSWORD, 12);
  await pool
    .request()
    .input("email", sql.NVarChar, DEFAULT_SUPER_ADMIN_EMAIL)
    .input("fullName", sql.NVarChar, DEFAULT_SUPER_ADMIN_NAME)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .query(`
      INSERT INTO SuperAdminUsers (Email, FullName, PasswordHash)
      VALUES (@email, @fullName, @passwordHash)
    `);
}

export async function syncClientAccessRows(clientId: number) {
  const pool = await poolPromise;

  await pool
    .request()
    .input("clientId", sql.Int, clientId)
    .query(`
      INSERT INTO ClientServices (ClientId, ServiceId, IsEnabled, ConfigJson, UpdatedAt)
      SELECT @clientId, sc.Id, sc.DefaultEnabled, NULL, SYSUTCDATETIME()
      FROM ServiceCatalog sc
      WHERE NOT EXISTS (
        SELECT 1
        FROM ClientServices cs
        WHERE cs.ClientId = @clientId AND cs.ServiceId = sc.Id
      );
    `);

  await pool
    .request()
    .input("clientId", sql.Int, clientId)
    .query(`
      INSERT INTO ClientServiceSections (ClientServiceId, SectionId, IsEnabled, ConfigJson, UpdatedAt)
      SELECT cs.Id, ss.Id, ss.DefaultEnabled, NULL, SYSUTCDATETIME()
      FROM ClientServices cs
      JOIN ServiceSections ss ON ss.ServiceId = cs.ServiceId
      WHERE cs.ClientId = @clientId
        AND NOT EXISTS (
          SELECT 1
          FROM ClientServiceSections css
          WHERE css.ClientServiceId = cs.Id AND css.SectionId = ss.Id
        );
    `);
}

async function enableDefaultClientAccess(clientId: number) {
  const pool = await poolPromise;

  await pool
    .request()
    .input("clientId", sql.Int, clientId)
    .query(`
      UPDATE cs
      SET cs.IsEnabled = 1,
          cs.UpdatedAt = SYSUTCDATETIME()
      FROM ClientServices cs
      WHERE cs.ClientId = @clientId;

      UPDATE css
      SET css.IsEnabled = 1,
          css.UpdatedAt = SYSUTCDATETIME()
      FROM ClientServiceSections css
      JOIN ClientServices cs ON cs.Id = css.ClientServiceId
      WHERE cs.ClientId = @clientId;
    `);
}

export async function recordAuditLog(input: {
  userId?: number | null;
  action: string;
  entityType: string;
  entityKey?: string | null;
  summary: string;
  payload?: unknown;
}) {
  const pool = await poolPromise;

  await pool
    .request()
    .input("userId", sql.Int, input.userId ?? null)
    .input("action", sql.NVarChar, input.action)
    .input("entityType", sql.NVarChar, input.entityType)
    .input("entityKey", sql.NVarChar, input.entityKey ?? null)
    .input("summary", sql.NVarChar, input.summary)
    .input("payloadJson", sql.NVarChar(sql.MAX), input.payload == null ? null : JSON.stringify(input.payload))
    .query(`
      INSERT INTO SuperAdminAuditLogs (UserId, Action, EntityType, EntityKey, Summary, PayloadJson)
      VALUES (@userId, @action, @entityType, @entityKey, @summary, @payloadJson)
    `);
}

function buildAccessSnapshot(rows: any[]) {
  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];
  const services = new Map<number, any>();

  for (const row of rows) {
    if (!services.has(row.ServiceId)) {
      services.set(row.ServiceId, {
        id: row.ServiceId,
        key: row.ServiceKey,
        name: row.ServiceName,
        description: row.ServiceDescription,
        isEnabled: Boolean(row.ServiceEnabled),
        configJson: row.ServiceConfigJson,
        sections: [],
      });
    }

    if (row.SectionId != null) {
      services.get(row.ServiceId).sections.push({
        id: row.SectionId,
        key: row.SectionKey,
        name: row.SectionName,
        description: row.SectionDescription,
        isEnabled: Boolean(row.SectionEnabled),
        configJson: row.SectionConfigJson,
      });
    }
  }

  return {
    client: {
      id: firstRow.ClientId,
      key: firstRow.ClientKey,
      name: firstRow.ClientName,
      status: firstRow.ClientStatus,
    },
    services: Array.from(services.values()),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getClientAccessSnapshotByKey(clientKey: string) {
  const pool = await poolPromise;
  const clientResult = await pool
    .request()
    .input("clientKey", sql.NVarChar, clientKey)
    .query(`SELECT TOP 1 Id FROM Clients WHERE ClientKey = @clientKey`);

  const clientId = Number(clientResult.recordset[0]?.Id);
  if (!Number.isInteger(clientId)) {
    return null;
  }

  await syncClientAccessRows(clientId);
  return getClientAccessSnapshotById(clientId);
}

export async function getClientAccessSnapshotById(clientId: number) {
  const pool = await poolPromise;
  await syncClientAccessRows(clientId);

  const result = await pool
    .request()
    .input("clientId", sql.Int, clientId)
    .query(`
      SELECT
        c.Id AS ClientId,
        c.ClientKey,
        c.Name AS ClientName,
        c.Status AS ClientStatus,
        sc.Id AS ServiceId,
        sc.ServiceKey,
        sc.Name AS ServiceName,
        sc.Description AS ServiceDescription,
        sc.SortOrder AS ServiceSortOrder,
        cs.IsEnabled AS ServiceEnabled,
        cs.ConfigJson AS ServiceConfigJson,
        ss.Id AS SectionId,
        ss.SectionKey,
        ss.Name AS SectionName,
        ss.Description AS SectionDescription,
        ss.SortOrder AS SectionSortOrder,
        css.IsEnabled AS SectionEnabled,
        css.ConfigJson AS SectionConfigJson
      FROM Clients c
      JOIN ClientServices cs ON cs.ClientId = c.Id
      JOIN ServiceCatalog sc ON sc.Id = cs.ServiceId
      LEFT JOIN ClientServiceSections css ON css.ClientServiceId = cs.Id
      LEFT JOIN ServiceSections ss ON ss.Id = css.SectionId
      WHERE c.Id = @clientId
      ORDER BY sc.SortOrder, ss.SortOrder
    `);

  return buildAccessSnapshot(result.recordset);
}

export async function ensureSuperAdminPlatform() {
  await ensureSchema();

  for (const service of SERVICE_SEEDS) {
    const serviceId = await upsertService(service);
    for (const section of service.sections) {
      await upsertSection(serviceId, section);
    }
  }

  const defaultClientId = await ensureClient(DEFAULT_CLIENT_KEY, DEFAULT_CLIENT_NAME);
  await syncClientAccessRows(defaultClientId);
  await enableDefaultClientAccess(defaultClientId);
  await ensureSeedSuperAdminUser();
}

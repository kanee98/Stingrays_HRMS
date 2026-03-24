USE [$(DB_NAME)];
GO

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
END
GO

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
END
GO

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
END
GO

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
END
GO

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
END
GO

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
END
GO

IF OBJECT_ID('SuperAdminSessions', 'U') IS NULL
BEGIN
    CREATE TABLE SuperAdminSessions (
        SessionId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        AdminId INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        LastSeenAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ExpiresAt DATETIME2 NOT NULL,
        RevokedAt DATETIME2 NULL,
        RevokedReason NVARCHAR(100) NULL,
        UserAgent NVARCHAR(512) NULL,
        IpAddress NVARCHAR(64) NULL,
        CONSTRAINT FK_SuperAdminSessions_SuperAdminUsers FOREIGN KEY (AdminId) REFERENCES SuperAdminUsers(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_SuperAdminSessions_AdminId_RevokedAt_ExpiresAt
    ON SuperAdminSessions (AdminId, RevokedAt, ExpiresAt);
END
GO

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
END
GO

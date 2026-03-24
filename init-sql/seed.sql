USE [$(DB_NAME)];
GO

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = '$(AUTH_SEED_EMAIL)')
BEGIN
    INSERT INTO Users (
        Email,
        FullName,
        PasswordHash,
        IsActive,
        MustChangePassword,
        PasswordChangedAt,
        UpdatedAt
    )
    VALUES (
        '$(AUTH_SEED_EMAIL)',
        '$(AUTH_SEED_NAME)',
        '$(AUTH_SEED_PASSWORD_HASH)',
        1,
        0,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
END
ELSE
BEGIN
    UPDATE Users
    SET FullName = '$(AUTH_SEED_NAME)',
        PasswordHash = '$(AUTH_SEED_PASSWORD_HASH)',
        IsActive = 1,
        MustChangePassword = 0,
        PasswordChangedAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME()
    WHERE Email = '$(AUTH_SEED_EMAIL)';
END
GO

INSERT INTO UserRoles (UserId, RoleId)
SELECT U.Id, R.Id
FROM Users U
JOIN Roles R ON R.Name = 'admin'
WHERE U.Email = '$(AUTH_SEED_EMAIL)'
  AND NOT EXISTS (
      SELECT 1
      FROM UserRoles UR
      WHERE UR.UserId = U.Id
        AND UR.RoleId = R.Id
  );
GO

IF NOT EXISTS (SELECT 1 FROM SuperAdminUsers WHERE Email = '$(SUPER_ADMIN_SEED_EMAIL)')
BEGIN
    INSERT INTO SuperAdminUsers (
        Email,
        FullName,
        PasswordHash,
        IsActive
    )
    VALUES (
        '$(SUPER_ADMIN_SEED_EMAIL)',
        '$(SUPER_ADMIN_SEED_NAME)',
        '$(SUPER_ADMIN_SEED_PASSWORD_HASH)',
        1
    );
END
ELSE
BEGIN
    UPDATE SuperAdminUsers
    SET FullName = '$(SUPER_ADMIN_SEED_NAME)',
        PasswordHash = '$(SUPER_ADMIN_SEED_PASSWORD_HASH)',
        IsActive = 1,
        UpdatedAt = SYSUTCDATETIME()
    WHERE Email = '$(SUPER_ADMIN_SEED_EMAIL)';
END
GO

IF OBJECT_ID('OnboardingSettings', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM OnboardingSettings)
BEGIN
    INSERT INTO OnboardingSettings (ShowGramasevakaStep, ShowPoliceReportStep)
    VALUES (1, 1);
    PRINT 'Seeded OnboardingSettings';
END
GO

IF OBJECT_ID('OnboardingDocumentTypes', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM OnboardingDocumentTypes)
BEGIN
    SET IDENTITY_INSERT OnboardingDocumentTypes ON;

    INSERT INTO OnboardingDocumentTypes (Id, Name, IsRequired, SortOrder, IsActive, Description) VALUES
    (1, 'NIC Copy', 1, 1, 1, NULL),
    (2, 'Birth Certificate', 1, 2, 1, NULL),
    (3, 'Educational Certificates', 1, 3, 1, NULL),
    (4, 'Police Report', 1, 4, 1, NULL),
    (5, 'Gramasevaka Certificate', 1, 5, 1, NULL),
    (6, 'Medical Report', 0, 6, 1, NULL),
    (7, 'Reference Letters', 0, 7, 1, NULL);

    SET IDENTITY_INSERT OnboardingDocumentTypes OFF;
    PRINT 'Seeded OnboardingDocumentTypes';
END
GO

IF OBJECT_ID('Departments', 'U') IS NULL
BEGIN
    CREATE TABLE Departments (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
    );
    PRINT 'Table Departments created';
END
GO

IF OBJECT_ID('Departments', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM Departments)
BEGIN
    INSERT INTO Departments (Name, SortOrder, IsActive) VALUES
    ('Engineering', 1, 1),
    ('Human Resources', 2, 1),
    ('Finance', 3, 1),
    ('Marketing', 4, 1),
    ('Sales', 5, 1),
    ('Operations', 6, 1);
    PRINT 'Seeded Departments';
END
GO

IF OBJECT_ID('ProspectImportTemplates', 'U') IS NULL
BEGIN
    CREATE TABLE ProspectImportTemplates (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        TemplateKey NVARCHAR(100) NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        Description NVARCHAR(500) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        ScreeningColumnNumbersJson NVARCHAR(MAX) NOT NULL,
        DefaultQuestionLabelsJson NVARCHAR(MAX) NULL,
        CityAreaColumnNumber INT NULL,
        FullNameColumnNumber INT NOT NULL,
        PhoneColumnNumber INT NOT NULL,
        EmailColumnNumber INT NULL,
        GenderColumnNumber INT NULL,
        DateOfBirthColumnNumber INT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
    );
    PRINT 'Table ProspectImportTemplates created';
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_ProspectImportTemplates_TemplateKey'
      AND object_id = OBJECT_ID('ProspectImportTemplates')
)
BEGIN
    CREATE UNIQUE INDEX UX_ProspectImportTemplates_TemplateKey ON ProspectImportTemplates(TemplateKey);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_ProspectImportTemplates_Name'
      AND object_id = OBJECT_ID('ProspectImportTemplates')
)
AND NOT EXISTS (
    SELECT Name
    FROM ProspectImportTemplates
    GROUP BY Name
    HAVING COUNT(*) > 1
)
BEGIN
    CREATE UNIQUE INDEX UX_ProspectImportTemplates_Name ON ProspectImportTemplates(Name);
END
GO

IF NOT EXISTS (SELECT 1 FROM ProspectImportTemplates WHERE TemplateKey = 'swimming-instructor')
BEGIN
    INSERT INTO ProspectImportTemplates (
        TemplateKey,
        Name,
        Description,
        SortOrder,
        IsActive,
        ScreeningColumnNumbersJson,
        DefaultQuestionLabelsJson,
        CityAreaColumnNumber,
        FullNameColumnNumber,
        PhoneColumnNumber,
        EmailColumnNumber,
        GenderColumnNumber,
        DateOfBirthColumnNumber
    )
    VALUES (
        'swimming-instructor',
        'Swimming Instructor template',
        '4 screening answers, city or area, full name, phone, gender, and date of birth.',
        1,
        1,
        '[1,2,3,4]',
        '["Can you swim?","Do you have prior teaching or coaching experience?","Are you available for the required schedule?","Why do you want to work as a swimming instructor?"]',
        5,
        6,
        7,
        NULL,
        8,
        9
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM ProspectImportTemplates WHERE TemplateKey = 'customer-service-assistant')
BEGIN
    INSERT INTO ProspectImportTemplates (
        TemplateKey,
        Name,
        Description,
        SortOrder,
        IsActive,
        ScreeningColumnNumbersJson,
        DefaultQuestionLabelsJson,
        CityAreaColumnNumber,
        FullNameColumnNumber,
        PhoneColumnNumber,
        EmailColumnNumber,
        GenderColumnNumber,
        DateOfBirthColumnNumber
    )
    VALUES (
        'customer-service-assistant',
        'Customer Service Assistant template',
        '7 screening answers, full name, phone, email, date of birth, and gender.',
        2,
        1,
        '[1,2,3,4,5,6,8]',
        NULL,
        NULL,
        7,
        9,
        10,
        12,
        11
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM ProspectImportTemplates WHERE TemplateKey = 'assistant-coordinator')
BEGIN
    INSERT INTO ProspectImportTemplates (
        TemplateKey,
        Name,
        Description,
        SortOrder,
        IsActive,
        ScreeningColumnNumbersJson,
        DefaultQuestionLabelsJson,
        CityAreaColumnNumber,
        FullNameColumnNumber,
        PhoneColumnNumber,
        EmailColumnNumber,
        GenderColumnNumber,
        DateOfBirthColumnNumber
    )
    VALUES (
        'assistant-coordinator',
        'Assistant Coordinator template',
        '8 screening answers, full name, phone, email, city or area, date of birth, and gender.',
        3,
        1,
        '[1,2,3,4,5,6,7,8]',
        NULL,
        12,
        9,
        10,
        11,
        14,
        13
    );
END
GO

IF OBJECT_ID('ProspectTypes', 'U') IS NULL
BEGIN
    CREATE TABLE ProspectTypes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        ImportLayoutKey NVARCHAR(100) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL
    );
    PRINT 'Table ProspectTypes created';
END
GO

IF COL_LENGTH('ProspectTypes', 'ImportLayoutKey') IS NULL
BEGIN
    ALTER TABLE ProspectTypes ADD ImportLayoutKey NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_ProspectTypes_Name'
      AND object_id = OBJECT_ID('ProspectTypes')
)
AND NOT EXISTS (
    SELECT Name
    FROM ProspectTypes
    GROUP BY Name
    HAVING COUNT(*) > 1
)
BEGIN
    CREATE UNIQUE INDEX UX_ProspectTypes_Name ON ProspectTypes(Name);
END
GO

IF NOT EXISTS (SELECT 1 FROM ProspectTypes WHERE Name = 'Swimming Instructor')
BEGIN
    INSERT INTO ProspectTypes (Name, SortOrder, IsActive, ImportLayoutKey)
    VALUES ('Swimming Instructor', 1, 1, 'swimming-instructor');
END
ELSE
BEGIN
    UPDATE ProspectTypes
    SET ImportLayoutKey = CASE
            WHEN ImportLayoutKey IS NULL OR LTRIM(RTRIM(ImportLayoutKey)) = '' THEN 'swimming-instructor'
            ELSE ImportLayoutKey
        END
    WHERE Name = 'Swimming Instructor';
END
GO

IF NOT EXISTS (SELECT 1 FROM ProspectTypes WHERE Name = 'Customer Service Assistant')
BEGIN
    INSERT INTO ProspectTypes (Name, SortOrder, IsActive, ImportLayoutKey)
    VALUES ('Customer Service Assistant', 2, 1, 'customer-service-assistant');
END
ELSE
BEGIN
    UPDATE ProspectTypes
    SET ImportLayoutKey = CASE
            WHEN ImportLayoutKey IS NULL OR LTRIM(RTRIM(ImportLayoutKey)) = '' THEN 'customer-service-assistant'
            ELSE ImportLayoutKey
        END
    WHERE Name = 'Customer Service Assistant';
END
GO

IF NOT EXISTS (SELECT 1 FROM ProspectTypes WHERE Name = 'Assistant Coordinator')
BEGIN
    INSERT INTO ProspectTypes (Name, SortOrder, IsActive, ImportLayoutKey)
    VALUES ('Assistant Coordinator', 3, 1, 'assistant-coordinator');
END
ELSE
BEGIN
    UPDATE ProspectTypes
    SET ImportLayoutKey = CASE
            WHEN ImportLayoutKey IS NULL OR LTRIM(RTRIM(ImportLayoutKey)) = '' THEN 'assistant-coordinator'
            ELSE ImportLayoutKey
        END
    WHERE Name = 'Assistant Coordinator';
END
GO

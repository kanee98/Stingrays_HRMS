-- OnboardingDocumentTypes: configurable document list for onboarding (no CompanyId for now)
USE StingraysHRMS;
GO

IF OBJECT_ID('OnboardingDocumentTypes', 'U') IS NULL
BEGIN
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
    PRINT 'Table OnboardingDocumentTypes created';
END
ELSE
BEGIN
    PRINT 'Table OnboardingDocumentTypes already exists';
END
GO

-- Seed default document types (match current hardcoded list)
IF NOT EXISTS (SELECT 1 FROM OnboardingDocumentTypes)
BEGIN
    SET IDENTITY_INSERT OnboardingDocumentTypes ON;
    INSERT INTO OnboardingDocumentTypes (Id, Name, IsRequired, SortOrder, IsActive) VALUES
    (1, 'NIC Copy', 1, 1, 1),
    (2, 'Birth Certificate', 1, 2, 1),
    (3, 'Educational Certificates', 1, 3, 1),
    (4, 'Police Report', 1, 4, 1),
    (5, 'Gramasevaka Certificate', 1, 5, 1),
    (6, 'Medical Report', 0, 6, 1),
    (7, 'Reference Letters', 0, 7, 1);
    SET IDENTITY_INSERT OnboardingDocumentTypes OFF;
    PRINT 'Seeded default OnboardingDocumentTypes';
END
GO

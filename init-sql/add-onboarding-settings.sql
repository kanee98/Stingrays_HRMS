-- OnboardingSettings: optional steps (Gramasevaka, Police Report) - single row config
USE StingraysHRMS;
GO

IF OBJECT_ID('OnboardingSettings', 'U') IS NULL
BEGIN
    CREATE TABLE OnboardingSettings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ShowGramasevakaStep BIT NOT NULL DEFAULT 1,
        ShowPoliceReportStep BIT NOT NULL DEFAULT 1,
        UpdatedAt DATETIME NULL
    );
    INSERT INTO OnboardingSettings (ShowGramasevakaStep, ShowPoliceReportStep) VALUES (1, 1);
    PRINT 'Table OnboardingSettings created and seeded';
END
ELSE
BEGIN
    PRINT 'Table OnboardingSettings already exists';
END
GO

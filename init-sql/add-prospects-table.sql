USE StingraysHRMS;
GO

-- Create Prospects table if missing (e.g. DB was initialized before this table was added)
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

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const upload = require('../config/upload');
const path = require('path');

// Get all employees
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM OnboardingChecklist WHERE EmployeeId = e.Id AND IsCompleted = 1) as CompletedItems,
        (SELECT COUNT(*) FROM OnboardingChecklist WHERE EmployeeId = e.Id) as TotalItems
      FROM Employees e
      ORDER BY e.CreatedAt DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT e.*,
               gd.*,
               prd.*
        FROM Employees e
        LEFT JOIN GramasevakaDetails gd ON e.Id = gd.EmployeeId
        LEFT JOIN PoliceReportDetails prd ON e.Id = prd.EmployeeId
        WHERE e.Id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = result.recordset[0];

    // Get documents
    const docsResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM OnboardingDocuments WHERE EmployeeId = @id ORDER BY UploadedAt DESC');

    // Get checklist
    const checklistResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM OnboardingChecklist WHERE EmployeeId = @id ORDER BY Id');

    res.json({
      ...employee,
      documents: docsResult.recordset,
      checklist: checklistResult.recordset,
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Create new employee
router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const {
      firstName,
      lastName,
      email,
      dob,
      nic,
      phone,
      address,
      city,
      postalCode,
      position,
      department,
      emergencyContactName,
      emergencyContactPhone,
    } = req.body;

    const result = await pool
      .request()
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('dob', sql.Date, dob)
      .input('nic', sql.NVarChar, nic)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('city', sql.NVarChar, city)
      .input('postalCode', sql.NVarChar, postalCode)
      .input('position', sql.NVarChar, position)
      .input('department', sql.NVarChar, department)
      .input('emergencyContactName', sql.NVarChar, emergencyContactName)
      .input('emergencyContactPhone', sql.NVarChar, emergencyContactPhone)
      .query(`
        INSERT INTO Employees (
          FirstName, LastName, Email, DOB, NIC, Phone, Address, City, PostalCode,
          Position, Department, EmergencyContactName, EmergencyContactPhone, OnboardingStatus
        )
        OUTPUT INSERTED.Id
        VALUES (
          @firstName, @lastName, @email, @dob, @nic, @phone, @address, @city, @postalCode,
          @position, @department, @emergencyContactName, @emergencyContactPhone, 'pending'
        )
      `);

    const employeeId = result.recordset[0].Id;

    // Create default checklist items
    const checklistItems = [
      { name: 'Personal Information', type: 'information', required: true },
      { name: 'NIC Copy', type: 'document', required: true },
      { name: 'Birth Certificate', type: 'document', required: true },
      { name: 'Educational Certificates', type: 'document', required: true },
      { name: 'Police Report', type: 'document', required: true },
      { name: 'Gramasevaka Certificate', type: 'document', required: true },
      { name: 'Medical Report', type: 'document', required: false },
      { name: 'Reference Letters', type: 'document', required: false },
    ];

    for (const item of checklistItems) {
      await pool
        .request()
        .input('employeeId', sql.Int, employeeId)
        .input('itemName', sql.NVarChar, item.name)
        .input('itemType', sql.NVarChar, item.type)
        .input('isRequired', sql.Bit, item.required)
        .query(`
          INSERT INTO OnboardingChecklist (EmployeeId, ItemName, ItemType, IsRequired)
          VALUES (@employeeId, @itemName, @itemType, @isRequired)
        `);
    }

    res.status(201).json({ id: employeeId, message: 'Employee created successfully' });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const {
      firstName,
      lastName,
      email,
      dob,
      nic,
      phone,
      address,
      city,
      postalCode,
      position,
      department,
      emergencyContactName,
      emergencyContactPhone,
    } = req.body;

    await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('email', sql.NVarChar, email)
      .input('dob', sql.Date, dob)
      .input('nic', sql.NVarChar, nic)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('city', sql.NVarChar, city)
      .input('postalCode', sql.NVarChar, postalCode)
      .input('position', sql.NVarChar, position)
      .input('department', sql.NVarChar, department)
      .input('emergencyContactName', sql.NVarChar, emergencyContactName)
      .input('emergencyContactPhone', sql.NVarChar, emergencyContactPhone)
      .query(`
        UPDATE Employees SET
          FirstName = @firstName,
          LastName = @lastName,
          Email = @email,
          DOB = @dob,
          NIC = @nic,
          Phone = @phone,
          Address = @address,
          City = @city,
          PostalCode = @postalCode,
          Position = @position,
          Department = @department,
          EmergencyContactName = @emergencyContactName,
          EmergencyContactPhone = @emergencyContactPhone
        WHERE Id = @id
      `);

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Upload document
router.post('/:id/documents', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pool = await getPool();
    const { documentType } = req.body;

    const filePath = `/uploads/${req.file.fieldname}/${req.file.filename}`;

    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('documentType', sql.NVarChar, documentType)
      .input('fileName', sql.NVarChar, req.file.originalname)
      .input('filePath', sql.NVarChar, filePath)
      .input('fileSize', sql.Int, req.file.size)
      .input('mimeType', sql.NVarChar, req.file.mimetype)
      .query(`
        INSERT INTO OnboardingDocuments 
        (EmployeeId, DocumentType, FileName, FilePath, FileSize, MimeType)
        VALUES (@employeeId, @documentType, @fileName, @filePath, @fileSize, @mimeType)
      `);

    // Update checklist if document type matches
    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('itemName', sql.NVarChar, documentType)
      .query(`
        UPDATE OnboardingChecklist 
        SET IsCompleted = 1, CompletedAt = GETDATE()
        WHERE EmployeeId = @employeeId AND ItemName = @itemName
      `);

    res.status(201).json({ message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Save gramasevaka details
router.post('/:id/gramasevaka', upload.single('certificate'), async (req, res) => {
  try {
    const pool = await getPool();
    const { gramasevakaName, gramasevakaOffice, gramasevakaPhone, certificateNumber, certificateDate } = req.body;

    const filePath = req.file ? `/uploads/gramasevaka/${req.file.filename}` : null;

    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('gramasevakaName', sql.NVarChar, gramasevakaName)
      .input('gramasevakaOffice', sql.NVarChar, gramasevakaOffice)
      .input('gramasevakaPhone', sql.NVarChar, gramasevakaPhone)
      .input('certificateNumber', sql.NVarChar, certificateNumber)
      .input('certificateDate', sql.Date, certificateDate)
      .input('documentPath', sql.NVarChar, filePath)
      .query(`
        IF EXISTS (SELECT 1 FROM GramasevakaDetails WHERE EmployeeId = @employeeId)
        BEGIN
          UPDATE GramasevakaDetails SET
            GramasevakaName = @gramasevakaName,
            GramasevakaOffice = @gramasevakaOffice,
            GramasevakaPhone = @gramasevakaPhone,
            CertificateNumber = @certificateNumber,
            CertificateDate = @certificateDate,
            DocumentPath = ISNULL(@documentPath, DocumentPath)
          WHERE EmployeeId = @employeeId
        END
        ELSE
        BEGIN
          INSERT INTO GramasevakaDetails 
          (EmployeeId, GramasevakaName, GramasevakaOffice, GramasevakaPhone, CertificateNumber, CertificateDate, DocumentPath)
          VALUES (@employeeId, @gramasevakaName, @gramasevakaOffice, @gramasevakaPhone, @certificateNumber, @certificateDate, @documentPath)
        END
      `);

    // Update checklist
    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('itemName', sql.NVarChar, 'Gramasevaka Certificate')
      .query(`
        UPDATE OnboardingChecklist 
        SET IsCompleted = 1, CompletedAt = GETDATE()
        WHERE EmployeeId = @employeeId AND ItemName = @itemName
      `);

    res.json({ message: 'Gramasevaka details saved successfully' });
  } catch (error) {
    console.error('Error saving gramasevaka details:', error);
    res.status(500).json({ error: 'Failed to save gramasevaka details' });
  }
});

// Save police report details
router.post('/:id/police-report', upload.single('report'), async (req, res) => {
  try {
    const pool = await getPool();
    const { reportNumber, policeStation, reportDate } = req.body;

    const filePath = req.file ? `/uploads/police-report/${req.file.filename}` : null;

    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('reportNumber', sql.NVarChar, reportNumber)
      .input('policeStation', sql.NVarChar, policeStation)
      .input('reportDate', sql.Date, reportDate)
      .input('documentPath', sql.NVarChar, filePath)
      .query(`
        IF EXISTS (SELECT 1 FROM PoliceReportDetails WHERE EmployeeId = @employeeId)
        BEGIN
          UPDATE PoliceReportDetails SET
            ReportNumber = @reportNumber,
            PoliceStation = @policeStation,
            ReportDate = @reportDate,
            DocumentPath = ISNULL(@documentPath, DocumentPath)
          WHERE EmployeeId = @employeeId
        END
        ELSE
        BEGIN
          INSERT INTO PoliceReportDetails 
          (EmployeeId, ReportNumber, PoliceStation, ReportDate, DocumentPath)
          VALUES (@employeeId, @reportNumber, @policeStation, @reportDate, @documentPath)
        END
      `);

    // Update checklist
    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('itemName', sql.NVarChar, 'Police Report')
      .query(`
        UPDATE OnboardingChecklist 
        SET IsCompleted = 1, CompletedAt = GETDATE()
        WHERE EmployeeId = @employeeId AND ItemName = @itemName
      `);

    res.json({ message: 'Police report details saved successfully' });
  } catch (error) {
    console.error('Error saving police report:', error);
    res.status(500).json({ error: 'Failed to save police report' });
  }
});

// Generate contract
router.post('/:id/generate-contract', async (req, res) => {
  try {
    const pool = await getPool();
    const { contractStart, contractEnd, contractType, salary } = req.body;

    // Check if all required items are completed
    const checklistResult = await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .query(`
        SELECT COUNT(*) as TotalRequired,
               SUM(CASE WHEN IsCompleted = 1 AND IsRequired = 1 THEN 1 ELSE 0 END) as CompletedRequired
        FROM OnboardingChecklist
        WHERE EmployeeId = @employeeId AND IsRequired = 1
      `);

    const { TotalRequired, CompletedRequired } = checklistResult.recordset[0];

    if (CompletedRequired < TotalRequired) {
      return res.status(400).json({
        error: 'Cannot generate contract. Please complete all required onboarding items.',
        completed: CompletedRequired,
        total: TotalRequired,
      });
    }

    // Create or update contract
    const contractResult = await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('contractStart', sql.Date, contractStart)
      .input('contractEnd', sql.Date, contractEnd)
      .input('contractType', sql.NVarChar, contractType)
      .input('salary', sql.Decimal(18, 2), salary)
      .query(`
        IF EXISTS (SELECT 1 FROM Contracts WHERE EmployeeId = @employeeId)
        BEGIN
          UPDATE Contracts SET
            ContractStart = @contractStart,
            ContractEnd = @contractEnd,
            ContractType = @contractType,
            Salary = @salary,
            Status = 'pending'
          WHERE EmployeeId = @employeeId
          SELECT Id FROM Contracts WHERE EmployeeId = @employeeId
        END
        ELSE
        BEGIN
          INSERT INTO Contracts (EmployeeId, ContractStart, ContractEnd, ContractType, Salary, Status)
          OUTPUT INSERTED.Id
          VALUES (@employeeId, @contractStart, @contractEnd, @contractType, @salary, 'pending')
        END
      `);

    const contractId = contractResult.recordset[0].Id;

    // Update employee onboarding status
    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .query(`
        UPDATE Employees 
        SET OnboardingStatus = 'completed', OnboardingCompletedAt = GETDATE()
        WHERE Id = @employeeId
      `);

    res.json({
      contractId,
      message: 'Contract generated successfully',
    });
  } catch (error) {
    console.error('Error generating contract:', error);
    res.status(500).json({ error: 'Failed to generate contract' });
  }
});

// Get contract
router.get('/:id/contract', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT c.*, e.FirstName, e.LastName, e.Email, e.Position, e.Department
        FROM Contracts c
        INNER JOIN Employees e ON c.EmployeeId = e.Id
        WHERE c.EmployeeId = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

module.exports = router;

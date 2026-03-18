const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const upload = require('../config/upload');
const path = require('path');

const PERSONAL_INFO_CHECKLIST_ITEM = 'Personal Information';
const REQUIRED_PERSONAL_INFO_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'dob',
  'nic',
  'phone',
  'address',
  'city',
  'postalCode',
  'position',
  'department',
  'emergencyContactName',
  'emergencyContactPhone',
];

function hasNonEmptyValue(value) {
  return value != null && String(value).trim() !== '';
}

function isPersonalInfoComplete(payload) {
  return REQUIRED_PERSONAL_INFO_FIELDS.every((field) => hasNonEmptyValue(payload[field]));
}

async function syncPersonalInfoChecklist(pool, employeeId, payload) {
  const isCompleted = isPersonalInfoComplete(payload);
  await pool
    .request()
    .input('employeeId', sql.Int, employeeId)
    .input('itemName', sql.NVarChar, PERSONAL_INFO_CHECKLIST_ITEM)
    .input('isCompleted', sql.Bit, isCompleted ? 1 : 0)
    .query(`
      UPDATE OnboardingChecklist
      SET IsCompleted = @isCompleted,
          CompletedAt = CASE
            WHEN @isCompleted = 1 THEN ISNULL(CompletedAt, GETDATE())
            ELSE NULL
          END
      WHERE EmployeeId = @employeeId AND ItemName = @itemName
    `);
}

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
      WHERE (e.IsActive = 1)
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
        WHERE e.Id = @id AND e.IsActive = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = result.recordset[0];

    // Get documents
    const docsResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT Id, EmployeeId, DocumentType, FileName, FilePath, FileSize, MimeType, UploadedAt, MetadataJson FROM OnboardingDocuments WHERE EmployeeId = @id ORDER BY UploadedAt DESC');

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

    // Normalize: empty string or undefined -> null for optional; ensure required strings
    const str = (v) => (v == null || v === '' ? null : String(v));
    const dobVal = dob == null || dob === '' ? null : (typeof dob === 'string' ? dob : dob);

    const result = await pool
      .request()
      .input('firstName', sql.NVarChar, str(firstName) ?? '')
      .input('lastName', sql.NVarChar, str(lastName) ?? '')
      .input('email', sql.NVarChar, str(email) ?? '')
      .input('dob', sql.Date, dobVal)
      .input('nic', sql.NVarChar, str(nic))
      .input('phone', sql.NVarChar, str(phone))
      .input('address', sql.NVarChar, str(address))
      .input('city', sql.NVarChar, str(city))
      .input('postalCode', sql.NVarChar, str(postalCode))
      .input('position', sql.NVarChar, str(position))
      .input('department', sql.NVarChar, str(department))
      .input('emergencyContactName', sql.NVarChar, str(emergencyContactName))
      .input('emergencyContactPhone', sql.NVarChar, str(emergencyContactPhone))
      .query(`
        INSERT INTO Employees (
          FirstName, LastName, Email, DOB, NIC, Phone, Address, City, PostalCode,
          Position, Department, EmergencyContactName, EmergencyContactPhone, OnboardingStatus, IsActive
        )
        OUTPUT INSERTED.Id
        VALUES (
          @firstName, @lastName, @email, @dob, @nic, @phone, @address, @city, @postalCode,
          @position, @department, @emergencyContactName, @emergencyContactPhone, 'pending', 1
        )
      `);

    const employeeId = result.recordset[0].Id;

    // Fixed checklist item: Personal Information
    await pool
      .request()
      .input('employeeId', sql.Int, employeeId)
      .input('itemName', sql.NVarChar, PERSONAL_INFO_CHECKLIST_ITEM)
      .input('itemType', sql.NVarChar, 'information')
      .input('isRequired', sql.Bit, 1)
      .query(`
        INSERT INTO OnboardingChecklist (EmployeeId, ItemName, ItemType, IsRequired)
        VALUES (@employeeId, @itemName, @itemType, @isRequired)
      `);

    // Document checklist items from OnboardingDocumentTypes (active only)
    const docTypesResult = await pool.request().query(`
      SELECT Name, IsRequired FROM OnboardingDocumentTypes WHERE IsActive = 1 ORDER BY SortOrder ASC, Id ASC
    `);
    for (const row of docTypesResult.recordset) {
      await pool
        .request()
        .input('employeeId', sql.Int, employeeId)
        .input('itemName', sql.NVarChar, row.Name)
        .input('itemType', sql.NVarChar, 'document')
        .input('isRequired', sql.Bit, row.IsRequired ? 1 : 0)
        .query(`
          INSERT INTO OnboardingChecklist (EmployeeId, ItemName, ItemType, IsRequired)
          VALUES (@employeeId, @itemName, @itemType, @isRequired)
        `);
    }

    await syncPersonalInfoChecklist(pool, employeeId, {
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
    });

    res.status(201).json({ id: employeeId, message: 'Employee created successfully' });
  } catch (error) {
    console.error('Error creating employee:', error);
    const message = error.message || 'Failed to create employee';
    res.status(500).json({ error: 'Failed to create employee', detail: message });
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

    const result = await pool
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
        WHERE Id = @id AND IsActive = 1;
        SELECT @@ROWCOUNT as updated
      `);

    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await syncPersonalInfoChecklist(pool, req.params.id, {
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
    });

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Soft delete: set IsActive = 0 (future: restrict by role e.g. admin/hr only)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid employee id' });
    }
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Employees
        SET IsActive = 0
        WHERE Id = @id AND IsActive = 1;
        SELECT @@ROWCOUNT as updated
      `);
    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Ensure OnboardingDocuments.MetadataJson column exists (for dynamic document field values).
async function ensureMetadataJsonColumn(pool) {
  try {
    const tableCheck = await pool.request().query(
      "SELECT OBJECT_ID('OnboardingDocuments', 'U') AS TableId"
    );
    if (tableCheck.recordset[0]?.TableId == null) return;
    const colCheck = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'OnboardingDocuments' AND COLUMN_NAME = 'MetadataJson'
    `);
    if (colCheck.recordset.length > 0) return;
    await pool.request().query(`
      ALTER TABLE OnboardingDocuments ADD MetadataJson NVARCHAR(MAX) NULL
    `);
  } catch (err) {
    console.error('ensureMetadataJsonColumn:', err.message);
  }
}

// Upload document (with optional field metadata from dynamic document type fields)
router.post('/:id/documents', upload.single('document'), async (req, res) => {
  try {
    const pool = await getPool();
    const { documentType, fieldValues } = req.body;
    if (!documentType || typeof documentType !== 'string' || !documentType.trim()) {
      return res.status(400).json({ error: 'documentType is required' });
    }
    const docTypeName = documentType.trim();

    // Validate against active OnboardingDocumentTypes
    const typesResult = await pool.request().query(
      'SELECT Id, Name FROM OnboardingDocumentTypes WHERE IsActive = 1'
    );
    const typeRow = typesResult.recordset.find((r) => r.Name === docTypeName);
    if (!typeRow) {
      return res.status(400).json({
        error: 'Invalid document type. Must be one of: ' + typesResult.recordset.map((r) => r.Name).join(', '),
      });
    }

    let metadataJson = null;
    if (fieldValues !== undefined && fieldValues !== null && fieldValues !== '') {
      try {
        const parsed = typeof fieldValues === 'string' ? JSON.parse(fieldValues) : fieldValues;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          metadataJson = JSON.stringify(parsed);
        }
      } catch (_) {
        // ignore invalid JSON
      }
    }

    if (metadataJson !== null) {
      await ensureMetadataJsonColumn(pool);
    }

    const existingDocResult = await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('documentType', sql.NVarChar, docTypeName)
      .query(`
        SELECT TOP 1 Id
        FROM OnboardingDocuments
        WHERE EmployeeId = @employeeId AND DocumentType = @documentType
        ORDER BY UploadedAt DESC, Id DESC
      `);
    const existingDocId = existingDocResult.recordset[0]?.Id ?? null;

    if (!req.file && existingDocId == null) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (req.file) {
      const filePath = `/uploads/${req.file.fieldname}/${req.file.filename}`;
      const insertRequest = pool
        .request()
        .input('employeeId', sql.Int, req.params.id)
        .input('documentType', sql.NVarChar, docTypeName)
        .input('fileName', sql.NVarChar, req.file.originalname)
        .input('filePath', sql.NVarChar, filePath)
        .input('fileSize', sql.Int, req.file.size)
        .input('mimeType', sql.NVarChar, req.file.mimetype);
      if (metadataJson !== null) {
        insertRequest.input('metadataJson', sql.NVarChar(sql.MAX), metadataJson);
      }
      const insertSql = metadataJson !== null
        ? `INSERT INTO OnboardingDocuments (EmployeeId, DocumentType, FileName, FilePath, FileSize, MimeType, MetadataJson)
           VALUES (@employeeId, @documentType, @fileName, @filePath, @fileSize, @mimeType, @metadataJson)`
        : `INSERT INTO OnboardingDocuments (EmployeeId, DocumentType, FileName, FilePath, FileSize, MimeType)
           VALUES (@employeeId, @documentType, @fileName, @filePath, @fileSize, @mimeType)`;
      await insertRequest.query(insertSql);
    } else if (metadataJson !== null) {
      await pool
        .request()
        .input('id', sql.Int, existingDocId)
        .input('metadataJson', sql.NVarChar(sql.MAX), metadataJson)
        .query(`
          UPDATE OnboardingDocuments
          SET MetadataJson = @metadataJson
          WHERE Id = @id
        `);
    } else {
      return res.status(400).json({ error: 'No changes to save' });
    }

    // Update checklist if document type matches
    await pool
      .request()
      .input('employeeId', sql.Int, req.params.id)
      .input('itemName', sql.NVarChar, docTypeName)
      .query(`
        UPDATE OnboardingChecklist 
        SET IsCompleted = 1, CompletedAt = GETDATE()
        WHERE EmployeeId = @employeeId AND ItemName = @itemName
      `);

    res.status(201).json({ message: req.file ? 'Document uploaded successfully' : 'Document details updated successfully' });
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

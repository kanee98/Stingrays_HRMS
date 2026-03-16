const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET /api/settings/document-types – list active document types (for onboarding step)
router.get('/document-types', async (req, res) => {
  try {
    const pool = await getPool();
    const activeOnly = req.query.active !== '0';
    const result = await pool.request().query(`
      SELECT Id, Name, IsRequired, SortOrder, IsActive, Description
      FROM OnboardingDocumentTypes
      ${activeOnly ? 'WHERE IsActive = 1' : ''}
      ORDER BY SortOrder ASC, Id ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Failed to fetch document types' });
  }
});

// GET /api/settings/document-types/all – list all (including inactive) for admin UI
router.get('/document-types/all', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT Id, Name, IsRequired, SortOrder, IsActive, Description, CreatedAt, UpdatedAt
      FROM OnboardingDocumentTypes
      ORDER BY SortOrder ASC, Id ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Failed to fetch document types' });
  }
});

// POST /api/settings/document-types – create
router.post('/document-types', async (req, res) => {
  try {
    const pool = await getPool();
    const { name, isRequired = true, sortOrder = 0, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool
      .request()
      .input('name', sql.NVarChar, name.trim())
      .input('isRequired', sql.Bit, isRequired ? 1 : 0)
      .input('sortOrder', sql.Int, Math.max(0, parseInt(sortOrder, 10) || 0))
      .input('description', sql.NVarChar, description && typeof description === 'string' ? description.trim() : null)
      .query(`
        INSERT INTO OnboardingDocumentTypes (Name, IsRequired, SortOrder, IsActive, Description)
        VALUES (@name, @isRequired, @sortOrder, 1, @description);
        SELECT SCOPE_IDENTITY() AS Id;
      `);
    const id = parseInt(result.recordset[0].Id, 10);
    res.status(201).json({ id, message: 'Document type created' });
  } catch (error) {
    console.error('Error creating document type:', error);
    res.status(500).json({ error: 'Failed to create document type' });
  }
});

// PUT /api/settings/document-types/:id – update
router.put('/document-types/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, isRequired, sortOrder, isActive, description } = req.body;
    const updates = [];
    const request = pool.request().input('id', sql.Int, id);
    if (name !== undefined && typeof name === 'string') {
      updates.push('Name = @name');
      request.input('name', sql.NVarChar, name.trim());
    }
    if (typeof isRequired === 'boolean') {
      updates.push('IsRequired = @isRequired');
      request.input('isRequired', sql.Bit, isRequired ? 1 : 0);
    }
    if (sortOrder !== undefined && Number.isInteger(parseInt(sortOrder, 10))) {
      updates.push('SortOrder = @sortOrder');
      request.input('sortOrder', sql.Int, parseInt(sortOrder, 10));
    }
    if (typeof isActive === 'boolean') {
      updates.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, isActive ? 1 : 0);
    }
    if (description !== undefined) {
      updates.push('Description = @description');
      request.input('description', sql.NVarChar, description && typeof description === 'string' ? description.trim() : null);
    }
    updates.push('UpdatedAt = GETDATE()');
    if (updates.length <= 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const result = await request.query(`
      UPDATE OnboardingDocumentTypes SET ${updates.join(', ')} WHERE Id = @id;
      SELECT @@ROWCOUNT AS updated;
    `);
    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Document type not found' });
    }
    res.json({ message: 'Document type updated' });
  } catch (error) {
    console.error('Error updating document type:', error);
    res.status(500).json({ error: 'Failed to update document type' });
  }
});

// GET /api/settings/onboarding – step visibility (Gramasevaka, Police Report)
router.get('/onboarding', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1 ShowGramasevakaStep, ShowPoliceReportStep
      FROM OnboardingSettings
    `);
    const row = result.recordset[0];
    if (!row) {
      return res.json({ showGramasevakaStep: true, showPoliceReportStep: true });
    }
    res.json({
      showGramasevakaStep: !!row.ShowGramasevakaStep,
      showPoliceReportStep: !!row.ShowPoliceReportStep,
    });
  } catch (err) {
    console.error('Error fetching onboarding settings:', err);
    res.json({ showGramasevakaStep: true, showPoliceReportStep: true });
  }
});

// PUT /api/settings/onboarding – update step visibility
router.put('/onboarding', async (req, res) => {
  try {
    const pool = await getPool();
    const { showGramasevakaStep, showPoliceReportStep } = req.body;
    await pool
      .request()
      .input('gramasevaka', sql.Bit, showGramasevakaStep !== false ? 1 : 0)
      .input('police', sql.Bit, showPoliceReportStep !== false ? 1 : 0)
      .query(`
        UPDATE OnboardingSettings SET
          ShowGramasevakaStep = @gramasevaka,
          ShowPoliceReportStep = @police,
          UpdatedAt = GETDATE()
        WHERE Id = (SELECT TOP 1 Id FROM OnboardingSettings);
        IF @@ROWCOUNT = 0
          INSERT INTO OnboardingSettings (ShowGramasevakaStep, ShowPoliceReportStep) VALUES (@gramasevaka, @police);
      `);
    res.json({ message: 'Onboarding settings updated' });
  } catch (err) {
    console.error('Error updating onboarding settings:', err);
    res.status(500).json({ error: 'Failed to update onboarding settings' });
  }
});

// DELETE /api/settings/document-types/:id – soft delete (set IsActive = 0)
router.delete('/document-types/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE OnboardingDocumentTypes SET IsActive = 0, UpdatedAt = GETDATE() WHERE Id = @id;
        SELECT @@ROWCOUNT AS updated;
      `);
    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Document type not found' });
    }
    res.json({ message: 'Document type deactivated' });
  } catch (error) {
    console.error('Error deactivating document type:', error);
    res.status(500).json({ error: 'Failed to deactivate document type' });
  }
});

// --- Departments (admin-configurable for employee onboarding) ---

// GET /api/settings/departments – list active (for onboarding dropdown)
router.get('/departments', async (req, res) => {
  try {
    const pool = await getPool();
    const activeOnly = req.query.active !== '0';
    const result = await pool.request().query(`
      SELECT Id, Name, SortOrder, IsActive
      FROM Departments
      ${activeOnly ? 'WHERE IsActive = 1' : ''}
      ORDER BY SortOrder ASC, Id ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// GET /api/settings/departments/all – list all for admin UI
router.get('/departments/all', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT Id, Name, SortOrder, IsActive, CreatedAt, UpdatedAt
      FROM Departments
      ORDER BY SortOrder ASC, Id ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /api/settings/departments – create
router.post('/departments', async (req, res) => {
  try {
    const pool = await getPool();
    const { name, sortOrder = 0 } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = await pool
      .request()
      .input('name', sql.NVarChar, name.trim())
      .input('sortOrder', sql.Int, Math.max(0, parseInt(sortOrder, 10) || 0))
      .query(`
        INSERT INTO Departments (Name, SortOrder, IsActive)
        VALUES (@name, @sortOrder, 1);
        SELECT SCOPE_IDENTITY() AS Id;
      `);
    const id = parseInt(result.recordset[0].Id, 10);
    res.status(201).json({ id, message: 'Department created' });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PUT /api/settings/departments/:id – update
router.put('/departments/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, sortOrder, isActive } = req.body;
    const updates = [];
    const request = pool.request().input('id', sql.Int, id);
    if (name !== undefined && typeof name === 'string') {
      updates.push('Name = @name');
      request.input('name', sql.NVarChar, name.trim());
    }
    if (sortOrder !== undefined && Number.isInteger(parseInt(sortOrder, 10))) {
      updates.push('SortOrder = @sortOrder');
      request.input('sortOrder', sql.Int, parseInt(sortOrder, 10));
    }
    if (typeof isActive === 'boolean') {
      updates.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, isActive ? 1 : 0);
    }
    updates.push('UpdatedAt = GETDATE()');
    if (updates.length <= 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const result = await request.query(`
      UPDATE Departments SET ${updates.join(', ')} WHERE Id = @id;
      SELECT @@ROWCOUNT AS updated;
    `);
    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json({ message: 'Department updated' });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/settings/departments/:id – soft delete (set IsActive = 0)
router.delete('/departments/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE Departments SET IsActive = 0, UpdatedAt = GETDATE() WHERE Id = @id;
        SELECT @@ROWCOUNT AS updated;
      `);
    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json({ message: 'Department deactivated' });
  } catch (error) {
    console.error('Error deactivating department:', error);
    res.status(500).json({ error: 'Failed to deactivate department' });
  }
});

module.exports = router;

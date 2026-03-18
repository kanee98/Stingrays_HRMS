const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const {
  listProspectTypes,
  listImportTemplates,
  getImportTemplateById,
  getImportLayoutByKey,
  generateUniqueTemplateKey,
  validateImportTemplatePayload,
  normalizeProspectTypeName,
  normalizeImportLayoutKey,
  toImportTemplateOption,
} = require('../services/prospectTypes');

function toNonNegativeInt(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, parsed);
}

async function hasProspectTypeNameConflict(pool, name, excludeId = null) {
  const request = pool.request().input('name', sql.NVarChar, name);
  let query = `
    SELECT TOP 1 Id
    FROM ProspectTypes
    WHERE Name = @name
  `;

  if (excludeId != null) {
    request.input('excludeId', sql.Int, excludeId);
    query += ' AND Id <> @excludeId';
  }

  const result = await request.query(query);
  return result.recordset.length > 0;
}

async function hasImportTemplateNameConflict(pool, name, excludeId = null) {
  const request = pool.request().input('name', sql.NVarChar, name);
  let query = `
    SELECT TOP 1 Id
    FROM ProspectImportTemplates
    WHERE Name = @name
  `;

  if (excludeId != null) {
    request.input('excludeId', sql.Int, excludeId);
    query += ' AND Id <> @excludeId';
  }

  const result = await request.query(query);
  return result.recordset.length > 0;
}

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

// Active document types with their fields (for onboarding Documents step)
router.get('/document-types/with-fields', async (req, res) => {
  try {
    const pool = await getPool();
    const typesResult = await pool.request().query(`
      SELECT Id, Name, IsRequired, SortOrder, Description
      FROM OnboardingDocumentTypes
      WHERE IsActive = 1
      ORDER BY SortOrder ASC, Id ASC
    `);
    const fieldsResult = await pool.request().query(`
      SELECT Id, DocumentTypeId, FieldKey, Label, FieldType, IsRequired, SortOrder
      FROM OnboardingDocumentTypeFields
      ORDER BY DocumentTypeId, SortOrder ASC, Id ASC
    `);
    const fieldsByTypeId = {};
    for (const row of fieldsResult.recordset) {
      const id = row.DocumentTypeId;
      if (!fieldsByTypeId[id]) fieldsByTypeId[id] = [];
      fieldsByTypeId[id].push({
        Id: row.Id,
        FieldKey: row.FieldKey,
        Label: row.Label,
        FieldType: row.FieldType,
        IsRequired: !!row.IsRequired,
        SortOrder: row.SortOrder,
      });
    }
    const types = typesResult.recordset.map((t) => ({
      Id: t.Id,
      Name: t.Name,
      IsRequired: !!t.IsRequired,
      SortOrder: t.SortOrder,
      Description: t.Description,
      Fields: fieldsByTypeId[t.Id] || [],
    }));
    res.json(types);
  } catch (error) {
    console.error('Error fetching document types with fields:', error);
    res.status(500).json({ error: 'Failed to fetch document types with fields' });
  }
});

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
      .input('sortOrder', sql.Int, toNonNegativeInt(sortOrder))
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

const DOCUMENT_FIELD_TYPES = ['text', 'tel', 'date', 'file'];

router.get('/document-types/:id/fields', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid document type id' });
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT Id, DocumentTypeId, FieldKey, Label, FieldType, IsRequired, SortOrder
        FROM OnboardingDocumentTypeFields
        WHERE DocumentTypeId = @id
        ORDER BY SortOrder ASC, Id ASC
      `);
    const fields = result.recordset.map((r) => ({
      Id: r.Id,
      DocumentTypeId: r.DocumentTypeId,
      FieldKey: r.FieldKey,
      Label: r.Label,
      FieldType: r.FieldType,
      IsRequired: !!r.IsRequired,
      SortOrder: r.SortOrder,
    }));
    res.json(fields);
  } catch (error) {
    console.error('Error fetching document type fields:', error);
    res.status(500).json({ error: 'Failed to fetch document type fields' });
  }
});

router.post('/document-types/:id/fields', async (req, res) => {
  try {
    const pool = await getPool();
    const documentTypeId = parseInt(req.params.id, 10);
    if (Number.isNaN(documentTypeId)) return res.status(400).json({ error: 'Invalid document type id' });
    const { fieldKey, label, fieldType, isRequired = false, sortOrder = 0 } = req.body;
    if (!fieldKey || typeof fieldKey !== 'string' || !fieldKey.trim()) {
      return res.status(400).json({ error: 'fieldKey is required' });
    }
    if (!label || typeof label !== 'string' || !label.trim()) {
      return res.status(400).json({ error: 'label is required' });
    }
    const type = (fieldType && typeof fieldType === 'string' ? fieldType : 'text').toLowerCase();
    if (!DOCUMENT_FIELD_TYPES.includes(type)) {
      return res.status(400).json({ error: 'fieldType must be one of: ' + DOCUMENT_FIELD_TYPES.join(', ') });
    }
    const key = fieldKey.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    if (!key) return res.status(400).json({ error: 'fieldKey must contain at least one alphanumeric character' });
    const check = await pool
      .request()
      .input('documentTypeId', sql.Int, documentTypeId)
      .query('SELECT Id FROM OnboardingDocumentTypes WHERE Id = @documentTypeId');
    if (check.recordset.length === 0) {
      return res.status(404).json({ error: 'Document type not found' });
    }
    const result = await pool
      .request()
      .input('documentTypeId', sql.Int, documentTypeId)
      .input('fieldKey', sql.NVarChar, key)
      .input('label', sql.NVarChar, label.trim())
      .input('fieldType', sql.NVarChar, type)
      .input('isRequired', sql.Bit, isRequired ? 1 : 0)
      .input('sortOrder', sql.Int, toNonNegativeInt(sortOrder))
      .query(`
        INSERT INTO OnboardingDocumentTypeFields (DocumentTypeId, FieldKey, Label, FieldType, IsRequired, SortOrder)
        VALUES (@documentTypeId, @fieldKey, @label, @fieldType, @isRequired, @sortOrder);
        SELECT SCOPE_IDENTITY() AS Id;
      `);
    const id = parseInt(result.recordset[0].Id, 10);
    res.status(201).json({ id, message: 'Document type field created' });
  } catch (error) {
    console.error('Error creating document type field:', error);
    res.status(500).json({ error: 'Failed to create document type field' });
  }
});

router.put('/document-types/fields/:fieldId', async (req, res) => {
  try {
    const pool = await getPool();
    const fieldId = parseInt(req.params.fieldId, 10);
    if (Number.isNaN(fieldId)) return res.status(400).json({ error: 'Invalid field id' });
    const { fieldKey, label, fieldType, isRequired, sortOrder } = req.body;
    const updates = [];
    const request = pool.request().input('fieldId', sql.Int, fieldId);
    if (fieldKey !== undefined && typeof fieldKey === 'string' && fieldKey.trim()) {
      const key = fieldKey.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      if (key) {
        updates.push('FieldKey = @fieldKey');
        request.input('fieldKey', sql.NVarChar, key);
      }
    }
    if (label !== undefined && typeof label === 'string') {
      updates.push('Label = @label');
      request.input('label', sql.NVarChar, label.trim());
    }
    if (fieldType !== undefined && typeof fieldType === 'string') {
      const type = fieldType.toLowerCase();
      if (DOCUMENT_FIELD_TYPES.includes(type)) {
        updates.push('FieldType = @fieldType');
        request.input('fieldType', sql.NVarChar, type);
      }
    }
    if (typeof isRequired === 'boolean') {
      updates.push('IsRequired = @isRequired');
      request.input('isRequired', sql.Bit, isRequired ? 1 : 0);
    }
    if (sortOrder !== undefined && Number.isInteger(parseInt(sortOrder, 10))) {
      updates.push('SortOrder = @sortOrder');
      request.input('sortOrder', sql.Int, parseInt(sortOrder, 10));
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    updates.push('UpdatedAt = GETDATE()');
    const result = await request.query(`
      UPDATE OnboardingDocumentTypeFields SET ${updates.join(', ')} WHERE Id = @fieldId;
      SELECT @@ROWCOUNT AS updated;
    `);
    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Document type field not found' });
    }
    res.json({ message: 'Document type field updated' });
  } catch (error) {
    console.error('Error updating document type field:', error);
    res.status(500).json({ error: 'Failed to update document type field' });
  }
});

router.delete('/document-types/fields/:fieldId', async (req, res) => {
  try {
    const pool = await getPool();
    const fieldId = parseInt(req.params.fieldId, 10);
    if (Number.isNaN(fieldId)) return res.status(400).json({ error: 'Invalid field id' });
    const result = await pool
      .request()
      .input('fieldId', sql.Int, fieldId)
      .query(`
        DELETE FROM OnboardingDocumentTypeFields WHERE Id = @fieldId;
        SELECT @@ROWCOUNT AS deleted;
      `);
    if (result.recordset[0].deleted === 0) {
      return res.status(404).json({ error: 'Document type field not found' });
    }
    res.json({ message: 'Document type field deleted' });
  } catch (error) {
    console.error('Error deleting document type field:', error);
    res.status(500).json({ error: 'Failed to delete document type field' });
  }
});

router.get('/prospect-import-templates', async (req, res) => {
  try {
    const activeOnly = req.query.active !== '0';
    const templates = await listImportTemplates({ activeOnly });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching prospect import templates:', error);
    res.status(500).json({ error: 'Failed to fetch prospect import templates' });
  }
});

router.get('/prospect-import-templates/all', async (req, res) => {
  try {
    const templates = await listImportTemplates({ activeOnly: false });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching prospect import templates:', error);
    res.status(500).json({ error: 'Failed to fetch prospect import templates' });
  }
});

router.post('/prospect-import-templates', async (req, res) => {
  try {
    const pool = await getPool();
    const { errors, template } = validateImportTemplatePayload(req.body || {});
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    if (await hasImportTemplateNameConflict(pool, template.name)) {
      return res.status(409).json({ error: 'An import template with this name already exists' });
    }

    const templateKey = await generateUniqueTemplateKey(template.name);
    const result = await pool
      .request()
      .input('templateKey', sql.NVarChar, templateKey)
      .input('name', sql.NVarChar, template.name)
      .input('description', sql.NVarChar, template.description)
      .input('sortOrder', sql.Int, template.sortOrder)
      .input('screeningColumnNumbersJson', sql.NVarChar(sql.MAX), JSON.stringify(template.screeningColumnNumbers))
      .input('defaultQuestionLabelsJson', sql.NVarChar(sql.MAX), template.defaultQuestionLabels.length ? JSON.stringify(template.defaultQuestionLabels) : null)
      .input('cityAreaColumnNumber', sql.Int, template.cityAreaColumnNumber)
      .input('fullNameColumnNumber', sql.Int, template.fullNameColumnNumber)
      .input('phoneColumnNumber', sql.Int, template.phoneColumnNumber)
      .input('emailColumnNumber', sql.Int, template.emailColumnNumber)
      .input('genderColumnNumber', sql.Int, template.genderColumnNumber)
      .input('dateOfBirthColumnNumber', sql.Int, template.dateOfBirthColumnNumber)
      .query(`
        INSERT INTO ProspectImportTemplates (
          TemplateKey, Name, Description, SortOrder, IsActive,
          ScreeningColumnNumbersJson, DefaultQuestionLabelsJson,
          CityAreaColumnNumber, FullNameColumnNumber, PhoneColumnNumber,
          EmailColumnNumber, GenderColumnNumber, DateOfBirthColumnNumber
        )
        VALUES (
          @templateKey, @name, @description, @sortOrder, 1,
          @screeningColumnNumbersJson, @defaultQuestionLabelsJson,
          @cityAreaColumnNumber, @fullNameColumnNumber, @phoneColumnNumber,
          @emailColumnNumber, @genderColumnNumber, @dateOfBirthColumnNumber
        );
        SELECT SCOPE_IDENTITY() AS Id;
      `);
    const id = parseInt(result.recordset[0].Id, 10);
    res.status(201).json({ id, templateKey, message: 'Prospect import template created' });
  } catch (error) {
    console.error('Error creating prospect import template:', error);
    res.status(500).json({ error: 'Failed to create prospect import template' });
  }
});

router.put('/prospect-import-templates/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const existing = await getImportTemplateById(id, { activeOnly: false });
    if (!existing) {
      return res.status(404).json({ error: 'Prospect import template not found' });
    }

    const merged = {
      ...existing,
      ...req.body,
    };
    const { errors, template } = validateImportTemplatePayload(merged);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    if (await hasImportTemplateNameConflict(pool, template.name, id)) {
      return res.status(409).json({ error: 'An import template with this name already exists' });
    }

    await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, template.name)
      .input('description', sql.NVarChar, template.description)
      .input('sortOrder', sql.Int, template.sortOrder)
      .input('screeningColumnNumbersJson', sql.NVarChar(sql.MAX), JSON.stringify(template.screeningColumnNumbers))
      .input('defaultQuestionLabelsJson', sql.NVarChar(sql.MAX), template.defaultQuestionLabels.length ? JSON.stringify(template.defaultQuestionLabels) : null)
      .input('cityAreaColumnNumber', sql.Int, template.cityAreaColumnNumber)
      .input('fullNameColumnNumber', sql.Int, template.fullNameColumnNumber)
      .input('phoneColumnNumber', sql.Int, template.phoneColumnNumber)
      .input('emailColumnNumber', sql.Int, template.emailColumnNumber)
      .input('genderColumnNumber', sql.Int, template.genderColumnNumber)
      .input('dateOfBirthColumnNumber', sql.Int, template.dateOfBirthColumnNumber)
      .query(`
        UPDATE ProspectImportTemplates
        SET Name = @name,
            Description = @description,
            SortOrder = @sortOrder,
            ScreeningColumnNumbersJson = @screeningColumnNumbersJson,
            DefaultQuestionLabelsJson = @defaultQuestionLabelsJson,
            CityAreaColumnNumber = @cityAreaColumnNumber,
            FullNameColumnNumber = @fullNameColumnNumber,
            PhoneColumnNumber = @phoneColumnNumber,
            EmailColumnNumber = @emailColumnNumber,
            GenderColumnNumber = @genderColumnNumber,
            DateOfBirthColumnNumber = @dateOfBirthColumnNumber,
            UpdatedAt = GETDATE()
        WHERE Id = @id
      `);

    res.json({ message: 'Prospect import template updated' });
  } catch (error) {
    console.error('Error updating prospect import template:', error);
    res.status(500).json({ error: 'Failed to update prospect import template' });
  }
});

router.delete('/prospect-import-templates/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const existing = await getImportTemplateById(id, { activeOnly: false });
    if (!existing) {
      return res.status(404).json({ error: 'Prospect import template not found' });
    }

    const linkedProspectTypes = await pool
      .request()
      .input('templateKey', sql.NVarChar, existing.TemplateKey)
      .query(`
        SELECT TOP 1 Name
        FROM ProspectTypes
        WHERE ImportLayoutKey = @templateKey AND IsActive = 1
      `);

    if (linkedProspectTypes.recordset.length > 0) {
      return res.status(409).json({
        error: `This template is assigned to active prospect type "${linkedProspectTypes.recordset[0].Name}". Reassign or deactivate that prospect type first.`,
      });
    }

    await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE ProspectImportTemplates
        SET IsActive = 0, UpdatedAt = GETDATE()
        WHERE Id = @id
      `);

    res.json({ message: 'Prospect import template deactivated' });
  } catch (error) {
    console.error('Error deactivating prospect import template:', error);
    res.status(500).json({ error: 'Failed to deactivate prospect import template' });
  }
});

router.get('/prospect-types/import-layouts', async (req, res) => {
  try {
    const templates = await listImportTemplates({ activeOnly: true });
    res.json(templates.map(toImportTemplateOption));
  } catch (error) {
    console.error('Error fetching prospect import template options:', error);
    res.status(500).json({ error: 'Failed to fetch prospect import template options' });
  }
});

router.get('/prospect-types', async (req, res) => {
  try {
    const activeOnly = req.query.active !== '0';
    const importableOnly = req.query.importable === '1';
    const list = await listProspectTypes({ activeOnly, importableOnly });
    res.json(list);
  } catch (error) {
    console.error('Error fetching prospect types:', error);
    res.status(500).json({ error: 'Failed to fetch prospect types' });
  }
});

router.get('/prospect-types/all', async (req, res) => {
  try {
    const list = await listProspectTypes({ activeOnly: false });
    res.json(list);
  } catch (error) {
    console.error('Error fetching prospect types:', error);
    res.status(500).json({ error: 'Failed to fetch prospect types' });
  }
});

router.post('/prospect-types', async (req, res) => {
  try {
    const pool = await getPool();
    const normalizedName = normalizeProspectTypeName(req.body?.name);
    const importLayoutKey = normalizeImportLayoutKey(req.body?.importLayoutKey);
    const sortOrder = toNonNegativeInt(req.body?.sortOrder);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (await hasProspectTypeNameConflict(pool, normalizedName)) {
      return res.status(409).json({ error: 'A prospect type with this name already exists' });
    }

    if (importLayoutKey) {
      const template = await getImportLayoutByKey(importLayoutKey);
      if (!template) {
        return res.status(400).json({ error: 'Selected import template is not active' });
      }
    }

    const result = await pool
      .request()
      .input('name', sql.NVarChar, normalizedName)
      .input('sortOrder', sql.Int, sortOrder)
      .input('importLayoutKey', sql.NVarChar, importLayoutKey)
      .query(`
        INSERT INTO ProspectTypes (Name, SortOrder, IsActive, ImportLayoutKey)
        VALUES (@name, @sortOrder, 1, @importLayoutKey);
        SELECT SCOPE_IDENTITY() AS Id;
      `);

    const id = parseInt(result.recordset[0].Id, 10);
    res.status(201).json({ id, message: 'Prospect type created' });
  } catch (error) {
    console.error('Error creating prospect type:', error);
    res.status(500).json({ error: 'Failed to create prospect type' });
  }
});

router.put('/prospect-types/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const updates = [];
    const request = pool.request().input('id', sql.Int, id);

    if (req.body?.name !== undefined) {
      const normalizedName = normalizeProspectTypeName(req.body.name);
      if (!normalizedName) {
        return res.status(400).json({ error: 'Name is required' });
      }

      if (await hasProspectTypeNameConflict(pool, normalizedName, id)) {
        return res.status(409).json({ error: 'A prospect type with this name already exists' });
      }

      updates.push('Name = @name');
      request.input('name', sql.NVarChar, normalizedName);
    }

    if (req.body?.sortOrder !== undefined && Number.isInteger(parseInt(req.body.sortOrder, 10))) {
      updates.push('SortOrder = @sortOrder');
      request.input('sortOrder', sql.Int, parseInt(req.body.sortOrder, 10));
    }

    if (req.body?.isActive !== undefined && typeof req.body.isActive === 'boolean') {
      updates.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, req.body.isActive ? 1 : 0);
    }

    if (req.body?.importLayoutKey !== undefined) {
      const importLayoutKey = normalizeImportLayoutKey(req.body.importLayoutKey);
      if (importLayoutKey) {
        const template = await getImportLayoutByKey(importLayoutKey);
        if (!template) {
          return res.status(400).json({ error: 'Selected import template is not active' });
        }
      }
      updates.push('ImportLayoutKey = @importLayoutKey');
      request.input('importLayoutKey', sql.NVarChar, importLayoutKey);
    }

    updates.push('UpdatedAt = GETDATE()');
    if (updates.length <= 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await request.query(`
      UPDATE ProspectTypes SET ${updates.join(', ')} WHERE Id = @id;
      SELECT @@ROWCOUNT AS updated;
    `);

    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Prospect type not found' });
    }

    res.json({ message: 'Prospect type updated' });
  } catch (error) {
    console.error('Error updating prospect type:', error);
    res.status(500).json({ error: 'Failed to update prospect type' });
  }
});

router.delete('/prospect-types/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE ProspectTypes SET IsActive = 0, UpdatedAt = GETDATE() WHERE Id = @id;
        SELECT @@ROWCOUNT AS updated;
      `);
    if (result.recordset[0].updated === 0) {
      return res.status(404).json({ error: 'Prospect type not found' });
    }
    res.json({ message: 'Prospect type deactivated' });
  } catch (error) {
    console.error('Error deactivating prospect type:', error);
    res.status(500).json({ error: 'Failed to deactivate prospect type' });
  }
});

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
      .input('sortOrder', sql.Int, toNonNegativeInt(sortOrder))
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

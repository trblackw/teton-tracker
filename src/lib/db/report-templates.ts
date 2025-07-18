import { type ReportTemplate, type ReportType } from '../schema';
import { getDatabase, handleDatabaseError } from './index';

// Type for creating new report templates
export type CreateReportTemplateData = Omit<
  ReportTemplate,
  'id' | 'createdAt' | 'updatedAt'
>;

// Type for updating report templates
export type UpdateReportTemplateData = Partial<
  Omit<ReportTemplate, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
>;

// Query interface for filtering templates
export interface ReportTemplatesQuery {
  organizationId?: string;
  reportType?: ReportType;
  createdBy?: string;
  isDefault?: boolean;
  search?: string; // Search in name and description
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'created_at' | 'updated_at';
  orderDirection?: 'ASC' | 'DESC';
}

// Create a new report template
export async function createReportTemplate(
  templateData: CreateReportTemplateData
): Promise<ReportTemplate> {
  try {
    const db = getDatabase();
    const templateId = crypto.randomUUID();
    const now = new Date().toISOString();

    const template: ReportTemplate = {
      id: templateId,
      ...templateData,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await db.query(
      `INSERT INTO report_templates (
        id, name, description, organization_id, report_type, column_config,
        is_default, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        template.id,
        template.name,
        template.description || null,
        template.organizationId,
        template.reportType,
        JSON.stringify(template.columnConfig),
        template.isDefault,
        template.createdBy,
        now,
        now,
      ]
    );

    console.log(`✅ Created report template: ${template.id}`);
    return template;
  } catch (error) {
    handleDatabaseError(error, 'create report template');
    throw new Error('Failed to create report template');
  }
}

// Get report templates with optional filtering
export async function getReportTemplates(
  query: ReportTemplatesQuery = {}
): Promise<ReportTemplate[]> {
  try {
    const db = getDatabase();
    const {
      organizationId,
      reportType,
      createdBy,
      isDefault,
      search,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = query;

    // Start with base query
    let sql = `
      SELECT 
        id, name, description, organization_id, report_type, column_config,
        is_default, created_by, created_at, updated_at
      FROM report_templates
    `;

    const conditions: string[] = [];
    const args: any[] = [];

    // Add conditions
    if (organizationId) {
      conditions.push(`organization_id = $${args.length + 1}`);
      args.push(organizationId);
    }

    if (reportType) {
      conditions.push(`report_type = $${args.length + 1}`);
      args.push(reportType);
    }

    if (createdBy) {
      conditions.push(`created_by = $${args.length + 1}`);
      args.push(createdBy);
    }

    if (isDefault !== undefined) {
      conditions.push(`is_default = $${args.length + 1}`);
      args.push(isDefault);
    }

    if (search) {
      conditions.push(
        `(name ILIKE $${args.length + 1} OR description ILIKE $${args.length + 1})`
      );
      args.push(`%${search}%`);
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY and LIMIT
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    sql += ` LIMIT $${args.length + 1} OFFSET $${args.length + 2}`;
    args.push(limit, offset);

    const result = await db.query(sql, args);

    // Transform database rows to ReportTemplate objects
    const templates: ReportTemplate[] = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      organizationId: row.organization_id,
      reportType: row.report_type as ReportType,
      columnConfig: JSON.parse(row.column_config || '[]'),
      isDefault: row.is_default,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return templates;
  } catch (error) {
    handleDatabaseError(error, 'get report templates');
    return [];
  }
}

// Get a single report template by ID
export async function getReportTemplateById(
  id: string,
  organizationId?: string
): Promise<ReportTemplate | null> {
  try {
    const db = getDatabase();

    let sql = `
      SELECT 
        id, name, description, organization_id, report_type, column_config,
        is_default, created_by, created_at, updated_at
      FROM report_templates
      WHERE id = $1
    `;

    const args = [id];

    if (organizationId) {
      sql += ' AND organization_id = $2';
      args.push(organizationId);
    }

    const result = await db.query(sql, args);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      organizationId: row.organization_id,
      reportType: row.report_type as ReportType,
      columnConfig: JSON.parse(row.column_config || '[]'),
      isDefault: row.is_default,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get report template by id');
    return null;
  }
}

// Update report template
export async function updateReportTemplate(
  id: string,
  updateData: UpdateReportTemplateData,
  organizationId: string
): Promise<ReportTemplate | null> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get existing template to ensure it exists and belongs to organization
    const existingTemplate = await getReportTemplateById(id, organizationId);
    if (!existingTemplate) {
      return null;
    }

    const setFields: string[] = [];
    const args: any[] = [];

    // Build dynamic SET clause
    if (updateData.name !== undefined) {
      setFields.push(`name = $${args.length + 1}`);
      args.push(updateData.name);
    }

    if (updateData.description !== undefined) {
      setFields.push(`description = $${args.length + 1}`);
      args.push(updateData.description);
    }

    if (updateData.reportType !== undefined) {
      setFields.push(`report_type = $${args.length + 1}`);
      args.push(updateData.reportType);
    }

    if (updateData.columnConfig !== undefined) {
      setFields.push(`column_config = $${args.length + 1}`);
      args.push(JSON.stringify(updateData.columnConfig));
    }

    if (updateData.isDefault !== undefined) {
      setFields.push(`is_default = $${args.length + 1}`);
      args.push(updateData.isDefault);
    }

    // Always update the updated_at timestamp
    setFields.push(`updated_at = $${args.length + 1}`);
    args.push(now);

    if (setFields.length === 1) {
      // Only updated_at was set, nothing to update
      return existingTemplate;
    }

    // Add WHERE clause with organization validation
    let sql = `
      UPDATE report_templates 
      SET ${setFields.join(', ')}
      WHERE id = $${args.length + 1} AND organization_id = $${args.length + 2}
    `;
    args.push(id, organizationId);

    sql += ' RETURNING *';

    const result = await db.query(sql, args);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const updatedTemplate: ReportTemplate = {
      id: row.id,
      name: row.name,
      description: row.description,
      organizationId: row.organization_id,
      reportType: row.report_type as ReportType,
      columnConfig: JSON.parse(row.column_config || '[]'),
      isDefault: row.is_default,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    console.log(`✅ Updated report template: ${id}`);
    return updatedTemplate;
  } catch (error) {
    handleDatabaseError(error, 'update report template');
    return null;
  }
}

// Delete report template
export async function deleteReportTemplate(
  id: string,
  organizationId: string
): Promise<boolean> {
  if (!id || !organizationId) {
    throw new Error('Template ID and Organization ID are required');
  }

  try {
    const db = getDatabase();

    // Delete the template only if it belongs to the organization
    const result = await db.query(
      'DELETE FROM report_templates WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    const success = result.rowCount !== null && result.rowCount > 0;

    if (success) {
      console.log(`✅ Deleted report template: ${id}`);
    } else {
      console.log(`⚠️ Report template not found or access denied: ${id}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete report template');
    return false;
  }
}

// Get template count for organization
export async function getReportTemplateCount(
  organizationId: string,
  reportType?: ReportType
): Promise<number> {
  try {
    const db = getDatabase();

    let sql =
      'SELECT COUNT(*) as count FROM report_templates WHERE organization_id = $1';
    const args: any[] = [organizationId];

    if (reportType) {
      sql += ' AND report_type = $2';
      args.push(reportType);
    }

    const result = await db.query(sql, args);

    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    handleDatabaseError(error, 'get report template count');
    return 0;
  }
}

// Get default template for organization and report type
export async function getDefaultReportTemplate(
  organizationId: string,
  reportType: ReportType
): Promise<ReportTemplate | null> {
  try {
    const templates = await getReportTemplates({
      organizationId,
      reportType,
      isDefault: true,
      limit: 1,
    });

    return templates.length > 0 ? templates[0] : null;
  } catch (error) {
    handleDatabaseError(error, 'get default report template');
    return null;
  }
}

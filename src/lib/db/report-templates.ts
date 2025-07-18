import {
  type ReportTemplate,
  type ReportTemplateForm,
  ReportType,
} from '../schema';
import { getDatabase, handleDatabaseError } from './index';

export interface ReportTemplatesQuery {
  organizationId?: string;
  reportType?: ReportType;
  isDefault?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
}

// Create a new report template
export async function createReportTemplate(
  templateData: ReportTemplateForm
): Promise<ReportTemplate> {
  if (!templateData.organizationId) {
    throw new Error('Organization ID is required');
  }

  if (!templateData.createdBy) {
    throw new Error('Created by user ID is required');
  }

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
      isDefault,
      createdBy,
      limit = 50,
      offset = 0,
    } = query;

    let sql = `
      SELECT 
        id, name, description, organization_id, report_type, column_config,
        is_default, created_by, created_at, updated_at
      FROM report_templates
    `;

    const conditions: string[] = [];
    const args: any[] = [];

    if (organizationId) {
      conditions.push(`organization_id = $${args.length + 1}`);
      args.push(organizationId);
    }

    if (reportType) {
      conditions.push(`report_type = $${args.length + 1}`);
      args.push(reportType);
    }

    if (isDefault !== undefined) {
      conditions.push(`is_default = $${args.length + 1}`);
      args.push(isDefault);
    }

    if (createdBy) {
      conditions.push(`created_by = $${args.length + 1}`);
      args.push(createdBy);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY created_at DESC`;
    sql += ` LIMIT $${args.length + 1} OFFSET $${args.length + 2}`;
    args.push(limit, offset);

    const result = await db.query(sql, args);

    const templates: ReportTemplate[] = result.rows.map((row: any) => {
      let columnConfig;
      // PostgreSQL JSONB fields are already parsed objects, not JSON strings
      if (typeof row.column_config === 'object' && row.column_config !== null) {
        columnConfig = row.column_config;
      } else {
        // Fallback: try to parse as JSON string if it's somehow a string
        try {
          columnConfig = JSON.parse(row.column_config || '[]');
        } catch (parseError) {
          console.error(
            `❌ JSON parse error for template ${row.id}:`,
            parseError
          );
          console.error(`❌ Raw column_config value:`, row.column_config);
          columnConfig = [];
        }
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        organizationId: row.organization_id,
        reportType: row.report_type as ReportType,
        columnConfig,
        isDefault: row.is_default,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

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

// Update a report template
export async function updateReportTemplate(
  id: string,
  templateData: ReportTemplateForm,
  organizationId: string
): Promise<ReportTemplate | null> {
  if (!templateData.createdBy) {
    throw new Error('Created by user ID is required');
  }

  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = await db.query(
      `UPDATE report_templates 
       SET name = $1, description = $2, report_type = $3, column_config = $4,
           is_default = $5, updated_at = $6
       WHERE id = $7 AND organization_id = $8
       RETURNING *`,
      [
        templateData.name,
        templateData.description || null,
        templateData.reportType,
        JSON.stringify(templateData.columnConfig),
        templateData.isDefault,
        now,
        id,
        organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return null; // Template not found or access denied
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

    return updatedTemplate;
  } catch (error) {
    handleDatabaseError(error, 'update report template');
    return null;
  }
}

// Delete a report template
export async function deleteReportTemplate(
  id: string,
  organizationId: string
): Promise<boolean> {
  if (!id) {
    throw new Error('Template ID is required');
  }

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  try {
    const db = getDatabase();

    // Don't allow deletion of default templates
    const existing = await getReportTemplateById(id, organizationId);
    if (existing?.isDefault) {
      throw new Error('Cannot delete default templates');
    }

    const result = await db.query(
      'DELETE FROM report_templates WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`🗑️ Deleted report template: ${id}`);
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

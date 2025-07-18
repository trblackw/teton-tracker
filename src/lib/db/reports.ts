import { type Report, type ReportType } from '../schema';
import { getDatabase, handleDatabaseError } from './index';

// Type for creating new reports
export type CreateReportData = Omit<
  Report,
  'id' | 'status' | 'generatedAt' | 'downloadUrl' | 'createdAt' | 'updatedAt'
>;

// Type for updating reports
export type UpdateReportData = Partial<
  Omit<Report, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
>;

// Query interface for filtering reports
export interface ReportsQuery {
  organizationId?: string;
  createdBy?: string;
  templateId?: string;
  reportType?: ReportType;
  status?: Report['status'] | Report['status'][];
  search?: string; // Search in name
  startDateFrom?: Date;
  startDateTo?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'created_at' | 'updated_at' | 'generated_at';
  orderDirection?: 'ASC' | 'DESC';
}

// Create a new report
export async function createReport(
  reportData: CreateReportData
): Promise<Report> {
  try {
    const db = getDatabase();
    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();

    const report: Report = {
      id: reportId,
      ...reportData,
      status: 'generating',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await db.query(
      `INSERT INTO reports (
        id, name, organization_id, created_by, template_id, start_date, end_date,
        report_type, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        report.id,
        report.name,
        report.organizationId,
        report.createdBy,
        report.templateId,
        report.startDate,
        report.endDate,
        report.reportType,
        report.status,
        now,
        now,
      ]
    );

    console.log(`✅ Created report: ${report.id}`);
    return report;
  } catch (error) {
    handleDatabaseError(error, 'create report');
    throw new Error('Failed to create report');
  }
}

// Get reports with optional filtering
export async function getReports(query: ReportsQuery = {}): Promise<Report[]> {
  try {
    const db = getDatabase();
    const {
      organizationId,
      createdBy,
      templateId,
      reportType,
      status,
      search,
      startDateFrom,
      startDateTo,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = query;

    // Start with base query
    let sql = `
      SELECT 
        id, name, organization_id, created_by, template_id, start_date, end_date,
        report_type, status, generated_at, download_url, created_at, updated_at
      FROM reports
    `;

    const conditions: string[] = [];
    const args: any[] = [];

    // Add conditions
    if (organizationId) {
      conditions.push(`organization_id = $${args.length + 1}`);
      args.push(organizationId);
    }

    if (createdBy) {
      conditions.push(`created_by = $${args.length + 1}`);
      args.push(createdBy);
    }

    if (templateId) {
      conditions.push(`template_id = $${args.length + 1}`);
      args.push(templateId);
    }

    if (reportType) {
      conditions.push(`report_type = $${args.length + 1}`);
      args.push(reportType);
    }

    if (status) {
      if (Array.isArray(status)) {
        const placeholders = status
          .map((_, index) => '$' + (args.length + index + 1))
          .join(',');
        conditions.push(`status IN (${placeholders})`);
        args.push(...status);
      } else {
        conditions.push(`status = $${args.length + 1}`);
        args.push(status);
      }
    }

    if (search) {
      conditions.push(`name ILIKE $${args.length + 1}`);
      args.push(`%${search}%`);
    }

    if (startDateFrom) {
      conditions.push(`start_date >= $${args.length + 1}`);
      args.push(startDateFrom);
    }

    if (startDateTo) {
      conditions.push(`start_date <= $${args.length + 1}`);
      args.push(startDateTo);
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

    // Transform database rows to Report objects
    const reports: Report[] = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      organizationId: row.organization_id,
      createdBy: row.created_by,
      templateId: row.template_id,
      startDate: row.start_date,
      endDate: row.end_date,
      reportType: row.report_type as ReportType,
      status: row.status as Report['status'],
      generatedAt: row.generated_at,
      downloadUrl: row.download_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return reports;
  } catch (error) {
    handleDatabaseError(error, 'get reports');
    return [];
  }
}

// Get a single report by ID
export async function getReportById(
  id: string,
  organizationId?: string
): Promise<Report | null> {
  try {
    const db = getDatabase();

    let sql = `
      SELECT 
        id, name, organization_id, created_by, template_id, start_date, end_date,
        report_type, status, generated_at, download_url, created_at, updated_at
      FROM reports
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
      organizationId: row.organization_id,
      createdBy: row.created_by,
      templateId: row.template_id,
      startDate: row.start_date,
      endDate: row.end_date,
      reportType: row.report_type as ReportType,
      status: row.status as Report['status'],
      generatedAt: row.generated_at,
      downloadUrl: row.download_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get report by id');
    return null;
  }
}

// Update report
export async function updateReport(
  id: string,
  updateData: UpdateReportData,
  organizationId: string
): Promise<Report | null> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Get existing report to ensure it exists and belongs to organization
    const existingReport = await getReportById(id, organizationId);
    if (!existingReport) {
      return null;
    }

    const setFields: string[] = [];
    const args: any[] = [];

    // Build dynamic SET clause
    if (updateData.name !== undefined) {
      setFields.push(`name = $${args.length + 1}`);
      args.push(updateData.name);
    }

    if (updateData.templateId !== undefined) {
      setFields.push(`template_id = $${args.length + 1}`);
      args.push(updateData.templateId);
    }

    if (updateData.startDate !== undefined) {
      setFields.push(`start_date = $${args.length + 1}`);
      args.push(updateData.startDate);
    }

    if (updateData.endDate !== undefined) {
      setFields.push(`end_date = $${args.length + 1}`);
      args.push(updateData.endDate);
    }

    if (updateData.reportType !== undefined) {
      setFields.push(`report_type = $${args.length + 1}`);
      args.push(updateData.reportType);
    }

    if (updateData.status !== undefined) {
      setFields.push(`status = $${args.length + 1}`);
      args.push(updateData.status);
    }

    if (updateData.generatedAt !== undefined) {
      setFields.push(`generated_at = $${args.length + 1}`);
      args.push(updateData.generatedAt);
    }

    if (updateData.downloadUrl !== undefined) {
      setFields.push(`download_url = $${args.length + 1}`);
      args.push(updateData.downloadUrl);
    }

    // Always update the updated_at timestamp
    setFields.push(`updated_at = $${args.length + 1}`);
    args.push(now);

    if (setFields.length === 1) {
      // Only updated_at was set, nothing to update
      return existingReport;
    }

    // Add WHERE clause with organization validation
    let sql = `
      UPDATE reports 
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
    const updatedReport: Report = {
      id: row.id,
      name: row.name,
      organizationId: row.organization_id,
      createdBy: row.created_by,
      templateId: row.template_id,
      startDate: row.start_date,
      endDate: row.end_date,
      reportType: row.report_type as ReportType,
      status: row.status as Report['status'],
      generatedAt: row.generated_at,
      downloadUrl: row.download_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    console.log(`✅ Updated report: ${id}`);
    return updatedReport;
  } catch (error) {
    handleDatabaseError(error, 'update report');
    return null;
  }
}

// Delete report
export async function deleteReport(
  id: string,
  organizationId: string
): Promise<boolean> {
  if (!id || !organizationId) {
    throw new Error('Report ID and Organization ID are required');
  }

  try {
    const db = getDatabase();

    // Delete the report only if it belongs to the organization
    const result = await db.query(
      'DELETE FROM reports WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    const success = result.rowCount !== null && result.rowCount > 0;

    if (success) {
      console.log(`✅ Deleted report: ${id}`);
    } else {
      console.log(`⚠️ Report not found or access denied: ${id}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete report');
    return false;
  }
}

// Get report count for organization
export async function getReportCount(
  organizationId: string,
  status?: Report['status']
): Promise<number> {
  try {
    const db = getDatabase();

    let sql =
      'SELECT COUNT(*) as count FROM reports WHERE organization_id = $1';
    const args: any[] = [organizationId];

    if (status) {
      sql += ' AND status = $2';
      args.push(status);
    }

    const result = await db.query(sql, args);

    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    handleDatabaseError(error, 'get report count');
    return 0;
  }
}

// Get reports statistics
export async function getReportsStats(organizationId?: string): Promise<{
  total: number;
  byStatus: Record<Report['status'], number>;
  byType: Record<ReportType, number>;
}> {
  try {
    const db = getDatabase();

    let sql = 'SELECT status, report_type, COUNT(*) as count FROM reports';
    const args: any[] = [];

    if (organizationId) {
      sql += ' WHERE organization_id = $1';
      args.push(organizationId);
    }

    sql += ' GROUP BY status, report_type';

    const result = await db.query(sql, args);

    const stats = {
      total: 0,
      byStatus: {
        generating: 0,
        completed: 0,
        failed: 0,
      } as Record<Report['status'], number>,
      byType: {
        flight: 0,
        traffic: 0,
        run: 0,
      } as Record<ReportType, number>,
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      stats.total += count;
      stats.byStatus[row.status as Report['status']] =
        (stats.byStatus[row.status as Report['status']] || 0) + count;
      stats.byType[row.report_type as ReportType] =
        (stats.byType[row.report_type as ReportType] || 0) + count;
    });

    return stats;
  } catch (error) {
    handleDatabaseError(error, 'get reports stats');
    return {
      total: 0,
      byStatus: { generating: 0, completed: 0, failed: 0 },
      byType: { flight: 0, traffic: 0, run: 0 },
    };
  }
}

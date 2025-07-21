import { requireAuth } from '../lib/access-control';
import { initJSONResponse } from '../lib/api/api-tools';
import { getDatabase } from '../lib/db';
import {
  createReportTemplate,
  deleteReportTemplate,
  getReportTemplates,
  updateReportTemplate,
  type ReportTemplatesQuery,
} from '../lib/db/report-templates';
import { type ReportTemplateForm, type ReportType } from '../lib/schema';

// Helper function to get user's organization ID from BetterAuth database
async function getUserOrganizationId(userId: string): Promise<string | null> {
  try {
    const db = getDatabase();

    const result = await db.query(
      'SELECT organization_id FROM organization_memberships WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0].organization_id : null;
  } catch (error) {
    console.error('Error fetching user organization:', error);
    return null;
  }
}

// Helper function to check if user is admin using BetterAuth database
async function checkAdminRole(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const db = getDatabase();

    const result = await db.query(
      'SELECT role FROM organization_memberships WHERE user_id = $1 AND organization_id = $2',
      [userId, organizationId]
    );

    return result.rows.length > 0 && result.rows[0].role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

// GET /api/report-templates
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return initJSONResponse({ error: 'User ID is required' }, 400);
    }

    // Get user's organization
    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return initJSONResponse({ error: 'User not in organization' }, 403);
    }

    // Parse query parameters
    const query: ReportTemplatesQuery = {
      organizationId,
      reportType:
        (url.searchParams.get('reportType') as ReportType) || undefined,
      isDefault: url.searchParams.get('isDefault')
        ? url.searchParams.get('isDefault') === 'true'
        : undefined,
      limit: Number(url.searchParams.get('limit')) || 50,
      offset: Number(url.searchParams.get('offset')) || 0,
    };

    const templates = await getReportTemplates(query);

    return initJSONResponse(templates);
  } catch (error) {
    console.error('Failed to get report templates:', error);
    return initJSONResponse({ error: 'Failed to get report templates' }, 500);
  }
}

// POST /api/report-templates
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { templateData } = body as {
      templateData: ReportTemplateForm;
    };

    // Validate auth and get user from session
    const user = await requireAuth(request);

    // Get user's organization
    const organizationId = await getUserOrganizationId(user.id);
    if (!organizationId) {
      return initJSONResponse({ error: 'User not in organization' }, 403);
    }

    // Check if user is admin
    const isAdmin = await checkAdminRole(user.id, organizationId);
    if (!isAdmin) {
      return initJSONResponse({ error: 'Admin role required' }, 403);
    }

    // Create the template
    const template = await createReportTemplate({
      ...templateData,
      organizationId,
      createdBy: user.id,
    });

    return initJSONResponse(template, 201);
  } catch (error) {
    console.error('Failed to create report template:', error);
    return initJSONResponse({ error: 'Failed to create report template' }, 500);
  }
}

// PUT /api/report-templates
export async function PUT(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { id, templateData } = body as {
      id: string;
      templateData: ReportTemplateForm;
    };

    if (!id) {
      return initJSONResponse({ error: 'Template ID is required' }, 400);
    }

    // Validate auth and get user from session
    const user = await requireAuth(request);

    // Get user's organization
    const organizationId = await getUserOrganizationId(user.id);
    if (!organizationId) {
      return initJSONResponse({ error: 'User not in organization' }, 403);
    }

    // Check if user is admin
    const isAdmin = await checkAdminRole(user.id, organizationId);
    if (!isAdmin) {
      return initJSONResponse({ error: 'Admin role required' }, 403);
    }

    // Update the template
    const template = await updateReportTemplate(
      id,
      {
        ...templateData,
        organizationId,
        createdBy: user.id,
      },
      organizationId
    );

    return initJSONResponse(template);
  } catch (error) {
    console.error('Failed to update report template:', error);
    return initJSONResponse({ error: 'Failed to update report template' }, 500);
  }
}

// DELETE /api/report-templates
export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return initJSONResponse({ error: 'Template ID is required' }, 400);
    }

    // Validate auth and get user from session
    const user = await requireAuth(request);

    // Get user's organization
    const organizationId = await getUserOrganizationId(user.id);
    if (!organizationId) {
      return initJSONResponse({ error: 'User not in organization' }, 403);
    }

    // Check if user is admin
    const isAdmin = await checkAdminRole(user.id, organizationId);
    if (!isAdmin) {
      return initJSONResponse({ error: 'Admin role required' }, 403);
    }

    // Delete the template
    await deleteReportTemplate(id, organizationId);

    return initJSONResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete report template:', error);
    return initJSONResponse({ error: 'Failed to delete report template' }, 500);
  }
}

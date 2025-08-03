import type { OrganizationRequest } from '../lib/api/api-tools';
import { initJSONResponse } from '../lib/api/api-tools';
import { getUserOrganizationId } from '../lib/api/server-utils';
import { getDatabase } from '../lib/db';
import {
  reportTemplatesDb,
  type ReportTemplatesQuery,
} from '../lib/db/report-templates-db';
import { type ReportTemplateForm, type ReportType } from '../lib/schema';
import { getCurrentAuthUser } from './auth';

// Helper function to check if user has admin privileges (admin or owner)
async function checkAdminRole(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const db = getDatabase();

    const result = await db.query(
      'SELECT role FROM member WHERE "userId" = $1 AND "organizationId" = $2',
      [userId, organizationId]
    );

    if (result.rows.length === 0) return false;

    const userRole = result.rows[0].role;
    // Both 'owner' and 'admin' have admin privileges
    return userRole === 'admin' || userRole === 'owner';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

// GET /api/report-templates
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get user's organization
    const organizationId = await getUserOrganizationId(
      user.id,
      request as OrganizationRequest
    );
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

    const templates = await reportTemplatesDb.getReportTemplates(query);

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
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get user's organization
    const organizationId = await getUserOrganizationId(
      user.id,
      request as OrganizationRequest
    );
    if (!organizationId) {
      return initJSONResponse({ error: 'User not in organization' }, 403);
    }

    // Check if user is admin
    const isAdmin = await checkAdminRole(user.id, organizationId);
    if (!isAdmin) {
      return initJSONResponse({ error: 'Admin role required' }, 403);
    }

    // Create the template
    const template = await reportTemplatesDb.createReportTemplate({
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
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get user's organization
    const organizationId = await getUserOrganizationId(
      user.id,
      request as OrganizationRequest
    );
    if (!organizationId) {
      return initJSONResponse({ error: 'User not in organization' }, 403);
    }

    // Check if user is admin
    const isAdmin = await checkAdminRole(user.id, organizationId);
    if (!isAdmin) {
      return initJSONResponse({ error: 'Admin role required' }, 403);
    }

    // Update the template
    const template = await reportTemplatesDb.updateReportTemplate(
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
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get user's organization
    const organizationId = await getUserOrganizationId(
      user.id,
      request as OrganizationRequest
    );
    if (!organizationId) {
      return initJSONResponse({ error: 'User not in organization' }, 403);
    }

    // Check if user is admin
    const isAdmin = await checkAdminRole(user.id, organizationId);
    if (!isAdmin) {
      return initJSONResponse({ error: 'Admin role required' }, 403);
    }

    // Delete the template
    await reportTemplatesDb.deleteReportTemplate(id, organizationId);

    return initJSONResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete report template:', error);
    return initJSONResponse({ error: 'Failed to delete report template' }, 500);
  }
}

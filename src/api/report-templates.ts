import { requireAuth } from '../lib/access-control';
import { clerk } from '../lib/api/clerk-client';
import {
  createReportTemplate,
  deleteReportTemplate,
  getReportTemplates,
  updateReportTemplate,
  type ReportTemplatesQuery,
} from '../lib/db/report-templates';
import { type ReportTemplateForm, type ReportType } from '../lib/schema';

// Helper function to get user's organization ID
async function getUserOrganizationId(userId: string): Promise<string | null> {
  try {
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId,
    });

    if (memberships.data.length === 0) {
      return null;
    }

    return memberships.data[0].organization.id;
  } catch (error) {
    console.error('Error fetching user organization:', error);
    return null;
  }
}

// Helper function to check if user is admin
async function checkAdminRole(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId,
    });

    const membership = memberships.data.find(
      m => m.organization.id === organizationId
    );

    return membership?.role === 'org:admin';
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
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user's organization
    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'User not in organization' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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

    return new Response(JSON.stringify(templates), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get report templates:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get report templates' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// POST /api/report-templates
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { templateData, userId } = body as {
      templateData: ReportTemplateForm;
      userId: string;
    };

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate auth
    requireAuth(userId);

    // Get user's organization
    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'User not in organization' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is admin (only admins can create templates)
    const isAdmin = await checkAdminRole(userId, organizationId);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure the template data has the correct organization and creator
    const completeTemplateData: ReportTemplateForm = {
      ...templateData,
      organizationId,
      createdBy: userId,
    };

    const template = await createReportTemplate(completeTemplateData);

    return new Response(JSON.stringify(template), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to create report template:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create report template' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// PUT /api/report-templates
export async function PUT(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { id, templateData, userId } = body as {
      id: string;
      templateData: ReportTemplateForm;
      userId: string;
    };

    if (!userId || !id) {
      return new Response(
        JSON.stringify({ error: 'User ID and template ID are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate auth
    requireAuth(userId);

    // Get user's organization
    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'User not in organization' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is admin (only admins can update templates)
    const isAdmin = await checkAdminRole(userId, organizationId);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure the template data has the correct organization and creator
    const completeTemplateData: ReportTemplateForm = {
      ...templateData,
      organizationId,
      createdBy: userId,
    };

    const updatedTemplate = await updateReportTemplate(
      id,
      completeTemplateData,
      organizationId
    );

    if (!updatedTemplate) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(updatedTemplate), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update report template:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update report template' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE /api/report-templates
export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');

    if (!id || !userId) {
      return new Response(
        JSON.stringify({ error: 'Template ID and User ID are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate auth
    requireAuth(userId);

    // Get user's organization
    const organizationId = await getUserOrganizationId(userId);
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'User not in organization' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is admin (only admins can delete templates)
    const isAdmin = await checkAdminRole(userId, organizationId);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const success = await deleteReportTemplate(id, organizationId);

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Template not found or cannot be deleted' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to delete report template:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete report template' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

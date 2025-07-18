import { z } from 'zod';
import {
  createReportTemplate,
  deleteReportTemplate,
  getDefaultReportTemplate,
  getReportTemplateById,
  getReportTemplateCount,
  getReportTemplates,
  updateReportTemplate,
  type CreateReportTemplateData,
  type UpdateReportTemplateData,
} from '../lib/db/report-templates';
import { ReportTemplateSchema, type ReportType } from '../lib/schema';

// Validation schemas for API requests
const CreateReportTemplateRequestSchema = ReportTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const UpdateReportTemplateRequestSchema = ReportTemplateSchema.partial().omit({
  id: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
});

const ReportTemplatesQuerySchema = z.object({
  reportType: z.enum(['flight', 'traffic', 'run']).default('run'),
  createdBy: z.string().optional(),
  isDefault: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  orderBy: z.enum(['name', 'created_at', 'updated_at']).default('created_at'),
  orderDirection: z.enum(['ASC', 'DESC']).default('DESC'),
});

// Helper to get user info from request (would integrate with your auth system)
function getUserFromRequest(req: Request): {
  userId: string;
  organizationId: string;
  isAdmin: boolean;
} {
  // This would integrate with your Clerk auth system
  // For now, returning mock data - you'll need to implement this based on your auth setup
  const userId = req.headers.get('x-user-id');
  const organizationId = req.headers.get('x-organization-id');
  const isAdmin = req.headers.get('x-is-admin') === 'true';

  if (!userId || !organizationId) {
    throw new Error('Authentication required');
  }

  return { userId, organizationId, isAdmin };
}

// GET /api/report-templates
export async function getReportTemplatesHandler(
  req: Request
): Promise<Response> {
  try {
    const { userId, organizationId, isAdmin } = getUserFromRequest(req);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Parse and validate query parameters
    const query = ReportTemplatesQuerySchema.parse({
      ...queryParams,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
      isDefault: queryParams.isDefault
        ? queryParams.isDefault === 'true'
        : undefined,
    });

    const templates = await getReportTemplates({
      ...query,
      organizationId,
      reportType: query.reportType as ReportType | undefined,
    });

    const total = await getReportTemplateCount(
      organizationId,
      query.reportType as ReportType | undefined
    );

    return new Response(
      JSON.stringify({
        templates,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting report templates:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Authentication required' ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/report-templates/:id
export async function getReportTemplateHandler(
  req: Request
): Promise<Response> {
  try {
    const { userId, organizationId, isAdmin } = getUserFromRequest(req);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const templateId = url.pathname.split('/').pop();

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'Template ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const template = await getReportTemplateById(templateId, organizationId);

    if (!template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ template }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting report template:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Authentication required' ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/report-templates
export async function createReportTemplateHandler(
  req: Request
): Promise<Response> {
  try {
    const { userId, organizationId, isAdmin } = getUserFromRequest(req);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const validatedData = CreateReportTemplateRequestSchema.parse(body);

    const templateData: CreateReportTemplateData = {
      ...validatedData,
      organizationId,
      createdBy: userId,
    };

    const template = await createReportTemplate(templateData);

    return new Response(JSON.stringify({ template }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating report template:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request data',
          details: error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Authentication required' ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT /api/report-templates/:id
export async function updateReportTemplateHandler(
  req: Request
): Promise<Response> {
  try {
    const { userId, organizationId, isAdmin } = getUserFromRequest(req);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const templateId = url.pathname.split('/').pop();

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'Template ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const validatedData = UpdateReportTemplateRequestSchema.parse(body);

    const template = await updateReportTemplate(
      templateId,
      validatedData as UpdateReportTemplateData,
      organizationId
    );

    if (!template) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ template }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating report template:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request data',
          details: error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Authentication required' ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/report-templates/:id
export async function deleteReportTemplateHandler(
  req: Request
): Promise<Response> {
  try {
    const { userId, organizationId, isAdmin } = getUserFromRequest(req);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const templateId = url.pathname.split('/').pop();

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'Template ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const success = await deleteReportTemplate(templateId, organizationId);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ message: 'Template deleted successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting report template:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Authentication required' ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/report-templates/default/:reportType
export async function getDefaultReportTemplateHandler(
  req: Request
): Promise<Response> {
  try {
    const { userId, organizationId, isAdmin } = getUserFromRequest(req);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const reportType = url.pathname.split('/').pop() as ReportType;

    if (!reportType || !['flight', 'traffic', 'run'].includes(reportType)) {
      return new Response(
        JSON.stringify({ error: 'Valid report type is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const template = await getDefaultReportTemplate(organizationId, reportType);

    return new Response(JSON.stringify({ template }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting default report template:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Authentication required' ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

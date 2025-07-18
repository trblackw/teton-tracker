import {
  checkRunOwnership,
  createErrorResponse,
  requireAuth,
} from '../lib/access-control';
import { clerk } from '../lib/api/clerk-client';
import {
  createRun,
  deleteRun,
  getRuns,
  updateRun,
  type RunsQuery,
} from '../lib/db/runs';
import { type NewRunForm, type RunStatus } from '../lib/schema';

// Helper function to get all organization member user IDs for an admin
async function getOrganizationMemberIds(
  adminUserId: string
): Promise<string[]> {
  try {
    // Get admin's organization memberships
    const adminOrgMemberships = await clerk.users.getOrganizationMembershipList(
      {
        userId: adminUserId,
      }
    );

    if (adminOrgMemberships.data.length === 0) {
      return [];
    }

    // Get the organization (assuming single org model)
    const orgId = adminOrgMemberships.data[0].organization.id;

    // Check if admin has admin role in the organization
    const adminRole = adminOrgMemberships.data[0].role;
    if (adminRole !== 'org:admin') {
      throw new Error('Access denied: Admin role required');
    }

    // Get all organization members
    const orgMemberships =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      });

    // Return all member user IDs
    return orgMemberships.data.map(
      (membership: any) => membership.publicUserData.userId
    );
  } catch (error) {
    console.error('Error fetching organization members:', error);
    throw error;
  }
}

// GET /api/runs/organization - Admin-only endpoint to get runs for all org members
export async function getOrganizationRuns(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const adminUserId = url.searchParams.get('userId');

    if (!adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Admin user ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all organization member user IDs (includes admin check)
    const memberUserIds = await getOrganizationMemberIds(adminUserId);

    if (memberUserIds.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch runs for all organization members
    const allRuns = await Promise.all(
      memberUserIds.map(userId => getRuns({ userId }))
    );

    // Flatten the results
    const flattenedRuns = allRuns.flat();

    // Sort by scheduled time (most recent first)
    flattenedRuns.sort(
      (a, b) =>
        new Date(b.scheduledTime).getTime() -
        new Date(a.scheduledTime).getTime()
    );

    return new Response(JSON.stringify(flattenedRuns), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching organization runs:', error);
    return createErrorResponse(
      error instanceof Error
        ? error
        : new Error('Failed to fetch organization runs'),
      500
    );
  }
}

// GET /api/runs
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

    const statusParam = url.searchParams.get('status');
    const status = statusParam
      ? (statusParam.split(',') as RunStatus[])
      : undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : undefined;
    const offsetParam = url.searchParams.get('offset');
    const offset = offsetParam ? parseInt(offsetParam) : undefined;
    const orderByParam = url.searchParams.get('orderBy');
    const orderBy =
      orderByParam && orderByParam !== 'null' && orderByParam !== 'undefined'
        ? (orderByParam as 'scheduled_time' | 'created_at' | 'updated_at')
        : undefined;
    const orderDirectionParam = url.searchParams.get('orderDirection');
    const orderDirection =
      orderDirectionParam &&
      orderDirectionParam !== 'null' &&
      orderDirectionParam !== 'undefined'
        ? (orderDirectionParam as 'ASC' | 'DESC')
        : undefined;

    const query: RunsQuery = {
      userId, // This ensures we only get runs for the authenticated user
      status,
      limit,
      offset,
      orderBy,
      orderDirection,
    };

    const runs = await getRuns(query);

    return new Response(JSON.stringify(runs), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get runs:', error);
    return new Response(JSON.stringify({ error: 'Failed to get runs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/runs
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { runData, userId } = body as {
      runData: NewRunForm;
      userId: string;
    };

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // For creation, we don't need access control validation since the user is creating their own resource
    const run = await createRun(runData, userId);

    return new Response(JSON.stringify(run), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to create run:', error);
    return new Response(JSON.stringify({ error: 'Failed to create run' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT /api/runs
export async function PUT(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { action, id, status, userId } = body as {
      action: string;
      id: string;
      status: any;
      userId: string;
    };

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'Run ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate that the user owns this run before allowing updates
    try {
      const authUserId = requireAuth(userId);
      await checkRunOwnership(id, authUserId);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (action === 'update_status') {
      // For status updates, we need to update the run with the new status
      const updateData: any = { status };

      // Set completed_at if status is completed
      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }

      const updatedRun = await updateRun(id, updateData, userId);
      const success = updatedRun !== null;

      return new Response(JSON.stringify({ success, updatedRun }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update run:', error);
    return new Response(JSON.stringify({ error: 'Failed to update run' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/runs/:id
export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const userId = url.searchParams.get('userId');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing run ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate that the user owns this run before allowing deletion
    try {
      const authUserId = requireAuth(userId);
      await checkRunOwnership(id, authUserId);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }

    const success = await deleteRun(id, userId);

    return new Response(JSON.stringify({ success }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to delete run:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete run' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

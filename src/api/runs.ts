import { checkRunOwnership, createErrorResponse } from '../lib/access-control';
import { initJSONResponse } from '../lib/api/api-tools';
import { getDatabase } from '../lib/db/index';
import { runsDb, type RunsQuery } from '../lib/db/runs-db';
import { type NewRunForm, type Run, type RunStatus } from '../lib/schema';
import { getCurrentAuthUser } from './auth';

// Helper function to get all organization member user IDs for an admin using BetterAuth tables
async function getOrganizationMemberIds(
  adminUserId: string
): Promise<string[]> {
  try {
    const db = getDatabase();

    // Get admin's organization memberships from our database
    const adminMemberships = await db.query(
      `SELECT organization_id, role 
       FROM organization_memberships 
       WHERE user_id = $1`,
      [adminUserId]
    );

    if (adminMemberships.rows.length === 0) {
      return [];
    }

    // Find the first organization where user has admin role
    const adminMembership = adminMemberships.rows.find(
      row => row.role === 'admin'
    );

    if (!adminMembership) {
      throw new Error('Access denied: Admin role required');
    }

    const orgId = adminMembership.organization_id;

    // Get all organization members from our database
    const orgMembers = await db.query(
      `SELECT user_id 
       FROM organization_memberships 
       WHERE organization_id = $1`,
      [orgId]
    );

    // Return all member user IDs
    return orgMembers.rows.map(row => row.user_id);
  } catch (error) {
    console.error('Error fetching organization members:', error);
    throw error;
  }
}

// GET /api/runs/organization - Admin-only endpoint to get runs for all org members
export async function getOrganizationRuns(request: Request): Promise<Response> {
  try {
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get all organization member user IDs (includes admin check)
    const memberUserIds = await getOrganizationMemberIds(user.id);

    if (memberUserIds.length === 0) {
      return initJSONResponse([]);
    }

    // Fetch runs for all organization members
    const allRuns = await Promise.all(
      memberUserIds.map(createdById => runsDb.getRuns({ createdById }))
    );

    // Flatten the results
    const flattenedRuns = allRuns.flat();

    // Sort by scheduled time (most recent first)
    flattenedRuns.sort(
      (a, b) =>
        new Date(b.scheduledTime).getTime() -
        new Date(a.scheduledTime).getTime()
    );

    return initJSONResponse(flattenedRuns);
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
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const url = new URL(request.url);
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
      createdById: user.id, // Use authenticated user's ID
      status,
      limit,
      offset,
      orderBy,
      orderDirection,
    };

    const runs = await runsDb.getRuns(query);

    return initJSONResponse(runs);
  } catch (error) {
    console.error('Failed to get runs:', error);
    return initJSONResponse({ error: 'Failed to get runs' }, 500);
  }
}

// POST /api/runs
export async function POST(request: Request): Promise<Response> {
  try {
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const body = await request.json();
    const { runData } = body as {
      runData: NewRunForm;
    };

    // Create run for the authenticated user
    const run = await runsDb.createRun(runData, user.id);

    return initJSONResponse(run, 201);
  } catch (error) {
    console.error('Failed to create run:', error);
    return initJSONResponse({ error: 'Failed to create run' }, 500);
  }
}

// PUT /api/runs
export async function PUT(request: Request): Promise<Response> {
  try {
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }
    const body = await request.json();
    const { action, id, status } = body as {
      action: string;
      id: string;
      status: any;
    };

    if (!id) {
      return initJSONResponse({ error: 'Run ID is required' }, 400);
    }

    // Validate that the user owns this run before allowing updates
    try {
      await checkRunOwnership(id, user.id);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (action === 'update_status') {
      // For status updates, we need to update the run with the new status
      const updateData: Partial<Run> = { status };

      // Set activated_at when status changes to active
      if (status === 'active') {
        updateData.activatedAt = new Date();
      }

      // Set completed_at and calculate actual duration if status is completed
      if (status === 'completed') {
        updateData.completedAt = new Date();
        updateData.activatedAt = null;

        // Calculate actual duration if the run was previously activated
        try {
          const currentRun = await runsDb.getRunById(id, user.id);
          if (currentRun?.activatedAt) {
            const activatedTime = new Date(currentRun.activatedAt).getTime();
            const completedTime = updateData.completedAt.getTime();
            const durationMs = completedTime - activatedTime;
            const durationMinutes = Math.round(durationMs / (1000 * 60)); // Convert to minutes
            updateData.actualDuration = Math.max(0, durationMinutes); // Ensure non-negative
          }
        } catch (error) {
          console.warn('Failed to calculate actual duration:', error);
          // Continue with the update even if duration calculation fails
        }
      }

      const updatedRun = await runsDb.updateRun(id, updateData, user.id);
      const success = updatedRun !== null;

      return initJSONResponse({ success, updatedRun });
    }

    return initJSONResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('Failed to update run:', error);
    return initJSONResponse({ error: 'Failed to update run' }, 500);
  }
}

// DELETE /api/runs/:id
export async function DELETE(request: Request): Promise<Response> {
  try {
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return initJSONResponse({ error: 'Missing run ID' }, 400);
    }

    // Validate that the user owns this run before allowing deletion
    try {
      await checkRunOwnership(id, user.id);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }

    const success = await runsDb.deleteRun(id, user.id);

    return initJSONResponse({ success });
  } catch (error) {
    console.error('Failed to delete run:', error);
    return initJSONResponse({ error: 'Failed to delete run' }, 500);
  }
}

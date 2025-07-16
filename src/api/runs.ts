import {
  checkRunOwnership,
  createErrorResponse,
  requireAuth,
} from '../lib/access-control';
import {
  createRun,
  deleteRun,
  getRuns,
  updateRun,
  type RunsQuery,
} from '../lib/db/runs';
import { type NewRunForm, type RunStatus } from '../lib/schema';

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

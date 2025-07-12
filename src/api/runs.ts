import {
  createRun,
  deleteRun,
  getRuns,
  updateRunStatus,
  type RunsQuery,
} from '../lib/db/runs';
import { type NewRunForm, type RunStatus } from '../lib/schema';

// GET /api/runs
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || undefined; // Don't generate one if not provided
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
      userId,
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
      userId?: string;
    };

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

// PUT /api/runs/:id/status
export async function PUT(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const runId = pathParts[pathParts.length - 2]; // /api/runs/:id/status

    const body = await request.json();
    const { status, userId } = body as { status: RunStatus; userId?: string };

    const success = await updateRunStatus(runId, status, userId);

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Run not found or unauthorized' }),
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
    console.error('Failed to update run status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update run status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE /api/runs/:id
export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const runId = pathParts[pathParts.length - 1]; // /api/runs/:id

    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    const success = await deleteRun(runId, userId);

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Run not found or unauthorized' }),
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
    console.error('Failed to delete run:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete run' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

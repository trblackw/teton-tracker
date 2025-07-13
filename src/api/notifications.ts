import { generateUserId } from '../lib/db';
import {
  cleanupOldNotifications,
  createNotification,
  deleteNotification,
  getNotifications,
  getNotificationStats,
  markAllNotificationsAsRead,
  updateNotificationReadStatus,
  type CreateNotificationData,
  type NotificationsQuery,
} from '../lib/db/notifications';

// GET /api/notifications
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || generateUserId();

    // Parse query parameters
    const query: NotificationsQuery = {
      userId,
      limit: Number(url.searchParams.get('limit')) || 50,
      offset: Number(url.searchParams.get('offset')) || 0,
      orderBy:
        (url.searchParams.get('orderBy') as 'created_at' | 'updated_at') ||
        'created_at',
      orderDirection:
        (url.searchParams.get('orderDirection') as 'ASC' | 'DESC') || 'DESC',
    };

    // Optional filters
    const typeParam = url.searchParams.get('type');
    if (typeParam) {
      query.type = typeParam.split(',') as any;
    }

    const isReadParam = url.searchParams.get('isRead');
    if (isReadParam !== null) {
      query.isRead = isReadParam === 'true';
    }

    const flightNumber = url.searchParams.get('flightNumber');
    if (flightNumber) {
      query.flightNumber = flightNumber;
    }

    const search = url.searchParams.get('search');
    if (search) {
      query.search = search;
    }

    const notifications = await getNotifications(query);

    return new Response(JSON.stringify(notifications), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get notifications' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// POST /api/notifications
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { notificationData, userId } = body as {
      notificationData: CreateNotificationData;
      userId?: string;
    };

    const notification = await createNotification(notificationData, userId);

    return new Response(JSON.stringify(notification), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create notification' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// PUT /api/notifications
export async function PUT(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { action, id, isRead, userId } = body as {
      action: 'mark_read' | 'mark_all_read';
      id?: string;
      isRead?: boolean;
      userId?: string;
    };

    let success = false;

    switch (action) {
      case 'mark_read':
        if (!id || isRead === undefined) {
          return new Response(
            JSON.stringify({ error: 'Missing id or isRead parameter' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        success = await updateNotificationReadStatus(id, isRead, userId);
        break;

      case 'mark_all_read':
        success = await markAllNotificationsAsRead(userId);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update notification:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update notification' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// DELETE /api/notifications
export async function DELETE(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action');

    let success = false;

    if (action === 'cleanup') {
      const daysToKeep = Number(url.searchParams.get('daysToKeep')) || 30;
      success = await cleanupOldNotifications(userId || undefined, daysToKeep);
    } else if (id) {
      success = await deleteNotification(id, userId || undefined);
    } else {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete notification' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET /api/notifications/stats
export async function getStats(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || generateUserId();

    const stats = await getNotificationStats(userId);

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get notification stats' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

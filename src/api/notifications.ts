import {
  checkNotificationOwnership,
  createErrorResponse,
} from '../lib/access-control';
import { initJSONResponse } from '../lib/api/api-tools';
import {
  createNotification,
  deleteNotification,
  getNotifications,
  getNotificationsStats,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationForm,
  type NotificationsQuery,
} from '../lib/db/notifications';
import { getCurrentAuthUser } from './auth';

// GET /api/notifications
export async function GET(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const url = new URL(request.url);

    // Parse query parameters
    const query: NotificationsQuery = {
      userId: user.id, // Use authenticated user's ID
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

    return initJSONResponse(notifications);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return initJSONResponse({ error: 'Failed to get notifications' }, 500);
  }
}

// POST /api/notifications
export async function POST(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const body = await request.json();
    const { notificationData } = body as {
      notificationData: NotificationForm;
    };

    // Create notification for the authenticated user
    const notification = await createNotification(notificationData, user.id);

    return initJSONResponse(notification, 201);
  } catch (error) {
    console.error('Failed to create notification:', error);
    return initJSONResponse({ error: 'Failed to create notification' }, 500);
  }
}

// PUT /api/notifications
export async function PUT(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const body = await request.json();
    const { action, id, isRead } = body as {
      action: 'mark_read' | 'mark_all_read';
      id?: string;
      isRead?: boolean;
    };

    let success = false;

    switch (action) {
      case 'mark_read':
        if (!id || isRead === undefined) {
          return initJSONResponse(
            { error: 'Missing id or isRead parameter' },
            400
          );
        }

        // Validate that the user owns this notification before allowing updates
        try {
          await checkNotificationOwnership(id, user.id);
        } catch (error) {
          return createErrorResponse(
            error instanceof Error ? error : new Error(String(error))
          );
        }

        if (isRead) {
          success = await markNotificationAsRead(id, user.id);
        } else {
          // For now, we only support marking as read, not unread
          success = false;
        }
        break;

      case 'mark_all_read':
        // For mark_all_read, we only mark the user's own notifications
        success = await markAllNotificationsAsRead(user.id);
        break;

      default:
        return initJSONResponse({ error: 'Invalid action' }, 400);
    }

    return initJSONResponse({ success });
  } catch (error) {
    console.error('Failed to update notification:', error);
    return initJSONResponse({ error: 'Failed to update notification' }, 500);
  }
}

// DELETE /api/notifications
export async function DELETE(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return initJSONResponse({ error: 'Missing id parameter' }, 400);
    }

    // Validate that the user owns this notification before allowing deletion
    try {
      await checkNotificationOwnership(id, user.id);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );
    }

    const success = await deleteNotification(id, user.id);

    return initJSONResponse({ success });
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return initJSONResponse({ error: 'Failed to delete notification' }, 500);
  }
}

// GET /api/notifications/stats
export async function getStats(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Stats are user-specific by design, so we don't need additional access control
    const stats = await getNotificationsStats(user.id);

    return initJSONResponse(stats);
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    return initJSONResponse({ error: 'Failed to get notification stats' }, 500);
  }
}

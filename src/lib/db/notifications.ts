import { type Notification } from '../schema';
import { getDatabase, getOrCreateUser, handleDatabaseError } from './index';

// Form type for creating notifications
export type NotificationForm = Omit<
  Notification,
  'id' | 'userId' | 'isRead' | 'createdAt' | 'updatedAt'
>;

// Legacy alias for backward compatibility
export type CreateNotificationData = NotificationForm;

export interface NotificationsQuery {
  userId?: string;
  type?: string[];
  isRead?: boolean;
  flightNumber?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at';
  orderDirection?: 'ASC' | 'DESC';
}

// Create a new notification
export async function createNotification(
  notificationData: NotificationForm,
  userId?: string
): Promise<Notification> {
  try {
    const db = getDatabase();
    const currentUserId = userId || (await getOrCreateUser());
    const notificationId = crypto.randomUUID();
    const now = new Date().toISOString();

    const notification: Notification = {
      id: notificationId,
      userId: currentUserId,
      ...notificationData,
      isRead: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await db.query(
      `INSERT INTO notifications (
        id, user_id, type, title, message, flight_number, pickup_location, 
        dropoff_location, run_id, is_read, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        notification.id,
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.flightNumber || null,
        notification.pickupLocation || null,
        notification.dropoffLocation || null,
        notification.runId || null,
        notification.isRead,
        JSON.stringify(notification.metadata),
        now,
        now,
      ]
    );

    console.log(`✅ Created notification: ${notification.id}`);
    return notification;
  } catch (error) {
    handleDatabaseError(error, 'create notification');
    throw new Error('Failed to create notification');
  }
}

// Get notifications with optional filtering and search
export async function getNotifications(
  query: NotificationsQuery = {}
): Promise<Notification[]> {
  try {
    const db = getDatabase();
    const {
      userId,
      type,
      isRead,
      flightNumber,
      search,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC',
    } = query;

    // Start with base query
    let sql = `
      SELECT 
        id, user_id, type, title, message, flight_number, pickup_location, 
        dropoff_location, run_id, is_read, metadata, created_at, updated_at
      FROM notifications
    `;

    const conditions: string[] = [];
    const args: any[] = [];

    // Add conditions
    if (userId) {
      conditions.push(`user_id = $${args.length + 1}`);
      args.push(userId);
    }

    if (type) {
      conditions.push(`type = $${args.length + 1}`);
      args.push(type);
    }

    if (isRead !== undefined) {
      conditions.push(`is_read = $${args.length + 1}`);
      args.push(isRead);
    }

    if (flightNumber) {
      conditions.push(`flight_number = $${args.length + 1}`);
      args.push(flightNumber);
    }

    if (search) {
      conditions.push(
        `(title ILIKE $${args.length + 1} OR message ILIKE $${args.length + 1})`
      );
      args.push(`%${search}%`);
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY and LIMIT
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    sql += ` LIMIT $${args.length + 1} OFFSET $${args.length + 2}`;
    args.push(limit, offset);

    const result = await db.query(sql, args);

    // Transform database rows to Notification objects
    const notifications: Notification[] = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      flightNumber: row.flight_number,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      runId: row.run_id,
      isRead: row.is_read,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return notifications;
  } catch (error) {
    handleDatabaseError(error, 'get notifications');
    return [];
  }
}

// Get a single notification by ID
export async function getNotificationById(
  id: string,
  userId?: string
): Promise<Notification | null> {
  try {
    const db = getDatabase();

    let sql = `
      SELECT 
        id, user_id, type, title, message, flight_number, pickup_location, 
        dropoff_location, run_id, is_read, metadata, created_at, updated_at
      FROM notifications
      WHERE id = $1
    `;

    const args = [id];

    if (userId) {
      sql += ' AND user_id = $2';
      args.push(userId);
    }

    const result = await db.query(sql, args);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      flightNumber: row.flight_number,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      runId: row.run_id,
      isRead: row.is_read,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get notification by id');
    return null;
  }
}

// Mark notification as read
export async function markNotificationAsRead(
  id: string,
  userId?: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    let sql = `
      UPDATE notifications 
      SET is_read = $1, updated_at = $2
      WHERE id = $3
    `;

    const args = [true, now, id];

    if (userId) {
      sql += ' AND user_id = $4';
      args.push(userId);
    }

    const result = await db.query(sql, args);

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`✅ Marked notification ${id} as read`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'mark notification as read');
    return false;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(
  userId: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const result = await db.query(
      `UPDATE notifications 
       SET is_read = $1, updated_at = $2
       WHERE user_id = $3 AND is_read = $4`,
      [true, now, userId, false]
    );

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`✅ Marked all notifications as read for user ${userId}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'mark all notifications as read');
    return false;
  }
}

// Delete a notification
export async function deleteNotification(
  id: string,
  userId?: string
): Promise<boolean> {
  try {
    const db = getDatabase();

    let sql = 'DELETE FROM notifications WHERE id = $1';
    const args = [id];

    if (userId) {
      sql += ' AND user_id = $2';
      args.push(userId);
    }

    const result = await db.query(sql, args);

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`🗑️ Deleted notification: ${id}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete notification');
    return false;
  }
}

// Delete all notifications for a user
export async function deleteAllNotifications(userId: string): Promise<boolean> {
  try {
    const db = getDatabase();

    const result = await db.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [userId]
    );

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`🗑️ Deleted all notifications for user ${userId}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete all notifications');
    return false;
  }
}

// Delete notifications by run ID
export async function deleteNotificationsByRunId(
  runId: string
): Promise<boolean> {
  try {
    const db = getDatabase();

    const result = await db.query(
      'DELETE FROM notifications WHERE run_id = $1',
      [runId]
    );

    const success = result.rowCount != null && result.rowCount > 0;
    if (success) {
      console.log(`🗑️ Deleted notifications for run: ${runId}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete notifications by run id');
    return false;
  }
}

// Get notification count for a user
export async function getNotificationCount(
  userId: string,
  onlyUnread: boolean = false
): Promise<number> {
  try {
    const db = getDatabase();

    let sql = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1';
    const args: any[] = [userId];

    if (onlyUnread) {
      sql += ' AND is_read = $2';
      args.push(false);
    }

    const result = await db.query(sql, args);

    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    handleDatabaseError(error, 'get notification count');
    return 0;
  }
}

// Get notifications statistics
export async function getNotificationsStats(userId?: string): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
}> {
  try {
    const db = getDatabase();

    let sql = 'SELECT type, is_read, COUNT(*) as count FROM notifications';
    const args: any[] = [];

    if (userId) {
      sql += ' WHERE user_id = $1';
      args.push(userId);
    }

    sql += ' GROUP BY type, is_read';

    const result = await db.query(sql, args);

    const stats = {
      total: 0,
      unread: 0,
      byType: {} as Record<string, number>,
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      const type = row.type;
      const isRead = row.is_read;

      stats.total += count;
      if (!isRead) {
        stats.unread += count;
      }

      if (!stats.byType[type]) {
        stats.byType[type] = 0;
      }
      stats.byType[type] += count;
    });

    return stats;
  } catch (error) {
    handleDatabaseError(error, 'get notifications stats');
    return {
      total: 0,
      unread: 0,
      byType: {},
    };
  }
}

// Bulk create notifications
export async function createBulkNotifications(
  notificationsData: NotificationForm[],
  userId?: string
): Promise<Notification[]> {
  try {
    const db = getDatabase();
    const currentUserId = userId || (await getOrCreateUser());
    const notifications: Notification[] = [];
    const now = new Date().toISOString();

    // Start transaction
    await db.query('BEGIN');

    try {
      for (const notificationData of notificationsData) {
        const notificationId = crypto.randomUUID();

        const notification: Notification = {
          id: notificationId,
          userId: currentUserId,
          ...notificationData,
          isRead: false,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        };

        await db.query(
          `INSERT INTO notifications (
            id, user_id, type, title, message, flight_number, pickup_location, 
            dropoff_location, run_id, is_read, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            notification.id,
            notification.userId,
            notification.type,
            notification.title,
            notification.message,
            notification.flightNumber || null,
            notification.pickupLocation || null,
            notification.dropoffLocation || null,
            notification.runId || null,
            notification.isRead,
            JSON.stringify(notification.metadata),
            now,
            now,
          ]
        );

        notifications.push(notification);
      }

      // Commit transaction
      await db.query('COMMIT');

      console.log(`✅ Created ${notifications.length} notifications in batch`);
      return notifications;
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    handleDatabaseError(error, 'create bulk notifications');
    throw new Error('Failed to create bulk notifications');
  }
}

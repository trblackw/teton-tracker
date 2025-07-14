import { type Notification, type NotificationType } from '../schema';
import { getDatabase, getOrCreateUser, handleDatabaseError } from './index';

export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  flightNumber?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  runId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationsQuery {
  userId?: string;
  type?: NotificationType[];
  isRead?: boolean;
  flightNumber?: string;
  search?: string; // Search in title, message, flight number, locations
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at';
  orderDirection?: 'ASC' | 'DESC';
}

// Create a new notification
export async function createNotification(
  data: CreateNotificationData,
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
      ...data,
      isRead: false,
      metadata: data.metadata || {},
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await db.execute({
      sql: `
        INSERT INTO notifications (
          id, user_id, type, title, message, flight_number, pickup_location, 
          dropoff_location, run_id, is_read, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
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
      ],
    });

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
      conditions.push('user_id = ?');
      args.push(userId);
    }

    if (type && Array.isArray(type) && type.length > 0) {
      const placeholders = type.map(() => '?').join(',');
      conditions.push(`type IN (${placeholders})`);
      args.push(...type);
    }

    if (isRead !== undefined) {
      conditions.push('is_read = ?');
      args.push(isRead);
    }

    if (flightNumber) {
      conditions.push('flight_number = ?');
      args.push(flightNumber);
    }

    if (search) {
      conditions.push(`(
        title LIKE ? OR 
        message LIKE ? OR 
        flight_number LIKE ? OR 
        pickup_location LIKE ? OR 
        dropoff_location LIKE ?
      )`);
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY and LIMIT
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    sql += ` LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await db.execute({ sql, args });

    const notifications: Notification[] = result.rows.map(row => ({
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as NotificationType,
      title: row.title as string,
      message: row.message as string,
      flightNumber: row.flight_number as string | undefined,
      pickupLocation: row.pickup_location as string | undefined,
      dropoffLocation: row.dropoff_location as string | undefined,
      runId: row.run_id as string | undefined,
      isRead: Boolean(row.is_read),
      metadata: JSON.parse((row.metadata as string) || '{}'),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));

    console.log(`📊 Retrieved ${notifications.length} notifications`);
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
      WHERE id = ?
    `;
    const args: any[] = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id as string,
      userId: row.user_id as string,
      type: row.type as NotificationType,
      title: row.title as string,
      message: row.message as string,
      flightNumber: row.flight_number as string | undefined,
      pickupLocation: row.pickup_location as string | undefined,
      dropoffLocation: row.dropoff_location as string | undefined,
      runId: row.run_id as string | undefined,
      isRead: Boolean(row.is_read),
      metadata: JSON.parse((row.metadata as string) || '{}'),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  } catch (error) {
    handleDatabaseError(error, 'get notification by ID');
    return null;
  }
}

// Mark notification as read/unread
export async function updateNotificationReadStatus(
  id: string,
  isRead: boolean,
  userId?: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    let sql = `
      UPDATE notifications 
      SET is_read = ?, updated_at = ?
      WHERE id = ?
    `;
    const args: any[] = [isRead, now, id];

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(`✅ Updated notification ${id} read status to ${isRead}`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'update notification read status');
    return false;
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(
  userId?: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    const currentUserId = userId || (await getOrCreateUser());
    const now = new Date().toISOString();

    const result = await db.execute({
      sql: `
        UPDATE notifications 
        SET is_read = TRUE, updated_at = ?
        WHERE user_id = ? AND is_read = FALSE
      `,
      args: [now, currentUserId],
    });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(
        `✅ Marked ${result.rowsAffected} notifications as read for user ${currentUserId}`
      );
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

    let sql = 'DELETE FROM notifications WHERE id = ?';
    const args: any[] = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    const success = result.rowsAffected > 0;
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
export async function deleteAllNotifications(
  userId?: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    const currentUserId = userId || (await getOrCreateUser());

    const result = await db.execute({
      sql: 'DELETE FROM notifications WHERE user_id = ?',
      args: [currentUserId],
    });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(
        `🗑️ Deleted ${result.rowsAffected} notifications for user ${currentUserId}`
      );
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete all notifications');
    return false;
  }
}

// Delete all notifications associated with a run (cascade delete)
export async function deleteNotificationsByRunId(
  runId: string
): Promise<boolean> {
  try {
    const db = getDatabase();

    const result = await db.execute({
      sql: 'DELETE FROM notifications WHERE run_id = ?',
      args: [runId],
    });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(
        `🗑️ Deleted ${result.rowsAffected} notifications for run ${runId}`
      );
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete notifications by run ID');
    return false;
  }
}

// Delete all notifications associated with a user (cascade delete)
export async function deleteNotificationsByUserId(
  userId: string
): Promise<boolean> {
  try {
    const db = getDatabase();

    const result = await db.execute({
      sql: 'DELETE FROM notifications WHERE user_id = ?',
      args: [userId],
    });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(
        `🗑️ Deleted ${result.rowsAffected} notifications for user ${userId}`
      );
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'delete notifications by user ID');
    return false;
  }
}

// Get notification statistics
export async function getNotificationStats(userId?: string): Promise<{
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}> {
  try {
    const db = getDatabase();
    const currentUserId = userId || (await getOrCreateUser());

    const result = await db.execute({
      sql: `
        SELECT 
          type, 
          is_read, 
          COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? 
        GROUP BY type, is_read
      `,
      args: [currentUserId],
    });

    const stats = {
      total: 0,
      unread: 0,
      byType: {
        flight_update: 0,
        traffic_alert: 0,
        run_reminder: 0,
        status_change: 0,
        system: 0,
      } as Record<NotificationType, number>,
    };

    result.rows.forEach(row => {
      const count = row.count as number;
      const type = row.type as NotificationType;
      const isRead = Boolean(row.is_read);

      stats.total += count;
      stats.byType[type] += count;

      if (!isRead) {
        stats.unread += count;
      }
    });

    return stats;
  } catch (error) {
    handleDatabaseError(error, 'get notification stats');
    return {
      total: 0,
      unread: 0,
      byType: {
        flight_update: 0,
        traffic_alert: 0,
        run_reminder: 0,
        status_change: 0,
        system: 0,
      },
    };
  }
}

// Cleanup old notifications (keep only last N days)
export async function cleanupOldNotifications(
  userId?: string,
  daysToKeep: number = 30
): Promise<boolean> {
  try {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let sql = `
      DELETE FROM notifications 
      WHERE created_at < ?
    `;
    const args: any[] = [cutoffDate.toISOString()];

    if (userId) {
      sql += ' AND user_id = ?';
      args.push(userId);
    }

    const result = await db.execute({ sql, args });

    const success = result.rowsAffected > 0;
    if (success) {
      console.log(`🧹 Cleaned up ${result.rowsAffected} old notifications`);
    }

    return success;
  } catch (error) {
    handleDatabaseError(error, 'cleanup old notifications');
    return false;
  }
}

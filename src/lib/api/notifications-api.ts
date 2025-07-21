import type {
  NotificationForm,
  NotificationsQuery,
} from '../db/notifications-db';
import type { Notification } from '../schema';
import { API_BASE, createFetchOptions } from './api-tools';

export const notificationsApi = {
  // Get notifications with optional filtering
  async getNotifications(
    query: Partial<NotificationsQuery> = {}
  ): Promise<Notification[]> {
    const params = new URLSearchParams();

    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());
    if (query.orderBy) params.append('orderBy', query.orderBy);
    if (query.orderDirection)
      params.append('orderDirection', query.orderDirection);
    if (query.type) params.append('type', query.type.join(','));
    if (query.isRead !== undefined)
      params.append('isRead', query.isRead.toString());
    if (query.flightNumber) params.append('flightNumber', query.flightNumber);
    if (query.search) params.append('search', query.search);

    const response = await fetch(
      `${API_BASE}/notifications?${params}`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return response.json();
  },

  async getNotificationStats() {
    const response = await fetch(
      `${API_BASE}/notifications/stats`,
      createFetchOptions()
    );
    if (!response.ok) {
      throw new Error('Failed to fetch notification stats');
    }
    return response.json();
  },

  // Create a new notification
  async createNotification(
    notificationData: NotificationForm
  ): Promise<Notification> {
    const response = await fetch(
      `${API_BASE}/notifications`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ notificationData }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to create notification');
    }

    return response.json();
  },

  // Mark notification as read/unread
  async markNotificationAsRead(
    id: string,
    isRead: boolean = true
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE}/notifications`,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ action: 'mark_read', id, isRead }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to update notification');
    }
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<void> {
    const response = await fetch(
      `${API_BASE}/notifications`,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
  },

  // Delete a notification
  async deleteNotification(id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/notifications?id=${id}`,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }
  },
};

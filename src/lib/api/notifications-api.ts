import type { NotificationForm } from '../db/notifications-db';
import { buildOrgApiUrl, createFetchOptions } from './api-tools';

export interface NotificationsQuery {
  userId?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at';
  orderDirection?: 'ASC' | 'DESC';
  type?: string[];
  isRead?: boolean;
  flightNumber?: string;
  search?: string;
}

// API client for notifications - organization-scoped only!

export const notificationsApi = {
  // Get all notifications
  async getNotifications(
    query: NotificationsQuery = {},
    organizationId: string
  ) {
    // Build query string
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/notifications${queryString ? `?${queryString}` : ''}`;
    const url = buildOrgApiUrl(organizationId, endpoint);
    const response = await fetch(url, createFetchOptions());

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return response.json();
  },

  // Create a new notification
  async createNotification(
    notificationData: NotificationForm,
    organizationId: string
  ) {
    const url = buildOrgApiUrl(organizationId, '/notifications');
    const response = await fetch(
      url,
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

  // Update notification (mark as read/unread)
  async updateNotification(
    action: 'mark_read' | 'mark_all_read',
    organizationId: string,
    id?: string,
    isRead?: boolean
  ) {
    const url = buildOrgApiUrl(organizationId, '/notifications');
    const response = await fetch(
      url,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ action, id, isRead }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to update notification');
    }

    return response.json();
  },

  // Delete a notification
  async deleteNotification(id: string, organizationId: string) {
    const endpoint = `/notifications?id=${id}`;
    const url = buildOrgApiUrl(organizationId, endpoint);
    const response = await fetch(
      url,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }

    return response.json();
  },

  // Get notification statistics
  async getNotificationStats(organizationId: string) {
    const url = buildOrgApiUrl(organizationId, '/notifications/stats');
    const response = await fetch(url, createFetchOptions());

    if (!response.ok) {
      throw new Error('Failed to fetch notification stats');
    }

    return response.json();
  },
};

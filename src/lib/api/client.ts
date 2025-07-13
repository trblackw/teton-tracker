import {
  type CreateNotificationData,
  type NotificationsQuery,
} from '../db/notifications';
import { type UpdatePreferencesData } from '../db/preferences';
import {
  type NewRunForm,
  type Notification,
  type NotificationType,
  type Run,
  type RunStatus,
} from '../schema';

const API_BASE =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api';

// Helper function to get user ID from localStorage
function getUserId(): string {
  if (typeof window !== 'undefined') {
    let userId = window.localStorage.getItem('user-id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      window.localStorage.setItem('user-id', userId);
    }
    return userId;
  }
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API client for runs
export const runsApi = {
  // Get all runs for the current user
  async getRuns(): Promise<Run[]> {
    const userId = getUserId();
    const response = await fetch(
      `${API_BASE}/runs?userId=${userId}&orderDirection=DESC`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch runs');
    }

    return response.json();
  },

  // Create a new run
  async createRun(runData: NewRunForm): Promise<Run> {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ runData, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create run');
    }

    return response.json();
  },

  // Update an existing run
  async updateRun(id: string, runData: NewRunForm): Promise<Run> {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/runs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ runData, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update run');
    }

    return response.json();
  },

  // Update run status
  async updateRunStatus(id: string, status: RunStatus): Promise<void> {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/runs/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update run status');
    }
  },

  // Delete a run
  async deleteRun(id: string): Promise<void> {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/runs/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete run');
    }
  },
};

// API client for preferences
export const preferencesApi = {
  // Get user preferences
  async getPreferences() {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/preferences?userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }

    return response.json();
  },

  // Update user preferences
  async updatePreferences(preferencesData: UpdatePreferencesData) {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferencesData, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }

    return response.json();
  },
};

// API client for notifications
export const notificationsApi = {
  // Get notifications with optional filtering
  async getNotifications(
    query: Partial<NotificationsQuery> = {}
  ): Promise<Notification[]> {
    const userId = getUserId();

    const params = new URLSearchParams();
    params.append('userId', userId);

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

    const response = await fetch(`${API_BASE}/notifications?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return response.json();
  },

  // Create a new notification
  async createNotification(
    notificationData: CreateNotificationData
  ): Promise<Notification> {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationData, userId }),
    });

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
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'mark_read', id, isRead, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update notification');
    }
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<void> {
    const userId = getUserId();
    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'mark_all_read', userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
  },

  // Delete a notification
  async deleteNotification(id: string): Promise<void> {
    const userId = getUserId();
    const response = await fetch(
      `${API_BASE}/notifications?id=${id}&userId=${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }
  },

  // Get notification statistics
  async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
  }> {
    const userId = getUserId();
    const response = await fetch(
      `${API_BASE}/notifications/stats?userId=${userId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch notification stats');
    }

    return response.json();
  },

  // Cleanup old notifications
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<void> {
    const userId = getUserId();
    const response = await fetch(
      `${API_BASE}/notifications?action=cleanup&userId=${userId}&daysToKeep=${daysToKeep}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to cleanup old notifications');
    }
  },
};

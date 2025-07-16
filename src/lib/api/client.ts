import {
  type CreateNotificationData,
  type NotificationsQuery,
} from '../db/notifications';
import { type UpdatePreferencesData } from '../db/preferences';
import {
  type NewRunForm,
  type Notification,
  type Run,
  type RunStatus,
} from '../schema';
import { getApiUrl } from '../utils';

const API_BASE = getApiUrl();

// Extend Window interface to include Clerk
declare global {
  interface Window {
    Clerk?: {
      user?: {
        id: string;
      };
      session?: {
        getToken: () => string | null;
      };
    };
  }
}

// Helper function to get auth token from Clerk
function getAuthToken(): string | null {
  // This will be populated by Clerk's session token
  // For now, we'll return null during migration
  if (typeof window !== 'undefined' && window.Clerk?.session) {
    return window.Clerk.session.getToken() || null;
  }
  return null;
}

// Helper function to get current user ID from Clerk
function getCurrentUserIdFromClerk(): string | null {
  if (typeof window !== 'undefined' && window.Clerk?.user) {
    return window.Clerk.user.id || null;
  }
  return null;
}

// Helper function to create authenticated headers
function createAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// API client for authentication (legacy - will be replaced by Clerk)
export const authApi = {
  // Check authentication status
  async checkAuthStatus(): Promise<{ authenticated: boolean }> {
    const response = await fetch(`${API_BASE}/auth/check`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to check auth status');
    }

    return response.json();
  },

  // Validate password and authenticate
  async validatePassword(
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${API_BASE}/auth/validate-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Authentication failed' };
    }

    return data;
  },

  // Logout
  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to logout');
    }
  },
};

// API client for runs
export const runsApi = {
  // Get all runs for the current user
  async getRuns(): Promise<Run[]> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${API_BASE}/runs?userId=${userId}&orderDirection=DESC`,
      {
        headers: createAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch runs');
    }

    return response.json();
  },

  // Create a new run
  async createRun(runData: NewRunForm): Promise<Run> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/runs`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ runData, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create run');
    }

    return response.json();
  },

  // Update an existing run
  async updateRun(id: string, runData: NewRunForm): Promise<Run> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/runs/${id}`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify({ runData, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update run');
    }

    return response.json();
  },

  // Update run status
  async updateRunStatus(id: string, status: RunStatus): Promise<Run | null> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/runs`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        action: 'update_status',
        id,
        status,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update run status');
    }

    const result = await response.json();
    return result.updatedRun;
  },

  // Delete a run
  async deleteRun(id: string): Promise<void> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/runs/${id}`, {
      method: 'DELETE',
      headers: createAuthHeaders(),
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
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/preferences?userId=${userId}`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }

    return response.json();
  },

  // Update user preferences
  async updatePreferences(preferencesData: UpdatePreferencesData) {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/preferences`, {
      method: 'PUT',
      headers: createAuthHeaders(),
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
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

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

    const response = await fetch(`${API_BASE}/notifications?${params}`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return response.json();
  },

  async getNotificationStats() {
    const response = await fetch(`${API_BASE}/notifications/stats`, {
      headers: createAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch notification stats');
    }
    return response.json();
  },

  // Create a new notification
  async createNotification(
    notificationData: CreateNotificationData
  ): Promise<Notification> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: createAuthHeaders(),
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
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify({ action: 'mark_read', id, isRead, userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update notification');
    }
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<void> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/notifications`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify({ action: 'mark_all_read', userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
  },

  // Delete a notification
  async deleteNotification(id: string): Promise<void> {
    const userId = getCurrentUserIdFromClerk();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(
      `${API_BASE}/notifications?id=${id}&userId=${userId}`,
      {
        method: 'DELETE',
        headers: createAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }
  },
};

export const seedApi = {
  // Generate seed data for the current user (development only)
  async generateData(userId: string): Promise<{
    runs: number;
    notifications: number;
    message: string;
  }> {
    const response = await fetch(`${API_BASE}/seed`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate seed data');
    }

    return response.json();
  },

  async clearUserData(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/seed`, {
      method: 'DELETE',
      headers: createAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to clear user data');
    }

    return response.json();
  },
};

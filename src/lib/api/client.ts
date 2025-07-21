import {
  type CreateNotificationData,
  type NotificationsQuery,
} from '../db/notifications';
import { type UpdatePreferencesData } from '../db/preferences';
import { getApiUrl } from '../environment';
import {
  type NewRunForm,
  type Notification,
  type ReportTemplate,
  type ReportTemplateForm,
  type Run,
  type RunStatus,
} from '../schema';

const API_BASE = getApiUrl();

// Helper function to create headers with credentials for session-based auth
async function createAuthHeaders(): Promise<HeadersInit> {
  return {
    'Content-Type': 'application/json',
    // No Authorization header needed - BetterAuth uses session cookies
  };
}

// Helper function to create fetch options with credentials
function createFetchOptions(options: RequestInit = {}): RequestInit {
  return {
    ...options,
    credentials: 'include', // Always include session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
}

// API client for authentication (legacy password protection - separate from BetterAuth)
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
    const response = await fetch(
      `${API_BASE}/runs?orderDirection=DESC`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to fetch runs');
    }

    return response.json();
  },

  // Get all runs for organization members (admin-only)
  async getOrganizationRuns(): Promise<Run[]> {
    const response = await fetch(
      `${API_BASE}/runs/organization`,
      createFetchOptions()
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch organization runs');
    }

    return response.json();
  },

  // Create a new run
  async createRun(runData: NewRunForm): Promise<Run> {
    const response = await fetch(
      `${API_BASE}/runs`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ runData }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to create run');
    }

    return response.json();
  },

  // Update an existing run
  async updateRun(id: string, runData: NewRunForm): Promise<Run> {
    const response = await fetch(
      `${API_BASE}/runs/${id}`,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ runData }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to update run');
    }

    return response.json();
  },

  // Update run status
  async updateRunStatus(id: string, status: RunStatus): Promise<Run | null> {
    const response = await fetch(
      `${API_BASE}/runs/${id}/status`,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to update run status');
    }

    const result = await response.json();
    return result.updatedRun;
  },

  // Delete a run
  async deleteRun(id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/runs/${id}`,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      throw new Error('Failed to delete run');
    }
  },
};

// API client for preferences
export const preferencesApi = {
  // Get user preferences
  async getPreferences() {
    const response = await fetch(
      `${API_BASE}/preferences`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }

    return response.json();
  },

  // Update user preferences
  async updatePreferences(preferencesData: UpdatePreferencesData) {
    const response = await fetch(
      `${API_BASE}/preferences`,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ preferencesData }),
      })
    );

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
    notificationData: CreateNotificationData
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

export const seedApi = {
  // Generate seed data for the current user (development only)
  async generateData(): Promise<{
    runs: number;
    notifications: number;
    templates: number;
    message: string;
  }> {
    const response = await fetch(
      `${API_BASE}/seed`,
      createFetchOptions({
        method: 'POST',
      })
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate seed data');
    }

    return response.json();
  },

  async clearUserData(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${API_BASE}/seed`,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      throw new Error('Failed to clear user data');
    }

    return response.json();
  },
};

export const smsApi = {
  // Send SMS message
  async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<{
    success: boolean;
    messageId?: string;
    deliveryStatus?: string;
    error?: string;
  }> {
    const response = await fetch(
      `${API_BASE}/sms/send`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ phoneNumber, message }),
      })
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send SMS');
    }

    return response.json();
  },

  // Validate phone number
  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    formatted?: string;
    country?: string;
    type?: string;
    error?: string;
  }> {
    const response = await fetch(
      `${API_BASE}/sms/validate`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      })
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to validate phone number');
    }

    return response.json();
  },

  // Get SMS service status
  async getStatus(): Promise<{
    configured: boolean;
    provider: string;
    fromNumber: string | null;
    mode: string;
  }> {
    const response = await fetch(
      `${API_BASE}/sms/status`,
      createFetchOptions()
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get SMS status');
    }

    return response.json();
  },
};

// API client for organizations
export const organizationsApi = {
  // Get all organizations for the current user
  async getUserOrganizations(): Promise<any[]> {
    const response = await fetch(
      `${API_BASE}/organizations`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to get user organizations');
    }

    return response.json();
  },

  // Get all members of an organization
  async getOrganizationMembers(orgId: string): Promise<any> {
    const response = await fetch(
      `${API_BASE}/organizations/${orgId}/members`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to get organization members');
    }

    return response.json();
  },

  // Get user's role in a specific organization
  async getUserRole(orgId: string): Promise<any> {
    const response = await fetch(
      `${API_BASE}/organizations/${orgId}/user-role`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to get user role');
    }

    return response.json();
  },

  // Check if user has specific permissions
  async checkPermissions(orgId: string, permission: string): Promise<any> {
    const response = await fetch(
      `${API_BASE}/organizations/check-permissions?orgId=${orgId}&permission=${permission}`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to check permissions');
    }

    return response.json();
  },
};

// API client for report templates
export const reportTemplatesApi = {
  // Get all report templates for the organization
  async getReportTemplates(): Promise<ReportTemplate[]> {
    const response = await fetch(
      `${API_BASE}/report-templates`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to fetch report templates');
    }

    return response.json();
  },

  // Create a new report template
  async createReportTemplate(
    templateData: ReportTemplateForm
  ): Promise<ReportTemplate> {
    const response = await fetch(
      `${API_BASE}/report-templates`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ templateData }),
      })
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create report template');
    }

    return response.json();
  },

  // Update an existing report template
  async updateReportTemplate(
    id: string,
    templateData: ReportTemplateForm
  ): Promise<ReportTemplate> {
    const response = await fetch(
      `${API_BASE}/report-templates`,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ id, templateData }),
      })
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update report template');
    }

    return response.json();
  },

  // Delete a report template
  async deleteReportTemplate(id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/report-templates?id=${id}`,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete report template');
    }
  },
};

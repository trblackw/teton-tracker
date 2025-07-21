import { API_BASE } from './api-tools';

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

import { API_BASE, createFetchOptions } from './api-tools';

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

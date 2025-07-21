import type { UpdatePreferencesData } from '../db/preferences-db';
import { API_BASE, createFetchOptions } from './api-tools';

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

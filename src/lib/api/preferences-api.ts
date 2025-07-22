import type { UpdatePreferencesData } from '../db/preferences-db';
import { buildOrgApiUrl, createFetchOptions } from './api-tools';

// API client for preferences - organization-scoped only!

export const preferencesApi = {
  // Get user preferences
  async getPreferences(organizationId: string) {
    const url = buildOrgApiUrl(organizationId, '/preferences');
    const response = await fetch(url, createFetchOptions());

    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }

    return response.json();
  },

  // Update user preferences
  async updatePreferences(
    preferencesData: UpdatePreferencesData,
    organizationId: string
  ) {
    const url = buildOrgApiUrl(organizationId, '/preferences');
    const response = await fetch(
      url,
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

import type { NewRunForm, Run, RunStatus } from '../schema';
import { buildOrgApiUrl, createFetchOptions } from './api-tools';

// API client for runs - organization-scoped only!

export const runsApi = {
  // Get all runs for the current user
  async getRuns(organizationId: string): Promise<Run[]> {
    const url = buildOrgApiUrl(organizationId, '/runs?orderDirection=DESC');
    const response = await fetch(url, createFetchOptions());

    if (!response.ok) {
      throw new Error('Failed to fetch runs');
    }

    return response.json();
  },

  // Get all runs for organization members (admin-only)
  async getOrganizationRuns(organizationId?: string): Promise<Run[]> {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const url = buildOrgApiUrl(organizationId, '/runs');
    const response = await fetch(url, createFetchOptions());

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch organization runs');
    }

    return response.json();
  },

  // Create a new run
  async createRun(runData: NewRunForm, organizationId: string): Promise<Run> {
    const url = buildOrgApiUrl(organizationId, '/runs');
    const response = await fetch(
      url,
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

  // Delete a run
  async deleteRun(
    runId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    const url = buildOrgApiUrl(organizationId, `/runs/${runId}`);
    const response = await fetch(
      url,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      throw new Error('Failed to delete run');
    }

    return response.json();
  },

  // Update run status
  async updateRunStatus(
    runId: string,
    status: RunStatus,
    organizationId: string
  ): Promise<Run> {
    const url = buildOrgApiUrl(organizationId, `/runs/${runId}/status`);
    const response = await fetch(
      url,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to update run status');
    }

    return response.json();
  },

  // Get runs with custom query parameters
  async getRunsWithQuery(query: {
    status?: RunStatus[];
    limit?: number;
    offset?: number;
    orderBy?: 'scheduled_time' | 'created_at' | 'updated_at';
    orderDirection?: 'ASC' | 'DESC';
    organizationId: string; // Required!
  }): Promise<Run[]> {
    const { organizationId, ...queryParams } = query;

    // Build query string
    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/runs${queryString ? `?${queryString}` : ''}`;
    const url = buildOrgApiUrl(organizationId, endpoint);
    const response = await fetch(url, createFetchOptions());

    if (!response.ok) {
      throw new Error('Failed to fetch runs');
    }

    return response.json();
  },
};

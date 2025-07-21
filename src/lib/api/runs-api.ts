import type { NewRunForm, Run, RunStatus } from '../schema';
import { API_BASE, createFetchOptions } from './api-tools';

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

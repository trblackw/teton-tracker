import { type UpdatePreferencesData } from '../db/preferences';
import { type NewRunForm, type Run, type RunStatus } from '../schema';

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

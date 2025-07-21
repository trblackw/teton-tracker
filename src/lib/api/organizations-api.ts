import type { OrganizationWithRole, User, UserRole } from '../schema';
import { API_BASE, createFetchOptions } from './api-tools';

// API client for organizations

export const organizationsApi = {
  // Get all organizations for the current user
  async getUserOrganizations(): Promise<OrganizationWithRole[]> {
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
  async getOrganizationMembers(orgId: string): Promise<User[]> {
    const response = await fetch(
      `${API_BASE}/organizations/${orgId}/members`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to get organization members');
    }

    return response.json();
  },

  async getOrganizationMemberById(
    orgId: string,
    memberId: string
  ): Promise<User | null> {
    const response = await fetch(
      `${API_BASE}/organizations/${orgId}/members/${memberId}`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to get organization member by ID');
    }

    return response.json();
  },

  // Get user's role in a specific organization
  async getUserRole(orgId: string): Promise<UserRole> {
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
  async checkPermissions(orgId: string, permission: string): Promise<boolean> {
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

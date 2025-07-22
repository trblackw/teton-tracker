import { getApiBaseUrl } from '../environment';

export interface OrganizationListItem {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: any;
  memberCount?: number;
  description?: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  organizationId: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

class OrganizationRequestsApi {
  private baseUrl = `${getApiBaseUrl()}/api`;

  /**
   * Get all organizations that users can request to join
   * This would typically be public organizations or organizations the user can discover
   */
  async getAllOrganizations(): Promise<OrganizationListItem[]> {
    // Placeholder implementation - replace with real API call
    // In a real implementation, this might be:
    // const response = await fetch(`${this.baseUrl}/organizations/public`);
    // return response.json();

    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            name: 'Acme Corporation',
            slug: 'acme-corp',
            memberCount: 45,
            description: 'Leading transportation company',
          },
          {
            id: '2',
            name: 'TechStart Inc',
            slug: 'techstart',
            memberCount: 12,
            description: 'Innovative tech startup',
          },
          {
            id: '3',
            name: 'Global Airlines',
            slug: 'global-airlines',
            memberCount: 200,
            description: 'International airline services',
          },
          {
            id: '4',
            name: 'Mountain Express',
            slug: 'mountain-express',
            memberCount: 8,
            description: 'Regional transportation services',
          },
          {
            id: '5',
            name: 'City Transport',
            slug: 'city-transport',
            memberCount: 35,
            description: 'Urban mobility solutions',
          },
        ]);
      }, 800); // Simulate network delay
    });
  }

  /**
   * Request to join an organization
   */
  async requestToJoin(
    organizationId: string,
    message: string
  ): Promise<{ success: boolean; message: string }> {
    // Placeholder implementation - replace with real API call
    // In a real implementation, this might be:
    // const response = await fetch(`${this.baseUrl}/organizations/${organizationId}/join-requests`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message }),
    // });
    // return response.json();

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional failures for testing
        if (Math.random() > 0.9) {
          reject(new Error('Network error - please try again'));
        } else {
          resolve({
            success: true,
            message:
              'Your join request has been sent to the organization administrators.',
          });
        }
      }, 1000);
    });
  }

  /**
   * Get user's pending join requests
   */
  async getUserJoinRequests(): Promise<JoinRequest[]> {
    // Placeholder implementation
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          // This would show any pending requests the user has made
        ]);
      }, 500);
    });
  }
}

export const organizationRequestsApi = new OrganizationRequestsApi();

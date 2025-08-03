import { useNavigate } from '@tanstack/react-router';
import { authClient, useUserOrganization } from '../auth-client';

/**
 * Hook that returns a function to get organizational route paths
 * Converts flat routes like '/runs' to organizational routes like '/organizations/123/runs'
 */
export function useOrgRoutePath() {
  const { data: organization } = useUserOrganization();

  return (route: string) => {
    if (!organization) {
      // Return a fallback path instead of throwing an error
      // This prevents disrupting the redirect flow
      return '/no-organization';
    }

    // Ensure route starts with '/'
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

    return `/organizations/${organization.id}${normalizedRoute}`;
  };
}

/**
 * Hook that returns a navigation function for organizational routes
 * Similar to useNavigate but automatically includes the organization ID
 *
 * @example
 * const navigateToOrg = useOrgNavigate();
 * navigateToOrg('/runs'); // navigates to /organizations/123/runs
 * navigateToOrg('/settings', { replace: true }); // with options
 */
export function useOrgNavigate() {
  const navigate = useNavigate();
  const { data: organization } = useUserOrganization();

  return (route: string, options?: Parameters<typeof navigate>[0]) => {
    if (!organization) {
      // If no organization, redirect to no-organization page
      return navigate({
        to: '/no-organization',
        ...options,
      });
    }

    // Ensure route starts with '/'
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    const orgPath = `/organizations/${organization.id}${normalizedRoute}`;

    // Navigate to the organizational route
    return navigate({
      to: orgPath as any, // Type assertion needed for dynamic routes
      ...options,
    });
  };
}

/**
 * Hook that returns the current organization ID
 * Useful for components that need the org ID directly
 * Returns null if no organization is found (instead of throwing)
 */
export function useCurrentOrgId(): string | undefined {
  try {
    const { data: organization } = useUserOrganization();
    return organization?.id || undefined;
  } catch (error) {
    console.warn('useCurrentOrgId error:', error);
    return undefined;
  }
}

/**
 * Hook that safely gets the current organization
 * Returns the organization or null, useful for conditional rendering
 */
export function useCurrentOrganization() {
  const { data: organization, ...rest } = useUserOrganization();
  return { data: organization || null, ...rest };
}

/**
 * Helper function to determine where to navigate a user after sign-in based on their organizations
 * This is used during authentication flow to redirect to the appropriate page
 */
export async function getPostSignInNavigationPath(): Promise<{
  to: string;
  params?: any;
}> {
  try {
    // Get user's organizations
    const organizationsResponse = await authClient.organization.list();

    if (organizationsResponse.data && organizationsResponse.data.length > 0) {
      // Navigate to the first organization's home page (runs)
      return {
        to: '/organizations/$organizationId/runs',
        params: { organizationId: organizationsResponse.data[0].id },
      };
    }

    // If no organizations, redirect to no-organization page
    return {
      to: '/no-organization',
    };
  } catch (error) {
    console.error(
      'Failed to get user organizations for post-signin navigation:',
      error
    );
    // Fallback to home page
    return {
      to: '/',
    };
  }
}

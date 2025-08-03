import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { getApiBaseUrl, SUPER_ADMIN_EMAIL } from './environment';

export const authClient = createAuthClient({
  baseURL: `${getApiBaseUrl()}/api/auth`, // Include the full basePath for BetterAuth
  credentials: 'include', // Ensure cookies are sent with cross-origin requests
  fetchOptions: {
    credentials: 'include', // Also set on fetch options for better compatibility
  },
  plugins: [
    organizationClient(), // Add organization client plugin
  ],
});

// Re-export auth functions for convenience
export const { signIn, signUp, signOut, useSession, getSession } = authClient;

// Re-export organization functions for convenience
export const { organization } = authClient;

// Super-admin check function
export function isSuperAdmin(userEmail?: string | null): boolean {
  return userEmail === SUPER_ADMIN_EMAIL;
}

// Custom hook for user functionality (wraps BetterAuth useSession)
export function useUser() {
  const { data: session, isPending } = useSession();
  return {
    user: session?.user || null,
    isLoaded: !isPending,
    isSignedIn: !!session?.user,
  };
}

export function useAuth() {
  const { data: session, isPending } = useSession();
  return {
    userId: session?.user?.id || null,
    sessionId: session?.session?.id || null,
    isLoaded: !isPending,
    isSignedIn: !!session?.user,
    signOut,
  };
}

// Custom hook to check if current user is super admin
export function useIsSuperAdmin() {
  const { user } = useUser();
  return isSuperAdmin(user?.email);
}

// Now use BetterAuth organization hooks instead of custom ones
export function useUserOrganization() {
  try {
    return authClient.useActiveOrganization();
  } catch (error) {
    console.warn('useUserOrganization error:', error);
    // Return a fallback state to prevent crashes
    return {
      data: null,
      isPending: false,
      error: error,
      isLoading: false,
    };
  }
}

export function useUserOrganizations() {
  return authClient.useListOrganizations();
}

export function useCreateOrganization() {
  return {
    mutate: authClient.organization.create,
    isPending: false, // BetterAuth handles loading states
    error: null,
  };
}

export function useUpdateOrganization() {
  return {
    mutate: authClient.organization.update,
    isPending: false,
    error: null,
  };
}

export function useDeleteOrganization() {
  return {
    mutate: authClient.organization.delete,
    isPending: false,
    error: null,
  };
}

export function useOrganizationMemberships() {
  // This would use authClient.organization.listMembers() when needed
  return {
    data: [],
    isLoading: false,
    error: null,
  };
}

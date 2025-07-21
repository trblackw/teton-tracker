import { createAuthClient } from 'better-auth/react';
import { getApiBaseUrl } from './environment';

export const authClient = createAuthClient({
  baseURL: `${getApiBaseUrl()}/api/auth`, // Include the full basePath for BetterAuth
  credentials: 'include', // Ensure cookies are sent with cross-origin requests
  fetchOptions: {
    credentials: 'include', // Also set on fetch options for better compatibility
  },
});

// Re-export auth functions for convenience
export const { signIn, signUp, signOut, useSession, getSession } = authClient;

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

// Placeholder hooks for organization functionality
export function useUserOrganization() {
  // This will be implemented when we add organization functionality
  return {
    data: null,
    isLoading: false,
    error: null,
  };
}

export function useUserOrganizations() {
  // This will be implemented when we add organization functionality
  return {
    data: [],
    isLoading: false,
    error: null,
  };
}

export function useCreateOrganization() {
  // This will be implemented when we add organization functionality
  return {
    mutate: () => {},
    isPending: false,
    error: null,
  };
}

export function useUpdateOrganization() {
  // This will be implemented when we add organization functionality
  return {
    mutate: () => {},
    isPending: false,
    error: null,
  };
}

export function useDeleteOrganization() {
  // This will be implemented when we add organization functionality
  return {
    mutate: () => {},
    isPending: false,
    error: null,
  };
}

export function useOrganizationMemberships() {
  // This will be implemented when we add organization functionality
  return {
    data: [],
    isLoading: false,
    error: null,
  };
}

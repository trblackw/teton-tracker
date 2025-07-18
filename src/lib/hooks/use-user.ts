import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ClerkUser } from '../schema';

/**
 * Hook to get current user data from Clerk
 *
 * Note: User management is now handled entirely by Clerk.
 * We no longer store user data in our own database.
 */
export function useCurrentUserData() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  console.log('🚀 ~ useCurrentUserData ~ clerkUser:', clerkUser);

  clerkUser?.getOrganizationMemberships().then(orgs => {
    console.log('🚀 ~ useCurrentUserData ~ orgs:', orgs);
  });

  const transformClerkUserToUser = useCallback(
    (user: typeof clerkUser): ClerkUser | null => {
      if (!user) {
        return null;
      }

      console.log({ user });

      return {
        id: user.id,
        name: user.fullName || undefined,
        email: user.primaryEmailAddress?.emailAddress || undefined,
        phoneNumber: user.primaryPhoneNumber?.phoneNumber || undefined,
        imageUrl: user.imageUrl || undefined,
        createdAt: user.createdAt ? new Date(user.createdAt) : undefined,
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
      };
    },
    [clerkUser]
  );

  const query = useQuery({
    queryKey: ['authenticated-user', clerkUser?.id],
    queryFn: async (): Promise<ClerkUser | null> => {
      // Wait for Clerk to finish loading
      if (!isLoaded) {
        throw new Error('User data not yet loaded');
      }
      return transformClerkUserToUser(clerkUser);
    },
    enabled: isLoaded, // Only run when Clerk has loaded
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry if it's an authentication error
      if (error.message.includes('not yet loaded')) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const isAuthenticated = Boolean(query.data?.id) && isSignedIn;
  const isSignedOut = isLoaded && !query.data;

  return {
    user: query.data ?? null,
    isLoading: query.isLoading || !isLoaded,
    isInitialLoading: query.isInitialLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    isAuthenticated,
    isSignedOut,
    refetch: query.refetch,
    refresh: () => {
      query.refetch();
    },
  };
}

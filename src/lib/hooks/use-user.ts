import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { type ClerkUser } from '../schema';

export function useCurrentUserData() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();

  // Optimize dependency management - only depend on stable user ID
  const userId = clerkUser?.id;
  const userUpdatedAt = clerkUser?.updatedAt;

  const transformClerkUserToUser = useCallback(
    (user: typeof clerkUser): ClerkUser | null => {
      if (!user) {
        return null;
      }

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
    [userId, userUpdatedAt] // Only depend on stable values
  );

  const query = useQuery({
    queryKey: ['authenticated-user', userId],
    queryFn: async (): Promise<ClerkUser | null> => {
      // Wait for Clerk to finish loading
      if (!isLoaded) {
        throw new Error('User data not yet loaded');
      }
      return transformClerkUserToUser(clerkUser);
    },
    enabled: isLoaded, // Only run when Clerk has loaded
    staleTime: 10 * 60 * 1000, // 10 minutes - user data doesn't change often
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
    refetchOnWindowFocus: false, // Don't refetch on window focus for user data
    refetchOnReconnect: false, // Don't refetch on reconnect - user data is stable
    retry: (failureCount, error) => {
      // Don't retry if it's an authentication error
      if (error.message.includes('not yet loaded')) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Memoize derived values to prevent unnecessary re-renders
  const derivedValues = useMemo(() => {
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
  }, [
    query.data,
    query.isLoading,
    query.isInitialLoading,
    query.isRefetching,
    query.error,
    query.refetch,
    isLoaded,
    isSignedIn,
  ]);

  return derivedValues;
}

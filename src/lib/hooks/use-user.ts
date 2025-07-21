import { useUser } from '../auth-client';
import { type User } from '../schema';

export function useCurrentUserData() {
  const { user, isLoaded, isSignedIn } = useUser();

  return {
    user: user
      ? ({
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: undefined, // TODO: Add phoneNumber field to better-auth user schema
          imageUrl: user.image || undefined,
          emailVerifiedAt:
            user.emailVerified && typeof user.emailVerified === 'object'
              ? (user.emailVerified as Date)
              : undefined, // Only use if it's actually a Date object
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } as User)
      : null,
    isLoading: !isLoaded,
    isInitialLoading: !isLoaded,
    isRefetching: false,
    error: null,
    isAuthenticated: isSignedIn,
    isSignedOut: isLoaded && !user,
    refetch: () => {}, // TODO: Implement proper refetch functionality if needed
    refresh: () => {}, // TODO: Implement proper refresh functionality if needed
  };
}

import { useUser } from '@clerk/clerk-react';

// Hook for getting current user from Clerk
export function useCurrentUser() {
  const { user, isLoaded, isSignedIn } = useUser();

  return {
    user,
    userId: user?.id,
    isLoaded,
    isSignedIn,
    email: user?.primaryEmailAddress?.emailAddress,
    firstName: user?.firstName,
    lastName: user?.lastName,
    fullName: user?.fullName,
    imageUrl: user?.imageUrl,
  };
}

// Helper function to get user ID from Clerk user object
export function getUserIdFromClerkUser(user: any): string | null {
  return user?.id || null;
}

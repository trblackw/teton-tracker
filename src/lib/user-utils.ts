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

// Utility function for getting user ID in API calls (non-hook version)
// This should be used in API functions where hooks can't be used
export function getCurrentUserId(): string | null {
  // This will be used in API calls where we need to get the user ID
  // In the new setup, this will be replaced by server-side authentication
  // For now, we'll return null and handle this in the migration
  console.warn(
    'getCurrentUserId() is deprecated. Use useCurrentUser() hook instead.'
  );
  return null;
}

// Legacy function - to be removed after migration
export function generateBrowserUserId(): string {
  console.warn(
    'generateBrowserUserId() is deprecated. Clerk handles user ID generation.'
  );
  return 'deprecated_user_id';
}

// Helper function to get user ID from Clerk user object
export function getUserIdFromClerkUser(user: any): string | null {
  return user?.id || null;
}

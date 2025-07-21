import { redirect } from '@tanstack/react-router';
import { authClient } from '../auth-client';

/**
 * Hook for redirecting authenticated users away from auth pages.
 * This prevents users from accessing sign-in/sign-up when already logged in.
 */
export async function checkAuthRedirect(): Promise<void> {
  // Check if user has a valid session
  const { data: session } = await authClient.getSession();

  if (session?.user) {
    // User is authenticated, redirect them to the main app
    throw redirect({
      to: '/runs',
      replace: true, // Replace history entry so back button works correctly
    });
  }
}

/**
 * Hook to get current authentication status without redirecting
 * Useful for conditional rendering in auth pages
 */
export function useAuthStatus() {
  return authClient.useSession();
}

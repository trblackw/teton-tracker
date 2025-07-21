import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useUserOrganization } from '../auth-client';

interface UseNonAdminRedirectResult {
  isAdmin: boolean;
  isLoading: boolean;
  organization: any | null; // BetterAuth organization type
}

export function useNonAdminRedirect(
  redirectTo: string = '/runs'
): UseNonAdminRedirectResult {
  const { data: organization, isPending: orgLoading } = useUserOrganization();
  const navigate = useNavigate();

  // Check if user has admin role in the organization
  const isAdmin =
    organization?.members?.some((member: any) => member.role === 'admin') ||
    false;

  const isLoading = orgLoading;

  // Redirect non-admin users once loading is complete
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      console.log('🚫 Non-admin user detected, redirecting to:', redirectTo);
      navigate({ to: redirectTo });
    }
  }, [isAdmin, isLoading, navigate, redirectTo]);

  return {
    isAdmin,
    isLoading,
    organization: organization || null,
  };
}

import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import type { Organization } from '../schema';
import { useIsUserAdmin, useUserOrganization } from './use-organizations';

interface UseNonAdminRedirectResult {
  isAdmin: boolean;
  isLoading: boolean;
  organization: Organization | null;
}

export function useNonAdminRedirect(
  redirectTo: string = '/runs'
): UseNonAdminRedirectResult {
  const { data: organization, isLoading: orgLoading } = useUserOrganization();
  const { isAdmin, isLoading: adminLoading } = useIsUserAdmin(organization?.id);
  const navigate = useNavigate();

  const isLoading = orgLoading || adminLoading;

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

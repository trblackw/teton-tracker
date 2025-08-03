import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useIsSuperAdmin, useUserOrganization } from '../auth-client';
import { OrganizationRole } from '../schema';
import { useOrgRoutePath } from './use-org-navigation';

interface UseNonAdminRedirectResult {
  isAdmin: boolean;
  isLoading: boolean;
  organization: any | null; // BetterAuth organization type
}

export function useNonAdminRedirect(
  redirectTo: string = '/runs'
): UseNonAdminRedirectResult {
  try {
    const { data: organization, isPending: orgLoading } = useUserOrganization();
    const navigate = useNavigate();
    const isSuperAdmin = useIsSuperAdmin();
    const path = useOrgRoutePath();
    const pathRedirectTo = path(redirectTo);

    const isAdmin = (() => {
      if (isSuperAdmin) return true;
      return (
        organization?.members?.some(
          (member: any) =>
            member.role === OrganizationRole.admin ||
            member.role === OrganizationRole.owner
        ) || false
      );
    })();

    const isLoading = orgLoading;

    // Redirect non-admin users once loading is complete
    useEffect(() => {
      if (!isLoading && !isAdmin) {
        console.log('🚫 Non-admin user detected, redirecting to:', redirectTo);
        navigate({ to: pathRedirectTo });
      }
    }, [isAdmin, isLoading, navigate, pathRedirectTo]);

    return {
      isAdmin,
      isLoading,
      organization: organization || null,
    };
  } catch (error) {
    console.warn('useNonAdminRedirect error:', error);
    // Return safe fallback state
    return {
      isAdmin: false,
      isLoading: false,
      organization: null,
    };
  }
}

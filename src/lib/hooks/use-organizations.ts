import { useUser } from '@clerk/clerk-react';
import type { Organization } from '@clerk/clerk-sdk-node';
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { organizationsApi } from '../api/client';

// Hook to get single organization for the current user (new single-org model)
export function useUserOrganization(): UseQueryResult<Organization, Error> {
  const { user } = useUser();

  return useQuery({
    queryKey: ['organizations', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');

      const organizations = await organizationsApi.getUserOrganizations(
        user.id
      );
      return organizations[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get members of a specific organization
export function useOrganizationMembers(orgId: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ['organizations', orgId, 'members'],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID not available');
      return organizationsApi.getOrganizationMembers(orgId, user.id);
    },
    enabled: !!user?.id && !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get user's role in a specific organization
export function useUserRole(orgId: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ['organizations', orgId, 'user-role', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID not available');
      return organizationsApi.getUserRole(orgId, user.id);
    },
    enabled: !!user?.id && !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to check if user has specific permissions in an organization
export function useUserPermissions(orgId: string, permission: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ['organizations', orgId, 'permissions', permission, user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID not available');
      return organizationsApi.checkPermissions(orgId, user.id, permission);
    },
    enabled: !!user?.id && !!orgId && !!permission,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to check if user is an admin in any organization
export function useIsUserAdmin(orgId?: string) {
  const { data: userOrg } = useUserOrganization();
  const { data: userRole } = useUserRole(orgId || '');

  if (orgId) {
    // Check specific organization
    return {
      isAdmin: userRole?.role === 'org:admin',
      isLoading: !userRole,
    };
  }

  // Check if admin in any organization
  const isAdminInAnyOrg = (userOrg as any)?.role === 'org:admin' || false;

  return {
    isAdmin: isAdminInAnyOrg,
    isLoading: !userOrg,
  };
}

// Hook to get the current active organization (simplified for single-org model)
export function useActiveOrganization() {
  const { data: userOrg, isLoading } = useUserOrganization();

  // Since users only belong to one organization, return the first (and only) one
  const activeOrganization = userOrg || null;

  return {
    activeOrganization,
    isLoading,
    hasOrganization: !!activeOrganization,
  };
}

// Utility hook to invalidate organization queries (useful after mutations)
export function useInvalidateOrganizationQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateUserOrganizations: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'user'] });
    },
    invalidateOrganizationMembers: (orgId: string) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'members'],
      });
    },
    invalidateUserRole: (orgId: string, userId: string) => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', orgId, 'user-role', userId],
      });
    },
    invalidateAllOrganizationQueries: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  };
}

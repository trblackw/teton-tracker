import { useUser } from '@clerk/clerk-react';
import type { Organization } from '@clerk/clerk-sdk-node';
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { organizationsApi } from '../api/client';

// Hook to get all organizations for the current user
export function useUserOrganizations(): UseQueryResult<Organization[], Error> {
  const { user } = useUser();

  return useQuery({
    queryKey: ['organizations', 'user', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User ID not available');
      return organizationsApi.getUserOrganizations(user.id);
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
  const { user } = useUser();
  const { data: userOrgs } = useUserOrganizations();
  const { data: userRole } = useUserRole(orgId || '');

  if (orgId) {
    // Check specific organization
    return {
      isAdmin: userRole?.role === 'org:admin',
      isLoading: !userRole,
    };
  }

  // Check if admin in any organization
  const isAdminInAnyOrg =
    userOrgs?.some((org: any) => org.role === 'org:admin') || false;

  return {
    isAdmin: isAdminInAnyOrg,
    isLoading: !userOrgs,
  };
}

// Hook to get the current active organization (you can extend this based on your app's logic)
export function useActiveOrganization() {
  const { data: userOrgs, isLoading } = useUserOrganizations();

  // For now, return the first organization, but you could implement logic to:
  // - Store active org in localStorage
  // - Use URL params
  // - Use a context provider
  const activeOrg = userOrgs?.[0] || null;

  return {
    activeOrganization: activeOrg,
    isLoading,
    hasOrganizations: (userOrgs?.length || 0) > 0,
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

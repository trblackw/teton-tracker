// Hook index file
import { useIsSuperAdmin, useUser, useUserOrganization } from '../auth-client';

export * from './use-api-data';
export * from './use-auth-redirect';
export * from './use-current-runs-count';
export * from './use-mobile';
export * from './use-network-status';
export * from './use-non-admin-redirect';
export * from './use-org-navigation';
export * from './use-timezone';
export * from './use-user';

// Route protection types
export interface RouteAccess {
  allowedRoles: OrganizationRole[];
  requiresOrganization?: boolean;
}

// Hook for route protection
export function useRouteProtection(accessConfig: RouteAccess) {
  const { data: organization } = useUserOrganization();
  const { user: currentUser } = useUser();
  const isSuperAdmin = useIsSuperAdmin();

  // Get user's role in current organization
  const getUserRole = (): OrganizationRole | null => {
    if (isSuperAdmin) return OrganizationRole.owner;
    if (!organization || !currentUser) return null;

    const member = organization.members?.find(
      (m: any) => m.user?.id === currentUser.id
    );
    return (member?.role as OrganizationRole) || null;
  };

  const userRole = getUserRole();
  const hasOrganization = !!organization;

  // Check if user has required role
  const hasAccess = userRole && accessConfig.allowedRoles.includes(userRole);

  // Check organization requirement
  const organizationRequirementMet =
    !accessConfig.requiresOrganization || hasOrganization;

  return {
    hasAccess: hasAccess && organizationRequirementMet,
    userRole,
    hasOrganization,
    isLoading: false, // Could add loading states here
  };
}

// Organization-aware API client hooks
import { notificationsApi } from '../api/notifications-api';
import { preferencesApi } from '../api/preferences-api';
import { reportTemplatesApi } from '../api/report-templates-api';
import { runsApi } from '../api/runs-api';
import { OrganizationRole } from '../schema';
import { useCurrentOrgId } from './use-org-navigation';

/**
 * Hook that provides organization-aware API clients
 * These automatically inject the current organization ID into all API calls
 */
export function useOrgApiClients() {
  const organizationId = useCurrentOrgId();

  if (!organizationId) {
    return {
      runs: {
        getRuns: () => Promise.resolve([]),
        getOrganizationRuns: () => Promise.resolve([]),
        createRun: () => Promise.reject(new Error('No organization selected')),
        deleteRun: () => Promise.reject(new Error('No organization selected')),
        updateRunStatus: () =>
          Promise.reject(new Error('No organization selected')),
        getRunsWithQuery: () => Promise.resolve([]),
      },

      preferences: {
        getPreferences: () =>
          Promise.reject(new Error('No organization selected')),
        updatePreferences: () =>
          Promise.reject(new Error('No organization selected')),
      },

      notifications: {
        getNotifications: () => Promise.resolve([]),
        createNotification: () =>
          Promise.reject(new Error('No organization selected')),
        updateNotification: () =>
          Promise.reject(new Error('No organization selected')),
        deleteNotification: () =>
          Promise.reject(new Error('No organization selected')),
        getNotificationStats: () =>
          Promise.reject(new Error('No organization selected')),
      },

      reportTemplates: {
        getReportTemplates: () => Promise.resolve([]),
        createReportTemplate: () =>
          Promise.reject(new Error('No organization selected')),
        updateReportTemplate: () =>
          Promise.reject(new Error('No organization selected')),
        deleteReportTemplate: () =>
          Promise.reject(new Error('No organization selected')),
      },
    };
  }

  return {
    runs: {
      getRuns: () => runsApi.getRuns(organizationId),
      getOrganizationRuns: () => runsApi.getOrganizationRuns(organizationId),
      createRun: (runData: Parameters<typeof runsApi.createRun>[0]) =>
        runsApi.createRun(runData, organizationId),
      deleteRun: (runId: string) => runsApi.deleteRun(runId, organizationId),
      updateRunStatus: (
        runId: string,
        status: Parameters<typeof runsApi.updateRunStatus>[1]
      ) => runsApi.updateRunStatus(runId, status, organizationId),
      getRunsWithQuery: (
        query: Omit<
          Parameters<typeof runsApi.getRunsWithQuery>[0],
          'organizationId'
        >
      ) => runsApi.getRunsWithQuery({ ...query, organizationId }),
    },

    preferences: {
      getPreferences: () => preferencesApi.getPreferences(organizationId),
      updatePreferences: (
        preferencesData: Parameters<typeof preferencesApi.updatePreferences>[0]
      ) => preferencesApi.updatePreferences(preferencesData, organizationId),
    },

    notifications: {
      getNotifications: (
        query?: Parameters<typeof notificationsApi.getNotifications>[0]
      ) => notificationsApi.getNotifications(query, organizationId),
      createNotification: (
        notificationData: Parameters<
          typeof notificationsApi.createNotification
        >[0]
      ) =>
        notificationsApi.createNotification(notificationData, organizationId),
      updateNotification: (
        action: Parameters<typeof notificationsApi.updateNotification>[0],
        id?: string,
        isRead?: boolean
      ) =>
        notificationsApi.updateNotification(action, organizationId, id, isRead),
      deleteNotification: (id: string) =>
        notificationsApi.deleteNotification(id, organizationId),
      getNotificationStats: () =>
        notificationsApi.getNotificationStats(organizationId),
    },

    reportTemplates: {
      getReportTemplates: () =>
        reportTemplatesApi.getReportTemplates(organizationId),
      createReportTemplate: (
        templateData: Parameters<
          typeof reportTemplatesApi.createReportTemplate
        >[0]
      ) =>
        reportTemplatesApi.createReportTemplate(templateData, organizationId),
      updateReportTemplate: (
        templateId: string,
        templateData: Parameters<
          typeof reportTemplatesApi.updateReportTemplate
        >[1]
      ) =>
        reportTemplatesApi.updateReportTemplate(
          templateId,
          templateData,
          organizationId
        ),
      deleteReportTemplate: (templateId: string) =>
        reportTemplatesApi.deleteReportTemplate(templateId, organizationId),
    },
  };
}

/**
 * Individual hooks for each API client (for component-specific usage)
 */
export function useOrgRunsApi() {
  const organizationId = useCurrentOrgId();

  if (!organizationId) {
    return {
      getRuns: () => Promise.resolve([]),
      getOrganizationRuns: () => Promise.resolve([]),
      createRun: () => Promise.reject(new Error('No organization selected')),
      deleteRun: () => Promise.reject(new Error('No organization selected')),
      updateRunStatus: () =>
        Promise.reject(new Error('No organization selected')),
      getRunsWithQuery: () => Promise.resolve([]),
    };
  }

  return {
    getRuns: () => runsApi.getRuns(organizationId),
    getOrganizationRuns: () => runsApi.getOrganizationRuns(organizationId),
    createRun: (runData: Parameters<typeof runsApi.createRun>[0]) =>
      runsApi.createRun(runData, organizationId),
    deleteRun: (runId: string) => runsApi.deleteRun(runId, organizationId),
    updateRunStatus: (
      runId: string,
      status: Parameters<typeof runsApi.updateRunStatus>[1]
    ) => runsApi.updateRunStatus(runId, status, organizationId),
    getRunsWithQuery: (
      query: Omit<
        Parameters<typeof runsApi.getRunsWithQuery>[0],
        'organizationId'
      >
    ) => runsApi.getRunsWithQuery({ ...query, organizationId }),
  };
}

export function useOrgPreferencesApi() {
  const organizationId = useCurrentOrgId();

  if (!organizationId) {
    return {
      getPreferences: () =>
        Promise.reject(new Error('No organization selected')),
      updatePreferences: () =>
        Promise.reject(new Error('No organization selected')),
    };
  }

  return {
    getPreferences: () => preferencesApi.getPreferences(organizationId),
    updatePreferences: (
      preferencesData: Parameters<typeof preferencesApi.updatePreferences>[0]
    ) => preferencesApi.updatePreferences(preferencesData, organizationId),
  };
}

export function useOrgNotificationsApi() {
  const organizationId = useCurrentOrgId();

  if (!organizationId) {
    return {
      getNotifications: () => Promise.resolve([]),
      createNotification: () =>
        Promise.reject(new Error('No organization selected')),
      updateNotification: () =>
        Promise.reject(new Error('No organization selected')),
      deleteNotification: () =>
        Promise.reject(new Error('No organization selected')),
      getNotificationStats: () =>
        Promise.reject(new Error('No organization selected')),
    };
  }

  return {
    getNotifications: (
      query?: Parameters<typeof notificationsApi.getNotifications>[0]
    ) => notificationsApi.getNotifications(query, organizationId),
    createNotification: (
      notificationData: Parameters<
        typeof notificationsApi.createNotification
      >[0]
    ) => notificationsApi.createNotification(notificationData, organizationId),
    updateNotification: (
      action: Parameters<typeof notificationsApi.updateNotification>[0],
      id?: string,
      isRead?: boolean
    ) =>
      notificationsApi.updateNotification(action, organizationId, id, isRead),
    deleteNotification: (id: string) =>
      notificationsApi.deleteNotification(id, organizationId),
    getNotificationStats: () =>
      notificationsApi.getNotificationStats(organizationId),
  };
}

export function useOrgReportTemplatesApi() {
  const organizationId = useCurrentOrgId();

  if (!organizationId) {
    return {
      getReportTemplates: () => Promise.resolve([]),
      createReportTemplate: () =>
        Promise.reject(new Error('No organization selected')),
      updateReportTemplate: () =>
        Promise.reject(new Error('No organization selected')),
      deleteReportTemplate: () =>
        Promise.reject(new Error('No organization selected')),
    };
  }
  return {
    getReportTemplates: () =>
      reportTemplatesApi.getReportTemplates(organizationId),
    createReportTemplate: (
      templateData: Parameters<
        typeof reportTemplatesApi.createReportTemplate
      >[0]
    ) => reportTemplatesApi.createReportTemplate(templateData, organizationId),
    updateReportTemplate: (
      templateId: string,
      templateData: Parameters<
        typeof reportTemplatesApi.updateReportTemplate
      >[1]
    ) =>
      reportTemplatesApi.updateReportTemplate(
        templateId,
        templateData,
        organizationId
      ),
    deleteReportTemplate: (templateId: string) =>
      reportTemplatesApi.deleteReportTemplate(templateId, organizationId),
  };
}

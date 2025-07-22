import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { authClient } from '../../lib/auth-client';

interface OrganizationParams {
  organizationId: string;
}

export const Route = createFileRoute('/organizations/$organizationId')({
  beforeLoad: async ({ params }: { params: OrganizationParams }) => {
    // Get the current session to check if user is authenticated
    const sessionResponse = await authClient.getSession();

    if (!sessionResponse.data?.user) {
      throw redirect({
        to: '/sign-in',
      });
    }

    // Validate that the user has access to this organization
    const organizationsResponse = await authClient.organization.list();

    if (!organizationsResponse.data) {
      throw redirect({
        to: '/',
      });
    }

    const hasAccess = organizationsResponse.data.some(
      (org: any) => org.id === params.organizationId
    );

    if (!hasAccess) {
      // If user doesn't have access to this organization, redirect to first available org or home
      if (organizationsResponse.data.length > 0) {
        throw redirect({
          to: '/organizations/$organizationId',
          params: { organizationId: organizationsResponse.data[0].id },
        });
      } else {
        throw redirect({
          to: '/',
        });
      }
    }

    // Set the active organization
    await authClient.organization.setActive({
      organizationId: params.organizationId,
    });

    return { organizationId: params.organizationId };
  },
  component: () => <Outlet />, // This renders child routes like /runs, /drivers, etc.
});

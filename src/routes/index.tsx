import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '../lib/auth-client';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Get the current session
    const sessionResponse = await authClient.getSession();

    if (!sessionResponse.data?.user) {
      throw redirect({
        to: '/sign-in',
      });
    }

    // Get user's organizations
    const organizationsResponse = await authClient.organization.list();

    if (organizationsResponse.data && organizationsResponse.data.length > 0) {
      // Redirect to the first organization's runs page
      throw redirect({
        to: '/organizations/$organizationId/runs',
        params: { organizationId: organizationsResponse.data[0].id },
      });
    }

    // If no organizations, redirect to no-organization page
    throw redirect({
      to: '/no-organization',
    });
  },
  component: () => <div>Redirecting...</div>,
});

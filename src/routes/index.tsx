import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '../lib/auth-client';
import { getPostSignInNavigationPath } from '../lib/hooks/use-org-navigation';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Get the current session
    const sessionResponse = await authClient.getSession();

    if (!sessionResponse.data?.user) {
      throw redirect({
        to: '/sign-in',
      });
    }

    // Get the appropriate navigation path for this user
    const navigationPath = await getPostSignInNavigationPath();
    throw redirect(navigationPath);
  },
  component: () => <div>Redirecting...</div>,
});

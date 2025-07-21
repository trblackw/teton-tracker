import { useUser } from '../auth-client';

export function useCurrentUserData() {
  const { user, isLoaded, isSignedIn } = useUser();

  return {
    user: user || null,
    isLoading: !isLoaded,
    isSignedIn,
  };
}

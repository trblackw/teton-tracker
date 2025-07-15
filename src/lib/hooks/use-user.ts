import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/client';
import { type User } from '../schema';

export function useCurrentUserData() {
  const { user: clerkUser, isLoaded } = useUser();

  return useQuery<User>({
    queryKey: ['user', clerkUser?.id],
    queryFn: userApi.getUser,
    enabled: isLoaded && !!clerkUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if user not found (404) - means they haven't been synced yet
      if (error instanceof Error && error.message.includes('User not found')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

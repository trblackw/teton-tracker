import { useUser } from '@clerk/clerk-react';
import { createContext, useContext, useEffect } from 'react';
import { useCurrentUserData } from './hooks/use-user';
import { type User } from './schema';

interface AppContextValue {
  currentUser: User | null;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const {
    data: userData,
    isLoading: userDataLoading,
    error,
  } = useCurrentUserData();

  // Calculate loading state
  const isLoading = !clerkLoaded || (!!clerkUser && userDataLoading);

  // Calculate current user
  const currentUser = (() => {
    if (!clerkUser) {
      // No Clerk user - not logged in
      return null;
    }

    if (userData) {
      // We have user data from database - use it
      return userData;
    }

    if (error && error.message.includes('User not found')) {
      // User exists in Clerk but not in database yet (webhook might be pending)
      // Create a basic user object with Clerk data as fallback
      console.warn(
        '⚠️ User not found in database, using Clerk data as fallback'
      );
      return {
        id: clerkUser.id,
        name: clerkUser.fullName || undefined,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (userDataLoading) {
      // Still loading user data
      return null;
    }

    // Some other error occurred
    console.error('Failed to load user data:', error);
    return null;
  })();

  // Log user state changes
  useEffect(() => {
    if (clerkLoaded) {
      if (currentUser) {
        console.log('👤 User loaded:', currentUser.id, {
          hasDbData: Boolean(userData),
          hasClerkData: Boolean(clerkUser),
        });
      } else if (!clerkUser) {
        console.log('👤 No user logged in');
      }
    }
  }, [currentUser, userData, clerkUser, clerkLoaded]);

  return (
    <AppContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

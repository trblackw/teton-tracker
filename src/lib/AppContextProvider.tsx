import { useUser } from '@clerk/clerk-react';
import { createContext, useContext, useEffect, useState } from 'react';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user: clerkUser, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded) {
      try {
        if (clerkUser) {
          const user: User = {
            id: clerkUser.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setCurrentUser(user);
          console.log('👤 Initialized user:', clerkUser.id);
        } else {
          // No user logged in
          setCurrentUser(null);
          console.log('👤 No user logged in');
        }
      } catch (error) {
        console.error('Failed to initialize user:', error);
        // Fallback to a basic user
        const fallbackUser: User = {
          id: `user_${crypto.randomUUID()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setCurrentUser(fallbackUser);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoaded, clerkUser]);

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

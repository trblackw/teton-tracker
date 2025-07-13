import { createContext, useContext, useEffect, useState } from 'react';
import { type User } from './schema';
import { getCurrentUserId } from './user-utils';

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

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Clean approach: use frontend utility (no database concerns)
        const userId = getCurrentUserId();

        const user: User = {
          id: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setCurrentUser(user);
        console.log('👤 Initialized user:', userId);
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
    };

    initializeUser();
  }, []);

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

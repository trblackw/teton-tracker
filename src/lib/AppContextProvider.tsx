import { createContext, useContext, useEffect, useState } from 'react';
import { generateUserId } from './db/index';
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

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userId = generateUserId();
        const user: User = {
          id: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setCurrentUser(user);
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

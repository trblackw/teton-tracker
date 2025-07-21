import { createContext, useContext } from 'react';
import { useCurrentUserData } from './hooks/use-user';
import { type User } from './schema';

// Use the inferred type from our existing UserSchema - single source of truth

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
  const { user, isLoading } = useCurrentUserData();

  return (
    <AppContext.Provider value={{ currentUser: user || null, isLoading }}>
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

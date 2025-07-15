import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  useUser,
} from '@clerk/clerk-react';
import { type ReactNode } from 'react';
import { Card, CardContent } from './ui/card';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

// Loading component for authentication state
export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-96">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Component to handle authentication state
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return <AuthLoading />;
  }

  return <AuthGuard>{children}</AuthGuard>;
}

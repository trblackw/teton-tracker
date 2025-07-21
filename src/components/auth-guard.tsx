import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { useCurrentUserData } from '../lib/hooks/use-user';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useCurrentUserData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: '/sign-in' });
    }
  }, [user, isLoading, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium">Loading...</div>
            <div className="text-sm text-muted-foreground mt-1">
              Please wait while we load your account
            </div>
          </div>
        </div>
      )
    );
  }

  // Don't render children if not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}

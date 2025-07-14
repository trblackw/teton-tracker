import { Eye, EyeOff, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
// import { isDebugMode } from '../lib/debug';
import { isDebugMode } from '../lib/debug';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    // Skip password protection in debug mode
    if (isDebugMode()) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const authToken = sessionStorage.getItem('teton-tracker-auth');
    if (authToken === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Validate password via server endpoint (use API server port)
      const response = await fetch(
        'http://localhost:3001/api/auth/validate-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        }
      );

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('teton-tracker-auth', 'authenticated');
        setPassword('');
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (error) {
      console.error('Password validation error:', error);
      setError('Authentication error. Please try again.');
      setPassword('');
    }
  };

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show password form if not authenticated (and not in debug mode)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Access Restricted
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              This application is currently in development. Please enter the
              access password to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter access password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={!password.trim()}
              >
                <Lock className="h-4 w-4 mr-2" />
                Access Application
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Teton Tracker • Development Version
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the main app if authenticated
  return <>{children}</>;
}

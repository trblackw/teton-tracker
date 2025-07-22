import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useOrgNavigate } from '../lib/hooks';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundaryClass extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback {...this.state} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({
  error,
  errorInfo,
}: {
  error?: Error;
  errorInfo?: ErrorInfo;
}) {
  const orgNavigate = useOrgNavigate();

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    orgNavigate('/runs');
    setTimeout(() => {
      handleReload();
    }, 100);
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Something went wrong
          </CardTitle>
          <p className="text-muted-foreground">
            We encountered an unexpected error. This has been logged and we'll
            look into it.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleReload}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
            <Button
              onClick={handleGoHome}
              className="bg-highlight text-white hover:bg-highlight/80 flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </div>

          {isDevelopment && error && (
            <details className="mt-6 p-4 bg-muted rounded-lg">
              <summary className="cursor-pointer font-medium text-sm text-muted-foreground mb-2">
                Error Details
              </summary>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <strong>Error:</strong> {error.message}
                </div>
                <div>
                  <strong>Stack trace:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-all">
                    {error.stack}
                  </pre>
                </div>
                {errorInfo && (
                  <div>
                    <strong>Component stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap break-all">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>
  );
}

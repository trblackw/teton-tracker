import { Plane } from 'lucide-react';

interface FullScreenLoaderProps {
  message?: string;
  showLogo?: boolean;
}

export function FullScreenLoader({
  message = 'Loading...',
  showLogo = true,
}: FullScreenLoaderProps) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center">
        {showLogo && (
          <div className="mb-6">
            <Plane className="size-12 mx-auto text-primary mb-4" />
            <h2 className="text-xl font-semibold text-foreground">
              Teton Tracker
            </h2>
          </div>
        )}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

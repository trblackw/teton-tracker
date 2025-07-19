import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface StickyHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  // Control sticky behavior
  sticky?: boolean;
  // Background blur effect
  withBlur?: boolean;
}

export function StickyHeader({
  title,
  subtitle,
  actions,
  children,
  className,
  sticky = true,
  withBlur = true,
}: StickyHeaderProps) {
  return (
    <div
      className={cn(
        'z-30 bg-background/95 border-b border-border/40',
        sticky && 'sticky top-0',
        withBlur && 'backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
          {actions && (
            <div className="flex-shrink-0 ml-4">
              <div className="flex items-center gap-2">{actions}</div>
            </div>
          )}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

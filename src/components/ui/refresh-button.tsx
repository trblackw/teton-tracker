import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';

interface RefreshButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onClick' | 'disabled' | 'className' | 'children'
  > {
  onRefresh: () => Promise<void> | void;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  loadingText?: string;
  defaultText?: string;
  iconOnly?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function RefreshButton({
  onRefresh,
  variant = 'secondary',
  size = 'default',
  className,
  disabled = false,
  children,
  defaultText = 'Refresh',
  loadingText = defaultText,
  iconOnly = false,
  onClick,
  ...props
}: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }

    if (isLoading || disabled) return;

    setIsLoading(true);

    try {
      // Create a promise that resolves after 2 seconds minimum
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));

      // Execute the refresh function
      const refreshPromise = Promise.resolve(onRefresh());

      // Wait for both the refresh and minimum load time
      await Promise.all([refreshPromise, minLoadTime]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine the button content
  const getButtonContent = () => {
    if (iconOnly) {
      return (
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      );
    }

    if (children) {
      return children;
    }

    return (
      <>
        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        {isLoading ? loadingText : defaultText}
      </>
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isLoading || disabled}
      className={cn(iconOnly ? '' : 'gap-2', className)}
      {...props}
    >
      {getButtonContent()}
    </Button>
  );
}

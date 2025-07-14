import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface NavigationArrowProps {
  direction?: 'left' | 'right';
  variant?: 'back' | 'chevron';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export function NavigationArrow({
  direction = 'left',
  variant = 'back',
  size = 'md',
  className,
  onClick,
  disabled = false,
  'aria-label': ariaLabel,
}: NavigationArrowProps) {
  const IconComponent =
    variant === 'back'
      ? ArrowLeft
      : direction === 'left'
        ? ChevronLeft
        : ChevronRight;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const buttonSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };

  const defaultAriaLabel =
    variant === 'back' ? 'Go back' : direction === 'left' ? 'Previous' : 'Next';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || defaultAriaLabel}
      className={cn(
        buttonSizeClasses[size],
        'touch-manipulation',
        'hover:bg-accent hover:text-accent-foreground',
        'transition-colors',
        'flex-shrink-0',
        'focus-visible:ring-0',
        'focus:outline-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <IconComponent className={cn(sizeClasses[size])} />
    </Button>
  );
}

// Convenience components for common use cases
export function BackButton(
  props: Omit<NavigationArrowProps, 'direction' | 'variant'>
) {
  return <NavigationArrow {...props} direction="left" variant="back" />;
}

export function NextButton(
  props: Omit<NavigationArrowProps, 'direction' | 'variant'>
) {
  return <NavigationArrow {...props} direction="right" variant="chevron" />;
}

export function PreviousButton(
  props: Omit<NavigationArrowProps, 'direction' | 'variant'>
) {
  return <NavigationArrow {...props} direction="left" variant="chevron" />;
}

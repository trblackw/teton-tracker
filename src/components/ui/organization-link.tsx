import { Link } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';
import { useOrgRoutePath } from '../../lib/hooks/use-org-navigation';
import { Button } from './button';

interface OrganizationLinkProps extends PropsWithChildren {
  to: `/${string}`;
  variant?: 'default' | 'button';
  className?: string;
}

export function OrganizationLink({
  to,
  variant = 'default',
  className,
  children,
}: OrganizationLinkProps) {
  const orgPath = useOrgRoutePath();
  const cx =
    variant === 'button'
      ? 'text-white bg-highlight hover:bg-highlight/80 w-fit mx-auto'
      : 'text-blue-500 hover:text-blue-60 w-fit mx-auto';
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn(cx, className, 'flex items-center gap-1 rounded-md')}
    >
      <Link to={`${orgPath(to)}`}>{children}</Link>
    </Button>
  );
}

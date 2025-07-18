import { cn } from '@/lib/utils';
import { Plane } from 'lucide-react';
import * as React from 'react';
import IconSidebar from '../../lib/icons/icon-sidebar';
import { SidebarTrigger, useSidebar } from './sidebar';

interface TopNavProps {
  className?: string;
  children?: React.ReactNode;
}

export function TopNav({ className, children }: TopNavProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {children}
      </div>
    </header>
  );
}

export function TopNavLeft({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>{children}</div>
  );
}

export function TopNavCenter({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-center flex-1', className)}>
      {children}
    </div>
  );
}

export function TopNavRight({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>{children}</div>
  );
}

export function TopNavLogo({ className }: { className?: string }) {
  const { isOpen, setIsOpen } = useSidebar();
  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      <Plane className="size-7 text-primary" />
      <IconSidebar
        className="ml-auto scale-x-[-1] size-7 text-primary lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      />
    </div>
  );
}

export function TopNavSidebarTrigger({ className }: { className?: string }) {
  return (
    <SidebarTrigger className={cn('lg:hidden', className)}>
      <IconSidebar className="size-7" />
    </SidebarTrigger>
  );
}

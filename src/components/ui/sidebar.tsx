import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import * as React from 'react';
import { createContext, useContext } from 'react';

interface SidebarContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined
);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  isMobile?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = false,
  isMobile = false,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const value = React.useMemo(
    () => ({ isOpen, setIsOpen, isMobile }),
    [isOpen, isMobile]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

interface SidebarProps {
  side?: 'left' | 'right';
  collapsible?: 'icon' | 'none';
  className?: string;
  children?: React.ReactNode;
}

export function Sidebar({
  side = 'left',
  collapsible = 'icon',
  className,
  children,
}: SidebarProps) {
  const { isOpen, setIsOpen, isMobile } = useSidebar();

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: side === 'left' ? '-100%' : '100%',
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const backdropVariants = {
    open: { opacity: 1 },
    closed: { opacity: 0 },
  };

  if (!isMobile) {
    // Desktop sidebar - always visible, no animation
    return (
      <div
        className={cn(
          'relative z-30 flex h-screen w-64 flex-col border-r bg-background',
          className
        )}
      >
        {children}
      </div>
    );
  }

  // Mobile sidebar - completely out of layout flow
  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={backdropVariants}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.div
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className={cn(
          'fixed z-50 flex h-screen w-64 flex-col border-r bg-background shadow-lg top-0 left-0',
          className
        )}
      >
        {children}
      </motion.div>
    </>
  );
}

export function SidebarHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center gap-2 px-4 h-14 border-b bg-background',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SidebarContent({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('flex-1 overflow-auto py-2', className)}>{children}</div>
  );
}

export function SidebarFooter({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('mt-auto border-t px-4 py-3', className)}>
      {children}
    </div>
  );
}

export function SidebarNav({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <nav className={cn('space-y-1 px-2', className)}>{children}</nav>;
}

export function SidebarNavItem({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SidebarTrigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9',
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
    </button>
  );
}

import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

export interface DrawerAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  content: React.ReactNode;
  badge?: string | number; // Optional badge for active filters/search terms
}

interface ExpandableActionsDrawerProps {
  actions: DrawerAction[];
  className?: string;
}

export function ExpandableActionsDrawer({
  actions,
  className = '',
}: ExpandableActionsDrawerProps) {
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const activeAction = actions.find(action => action.id === activeActionId);

  console.log('🎲 ExpandableActionsDrawer render:', {
    activeActionId,
    mounted,
    actionsCount: actions.length,
    activeAction: activeAction?.label,
  });

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    console.log('🎲 Component mounted');
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeActionId) {
        setActiveActionId(null);
      }
    };

    if (activeActionId) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [activeActionId]);

  // Handle action button click
  const handleActionClick = (actionId: string) => {
    console.log(
      '🔘 Action button clicked:',
      actionId,
      'current active:',
      activeActionId
    );

    if (activeActionId === actionId) {
      // Close if same action clicked
      console.log('🔘 Closing drawer');
      setActiveActionId(null);
    } else {
      // Switch to new action
      console.log('🔘 Opening drawer for:', actionId);
      setActiveActionId(actionId);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setActiveActionId(null);
    }
  };

  // Handle close button click
  const handleClose = () => {
    setActiveActionId(null);
  };

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const drawerVariants = {
    hidden: {
      opacity: 0,
      y: -20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: 'easeInOut' as const,
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.1,
        duration: 0.2,
      },
    },
  };

  // Render the drawer overlay
  const renderDrawer = () => {
    if (!mounted || !activeAction) {
      console.log('🎯 Not rendering drawer:', {
        mounted,
        activeAction: activeAction?.label,
      });
      return null;
    }

    console.log('🎯 Rendering drawer:', {
      mounted,
      activeAction: activeAction?.label,
    });

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-start justify-center p-2 md:p-4"
        onClick={handleBackdropClick}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div
          ref={drawerRef}
          className="w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden mt-16 md:mt-20"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {activeAction.label}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4">{activeAction.content}</div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* Action buttons */}
      <div className={`flex items-center gap-2 ${className}`}>
        {actions.map(action => (
          <Button
            key={action.id}
            variant={activeActionId === action.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleActionClick(action.id)}
            className="relative h-9 w-9 p-0 shrink-0"
            aria-label={action.label}
            title={action.label}
          >
            {action.icon}
            {action.badge && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium min-w-[1rem]">
                {action.badge}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Drawer overlay */}
      {activeActionId && renderDrawer()}
    </>
  );
}

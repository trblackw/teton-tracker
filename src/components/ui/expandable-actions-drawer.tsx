import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from './button';

export interface DrawerAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  content: React.ReactNode;
  badge?: string | number; // Optional badge for active filters/search terms
  showHeader?: boolean; // Optional flag to show/hide header
}

interface ExpandableActionsDrawerProps {
  actions: DrawerAction[];
  className?: string;
  disabled?: boolean;
  rightContent?: React.ReactNode; // Optional content to render to the right of actions
}

export function ExpandableActionsDrawer({
  actions,
  className = '',
  disabled = false,
  rightContent,
}: ExpandableActionsDrawerProps) {
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const activeAction = actions.find(action => action.id === activeActionId);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (disabled) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeActionId) {
        setActiveActionId(null);
      }
    };

    if (activeActionId) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeActionId, disabled]);

  // Handle click outside to close
  useEffect(() => {
    if (disabled) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (
        activeActionId &&
        drawerRef.current &&
        !drawerRef.current.contains(target)
      ) {
        // Check if the click is inside a popover content (which could be a portal)
        const isInsidePopover =
          target instanceof Element &&
          (target.closest('[data-radix-popper-content-wrapper]') ||
            target.closest('[role="dialog"]') ||
            target.closest('.popover-content') ||
            target.closest('[data-state="open"]'));

        // Don't close if clicking inside a popover
        if (!isInsidePopover) {
          setActiveActionId(null);
        }
      }
    };

    if (activeActionId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeActionId, disabled]);

  // Handle action button click
  const handleActionClick = (actionId: string) => {
    if (disabled) return;
    if (activeActionId === actionId) {
      // Close if same action clicked
      setActiveActionId(null);
    } else {
      // Switch to new action
      setActiveActionId(actionId);
    }
  };

  // Handle close button click
  const handleClose = () => {
    setActiveActionId(null);
  };

  // Animation variants for inline expansion
  const expansionVariants = {
    hidden: {
      height: 0,
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut' as const,
      },
    },
    visible: {
      height: 'auto',
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1,
        duration: 0.2,
      },
    },
  };

  return (
    <div
      className={`space-y-3 ${className} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      ref={drawerRef}
    >
      {/* Action buttons and right content */}
      <div className="flex items-center justify-start gap-4">
        <div className="flex items-center gap-2">
          {actions.map(action => (
            <Button
              key={action.id}
              variant={activeActionId === action.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleActionClick(action.id)}
              disabled={disabled}
              className="relative h-9 w-9 p-0 shrink-0"
              aria-label={action.label}
              title={action.label}
            >
              {action.icon}
              {action.badge && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-300 text-primary-foreground text-xs flex items-center justify-center font-medium min-w-[1rem]">
                  {action.badge}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Right content area */}
        {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      </div>

      {/* Inline expanded content */}
      <AnimatePresence mode="wait">
        {activeActionId && activeAction && (
          <motion.div
            className="overflow-hidden"
            variants={expansionVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              className="border border-gray-600 rounded-md bg-accent/50"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Header with close button - conditional */}
              {activeAction.showHeader !== false && (
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
              )}

              {/* Content */}
              <div
                className={`${activeAction.showHeader === false ? 'relative p-3' : 'p-4'}`}
              >
                {activeAction.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

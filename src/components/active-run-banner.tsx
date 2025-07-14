import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Plane,
  Timer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { runsApi } from '../lib/api/client';
import { Button } from './ui/button';

// Hook to get the currently active run
function useActiveRun() {
  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: runsApi.getRuns,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const activeRun = runs.find(run => run.status === 'active');
  return activeRun;
}

// Timer component that tracks elapsed time
function RunTimer({ startTime }: { startTime: Date }) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-1">
      <Timer className="h-3 w-3" />
      <span className="text-xs">{formatTime(elapsedTime)}</span>
    </div>
  );
}

export function ActiveRunBanner() {
  const router = useRouter();
  const activeRun = useActiveRun();
  const [isMinimized, setIsMinimized] = useState(false);

  // Reset to expanded when a new active run starts
  useEffect(() => {
    if (activeRun) {
      setIsMinimized(false);
    }
  }, [activeRun?.id]);

  // Don't render if no active run
  if (!activeRun) {
    return null;
  }

  const handleNavigateToActiveRun = () => {
    router.navigate({ to: '/active-run', search: { id: activeRun.id } });
  };

  const handleToggleMinimized = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  // Calculate run start time (when it became active)
  const startTime = new Date(
    activeRun.updatedAt || activeRun.createdAt || new Date()
  );

  return (
    <div
      className={`fixed top-4 z-50 pointer-events-none ${
        isMinimized ? 'left-4' : 'left-4 right-4'
      }`}
    >
      <motion.div
        className="w-full"
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <motion.div
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-lg pointer-events-auto cursor-pointer hover:shadow-xl rounded-lg border dark:from-blue-950 dark:to-blue-900 dark:border-blue-800"
          onClick={handleNavigateToActiveRun}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
          layout
        >
          <div className={isMinimized ? 'px-2 py-0.5' : 'px-3 py-1'}>
            <AnimatePresence mode="wait">
              {isMinimized ? (
                <motion.div
                  key="minimized"
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  <span className="font-mono font-medium text-blue-800 dark:text-blue-200 text-xs whitespace-nowrap">
                    {activeRun.flightNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleMinimized}
                    className="h-4 w-4 p-0 ml-1 text-blue-600 hover:text-blue-700 hover:bg-blue-200/50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-800/50 flex-shrink-0"
                    aria-label="Expand run details"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Mobile layout */}
                  <div className="flex sm:hidden items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm whitespace-nowrap flex items-center gap-1">
                        <Plane className="size-4" />
                        Active
                      </span>
                      <span className="font-mono font-semibold text-blue-800 dark:text-blue-200 text-sm whitespace-nowrap">
                        {activeRun.flightNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs w-16 border border-blue-500 rounded-md text-white p-0 hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center mr-1 focus:outline-none"
                      >
                        <Link to="/active-run" search={{ id: activeRun.id }}>
                          <ArrowUpRight className="size-4 p-0 m-0" />
                          Open
                        </Link>
                      </Button>
                      <div className="text-xs text-blue-800 dark:text-blue-200 whitespace-nowrap">
                        <RunTimer startTime={startTime} />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleMinimized}
                        className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-200 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-800 flex-shrink-0"
                        aria-label="Minimize run details"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm whitespace-nowrap">
                        Active
                      </span>
                      <Plane className="h-3 w-3 flex-shrink-0" />
                      <span className="font-mono font-semibold text-blue-800 dark:text-blue-200 text-sm whitespace-nowrap">
                        {activeRun.flightNumber}
                      </span>
                      <span className="text-xs text-blue-700 dark:text-blue-300 truncate min-w-0">
                        {activeRun.pickupLocation} → {activeRun.dropoffLocation}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="text-xs text-blue-800 dark:text-blue-200 whitespace-nowrap">
                        <RunTimer startTime={startTime} />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleMinimized}
                        className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-200 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-800 flex-shrink-0"
                        aria-label="Minimize run details"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

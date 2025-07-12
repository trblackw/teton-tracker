import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Activity, Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { useMultipleRunsData } from '../lib/hooks/use-api-data';
import IconLogo from '../lib/icons/icon-logo';
import { invalidateAllApiData } from '../lib/react-query-client';
import { pollingService } from '../lib/services/polling-service';
import { initializeTomTomService } from '../lib/services/tomtom-service';

function RootComponent() {
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Get runs from localStorage for polling service
  const [runs, setRuns] = useState<any[]>([]);
  const runsApiData = useMultipleRunsData(runs);

  // Initialize services
  useEffect(() => {
    initializeTomTomService();

    // Load runs from localStorage
    if (typeof window !== 'undefined') {
      const savedRuns = window.localStorage.getItem('airport-runs');
      if (savedRuns) {
        try {
          const parsedRuns = JSON.parse(savedRuns);
          setRuns(parsedRuns);
        } catch (error) {
          console.error('Error parsing runs from localStorage:', error);
        }
      }
    }

    // Configure polling service
    pollingService.config = {
      ...pollingService.config,
      onDataInvalidation: type => {
        if (type === 'flight') {
          invalidateAllApiData();
        }
      },
    };

    if (pollingEnabled) {
      pollingService.start();
    }

    return () => {
      pollingService.stop();
    };
  }, [pollingEnabled]);

  // Update polling service with current runs
  useEffect(() => {
    pollingService.updateRuns(runs);
  }, [runs]);

  const refreshAllData = () => {
    invalidateAllApiData();
    runsApiData.refetchAll();
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header - Desktop */}
      <header className='hidden md:block bg-white shadow-sm border-b sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center gap-4'>
              <IconLogo className='h-8 w-8' />
              <h1 className='text-xl font-bold text-gray-900'>Teton Tracker</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className='flex items-center gap-6'>
              <Link
                to='/runs'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
              >
                Current Runs
              </Link>
              <Link
                to='/add'
                className='text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium'
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
              >
                Add Run
              </Link>
            </nav>

            {/* Action Buttons */}
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                <Settings className='h-4 w-4 mr-2' />
                Debug
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setPollingEnabled(!pollingEnabled);
                  if (!pollingEnabled) {
                    pollingService.start();
                  } else {
                    pollingService.stop();
                  }
                }}
              >
                <Activity className='h-4 w-4 mr-2' />
                {pollingEnabled ? 'Disable' : 'Enable'} Polling
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={refreshAllData}
                disabled={runsApiData.isFetching}
              >
                <Settings className='h-4 w-4 mr-2' />
                {runsApiData.isFetching ? 'Refreshing...' : 'Refresh All'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className='md:hidden bg-white shadow-sm border-b'>
        <div className='px-4 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconLogo className='h-6 w-6' />
              <h1 className='text-lg font-bold text-gray-900'>Teton Tracker</h1>
            </div>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className='p-2'
              >
                <Settings className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={refreshAllData}
                disabled={runsApiData.isFetching}
                className='p-2'
              >
                <Activity className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='pb-20 md:pb-4'>
        <div className='max-w-3xl mx-auto px-4 py-6'>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className='md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50'>
        <div className='grid grid-cols-2 h-16'>
          <Link
            to='/runs'
            className='flex flex-col items-center justify-center text-gray-600 hover:text-gray-900'
            activeProps={{ className: 'text-blue-600 bg-blue-50' }}
          >
            <Activity className='h-5 w-5' />
            <span className='text-xs mt-1'>Runs</span>
          </Link>
          <Link
            to='/add'
            className='flex flex-col items-center justify-center text-gray-600 hover:text-gray-900'
            activeProps={{ className: 'text-blue-600 bg-blue-50' }}
          >
            <Plus className='h-5 w-5' />
            <span className='text-xs mt-1'>Add Run</span>
          </Link>
        </div>
      </nav>

      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

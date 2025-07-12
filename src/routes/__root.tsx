import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Activity, Home, Plane, Plus, Settings } from 'lucide-react';
import { ThemeProvider } from '../components/theme-provider';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { isDebugMode } from '../lib/debug';

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <div className='min-h-screen bg-background'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex flex-col lg:flex-row lg:gap-8'>
            {/* Desktop Navigation */}
            <aside className='hidden lg:block w-64 shrink-0'>
              <Card className='sticky top-4 bg-card'>
                <CardContent className='p-4'>
                  <div className='flex items-center gap-2 mb-6'>
                    <div className='p-2 bg-primary rounded-lg'>
                      <Plane className='h-5 w-5 text-primary-foreground' />
                    </div>
                    <h1 className='text-xl font-bold text-foreground'>
                      Teton Tracker
                    </h1>
                  </div>
                  <nav className='space-y-2'>
                    <Button
                      asChild
                      variant='ghost'
                      className='w-full justify-start'
                    >
                      <Link to='/' className='flex items-center gap-2'>
                        <Home className='h-4 w-4' />
                        Home
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant='ghost'
                      className='w-full justify-start'
                    >
                      <Link to='/runs' className='flex items-center gap-2'>
                        <Activity className='h-4 w-4' />
                        Current Runs
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant='ghost'
                      className='w-full justify-start'
                    >
                      <Link to='/flights' className='flex items-center gap-2'>
                        <Plane className='h-4 w-4' />
                        Upcoming Flights
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant='ghost'
                      className='w-full justify-start'
                    >
                      <Link to='/add' className='flex items-center gap-2'>
                        <Plus className='h-4 w-4' />
                        Add Run
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant='ghost'
                      className='w-full justify-start'
                    >
                      <Link to='/settings' className='flex items-center gap-2'>
                        <Settings className='h-4 w-4' />
                        Settings
                      </Link>
                    </Button>
                  </nav>
                </CardContent>
              </Card>
            </aside>

            {/* Main Content */}
            <main className='flex-1 lg:max-w-4xl'>
              <Outlet />
            </main>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className='lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card'>
          <nav className='flex items-center justify-around p-2'>
            <Button
              asChild
              variant='ghost'
              size='sm'
              className='flex-col h-auto p-2'
            >
              <Link to='/' className='flex flex-col items-center gap-1'>
                <Home className='h-4 w-4' />
                <span className='text-xs'>Home</span>
              </Link>
            </Button>
            <Button
              asChild
              variant='ghost'
              size='sm'
              className='flex-col h-auto p-2'
            >
              <Link to='/runs' className='flex flex-col items-center gap-1'>
                <Activity className='h-4 w-4' />
                <span className='text-xs'>Runs</span>
              </Link>
            </Button>
            <Button
              asChild
              variant='ghost'
              size='sm'
              className='flex-col h-auto p-2'
            >
              <Link to='/flights' className='flex flex-col items-center gap-1'>
                <Plane className='h-4 w-4' />
                <span className='text-xs'>Flights</span>
              </Link>
            </Button>
          </nav>
        </div>

        {/* Add bottom padding for mobile navigation */}
        <div className='lg:hidden h-16' />

        {/* Router Devtools - only show in debug mode */}
        {isDebugMode() && <TanStackRouterDevtools />}
      </div>
    </ThemeProvider>
  ),
});

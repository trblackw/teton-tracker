import { QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { BarChart3, Bell, Car, Plane, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { ActiveRunBanner } from '../components/active-run-banner';
import { PasswordProtection } from '../components/password-protection';
import { ThemeProvider } from '../components/theme-provider';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { UserProfilePopover } from '../components/user-profile-popover';
import { AppContextProvider } from '../lib/AppContextProvider';
import { queryClient } from '../lib/react-query-client';
// import { initializeTomTomServiceWithConfig } from '../lib/services/tomtom-service';
import { toasts } from '../lib/toast';

const activeNavClass = 'bg-primary/10 text-blue-500';

function RootComponent() {
  const routerState = useRouterState();

  // Initialize services on app start
  // useEffect(() => {
  //   initializeTomTomServiceWithConfig();
  // }, []);

  // Auto-dismiss toasts on route change
  useEffect(() => {
    toasts.dismissAll();
  }, [routerState.location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContextProvider>
          <PasswordProtection>
            <div className="min-h-screen bg-background">
              {/* Active Run Banner */}
              <ActiveRunBanner />

              <div className="container mx-auto px-4 py-4">
                <div className="flex flex-col lg:flex-row lg:gap-8">
                  {/* Desktop Navigation */}
                  <aside className="hidden lg:block w-64 shrink-0">
                    <Card className="sticky top-4 bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="p-2 bg-primary rounded-lg">
                            <Plane className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <h1 className="text-xl font-bold text-foreground">
                            Teton Tracker
                          </h1>
                        </div>

                        {/* User Profile Section */}
                        <div className="mb-4 pb-4 border-b">
                          <UserProfilePopover />
                        </div>

                        <nav className="space-y-2">
                          <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <Link
                              to="/runs"
                              className="flex items-center gap-2"
                              activeProps={{
                                className: activeNavClass,
                              }}
                            >
                              <Car className="h-4 w-4" />
                              Current Runs
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <Link
                              to="/flights"
                              className="flex items-center gap-2"
                              activeProps={{
                                className: activeNavClass,
                              }}
                            >
                              <Plane className="h-4 w-4" />
                              Upcoming Flights
                            </Link>
                          </Button>
                          {/* <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <Link
                              to="/add"
                              className="flex items-center gap-2"
                              activeProps={{
                                className: activeNavClass,
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Add Run
                            </Link>
                          </Button> */}
                          <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <Link
                              to="/reports"
                              className="flex items-center gap-2"
                              activeProps={{
                                className: activeNavClass,
                              }}
                            >
                              <BarChart3 className="h-4 w-4" />
                              Reports
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <Link
                              to="/notifications"
                              className="flex items-center gap-2"
                              activeProps={{
                                className: activeNavClass,
                              }}
                            >
                              <Bell className="h-4 w-4" />
                              Notifications
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            <Link
                              to="/settings"
                              className="flex items-center gap-2"
                              activeProps={{
                                className: activeNavClass,
                              }}
                            >
                              <Settings className="h-4 w-4" />
                              Settings
                            </Link>
                          </Button>
                        </nav>
                      </CardContent>
                    </Card>
                  </aside>

                  {/* Main Content */}
                  <main
                    className="flex-1 lg:max-w-4xl pb-20 lg:pb-0"
                    data-scrollable
                  >
                    <Outlet />
                  </main>
                </div>
              </div>

              {/* Mobile Navigation */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
                <div className="flex items-center justify-between p-2">
                  <nav className="flex items-center justify-center gap-1 flex-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="flex-col h-auto p-3 min-w-[60px] touch-manipulation"
                    >
                      <Link
                        to="/runs"
                        className="flex flex-col items-center gap-1"
                        activeProps={{
                          className: activeNavClass,
                        }}
                      >
                        <Car className="size-7" />
                      </Link>
                    </Button>
                    {/* <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="flex-col h-auto p-3 min-w-[60px] touch-manipulation"
                    >
                      <Link
                        to="/add"
                        className="flex flex-col items-center gap-1"
                        activeProps={{
                          className: activeNavClass,
                        }}
                      >
                        <Plus className="size-6" />
                      </Link>
                    </Button> */}
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="flex-col h-auto p-3 min-w-[60px] touch-manipulation"
                    >
                      <Link
                        to="/flights"
                        className="flex flex-col items-center gap-1"
                        activeProps={{
                          className: activeNavClass,
                        }}
                      >
                        <Plane className="size-5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="flex-col h-auto p-3 min-w-[60px] touch-manipulation"
                    >
                      <Link
                        to="/reports"
                        className="flex flex-col items-center gap-1"
                        activeProps={{
                          className: activeNavClass,
                        }}
                      >
                        <BarChart3 className="size-5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="flex-col h-auto p-3 min-w-[60px] touch-manipulation"
                    >
                      <Link
                        to="/notifications"
                        className="flex flex-col items-center gap-1"
                        activeProps={{
                          className: activeNavClass,
                        }}
                      >
                        <Bell className="size-5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="flex-col h-auto p-3 min-w-[60px] touch-manipulation"
                    >
                      <Link
                        to="/settings"
                        className="flex flex-col items-center gap-1"
                        activeProps={{
                          className: activeNavClass,
                        }}
                      >
                        <Settings className="size-5" />
                      </Link>
                    </Button>
                  </nav>

                  {/* User Profile for Mobile */}
                  <div className="mr-7">
                    <UserProfilePopover />
                  </div>
                </div>
              </div>

              {/* Add bottom padding for mobile navigation */}
              <div className="lg:hidden h-16" />

              {/* Toast Notifications */}
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: 'hsl(var(--background))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                }}
                theme="system"
                richColors
                closeButton
                offset="20px"
                expand={false}
                visibleToasts={3}
              />
            </div>
          </PasswordProtection>
        </AppContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

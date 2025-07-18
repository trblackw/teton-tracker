import { QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import {
  BarChart3,
  Bell,
  Building2,
  Car,
  Plane,
  Plus,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { ActiveRunBanner } from '../components/active-run-banner';
import { PasswordProtection } from '../components/password-protection';
import { ThemeProvider } from '../components/theme-provider';
import { Button } from '../components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarNav,
  SidebarProvider,
} from '../components/ui/sidebar';
import {
  TopNav,
  TopNavCenter,
  TopNavLeft,
  TopNavLogo,
  TopNavRight,
  TopNavSidebarTrigger,
} from '../components/ui/top-nav';
import { UserProfilePopover } from '../components/user-profile-popover';
import { AppContextProvider } from '../lib/AppContextProvider';
import { isFeatureEnabled } from '../lib/features';
import { useMobile } from '../lib/hooks/use-mobile';
import {
  useIsUserAdmin,
  useUserOrganization,
} from '../lib/hooks/use-organizations';
import { queryClient } from '../lib/react-query-client';
import { toasts } from '../lib/toast';

const activeNavClass = 'bg-primary/10 text-blue-500';

function OrganizationDisplay() {
  const { data: organization, isLoading } = useUserOrganization();

  if (isLoading || !organization) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
      <Building2 className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[200px]">{organization.name}</span>
    </div>
  );
}

function AdminNavItems() {
  const { data: organization } = useUserOrganization();
  const { isAdmin } = useIsUserAdmin(organization?.id);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="px-3 py-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Administration
        </div>
      </div>
      <Button asChild variant="ghost" className="w-full justify-start">
        <Link
          to="/drivers"
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
        >
          <Users className="h-4 w-4" />
          Drivers
        </Link>
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <Link
          to="/create-runs"
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
        >
          <Plus className="h-4 w-4" />
          Create Runs
        </Link>
      </Button>
    </>
  );
}

function RootComponent() {
  const routerState = useRouterState();
  const isMobile = useMobile();

  // Auto-dismiss toasts on route change
  useEffect(() => {
    toasts.dismissAll();
  }, [routerState.location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContextProvider>
          <PasswordProtection>
            <SidebarProvider isMobile={isMobile} defaultOpen={!isMobile}>
              <div className="min-h-screen bg-background flex">
                <style>{`body { overflow-x: hidden; }`}</style>
                {/* Sidebar - only affects layout on desktop */}
                {!isMobile && (
                  <Sidebar>
                    <SidebarHeader>
                      <TopNavLogo />
                    </SidebarHeader>
                    <SidebarContent className="flex flex-col">
                      <SidebarNav className="flex-1">
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
                        {isFeatureEnabled('realTimeFlightTraffic') && (
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
                        )}
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
                        {isFeatureEnabled('pushNotifications') && (
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
                        )}
                      </SidebarNav>

                      {/* Admin section at bottom */}
                      <div className="mt-auto pt-4 border-t border-border">
                        <AdminNavItems />
                      </div>
                    </SidebarContent>
                  </Sidebar>
                )}

                {/* Mobile Sidebar - renders separately */}
                {isMobile && (
                  <Sidebar>
                    <SidebarHeader>
                      <TopNavLogo />
                    </SidebarHeader>
                    <SidebarContent className="flex flex-col">
                      <SidebarNav className="flex-1">
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
                        {isFeatureEnabled('realTimeFlightTraffic') && (
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
                        )}
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
                        {isFeatureEnabled('pushNotifications') && (
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
                        )}
                      </SidebarNav>

                      {/* Admin section at bottom */}
                      <div className="mt-auto pt-4 border-t border-border">
                        <AdminNavItems />
                      </div>
                    </SidebarContent>
                  </Sidebar>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col w-full">
                  {/* Top Navigation */}
                  <TopNav>
                    <TopNavLeft>
                      <TopNavSidebarTrigger />
                    </TopNavLeft>
                    <TopNavCenter>
                      <OrganizationDisplay />
                    </TopNavCenter>
                    <TopNavRight>
                      <UserProfilePopover />
                    </TopNavRight>
                  </TopNav>

                  {/* Active Run Banner */}
                  <ActiveRunBanner />

                  {/* Main Content */}
                  <main className="flex-1 px-4 py-4 max-w-full lg:container lg:max-w-4xl lg:mx-auto">
                    <Outlet />
                  </main>
                </div>
              </div>

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
            </SidebarProvider>
          </PasswordProtection>
        </AppContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

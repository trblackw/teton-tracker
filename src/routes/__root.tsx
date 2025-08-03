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
  FileText,
  LayoutTemplate,
  Plus,
  Users,
} from 'lucide-react';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

import { AuthGuard } from '../components/auth-guard';
import { ErrorBoundary } from '../components/error-boundary';
import { PasswordProtection } from '../components/password-protection';
import { ThemeProvider } from '../components/theme-provider';
import { Button } from '../components/ui/button';
import { OfflineIndicator } from '../components/ui/offline-indicator';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarNav,
  SidebarProvider,
  useSidebar,
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
import {
  useIsSuperAdmin,
  useUser,
  useUserOrganization,
} from '../lib/auth-client';
import { useCurrentRunsCount, useMobile, useOrgRoutePath } from '../lib/hooks';
import { queryClient } from '../lib/react-query-client';
import { OrganizationRole } from '../lib/schema';
import { toasts } from '../lib/toast';

const activeNavClass = 'bg-primary/10 text-highlight';

/**
 * Role-Based Navigation System
 *
 * Driver Navigation (accessible to all roles):
 * - Current Runs: /organizations/$organizationId/runs
 * - Flights: /flights (global)
 * - Notifications: /organizations/$organizationId/notifications
 * - Organization: /organizations/$organizationId
 *
 * Admin Navigation (admin, owner, super-admin only):
 * - Reports: /organizations/$organizationId/reports
 * - Drivers: /organizations/$organizationId/drivers
 * - Add Runs: /organizations/$organizationId/add-runs
 * - Request Run Report: /organizations/$organizationId/request-run-report
 * - Report Templates: /organizations/$organizationId/report-templates
 *
 * Super-Admin Navigation (super-admin only):
 * - System Admin: /super-admin
 */
// Component that automatically closes sidebar on mobile when navigation items are clicked
function MobileAwareNavLink({
  children,
  ...linkProps
}: React.ComponentProps<typeof Link>) {
  const { setIsOpen, isMobile } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <Link {...linkProps} onClick={handleClick}>
      {children}
    </Link>
  );
}

// Helper function to get user's role in current organization
function useUserRole() {
  const { data: organization } = useUserOrganization();
  const { user: currentUser } = useUser();
  const isSuperAdmin = useIsSuperAdmin();

  // Super-admin has all privileges
  if (isSuperAdmin) {
    return OrganizationRole.owner;
  }

  if (!organization || !currentUser) {
    return null;
  }

  // Find current user's role in organization
  const member = organization.members?.find(
    (member: any) => member.user?.id === currentUser.id
  );

  return member?.role || null;
}

// Driver Navigation Items (accessible to driver, admin, super-admin)
function DriverNavItems() {
  const { data: organization } = useUserOrganization();
  const getOrgPath = useOrgRoutePath();
  const userRole = useUserRole();
  const currentRunsCount = useCurrentRunsCount();

  // Only show if user has driver or higher privileges and organization exists
  if (!userRole || !organization) {
    return null;
  }

  return (
    <>
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to={getOrgPath('/runs')}
          className="flex items-center gap-2 w-full"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true, // Only active on exact /runs path
          }}
        >
          <Car className="h-4 w-4" />
          Current Runs
          {currentRunsCount > 0 && (
            <span className="text-blue-400 text-xs ml-auto">
              {currentRunsCount > 99 ? '99+' : currentRunsCount}
            </span>
          )}
        </MobileAwareNavLink>
      </Button>
      {/* <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to="/flights"
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
        >
          <Plane className="h-4 w-4" />
          Upcoming Flights
        </MobileAwareNavLink>
      </Button> */}
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to={getOrgPath('/notifications')}
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true, // Only active on exact /notifications path
          }}
        >
          <Bell className="h-4 w-4" />
          Notifications
        </MobileAwareNavLink>
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to={getOrgPath('/')}
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true, // Only active on exact org index path
          }}
        >
          <Building2 className="h-4 w-4" />
          Organization
        </MobileAwareNavLink>
      </Button>
    </>
  );
}

// Admin Navigation Items (accessible to admin, super-admin)
function AdminNavItems() {
  const { data: organization } = useUserOrganization();
  const getOrgPath = useOrgRoutePath();
  const userRole = useUserRole();

  // Only show if user has admin or super-admin privileges
  if (
    !userRole ||
    !organization ||
    (userRole !== 'admin' && userRole !== 'owner' && userRole !== 'super-admin')
  ) {
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
        <MobileAwareNavLink
          to={getOrgPath('/reports')}
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true,
          }}
        >
          <BarChart3 className="h-4 w-4" />
          Reports
        </MobileAwareNavLink>
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to={getOrgPath('/drivers')}
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true,
          }}
        >
          <Users className="h-4 w-4" />
          Drivers
        </MobileAwareNavLink>
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to={getOrgPath('/add-runs')}
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true,
          }}
        >
          <Plus className="h-4 w-4" />
          Add Runs
        </MobileAwareNavLink>
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to={getOrgPath('/request-run-report')}
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true,
          }}
        >
          <FileText className="h-4 w-4" />
          Request Run Report
        </MobileAwareNavLink>
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to={getOrgPath('/report-templates')}
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true,
          }}
        >
          <LayoutTemplate className="h-4 w-4" />
          Report Templates
        </MobileAwareNavLink>
      </Button>
    </>
  );
}

// Super Admin Navigation Items (accessible to super-admin only)
function SuperAdminNavItems() {
  const userRole = useUserRole();

  if (userRole !== OrganizationRole.owner) {
    return null;
  }

  return (
    <>
      <div className="px-3 py-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Super Admin
        </div>
      </div>
      <Button asChild variant="ghost" className="w-full justify-start">
        <MobileAwareNavLink
          to="/super-admin"
          className="flex items-center gap-2"
          activeProps={{
            className: activeNavClass,
          }}
          activeOptions={{
            exact: true,
          }}
        >
          <Building2 className="h-4 w-4" />
          System Admin
        </MobileAwareNavLink>
      </Button>
    </>
  );
}

function OrganizationDisplay() {
  const { data: organization, isPending } = useUserOrganization();

  if (isPending || !organization) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
      {organization.logo ? (
        <img
          src={organization.logo}
          alt={organization.name}
          className="object-contain max-h-8 max-w-32 w-auto h-auto"
        />
      ) : (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate max-w-[200px] text-sm">
            {organization.name}
          </span>
        </div>
      )}
    </div>
  );
}

function RootComponent() {
  const routerState = useRouterState();
  const isMobile = useMobile();

  // Auto-dismiss toasts on route change
  useEffect(() => {
    toasts.dismissAll();
  }, [routerState.location.pathname]);

  // Check if current route is public (doesn't require authentication)
  const isPublicRoute = ['/sign-in', '/sign-up'].includes(
    routerState.location.pathname
  );

  const appContent = (
    <SidebarProvider isMobile={isMobile} defaultOpen={!isMobile}>
      <div className="h-screen bg-background overflow-hidden">
        <style>{`body { overflow: hidden; }`}</style>

        {/* Only show sidebar for authenticated routes */}
        {!isPublicRoute && !isMobile && (
          <Sidebar>
            <SidebarHeader>
              <TopNavLogo />
            </SidebarHeader>
            <SidebarContent className="flex flex-col">
              <SidebarNav className="flex-1">
                <DriverNavItems />
              </SidebarNav>

              {/* Admin and Super Admin sections at bottom */}
              <div className="mt-auto pt-4 border-t border-border">
                <AdminNavItems />
                <SuperAdminNavItems />
              </div>
            </SidebarContent>
          </Sidebar>
        )}

        {/* Mobile Sidebar - renders separately */}
        {!isPublicRoute && isMobile && (
          <Sidebar>
            <SidebarHeader>
              <TopNavLogo />
            </SidebarHeader>
            <SidebarContent className="flex flex-col">
              <SidebarNav className="flex-1">
                <DriverNavItems />
              </SidebarNav>

              {/* Admin and Super Admin sections at bottom */}
              <div className="mt-auto pt-4 border-t border-border">
                <AdminNavItems />
                <SuperAdminNavItems />
              </div>
            </SidebarContent>
          </Sidebar>
        )}

        {/* Main Content Area */}
        <div
          className={
            !isPublicRoute && !isMobile
              ? 'flex flex-col h-screen overflow-hidden ml-64'
              : 'flex flex-col h-screen overflow-hidden'
          }
        >
          {/* Top Navigation - only for authenticated routes */}
          {!isPublicRoute && (
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
          )}

          {/* Main Content */}
          <main
            className={
              !isPublicRoute
                ? 'flex-1 px-4 max-w-full lg:container lg:max-w-4xl lg:mx-auto overflow-y-auto'
                : 'flex-1 overflow-y-auto'
            }
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />

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
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContextProvider>
          <ThemeProvider>
            <PasswordProtection>
              {isPublicRoute ? appContent : <AuthGuard>{appContent}</AuthGuard>}
            </PasswordProtection>
          </ThemeProvider>
        </AppContextProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

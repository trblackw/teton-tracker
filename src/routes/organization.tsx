import {
  OrganizationProfile,
  useOrganization,
  useOrganizationList,
  useUser,
} from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Building2, Settings, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  useActiveOrganization,
  useIsUserAdmin,
  useUserOrganization,
} from '../lib/hooks/use-organizations';

export const Route = createFileRoute('/organization')({
  component: OrganizationPage,
});

function OrganizationPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const { organization: clerkOrganization, isLoaded: clerkOrgLoaded } =
    useOrganization();
  const { setActive, isLoaded: orgListLoaded } = useOrganizationList();
  const { data: organization, isLoading: orgsLoading } = useUserOrganization();
  const { activeOrganization, isLoading: activeOrgLoading } =
    useActiveOrganization();
  const { isAdmin } = useIsUserAdmin(activeOrganization?.id);

  // Automatically set the user's organization as active
  useEffect(() => {
    if (
      organization &&
      orgListLoaded &&
      clerkOrgLoaded &&
      !clerkOrganization &&
      setActive
    ) {
      setActive({ organization: organization.id });
    }
  }, [
    organization,
    orgListLoaded,
    clerkOrgLoaded,
    clerkOrganization,
    setActive,
  ]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You must be signed in to view organization settings.
          </p>
        </div>
      </div>
    );
  }

  if (orgsLoading || activeOrgLoading || !clerkOrgLoaded || !orgListLoaded) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading organization...</p>
          </div>
        </div>
      </div>
    );
  }

  // If user has no organization, redirect them or show a message
  if (!organization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">No Organization</h1>
          <p className="text-muted-foreground mb-6">
            You're not a member of any organization yet.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Contact an administrator to get invited to an organization.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // If organization is still being set as active, show loading
  if (!clerkOrganization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Setting up organization...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-full overflow-hidden">
      {/* Organization Overview */}
      <div className="mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              {organization.imageUrl && (
                <img
                  src={organization.imageUrl}
                  alt={organization.name}
                  className="h-12 w-12 rounded-lg border shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Building2 className="h-5 w-5 shrink-0" />
                  <span className="truncate">{organization.name}</span>
                </CardTitle>
                <CardDescription className="mt-1">
                  {isAdmin && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Administrator
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>Organization Member</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Settings className="h-4 w-4 shrink-0" />
                <span>{isAdmin ? 'Full Access' : 'Limited Access'}</span>
              </div>
              <div className="text-muted-foreground sm:col-span-2 lg:col-span-1">
                Joined:{' '}
                {new Date(
                  (organization as any).membershipCreatedAt || Date.now()
                ).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clerk Organization Profile Component */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="w-full max-w-full overflow-x-auto">
          <OrganizationProfile
            appearance={{
              baseTheme: theme === 'dark' ? dark : undefined,
              elements: {
                rootBox: 'w-full max-w-full',
                card: 'shadow-none border-0 max-w-full',
                modalContent: 'max-w-full',
                modalCloseButton: 'top-4 right-4',
                headerTitle: 'text-base sm:text-lg',
                headerSubtitle: 'text-sm',
                // Make form fields responsive
                formField: 'w-full',
                formFieldInput: 'w-full text-sm',
                formButtonPrimary: 'w-full sm:w-auto text-sm',
                // Member list styling
                membersPageInviteButton: 'w-full sm:w-auto text-sm',
                // Responsive navigation
                navbar: 'flex-wrap',
                navbarButton: 'text-sm px-3 py-2',
                // Table responsiveness
                table: 'w-full text-sm',
                tableCell: 'px-2 py-3 text-xs sm:text-sm',
                tableHead: 'px-2 py-3 text-xs sm:text-sm font-medium',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

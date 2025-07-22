import { Link, useNavigate } from '@tanstack/react-router';
import {
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  authClient,
  signOut,
  useIsSuperAdmin,
  useUserOrganization,
  useUserOrganizations,
} from '../lib/auth-client';
import { useCurrentUserData } from '../lib/hooks/use-user';
import { toasts } from '../lib/toast';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

// Searchable organization select for super-admin users
function OrganizationSelect() {
  const [open, setOpen] = useState(false);
  const [allOrganizations, setAllOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: currentOrg } = useUserOrganization();
  const { data: userOrgs } = useUserOrganizations(); // Get user's direct organization memberships
  const isSuperAdmin = useIsSuperAdmin();

  // Fetch all organizations for super-admin when needed
  useEffect(() => {
    if (!isSuperAdmin || !open) return;

    const fetchAllOrganizations = async () => {
      setLoading(true);
      try {
        // Super-admin should see ALL organizations, not just ones they're members of
        const response = await authClient.organization.list();
        if (response.data) {
          setAllOrganizations(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch all organizations:', error);
        // Fallback to user's direct organizations if API call fails
        if (userOrgs) {
          setAllOrganizations(userOrgs);
        }
        toasts.error('Failed to load all organizations');
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrganizations();
  }, [isSuperAdmin, open, userOrgs]);

  const handleSelectOrganization = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId });
      toasts.success('Organization switched successfully');
      setOpen(false);
      // Refresh the page to update the context
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
      toasts.error('Failed to switch organization');
    }
  };

  if (!isSuperAdmin) return null;

  // Show organizations available to super-admin
  const organizationsToShow =
    allOrganizations.length > 0 ? allOrganizations : userOrgs || [];

  return (
    <div className="p-2 border-b">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Organization
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-xs h-8"
          >
            {currentOrg ? (
              <div className="flex items-center gap-2 truncate text-blue-500">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{currentOrg.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="h-4 w-4" />
                <span>Select organization...</span>
              </div>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <Command>
            <CommandInput
              placeholder="Search organizations..."
              className="h-8"
            />
            <CommandList className="max-h-[200px]">
              <CommandEmpty>
                {loading
                  ? 'Loading organizations...'
                  : 'No organizations found.'}
              </CommandEmpty>
              <CommandGroup>
                {organizationsToShow.map(org => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => handleSelectOrganization(org.id)}
                    className="cursor-pointer px-2 py-2"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {org.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {org.slug}
                        </span>
                      </div>
                      <Check
                        className={`h-4 w-4 shrink-0 ${
                          currentOrg?.id === org.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        }`}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Regular organization display for non-super-admin users
function RegularOrganizationDisplay({
  onNavClick,
}: {
  onNavClick: () => void;
}) {
  const { data: organization, isPending: orgsLoading } = useUserOrganization();
  const isSuperAdmin = useIsSuperAdmin();

  if (isSuperAdmin || !organization) return null;

  return (
    <div className="p-3 border-b">
      {orgsLoading ? (
        <div className="text-xs text-muted-foreground">
          Loading organization...
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Link
                to="/organization"
                className="text-sm font-medium truncate text-blue-500"
                onClick={onNavClick}
              >
                {organization.name}
              </Link>
            </div>
          </div>
          <span className="text-xs text-muted-foreground capitalize flex items-center gap-2">
            {(organization as any).role?.replace('org:', '') || 'Member'}
          </span>
        </div>
      )}
    </div>
  );
}

export function UserProfilePopover() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser, isLoading: userLoading } = useCurrentUserData();
  const { data: organization } = useUserOrganization();
  const isSuperAdmin = useIsSuperAdmin();

  if (userLoading || !currentUser) {
    return null;
  }

  const handleSignOut = async () => {
    setIsOpen(false); // Close popover immediately
    try {
      await signOut();
      toasts.success('Successfully signed out');
      navigate({ to: '/sign-in' });
    } catch (error) {
      console.error('Error signing out:', error);
      toasts.error('Failed to sign out');
    }
  };

  const handleNavClick = () => {
    setIsOpen(false); // Close popover when navigating
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-8 px-2"
        >
          {currentUser.image ? (
            <img
              src={currentUser.image}
              alt={currentUser.name || 'User'}
              className="size-7 rounded-full border border-blue-500"
            />
          ) : (
            <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          )}
          <span className="hidden md:block text-sm font-medium truncate">
            {currentUser.name || currentUser.email || 'User'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center space-x-2">
            {currentUser.image ? (
              <img
                src={currentUser.image}
                alt={currentUser.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {currentUser.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser.name}</span>
              <span className="text-xs text-muted-foreground">
                {currentUser.email}
              </span>
            </div>
          </div>
        </div>

        {/* Organization Section - Enhanced for Super Admin */}
        {isSuperAdmin && <OrganizationSelect />}
        {!isSuperAdmin && organization && (
          <RegularOrganizationDisplay onNavClick={handleNavClick} />
        )}

        <div className="p-1">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-sm"
          >
            <Link
              to="/settings"
              className="flex items-center gap-2"
              onClick={handleNavClick}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-sm"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign Out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

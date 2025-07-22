import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  Building2,
  Check,
  ChevronsUpDown,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import PageWrapper from '../components/ui/page-wrapper';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { Textarea } from '../components/ui/textarea';
import { organizationRequestsApi } from '../lib/api/organization-requests-api';
import { authClient, useUser } from '../lib/auth-client';
import { cn } from '../lib/cn';
import { toasts } from '../lib/toast';

function NoOrganizationPage() {
  const { user } = useUser();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Fetch all organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations', 'all'],
    queryFn: organizationRequestsApi.getAllOrganizations,
  });

  // Join request mutation
  const joinRequestMutation = useMutation({
    mutationFn: ({ orgId, message }: { orgId: string; message: string }) =>
      organizationRequestsApi.requestToJoin(orgId, message),
    onSuccess: data => {
      toasts.success(data.message || 'Join request sent successfully!');
      setShowRequestDialog(false);
      setSelectedOrgId('');
      setRequestMessage('');
    },
    onError: error => {
      toasts.error(
        error.message || 'Failed to send join request. Please try again.'
      );
    },
  });

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  const handleRequestJoin = () => {
    if (!selectedOrgId) {
      toasts.error('Please select an organization first');
      return;
    }
    setShowRequestDialog(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedOrgId) return;

    joinRequestMutation.mutate({
      orgId: selectedOrgId,
      message: requestMessage,
    });
  };

  return (
    <PageWrapper>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">Welcome to Teton Tracker</h1>
            <p className="text-muted-foreground">
              Hi {user?.name || user?.email}! You have a valid account, but
              you're not currently a member of any organization.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Request Organization Access
              </CardTitle>
              <CardDescription>
                Search for an organization below and request to join their team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Organization Combobox */}
              <div className="space-y-2">
                <Label htmlFor="organization">Select Organization</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                      disabled={orgsLoading}
                    >
                      {selectedOrg
                        ? selectedOrg.name
                        : orgsLoading
                          ? 'Loading...'
                          : 'Search organizations...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search organizations..." />
                      <CommandList>
                        <CommandEmpty>
                          {orgsLoading
                            ? 'Loading organizations...'
                            : 'No organizations found.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {organizations.map(org => (
                            <CommandItem
                              key={org.id}
                              value={org.name}
                              onSelect={() => {
                                setSelectedOrgId(org.id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedOrgId === org.id
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium truncate">
                                    {org.name}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs flex-shrink-0"
                                  >
                                    {org.slug}
                                  </Badge>
                                </div>
                                {org.description && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {org.description}
                                  </p>
                                )}
                                {org.memberCount && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {org.memberCount} members
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Request Join Button */}
              <Button
                onClick={handleRequestJoin}
                disabled={!selectedOrgId || joinRequestMutation.isPending}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Request to Join
                {selectedOrg && ` ${selectedOrg.name}`}
              </Button>

              {/* Info Text */}
              <p className="text-sm text-muted-foreground text-center">
                Organization administrators will review your request and send
                you an invitation if approved.
              </p>
            </CardContent>
          </Card>

          {/* Request Dialog */}
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request to Join {selectedOrg?.name}</DialogTitle>
                <DialogDescription>
                  Send a message to the organization administrators explaining
                  why you'd like to join their team.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Hi! I'd like to join your organization because..."
                    value={requestMessage}
                    onChange={e => setRequestMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                  disabled={joinRequestMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={joinRequestMutation.isPending}
                >
                  {joinRequestMutation.isPending
                    ? 'Sending...'
                    : 'Send Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PageWrapper>
  );
}

export const Route = createFileRoute('/no-organization')({
  beforeLoad: async () => {
    // Ensure user is authenticated
    const sessionResponse = await authClient.getSession();

    if (!sessionResponse.data?.user) {
      throw redirect({
        to: '/sign-in',
      });
    }

    // If user has organizations, redirect to main app
    const organizationsResponse = await authClient.organization.list();

    if (organizationsResponse.data && organizationsResponse.data.length > 0) {
      throw redirect({
        to: '/organizations/$organizationId/runs',
        params: { organizationId: organizationsResponse.data[0].id },
      });
    }

    return {};
  },
  component: NoOrganizationPage,
});

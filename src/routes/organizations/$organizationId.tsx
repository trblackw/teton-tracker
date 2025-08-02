import { createFileRoute, redirect } from '@tanstack/react-router';
import { Mail, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import PageWrapper from '../../components/ui/page-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { StickyHeader } from '../../components/ui/sticky-header';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { authClient, useUserOrganization } from '../../lib/auth-client';
import { cn } from '../../lib/cn';
import { useNonAdminRedirect } from '../../lib/hooks';
import { OrganizationRole } from '../../lib/schema';
import { toasts } from '../../lib/toast';

interface OrganizationParams {
  organizationId: string;
}

function OrganizationPage() {
  const { isAdmin, isLoading } = useNonAdminRedirect();
  const { data: organization, refetch: refetchOrganization } =
    useUserOrganization();
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [invitationsCount, setInvitationsCount] = useState(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // useNonAdminRedirect will handle the redirect
  }

  if (!organization) {
    return (
      <PageWrapper>
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">
            Organization Not Found
          </h2>
          <p className="text-muted-foreground">
            Unable to load organization information.
          </p>
        </div>
      </PageWrapper>
    );
  }

  const members = organization.members || [];

  return (
    <PageWrapper>
      <StickyHeader
        title={organization.name}
        subtitle="Organization settings & members"
      />

      <div className="space-y-3">
        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'members' | 'invites')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">
              Members{' '}
              <span className="text-sm text-muted-foreground ml-1">
                ({members.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="invites">
              Invites{' '}
              <span className="text-sm text-muted-foreground ml-1">
                ({invitationsCount})
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <MembersContent
              organization={organization}
              onRefetch={refetchOrganization}
            />
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            <InvitesContent
              organization={organization}
              onRefetch={refetchOrganization}
              onInvitationsCountChange={setInvitationsCount}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

function MembersContent({
  organization,
  onRefetch,
}: {
  organization: any;
  onRefetch: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const members = organization.members || [];

  // Filter members based on search
  const filteredMembers = members.filter(
    (member: any) =>
      member.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveMember = async (member: any) => {
    try {
      await authClient.organization.removeMember({
        organizationId: organization.id,
        memberIdOrEmail: member.user?.email || member.id,
      });
      toasts.success(
        `${member.user?.name || 'Member'} has been removed from the organization`
      );
      onRefetch();
    } catch (error) {
      toasts.error('Failed to remove member');
      console.error('Remove member error:', error);
    }
  };

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add Member Button */}
      <div className="flex flex-col items-center gap-2">
        <InviteMemberDialog
          organizationId={organization.id}
          onSuccess={onRefetch}
        />
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {filteredMembers.map((member: any) => (
          <MemberCard
            key={member.id}
            member={member}
            onRemove={() => handleRemoveMember(member)}
            canRemove={member.role !== 'owner'} // Can't remove owners
          />
        ))}
      </div>

      {/* Empty States */}
      {filteredMembers.length === 0 && members.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members found</h3>
            <p className="text-sm text-muted-foreground text-center">
              Try adjusting your search terms
            </p>
          </CardContent>
        </Card>
      )}

      {members.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Invite the first member to get started
            </p>
            <InviteMemberDialog
              organizationId={organization.id}
              onSuccess={onRefetch}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}

function InvitesContent({
  organization,
  onRefetch,
  onInvitationsCountChange,
}: {
  organization: any;
  onRefetch: () => void;
  onInvitationsCountChange: (count: number) => void;
}) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [isResending, setIsResending] = useState<string | null>(null);

  // Fetch invitations when component mounts or organization changes
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        setIsLoadingInvitations(true);
        const { data, error } = await authClient.organization.listInvitations({
          query: { organizationId: organization.id },
        });

        if (error) {
          console.error('Failed to load invitations:', error);
          toasts.error('Failed to load invitations');
          return;
        }

        setInvitations(data || []);
        onInvitationsCountChange((data || []).length);
      } catch (error) {
        console.error('Failed to load invitations:', error);
        toasts.error('Failed to load invitations');
      } finally {
        setIsLoadingInvitations(false);
      }
    };

    if (organization?.id) {
      fetchInvitations();
    }
  }, [organization?.id]);

  const handleResendInvitation = async (
    invitationId: string,
    email: string
  ) => {
    setIsResending(invitationId);
    try {
      // Cancel the existing invitation and create a new one
      await authClient.organization.cancelInvitation({
        invitationId,
      });

      const invitation = invitations.find(inv => inv.id === invitationId);
      if (invitation) {
        await authClient.organization.inviteMember({
          organizationId: organization.id,
          email: invitation.email,
          role: invitation.role,
        });

        toasts.success(`Invitation resent to ${email}`);

        // Refresh invitations list
        const { data } = await authClient.organization.listInvitations({
          query: { organizationId: organization.id },
        });
        setInvitations(data || []);
        onInvitationsCountChange((data || []).length);
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      toasts.error('Failed to resend invitation');
    } finally {
      setIsResending(null);
    }
  };

  const handleCancelInvitation = async (
    invitationId: string,
    email: string
  ) => {
    try {
      await authClient.organization.cancelInvitation({
        invitationId,
      });

      toasts.success(`Invitation to ${email} has been cancelled`);

      // Remove from local state
      setInvitations(prev => {
        const updated = prev.filter(inv => inv.id !== invitationId);
        onInvitationsCountChange(updated.length);
        return updated;
      });
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      toasts.error('Failed to cancel invitation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-300"
          >
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Accepted
          </Badge>
        );
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'expired':
        return (
          <Badge variant="secondary" className="text-gray-600">
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Simple Invite Button */}
      <div className="flex justify-center">
        <InviteMemberDialog
          organizationId={organization.id}
          onSuccess={() => {
            onRefetch();
            // Refresh invitations list after sending new invite
            authClient.organization
              .listInvitations({
                query: { organizationId: organization.id },
              })
              .then(({ data }) => {
                setInvitations(data || []);
                onInvitationsCountChange((data || []).length);
              });
          }}
        />
      </div>

      {/* Pending Invitations */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">
              Pending Invitations
            </h3>
            {!isLoadingInvitations && (
              <span className="text-sm text-muted-foreground">
                {invitations.length} invitation
                {invitations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {isLoadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">
                Loading invitations...
              </span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map(invitation => (
                <Card key={invitation.id} className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium">
                            {invitation.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">
                            {invitation.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                            <span>Role: {invitation.role}</span>
                            <span className="hidden sm:inline">•</span>
                            {invitation.expiresAt && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="sm:ml-1">
                                  Expires: {formatDate(invitation.expiresAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getStatusBadge(invitation.status)}

                        {invitation.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleResendInvitation(
                                  invitation.id,
                                  invitation.email
                                )
                              }
                              disabled={isResending === invitation.id}
                            >
                              {isResending === invitation.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1" />
                              ) : (
                                <Mail className="h-3 w-3 mr-1" />
                              )}
                              Resend
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleCancelInvitation(
                                  invitation.id,
                                  invitation.email
                                )
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemberCard({
  member,
  onRemove,
  canRemove,
}: {
  member: any;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const getRoleBadgeVariant = (role: OrganizationRole) => {
    switch (role) {
      case OrganizationRole.owner:
        return 'default';
      case OrganizationRole.admin:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case OrganizationRole.owner:
      case OrganizationRole.admin:
        return <Shield className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case OrganizationRole.owner:
        return 'bg-primary';
      case OrganizationRole.admin:
        return 'bg-secondary';
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium">
              {member.user?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                {member.user?.name || 'Unknown User'}
              </h3>
              <Badge
                variant={getRoleBadgeVariant(member.role)}
                className={cn(
                  'flex items-center gap-1',
                  getRoleColor(member.role)
                )}
              >
                {getRoleIcon(member.role)}
                {member.role}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {member.user?.email || 'No email'}
            </p>
          </div>
        </div>

        {canRemove && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function InviteMemberDialog({
  organizationId,
  onSuccess,
}: {
  organizationId: string;
  onSuccess: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });

  const handleInvite = async () => {
    if (!formData.email.trim()) {
      toasts.error('Email address is required');
      return;
    }

    setIsInviting(true);
    try {
      await authClient.organization.inviteMember({
        organizationId,
        email: formData.email,
        role: formData.role as any,
      });
      toasts.success(`Invitation sent to ${formData.email}`);
      setIsOpen(false);
      setFormData({ email: '', role: 'member' });
      onSuccess();
    } catch (error) {
      toasts.error('Failed to send invitation');
      console.error('Invite error:', error);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-highlight text-white hover:bg-highlight/90 w-full">
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="border">
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join this organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-xs text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={e =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={role => setFormData({ ...formData, role })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Members can view and use the platform. Admins can manage
              organization settings and members.
            </p>
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleInvite}
              disabled={isInviting}
              className="border border-highlight text-highlight bg-secondary hover:bg-secondary/90"
            >
              {isInviting ? (
                <div className="animate-spin text-highlight rounded-full h-4 w-4 border-b-2 mr-2" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send Invitation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute('/organizations/$organizationId')({
  beforeLoad: async ({ params }: { params: OrganizationParams }) => {
    // Get the current session to check if user is authenticated
    const sessionResponse = await authClient.getSession();

    if (!sessionResponse.data?.user) {
      throw redirect({
        to: '/sign-in',
      });
    }

    // Validate that the user has access to this organization
    const organizationsResponse = await authClient.organization.list();

    if (!organizationsResponse.data) {
      throw redirect({
        to: '/',
      });
    }

    const hasAccess = organizationsResponse.data.some(
      (org: any) => org.id === params.organizationId
    );

    if (!hasAccess) {
      // If user doesn't have access to this organization, redirect to first available org or home
      if (organizationsResponse.data.length > 0) {
        throw redirect({
          to: '/organizations/$organizationId',
          params: { organizationId: organizationsResponse.data[0].id },
        });
      } else {
        throw redirect({
          to: '/',
        });
      }
    }

    // Set the active organization
    await authClient.organization.setActive({
      organizationId: params.organizationId,
    });

    return { organizationId: params.organizationId };
  },
  component: OrganizationPage,
});

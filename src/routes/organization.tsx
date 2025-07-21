import { createFileRoute } from '@tanstack/react-router';
import {
  Building2,
  Edit,
  Mail,
  Plus,
  Settings,
  UserMinus,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  authClient,
  useUserOrganization,
  useUserOrganizations,
} from '../lib/auth-client';
import { useNonAdminRedirect } from '../lib/hooks/use-non-admin-redirect';
import { toasts } from '../lib/toast';

export const Route = createFileRoute('/organization')({
  component: OrganizationPage,
});

function OrganizationPage() {
  const { isAdmin, isLoading } = useNonAdminRedirect();
  const { data: currentOrg } = useUserOrganization();
  const { data: userOrgs } = useUserOrganizations();

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

  return (
    <div className="space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
          <p className="text-muted-foreground">
            Manage your organization settings and members
          </p>
        </div>
        <CreateOrganizationDialog />
      </div>

      {/* Current Organization */}
      {currentOrg ? (
        <CurrentOrganizationCard organization={currentOrg} />
      ) : (
        <NoOrganizationCard />
      )}

      {/* User's Organizations List */}
      {userOrgs && userOrgs.length > 0 && (
        <UserOrganizationsCard organizations={userOrgs} />
      )}

      {/* Organization Members */}
      {currentOrg && <OrganizationMembersCard organization={currentOrg} />}
    </div>
  );
}

function CurrentOrganizationCard({ organization }: { organization: any }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization.logo ? (
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-xl">{organization.name}</CardTitle>
              <CardDescription>
                {organization.slug} • Created{' '}
                {new Date(organization.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Current Organization</Badge>
            <EditOrganizationDialog organization={organization} />
          </div>
        </div>
      </CardHeader>
      {organization.metadata?.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {organization.metadata.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function NoOrganizationCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Organization</h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
          You're not currently part of any organization. Create one to start
          managing your team and operations.
        </p>
        <CreateOrganizationDialog />
      </CardContent>
    </Card>
  );
}

function UserOrganizationsCard({ organizations }: { organizations: any[] }) {
  const handleSwitchOrg = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId });
      toasts.success('Switched organization successfully');
      // Refresh the page to update the context
      window.location.reload();
    } catch (error) {
      toasts.error('Failed to switch organization');
      console.error('Switch org error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Your Organizations
        </CardTitle>
        <CardDescription>
          Organizations you're a member of ({organizations.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {organizations.map(org => (
            <div
              key={org.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {org.logo ? (
                  <img
                    src={org.logo}
                    alt={org.name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-sm text-muted-foreground">{org.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {org.members?.find((m: any) => m.role === 'admin')
                    ? 'Admin'
                    : 'Member'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSwitchOrg(org.id)}
                >
                  Switch
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizationMembersCard({ organization }: { organization: any }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const members = organization.members || [];

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await authClient.organization.inviteMember({
        organizationId: organization.id,
        email: inviteEmail,
        role: 'member',
      });
      toasts.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (error) {
      toasts.error('Failed to send invitation');
      console.error('Invite error:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (
    memberIdOrEmail: string,
    userName: string
  ) => {
    try {
      await authClient.organization.removeMember({
        organizationId: organization.id,
        memberIdOrEmail,
      });
      toasts.success(`${userName} has been removed from the organization`);
    } catch (error) {
      toasts.error('Failed to remove member');
      console.error('Remove member error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Members
            </CardTitle>
            <CardDescription>
              Manage who has access to your organization ({members.length}{' '}
              members)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite New Member */}
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-medium">Invite New Member</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInviteMember()}
            />
            <Button
              onClick={handleInviteMember}
              disabled={!inviteEmail.trim() || isInviting}
            >
              {isInviting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Invite
            </Button>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-3">
          {members.map((member: any) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {member.user?.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {member.user?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.user?.email || 'No email'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={member.role === 'admin' ? 'default' : 'outline'}
                >
                  {member.role}
                </Badge>
                {member.role !== 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleRemoveMember(
                        member.user?.email || member.id,
                        member.user?.name || 'Unknown'
                      )
                    }
                  >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateOrganizationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toasts.error('Organization name is required');
      return;
    }

    setIsCreating(true);
    try {
      const createData: any = {
        name: formData.name,
      };

      if (formData.slug.trim()) {
        createData.slug = formData.slug;
      }

      if (formData.description.trim()) {
        createData.metadata = { description: formData.description };
      }

      await authClient.organization.create(createData);
      toasts.success('Organization created successfully!');
      setIsOpen(false);
      setFormData({ name: '', slug: '', description: '' });
    } catch (error) {
      toasts.error('Failed to create organization');
      console.error('Create organization error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to manage your team and operations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              placeholder="Acme Corporation"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input
              id="slug"
              placeholder="acme-corp"
              value={formData.slug}
              onChange={e => setFormData({ ...formData, slug: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Used for URLs and identification. If not provided, one will be
              generated.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your organization..."
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Organization
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditOrganizationDialog({ organization }: { organization: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: organization.name || '',
    description: organization.metadata?.description || '',
  });

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toasts.error('Organization name is required');
      return;
    }

    setIsUpdating(true);
    try {
      await authClient.organization.update({
        organizationId: organization.id,
        data: {
          name: formData.name,
          ...(formData.description && {
            metadata: { description: formData.description },
          }),
        },
      });
      toasts.success('Organization updated successfully!');
      setIsOpen(false);
    } catch (error) {
      toasts.error('Failed to update organization');
      console.error('Update organization error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update your organization details and settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Organization Name *</Label>
            <Input
              id="edit-name"
              placeholder="Acme Corporation"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Brief description of your organization..."
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Update Organization
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

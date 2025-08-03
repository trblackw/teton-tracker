import { createFileRoute } from '@tanstack/react-router';
import { Mail, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import PageWrapper from '../../../components/ui/page-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { StickyHeader } from '../../../components/ui/sticky-header';
import { authClient, useUserOrganization } from '../../../lib/auth-client';
import { useNonAdminRedirect } from '../../../lib/hooks';
import { toasts } from '../../../lib/toast';

function MembersPage() {
  const { isAdmin, isLoading } = useNonAdminRedirect();
  const { data: organization } = useUserOrganization();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading members...</p>
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
    } catch (error) {
      toasts.error('Failed to remove member');
      console.error('Remove member error:', error);
    }
  };

  return (
    <PageWrapper>
      <StickyHeader
        title="Organization Members"
        subtitle={`Manage members for ${organization.name}`}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </StickyHeader>

      {/* Search and Stats */}
      <div className="my-2 flex flex-col items-center gap-2">
        <InviteMemberDialog organizationId={organization.id} />
        <div className="text-sm text-muted-foreground text-center">
          {filteredMembers.length} of {members.length} members
        </div>
      </div>
      {/* <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div> */}

      {/* Members List */}
      <div className="space-y-4 mt-3">
        {filteredMembers.map((member: any) => (
          <MemberCard
            key={member.id}
            member={member}
            onRemove={() => handleRemoveMember(member)}
            canRemove={member.role !== 'owner'} // Can't remove owners
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && members.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center ">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members found</h3>
            <p className="text-sm text-muted-foreground text-center">
              Try adjusting your search terms
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Members */}
      {members.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center ">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Invite the first member to get started
            </p>
            <InviteMemberDialog organizationId={organization.id} />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
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
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between px-4 py-1">
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
                className="flex items-center gap-1"
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
  onSuccess?: () => void;
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
      onSuccess?.();
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join this organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isInviting}>
              {isInviting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute('/organizations/$organizationId/members')({
  component: MembersPage,
});

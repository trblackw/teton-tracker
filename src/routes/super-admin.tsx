import { createFileRoute } from '@tanstack/react-router';
import {
  Building2,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
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
import PageWrapper from '../components/ui/page-wrapper';
import { StickyHeader } from '../components/ui/sticky-header';
import { Textarea } from '../components/ui/textarea';
import {
  authClient,
  useIsSuperAdmin,
  useUserOrganizations,
} from '../lib/auth-client';
import { toasts } from '../lib/toast';

export const Route = createFileRoute('/super-admin')({
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const { data: userOrgs, isPending } = useUserOrganizations();
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect non-super-admins
  if (!isPending && !isSuperAdmin) {
    return (
      <PageWrapper>
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">
            Access Denied
          </h2>
          <p className="text-muted-foreground">
            This page is restricted to system administrators only.
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (isPending) {
    return (
      <PageWrapper>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </PageWrapper>
    );
  }

  const organizations = userOrgs || [];

  // Filter organizations based on search
  const filteredOrgs = organizations.filter(
    org =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageWrapper>
      <StickyHeader
        title="Manage Organizations"
        subtitle="Super admin view of all organizations in the system"
      >
        <CreateOrganizationDialog />
      </StickyHeader>

      {/* Search and Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredOrgs.length} of {organizations.length} organizations
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrgs.map(org => (
          <OrganizationCard key={org.id} organization={org} />
        ))}
      </div>

      {/* Empty State */}
      {filteredOrgs.length === 0 && organizations.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No organizations found
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              Try adjusting your search terms
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Organizations */}
      {organizations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Create the first organization to get started
            </p>
            <CreateOrganizationDialog />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}

function OrganizationCard({ organization }: { organization: any }) {
  const memberCount = organization.members?.length || 0;
  const adminCount =
    organization.members?.filter((m: any) => m.role === 'admin').length || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {organization.logo ? (
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">
                {organization.name}
              </CardTitle>
              <CardDescription className="truncate">
                {organization.slug}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Members</span>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{memberCount}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Admins</span>
          <Badge variant="outline">{adminCount}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span className="text-muted-foreground">
            {new Date(organization.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Users className="h-4 w-4 mr-1" />
            Members
          </Button>
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
            Create a new organization to manage teams and operations.
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
              placeholder="Brief description of the organization..."
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

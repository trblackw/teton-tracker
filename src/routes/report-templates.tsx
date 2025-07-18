import { createFileRoute } from '@tanstack/react-router';
import { Edit3, Eye, Plus, Settings, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Toggle } from '../components/ui/toggle';
import {
  useIsUserAdmin,
  useUserOrganization,
} from '../lib/hooks/use-organizations';
import {
  type ReportColumnConfig,
  type ReportTemplate,
  type ReportType,
  defaultReportTemplateFields,
} from '../lib/schema';

export const Route = createFileRoute('/report-templates')({
  component: ReportTemplatesPage,
});

// Mock data for development - this would be replaced with API calls
const mockTemplates: ReportTemplate[] = [
  {
    id: '1',
    name: 'Standard Run Report',
    description: 'Default template for run reports with all essential fields',
    organizationId: 'org-1',
    reportType: 'run' as ReportType,
    columnConfig: [
      {
        field: 'flightNumber',
        label: 'Flight Number',
        enabled: true,
        order: 0,
      },
      { field: 'airline', label: 'Airline', enabled: true, order: 1 },
      {
        field: 'departure',
        label: 'Departure Airport',
        enabled: true,
        order: 2,
      },
      { field: 'arrival', label: 'Arrival Airport', enabled: true, order: 3 },
      {
        field: 'pickupLocation',
        label: 'Pickup Location',
        enabled: true,
        order: 4,
      },
      {
        field: 'dropoffLocation',
        label: 'Dropoff Location',
        enabled: true,
        order: 5,
      },
      { field: 'price', label: 'Price', enabled: true, order: 6 },
    ],
    isDefault: true,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

function ReportTemplatesPage() {
  const { data: organization } = useUserOrganization();
  const { isAdmin } = useIsUserAdmin(organization?.id);
  const [templates, setTemplates] = useState(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You must be an administrator to access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateTemplate = (
    newTemplate: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const template: ReportTemplate = {
      ...newTemplate,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTemplates([...templates, template]);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateTemplate = (updatedTemplate: ReportTemplate) => {
    setTemplates(
      templates.map(t =>
        t.id === updatedTemplate.id
          ? { ...updatedTemplate, updatedAt: new Date() }
          : t
      )
    );
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Report Templates</h1>
          <p className="text-muted-foreground">
            Manage report templates & configure which columns appear in
            generated reports.
          </p>
        </div>
      </div>
      <div className="flex justify-end pb-2">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-400 text-foreground hover:bg-blue-500/90 font-bold flex items-center">
              <Plus className="size-5" strokeWidth={3} />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <TemplateFormDialog
              mode="create"
              onSave={handleCreateTemplate}
              organizationId={organization?.id || ''}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <Badge
                    className="ml-auto bg-transparent text-gray-200 border-gray-200"
                    variant={template.isDefault ? 'default' : 'secondary'}
                  >
                    {template.isDefault ? 'Default' : template.reportType}
                  </Badge>
                </div>
                <CardDescription>{template.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" strokeWidth={3} />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Preview: {template.name}</DialogTitle>
                      <DialogDescription>
                        Column configuration for this template
                      </DialogDescription>
                    </DialogHeader>
                    <TemplatePreview template={template} />
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={
                    isEditDialogOpen && selectedTemplate?.id === template.id
                  }
                  onOpenChange={open => {
                    setIsEditDialogOpen(open);
                    if (!open) setSelectedTemplate(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      //   variant="secondary"
                      className="bg-green-500 text-white font-bold flex items-center hover:bg-green-500/90 gap-2"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Edit3 className="h-4 w-4" strokeWidth={3} />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <TemplateFormDialog
                      mode="edit"
                      template={template}
                      onSave={handleUpdateTemplate}
                      organizationId={organization?.id || ''}
                    />
                  </DialogContent>
                </Dialog>

                {!template.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {template.columnConfig
                    .filter(col => col.enabled)
                    .sort((a, b) => a.order - b.order)
                    .map(col => (
                      <Badge
                        key={col.field}
                        variant="outline"
                        className="text-xs bg-blue-400/10 text-blue-400"
                      >
                        {col.label}
                      </Badge>
                    ))}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                  <strong>
                    {template.columnConfig.filter(c => c.enabled).length}
                  </strong>{' '}
                  of <strong>{template.columnConfig.length}</strong> columns
                  enabled
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first report template to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface TemplateFormDialogProps {
  mode: 'create' | 'edit';
  template?: ReportTemplate;
  onSave: (template: any) => void;
  organizationId: string;
}

function TemplateFormDialog({
  mode,
  template,
  onSave,
  organizationId,
}: TemplateFormDialogProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    reportType: template?.reportType || ('run' as ReportType),
    isDefault: template?.isDefault || false,
    columnConfig:
      template?.columnConfig ||
      defaultReportTemplateFields.map((field, index) => ({
        field,
        label:
          field.charAt(0).toUpperCase() +
          field.slice(1).replace(/([A-Z])/g, ' $1'),
        enabled: true,
        order: index,
      })),
  });

  const handleSave = () => {
    const templateData = {
      ...formData,
      organizationId,
      createdBy: 'current-user-id', // This would come from your auth system
    };

    if (mode === 'edit' && template) {
      onSave({ ...template, ...templateData });
    } else {
      onSave(templateData);
    }
  };

  const updateColumnConfig = (
    field: string,
    updates: Partial<ReportColumnConfig>
  ) => {
    setFormData(prev => ({
      ...prev,
      columnConfig: prev.columnConfig.map(col =>
        col.field === field ? { ...col, ...updates } : col
      ),
    }));
  };

  const moveColumn = (field: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const config = [...prev.columnConfig];
      const index = config.findIndex(col => col.field === field);

      if (direction === 'up' && index > 0) {
        [config[index], config[index - 1]] = [config[index - 1], config[index]];
        config[index - 1].order = index - 1;
        config[index].order = index;
      } else if (direction === 'down' && index < config.length - 1) {
        [config[index], config[index + 1]] = [config[index + 1], config[index]];
        config[index].order = index;
        config[index + 1].order = index + 1;
      }

      return { ...prev, columnConfig: config };
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === 'create' ? 'Create' : 'Edit'} Report Template
        </DialogTitle>
        <DialogDescription>
          Configure the template name, type, and which columns should appear in
          reports.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e =>
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Standard Run Report"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select
              value={formData.reportType}
              onValueChange={(value: ReportType) =>
                setFormData(prev => ({ ...prev, reportType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="run">Run Report</SelectItem>
                <SelectItem value="flight">Flight Report</SelectItem>
                <SelectItem value="traffic">Traffic Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e =>
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
            placeholder="Describe what this template is used for..."
            rows={3}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Column Configuration</Label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    isDefault: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="isDefault" className="text-sm">
                Set as default template
              </Label>
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="grid grid-cols-12 gap-4 p-3 border-b bg-muted/50 font-medium text-sm">
              <div className="col-span-3">Field</div>
              <div className="col-span-4">Display Label</div>
              <div className="col-span-2">Enabled</div>
              <div className="col-span-3">Order</div>
            </div>

            {formData.columnConfig
              .sort((a, b) => a.order - b.order)
              .map(col => (
                <div
                  key={col.field}
                  className="grid grid-cols-12 gap-4 p-3 border-b last:border-b-0"
                >
                  <div className="col-span-3 font-mono text-sm text-muted-foreground">
                    {col.field}
                  </div>

                  <div className="col-span-4">
                    <Input
                      value={col.label}
                      onChange={e =>
                        updateColumnConfig(col.field, { label: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <Toggle
                      pressed={col.enabled}
                      onPressedChange={enabled =>
                        updateColumnConfig(col.field, { enabled })
                      }
                      aria-label={`Toggle ${col.field}`}
                    >
                      {col.enabled ? 'Yes' : 'No'}
                    </Toggle>
                  </div>

                  <div className="col-span-3 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveColumn(col.field, 'up')}
                      disabled={col.order === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveColumn(col.field, 'down')}
                      disabled={col.order === formData.columnConfig.length - 1}
                    >
                      ↓
                    </Button>
                    <span className="text-sm text-muted-foreground ml-2">
                      {col.order + 1}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setFormData(prev => ({ ...prev }))}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!formData.name.trim()}>
          {mode === 'create' ? 'Create' : 'Update'} Template
        </Button>
      </div>
    </>
  );
}

function TemplatePreview({ template }: { template: ReportTemplate }) {
  const enabledColumns = template.columnConfig
    .filter(col => col.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        This template will generate reports with the following columns in this
        order:
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 p-3 border-b font-medium">
          Report Preview
        </div>
        <div className="p-4">
          <div className="grid gap-2">
            {enabledColumns.map((col, index) => (
              <div
                key={col.field}
                className="flex items-center gap-3 p-2 border rounded"
              >
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{col.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {col.field}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

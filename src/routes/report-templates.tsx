import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createFileRoute } from '@tanstack/react-router';
import {
  Asterisk,
  Edit3,
  Eye,
  GripVertical,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  useIsUserAdmin,
  useUserOrganization,
} from '../lib/hooks/use-organizations';
import {
  defaultReportTemplateFields,
  type ReportColumnConfig,
  type ReportTemplate,
  type ReportType,
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
        order: 0,
        required: true,
      },
      { field: 'airline', label: 'Airline', order: 1, required: true },
      {
        field: 'departure',
        label: 'Departure Airport',
        order: 2,
        required: true,
      },
      { field: 'arrival', label: 'Arrival Airport', order: 3, required: true },
      {
        field: 'pickupLocation',
        label: 'Pickup Location',
        order: 4,
        required: true,
      },
      {
        field: 'dropoffLocation',
        label: 'Dropoff Location',
        order: 5,
        required: false,
      },
      { field: 'price', label: 'Price', order: 6, required: false },
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
    <div className="container mx-auto py-6 max-w-4xl px-4">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Report Templates</h1>
          <p className="text-muted-foreground text-sm">
            Manage report templates and configure which columns appear in
            reports.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="flex items-center gap-2 font-bold bg-green-400 text-white hover:bg-green-400/90"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <TemplateFormDialog
              mode="create"
              onSave={handleCreateTemplate}
              organizationId={organization?.id || ''}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4">
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
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {template.columnConfig
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
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex items-center gap-2 justify-between w-full">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
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
                      className="bg-slate-600 text-white flex items-center hover:bg-slate-600/90 gap-2"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <TemplateFormDialog
                      mode="edit"
                      template={template}
                      onSave={handleUpdateTemplate}
                      organizationId={organization?.id || ''}
                      onCancel={() => setIsEditDialogOpen(false)}
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
            </CardFooter>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground text-center mb-4 text-sm">
                Create your first report template to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
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
  onCancel: () => void;
}

// Sortable item component for drag and drop
function SortableColumnItem({
  column,
  onUpdate,
}: {
  column: ReportColumnConfig & { id: string };
  onUpdate: (field: string, updates: Partial<ReportColumnConfig>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isDevMode = false;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-lg p-4 touch-manipulation ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="touch-manipulation cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded mt-1"
          style={{ touchAction: 'none' }}
          onTouchStart={e => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isDevMode && (
                <code className="text-sm font-bold text-red-400">
                  {column.field}
                </code>
              )}
            </div>
            <Input
              value={column.label}
              onChange={e => onUpdate(column.field, { label: e.target.value })}
              placeholder="Column label"
              className="text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`required-${column.field}`}
              checked={column.required}
              onChange={e =>
                onUpdate(column.field, { required: e.target.checked })
              }
              className="rounded"
            />
            <Label
              htmlFor={`required-${column.field}`}
              className="text-sm text-muted-foreground"
            >
              Required field for drivers
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateFormDialog({
  mode,
  template,
  onSave,
  organizationId,
  onCancel,
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
        order: index,
        required: false,
      })),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15, // Increased distance to prevent accidental activation during scrolling
        delay: 100, // Small delay to distinguish from scrolling
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.columnConfig.findIndex(
          col => col.field === active.id
        );
        const newIndex = prev.columnConfig.findIndex(
          col => col.field === over.id
        );

        // Reorder the array and update order values
        const reorderedConfig = arrayMove(
          prev.columnConfig,
          oldIndex,
          newIndex
        ).map((col, index) => ({
          ...col,
          order: index,
        }));

        return {
          ...prev,
          columnConfig: reorderedConfig,
        };
      });
    }
  };

  const sortableColumns = formData.columnConfig
    .sort((a, b) => a.order - b.order)
    .map(col => ({
      ...col,
      id: col.field,
    }));

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === 'create' ? 'Create' : 'Edit'} Report Template
        </DialogTitle>
        <DialogDescription>
          Configure the template and drag to reorder columns as they'll appear
          in reports.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-1 gap-4">
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
            <div>
              <Label className="text-base">Column Configuration</Label>
            </div>
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
              <Label
                htmlFor="isDefault"
                className="text-sm text-muted-foreground"
              >
                Set as default
              </Label>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableColumns.map(col => col.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3" style={{ userSelect: 'none' }}>
                {sortableColumns.map(col => (
                  <SortableColumnItem
                    key={col.id}
                    column={col}
                    onUpdate={updateColumnConfig}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            onCancel();
            setFormData(prev => ({ ...prev }));
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.name.trim()}
          className="bg-blue-400 text-white hover:bg-blue-500/90"
        >
          {mode === 'create' ? 'Create' : 'Update'} Template
        </Button>
      </div>
    </>
  );
}

function TemplatePreview({ template }: { template: ReportTemplate }) {
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
            {template.columnConfig
              .sort((a, b) => a.order - b.order)
              .map((col, index) => (
                <div
                  key={col.field}
                  className="flex items-center gap-3 p-3 border rounded"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{col.label}</div>
                      {col.required && (
                        <Asterisk className="h-3 w-3 text-red-500" />
                      )}
                    </div>
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

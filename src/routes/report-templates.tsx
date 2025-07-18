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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { type CSSProperties, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '../components/ui/command';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { reportTemplatesApi } from '../lib/api/client';
import { useAppContext } from '../lib/AppContextProvider';
import {
  useIsUserAdmin,
  useUserOrganization,
} from '../lib/hooks/use-organizations';
import {
  type ReportColumnConfig,
  type ReportTemplate,
  type ReportTemplateForm,
  ReportType,
  validateReportTemplateForm,
} from '../lib/schema';
import { toasts } from '../lib/toast';

export const Route = createFileRoute('/report-templates')({
  component: ReportTemplatesPage,
});

function ReportTemplatesPage() {
  const { data: organization } = useUserOrganization();
  const { isAdmin } = useIsUserAdmin(organization?.id);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch templates using the API client
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportTemplatesApi.getReportTemplates(),
    enabled: !!isAdmin,
  });

  // Get all existing column configurations from organization templates
  const existingColumnConfigs = useMemo(() => {
    const allColumns = templates.flatMap(template => template.columnConfig);

    // Deduplicate by field name and create a map with the most descriptive label
    const uniqueColumns = new Map<
      string,
      { field: string; label: string; usageCount: number }
    >();

    allColumns.forEach(col => {
      if (uniqueColumns.has(col.field)) {
        const existing = uniqueColumns.get(col.field)!;
        existing.usageCount++;
        // Keep the longer/more descriptive label
        if (col.label.length > existing.label.length) {
          existing.label = col.label;
        }
      } else {
        uniqueColumns.set(col.field, {
          field: col.field,
          label: col.label,
          usageCount: 1,
        });
      }
    });

    return Array.from(uniqueColumns.values()).sort((a, b) => {
      // Sort by usage count (most used first), then alphabetically
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.label.localeCompare(b.label);
    });
  }, [templates]);

  // Mutations for CRUD operations
  const createTemplateMutation = useMutation({
    mutationFn: (templateData: ReportTemplateForm) =>
      reportTemplatesApi.createReportTemplate(templateData),
    onSuccess: createdTemplate => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setIsCreateDialogOpen(false);
      toasts.success(
        'Template created successfully',
        `${createdTemplate.name} has been added to your report templates.`
      );
    },
    onError: error => {
      console.error('Failed to create template:', error);
      toasts.error('Failed to create template', error.message);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({
      id,
      templateData,
    }: {
      id: string;
      templateData: ReportTemplateForm;
    }) => reportTemplatesApi.updateReportTemplate(id, templateData),
    onSuccess: updatedTemplate => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      toasts.success(
        'Template updated successfully',
        `${updatedTemplate.name} has been updated with your changes.`
      );
    },
    onError: error => {
      console.error('Failed to update template:', error);
      toasts.error('Failed to update template', error.message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      reportTemplatesApi.deleteReportTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toasts.success(
        'Template deleted successfully',
        'The report template has been removed from your organization.'
      );
    },
    onError: error => {
      console.error('Failed to delete template:', error);
      toasts.error('Failed to delete template', error.message);
    },
  });

  const handleCreateTemplate = (newTemplate: ReportTemplateForm) => {
    createTemplateMutation.mutate(newTemplate);
  };

  const handleUpdateTemplate = (updatedTemplateForm: ReportTemplateForm) => {
    if (!selectedTemplate) return;

    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      templateData: updatedTemplateForm,
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  // Show loading state
  if (isLoadingTemplates) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

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
              existingColumns={existingColumnConfigs || []}
              isLoading={createTemplateMutation.isPending}
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
                      existingColumns={existingColumnConfigs || []}
                      isLoading={updateTemplateMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>

                {!template.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={deleteTemplateMutation.isPending}
                  >
                    {deleteTemplateMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
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
  onSave: (template: ReportTemplateForm) => void;
  organizationId: string;
  onCancel: () => void;
  existingColumns: { field: string; label: string; usageCount: number }[];
  isLoading?: boolean;
}

interface SortableColumnItemProps {
  column: ReportColumnConfig & { id: string };
  index: number;
  register: any;
  errors: any;
  onRemove: (field: string) => void;
}

// Sortable item component for drag and drop
function SortableColumnItem({
  column,
  index,
  register,
  errors,
  onRemove,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
            {/* Hidden inputs for field and order */}
            <input type="hidden" {...register(`columnConfig.${index}.field`)} />
            <input type="hidden" {...register(`columnConfig.${index}.order`)} />
            <Input
              {...register(`columnConfig.${index}.label`, {
                required: 'Column label is required',
                validate: (value: string) =>
                  value.trim().length > 0 || 'Column label cannot be empty',
              })}
              placeholder="Column label"
              className="text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {errors.columnConfig?.[index]?.label && (
              <p className="text-sm text-red-500 mt-1">
                {errors.columnConfig[index].label.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`required-${column.field}`}
              {...register(`columnConfig.${index}.required`)}
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(column.field)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
  existingColumns,
  isLoading = false,
}: TemplateFormDialogProps) {
  const { currentUser } = useAppContext();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<ReportTemplateForm>({
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      reportType: template?.reportType || ReportType.run,
      isDefault: template?.isDefault || false,
      columnConfig: template?.columnConfig || [],
      organizationId,
      createdBy: currentUser?.id || '',
    },
    mode: 'onChange',
    resolver: undefined, // We'll use manual validation with the schema
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'columnConfig',
    rules: {
      minLength: {
        value: 2,
        message: 'Template must have at least 2 columns',
      },
    },
  });

  console.log(fields);

  const columnConfig = watch('columnConfig');

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

  const onSubmit = (data: ReportTemplateForm) => {
    // Ensure user is authenticated
    if (!currentUser?.id) {
      toasts.error(
        'Authentication required',
        'User must be authenticated to save template.'
      );
      return;
    }

    const templateData: ReportTemplateForm = {
      ...data,
      organizationId,
      createdBy: currentUser.id,
    };

    // Validate the template data using the schema
    try {
      validateReportTemplateForm(templateData);
      onSave(templateData);
    } catch (error) {
      if (error instanceof Error) {
        toasts.error('Invalid template data', error.message);
      } else {
        toasts.error(
          'Validation failed',
          'Please check your template configuration and try again.'
        );
      }
    }
  };

  const removeColumn = (field: string) => {
    remove(columnConfig.findIndex(col => col.field === field));
  };

  const addColumn = (field: string, label: string) => {
    append({
      field,
      label,
      order: columnConfig.length,
      required: false,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      move(
        columnConfig.findIndex(col => col.field === active.id),
        columnConfig.findIndex(col => col.field === over.id)
      );
    }
  };

  const sortableColumns = columnConfig
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
            <Label htmlFor="name">
              Template Name <span className="text-xs text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name', { required: 'Template name is required' })}
              placeholder="e.g., Standard Run Report"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select
              value={watch('reportType')}
              onValueChange={(value: ReportType) =>
                setValue('reportType', value)
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
            {errors.reportType && (
              <p className="text-sm text-red-500">
                {errors.reportType.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe what this template is used for..."
            rows={3}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
          <div className="flex items-center justify-start gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={watch('isDefault')}
              onChange={e => setValue('isDefault', e.target.checked)}
            />
            <Label
              htmlFor="isDefault"
              className="text-sm text-muted-foreground"
            >
              Set as default
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Column Configuration</Label>
              {errors.columnConfig?.root && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.columnConfig.root.message}
                </p>
              )}
            </div>
          </div>

          {/* Add Column Dropdown */}
          <AddColumnCombobox
            existingColumns={existingColumns}
            usedFields={columnConfig.map(col => col.field)}
            onAddColumn={addColumn}
          />

          {/* Show message when all available fields have been added */}
          {existingColumns.length > 0 &&
            existingColumns.filter(
              col => !columnConfig.some(config => config.field === col.field)
            ).length === 0 &&
            columnConfig.length > 0 && (
              <div className="text-sm text-muted-foreground">
                All existing columns have been added. You can still create new
                columns by typing in the search above.
              </div>
            )}

          {/* Columns List */}
          {columnConfig.length > 0 ? (
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
                  {sortableColumns.map((col, index) => (
                    <SortableColumnItem
                      key={col.id}
                      column={col}
                      index={index}
                      register={register}
                      errors={errors}
                      onRemove={removeColumn}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No columns added yet.</p>
              <p className="text-xs">
                Use the "Add Column" dropdown above to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            onCancel();
            reset(); // Reset form values
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={!isValid || columnConfig.length < 2 || isLoading}
          className="bg-blue-400 text-white hover:bg-blue-500/90"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </>
          ) : (
            `${mode === 'create' ? 'Create' : 'Update'} Template`
          )}
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

// Add Column Combobox component
function AddColumnCombobox({
  existingColumns,
  usedFields,
  onAddColumn,
}: {
  existingColumns: { field: string; label: string; usageCount: number }[];
  usedFields: string[];
  onAddColumn: (field: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Filter existing columns that haven't been used yet
  const availableColumns = existingColumns.filter(
    col => !usedFields.includes(col.field)
  );

  // Check if the search value could be a new column
  const isNewColumn =
    searchValue.length > 0 &&
    !availableColumns.some(
      col =>
        col.field.toLowerCase() === searchValue.toLowerCase() ||
        col.label.toLowerCase() === searchValue.toLowerCase()
    );

  const handleSelect = (field: string, label: string) => {
    onAddColumn(field, label);
    setSearchValue('');
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (searchValue.trim()) {
      // Convert search value to a field name (camelCase)
      const field = searchValue
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
        .replace(/^\w/, char => char.toLowerCase());

      const label = searchValue.trim();
      handleSelect(field, label);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          Add Column...
          <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search existing columns or type new name..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            {isNewColumn ? (
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleCreateNew}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create "{searchValue}"
                </Button>
              </div>
            ) : (
              'No columns found.'
            )}
          </CommandEmpty>
          {availableColumns.length > 0 && (
            <CommandGroup heading="Existing Columns">
              {availableColumns
                .filter(
                  col =>
                    col.field
                      .toLowerCase()
                      .includes(searchValue.toLowerCase()) ||
                    col.label.toLowerCase().includes(searchValue.toLowerCase())
                )
                .map(col => (
                  <CommandItem
                    key={col.field}
                    onSelect={() => handleSelect(col.field, col.label)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{col.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {col.field} • usage: {col.usageCount}
                        {col.usageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
          {searchValue && isNewColumn && availableColumns.length > 0 && (
            <CommandGroup heading="Create New">
              <CommandItem onSelect={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create "{searchValue}"
              </CommandItem>
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

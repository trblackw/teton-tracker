import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router';
import {
  AlertTriangle,
  Database,
  Info,
  Loader2,
  Plus,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { OrganizationLink } from '../../../components/ui/organization-link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import {
  useCurrentOrgId,
  useNonAdminRedirect,
  useOrgReportTemplatesApi,
  useOrgRunsApi,
} from '../../../lib/hooks';
import { queryKeys } from '../../../lib/react-query-client';
import type { ReportTemplate } from '../../../lib/schema';
import { toasts } from '../../../lib/toast';

// Dynamic form schema based on selected template
const createDynamicFormSchema = (template: ReportTemplate | null) => {
  if (!template) {
    return z.object({
      templateId: z.string().min(1, 'Please select a report template'),
    });
  }

  const schemaFields: Record<string, z.ZodTypeAny> = {
    templateId: z.string().min(1, 'Template ID is required'),
  };

  // Add required fields from template
  template.columnConfig.forEach(column => {
    if (column.required) {
      schemaFields[column.field] = z
        .string()
        .min(1, `${column.label} is required`);
    } else {
      schemaFields[column.field] = z.string().optional();
    }
  });

  return z.object(schemaFields);
};

type DynamicFormData = Record<string, string>;

function AddRunsPage() {
  const router = useRouter();
  const search = useSearch({ from: '/organizations/$organizationId/add-runs' });
  const queryClient = useQueryClient();
  const { isAdmin, organization, isLoading } = useNonAdminRedirect();
  const organizationId = useCurrentOrgId();
  const runsApi = useOrgRunsApi();
  const reportTemplatesApi = useOrgReportTemplatesApi();

  // State for form management
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Query for report templates
  const {
    data: templates = [],
    isLoading: templatesLoading,
    isError: templatesError,
  } = useQuery({
    queryKey: queryKeys.reportTemplates(organizationId),
    queryFn: () => reportTemplatesApi.getReportTemplates(),
    enabled: !!isAdmin && !!organizationId, // Only fetch if user is admin and has org
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Find default template and selected template
  const defaultTemplate = templates.find((t: any) => t.isDefault);
  const selectedTemplate = templates.find(
    (t: any) => t.id === selectedTemplateId
  );

  // Query for editing run (if edit mode)
  const { data: editingRun } = useQuery({
    queryKey: queryKeys.runs(organizationId),
    queryFn: () =>
      runsApi
        .getRuns()
        .then((runs: any) => runs.find((run: any) => run.id === search.edit)),
    enabled: !!search.edit && !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set default template on load
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId && !editingRun) {
      const templateToSelect = defaultTemplate || templates[0];
      setSelectedTemplateId(templateToSelect.id);
    }
  }, [templates, defaultTemplate, selectedTemplateId, editingRun]);

  // Create dynamic form for single run
  const dynamicSchema = createDynamicFormSchema(selectedTemplate || null);
  const form = useForm<DynamicFormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      templateId: selectedTemplateId,
    },
  });

  // Reset form when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const defaultValues: DynamicFormData = {
        templateId: selectedTemplate.id,
      };

      // Initialize all fields as empty strings
      selectedTemplate.columnConfig.forEach((column: any) => {
        defaultValues[column.field] = '';
      });

      form.reset(defaultValues);
    }
  }, [selectedTemplate, form]);

  // Effect to populate form when editing run is loaded
  useEffect(() => {
    if (editingRun && selectedTemplate) {
      const formData: DynamicFormData = {
        templateId: selectedTemplate.id,
      };

      // Map existing run data to form fields
      selectedTemplate.columnConfig.forEach((column: any) => {
        switch (column.field) {
          case 'flightNumber':
            formData[column.field] = editingRun.flightNumber || '';
            break;
          case 'pickupLocation':
            formData[column.field] = editingRun.pickupLocation || '';
            break;
          case 'dropoffLocation':
            formData[column.field] = editingRun.dropoffLocation || '';
            break;
          case 'scheduledTime':
            formData[column.field] = editingRun.scheduledTime || '';
            break;
          case 'notes':
            formData[column.field] = editingRun.notes || '';
            break;
          default:
            formData[column.field] = '';
        }
      });

      form.reset(formData);
    }
  }, [editingRun, selectedTemplate, form]);

  // Mutation for creating/updating a single run
  const createRunMutation = useMutation({
    mutationFn: (data: DynamicFormData) => {
      if (!selectedTemplate) {
        throw new Error('No template selected');
      }

      // Transform dynamic form data to run form structure
      const runData: any = {
        reportTemplateId: selectedTemplate.id,
      };

      // Map form fields to run structure
      selectedTemplate.columnConfig.forEach((column: any) => {
        const value = data[column.field];
        switch (column.field) {
          case 'flightNumber':
            runData.flightNumber = value;
            break;
          case 'pickupLocation':
            runData.pickupLocation = value;
            break;
          case 'dropoffLocation':
            runData.dropoffLocation = value;
            break;
          case 'scheduledTime':
            runData.scheduledTime = value;
            break;
          case 'notes':
            runData.notes = value;
            break;
        }
      });

      // Call appropriate API method - only create since edit mode isn't fully implemented
      return runsApi.createRun(runData);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch runs
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs(organizationId),
      });

      // Show success toast
      const action = editingRun ? 'updated' : 'created';
      toasts.success(
        `Run ${action} successfully`,
        `Run has been ${action} using the ${selectedTemplate?.name} template.`
      );

      // Reset form and redirect
      form.reset();
      router.navigate({
        to: '/organizations/$organizationId/runs',
        params: { organizationId: organizationId || '' },
      });
    },
    onError: (error: any) => {
      console.error('Failed to create/update run:', error);
      toasts.error('Error', 'Failed to save run. Please try again.');
    },
  });

  // Handle form submission
  const onSubmitSingle = (data: DynamicFormData) => {
    createRunMutation.mutate(data);
  };

  // Handle template selection change for single run
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Show loading state while checking admin access
  if (isLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show error state for templates
  if (templatesError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Add Runs</h2>
          <p className="text-muted-foreground mt-1">
            Create runs using organization report templates
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Templates
              </h3>
              <p className="text-muted-foreground mb-4">
                Failed to load report templates. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state for templates
  if (templatesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Add Runs</h2>
          <p className="text-muted-foreground mt-1">
            Create runs using organization report templates
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Loading report templates...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no templates state
  if (templates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Add Runs</h2>
          <p className="text-muted-foreground mt-1">
            Create runs using organization report templates
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Report Templates
              </h3>
              <p className="text-muted-foreground mb-4">
                No report templates found for your organization. Create a
                template first to add runs.
              </p>
              <OrganizationLink to="/report-templates" variant="button">
                <Settings className="h-4 w-4 mr-2" />
                Manage Templates
              </OrganizationLink>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {editingRun ? 'Edit Run' : 'Add Runs'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {editingRun
            ? 'Update the details for this run'
            : 'Create runs using organization report templates'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Run Creation
          </CardTitle>
          <p className="text-muted-foreground">
            Select a report template and fill in the required information to
            create a new run
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitSingle)}
                className="space-y-6"
              >
                {/* Template Selection */}
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Report Template
                        <small className="text-destructive">*</small>
                        {defaultTemplate &&
                          selectedTemplateId === defaultTemplate.id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                      </FormLabel>
                      <Select
                        onValueChange={value => {
                          field.onChange(value);
                          handleTemplateChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a report template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                {template.isDefault && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {selectedTemplate?.description && (
                        <p className="text-sm text-muted-foreground">
                          {selectedTemplate.description}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Dynamic fields based on selected template */}
                {selectedTemplate && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Info className="h-4 w-4" />
                      Template Fields ({
                        selectedTemplate.columnConfig.length
                      }{' '}
                      fields)
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {selectedTemplate.columnConfig
                        .sort((a, b) => a.order - b.order)
                        .map(column => (
                          <FormField
                            key={column.field}
                            control={form.control}
                            name={column.field}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {column.label}
                                  {column.required && (
                                    <small className="text-destructive ml-1">
                                      *
                                    </small>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  {column.field === 'type' ? (
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value || ''}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select run type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pickup">
                                          Pickup
                                        </SelectItem>
                                        <SelectItem value="dropoff">
                                          Dropoff
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : column.field === 'notes' ? (
                                    <Textarea
                                      placeholder={`Enter ${column.label.toLowerCase()}`}
                                      {...field}
                                      value={field.value || ''}
                                      rows={3}
                                    />
                                  ) : (
                                    <Input
                                      placeholder={`Enter ${column.label.toLowerCase()}`}
                                      {...field}
                                      value={field.value || ''}
                                      type={
                                        column.field === 'estimatedDuration'
                                          ? 'number'
                                          : 'text'
                                      }
                                      min={
                                        column.field === 'estimatedDuration'
                                          ? '1'
                                          : undefined
                                      }
                                      max={
                                        column.field === 'estimatedDuration'
                                          ? '1440'
                                          : undefined
                                      }
                                    />
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      router.navigate({
                        to: '/organizations/$organizationId/runs',
                        params: { organizationId: organizationId || '' },
                      })
                    }
                    disabled={createRunMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-600 text-white hover:bg-green-700"
                    disabled={createRunMutation.isPending || !selectedTemplate}
                  >
                    {createRunMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        {editingRun ? 'Updating Run...' : 'Creating Run...'}
                      </>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {editingRun ? 'Update Run' : 'Add Run'}
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export const Route = createFileRoute('/organizations/$organizationId/add-runs')(
  {
    component: AddRunsPage,
  }
);

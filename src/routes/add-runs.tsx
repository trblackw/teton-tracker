import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Database,
  Info,
  Loader2,
  MapPin,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
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
  CommandItem,
  CommandList,
} from '../components/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { Input } from '../components/ui/input';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { reportTemplatesApi, runsApi } from '../lib/api/client';
import { useNonAdminRedirect } from '../lib/hooks/use-non-admin-redirect';
import type { ReportTemplate } from '../lib/schema';
import { toasts } from '../lib/toast';
import { cn } from '../lib/utils';

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

function AddRuns() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = useSearch({ from: '/add-runs' });

  // Admin access control
  const {
    isAdmin,
    isLoading: adminLoading,
    organization,
  } = useNonAdminRedirect('/runs');

  // Tab state
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single run state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReportTemplate | null>(null);

  // Bulk run state
  const [bulkSelectedTemplate, setBulkSelectedTemplate] = useState<string>('');
  const [bulkRunType, setBulkRunType] = useState<string>('pickup');
  const [bulkSelectedDate, setBulkSelectedDate] = useState<Date>(new Date());
  const [templateOpen, setTemplateOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Query for report templates
  const {
    data: templates = [],
    isLoading: templatesLoading,
    isError: templatesError,
  } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: () => reportTemplatesApi.getReportTemplates(),
    enabled: !!isAdmin && !!organization, // Only fetch if user is admin
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Find default template
  const defaultTemplate = templates.find(t => t.isDefault);

  // Query for editing run (if edit mode)
  const { data: editingRun } = useQuery({
    queryKey: ['run', search.edit],
    queryFn: () =>
      runsApi.getRuns().then(runs => runs.find(run => run.id === search.edit)),
    enabled: !!search.edit && !!isAdmin,
  });

  // Set default template on load for single run
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId && !editingRun) {
      const templateToSelect = defaultTemplate || templates[0];
      setSelectedTemplateId(templateToSelect.id);
      setSelectedTemplate(templateToSelect);
    }
  }, [templates, defaultTemplate, selectedTemplateId, editingRun]);

  // Set default template on load for bulk run
  useEffect(() => {
    if (templates.length > 0 && !bulkSelectedTemplate) {
      const templateToSelect = defaultTemplate || templates[0];
      setBulkSelectedTemplate(templateToSelect.id);
    }
  }, [templates, defaultTemplate, bulkSelectedTemplate]);

  // Update selected template when templateId changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setSelectedTemplate(template || null);
    }
  }, [selectedTemplateId, templates]);

  // Create dynamic form for single run
  const dynamicSchema = createDynamicFormSchema(selectedTemplate);
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
      selectedTemplate.columnConfig.forEach(column => {
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
      selectedTemplate.columnConfig.forEach(column => {
        switch (column.field) {
          case 'flightNumber':
            formData[column.field] = editingRun.flightNumber || '';
            break;
          case 'airline':
            formData[column.field] = editingRun.airline || '';
            break;
          case 'departure':
            formData[column.field] = editingRun.departure || '';
            break;
          case 'arrival':
            formData[column.field] = editingRun.arrival || '';
            break;
          case 'pickupLocation':
            formData[column.field] = editingRun.pickupLocation || '';
            break;
          case 'dropoffLocation':
            formData[column.field] = editingRun.dropoffLocation || '';
            break;
          case 'type':
            formData[column.field] = editingRun.type || '';
            break;
          case 'price':
            formData[column.field] = editingRun.price || '';
            break;
          default:
            formData[column.field] = '';
        }
      });

      form.reset(formData);
      setActiveTab('single'); // Switch to single tab for editing
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
      selectedTemplate.columnConfig.forEach(column => {
        const value = data[column.field];
        switch (column.field) {
          case 'flightNumber':
            runData.flightNumber = value || '';
            break;
          case 'airline':
            runData.airline = value || '';
            break;
          case 'departure':
            runData.departure = value || '';
            break;
          case 'arrival':
            runData.arrival = value || '';
            break;
          case 'pickupLocation':
            runData.pickupLocation = value || '';
            break;
          case 'dropoffLocation':
            runData.dropoffLocation = value || '';
            break;
          case 'type':
            runData.type = value || 'pickup';
            break;
          case 'price':
            runData.price = value || '';
            break;
          case 'scheduledTime':
            runData.scheduledTime = value || '';
            break;
          case 'estimatedDuration':
            runData.estimatedDuration = value ? parseInt(value) : 60;
            break;
          case 'notes':
            runData.notes = value || '';
            break;
          case 'reservationId':
            runData.reservationId = value || '';
            break;
          case 'billTo':
            runData.billTo = value || '';
            break;
        }
      });

      // Ensure required fields have defaults
      if (!runData.flightNumber) runData.flightNumber = '';
      if (!runData.departure) runData.departure = '';
      if (!runData.arrival) runData.arrival = '';
      if (!runData.pickupLocation) runData.pickupLocation = '';
      if (!runData.dropoffLocation) runData.dropoffLocation = '';
      if (!runData.scheduledTime)
        runData.scheduledTime = new Date().toISOString();
      if (!runData.estimatedDuration) runData.estimatedDuration = 60;
      if (!runData.type) runData.type = 'pickup';
      if (!runData.price) runData.price = '';

      if (editingRun) {
        return runsApi.updateRun(editingRun.id, runData);
      } else {
        return runsApi.createRun(runData);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch runs
      queryClient.invalidateQueries({ queryKey: ['runs'] });

      // Show success toast
      const action = editingRun ? 'updated' : 'created';
      toasts.success(
        `Run ${action} successfully`,
        `Run has been ${action} using the ${selectedTemplate?.name} template.`
      );

      // Reset form
      form.reset();

      // Navigate to runs page
      router.navigate({ to: '/runs' });
    },
    onError: error => {
      console.error(
        `Failed to ${editingRun ? 'update' : 'create'} run:`,
        error
      );
      toasts.error(
        `Failed to ${editingRun ? 'update' : 'create'} run`,
        'Please check your information and try again.'
      );
    },
  });

  const onSubmitSingle = (data: DynamicFormData) => {
    createRunMutation.mutate(data);
  };

  // Handle template selection change for single run
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
  };

  // Handle bulk run creation
  const handleCreateBulkRun = () => {
    if (!bulkSelectedTemplate) return;

    // TODO: Implement bulk run creation logic
    console.log('Creating bulk run:', {
      templateId: bulkSelectedTemplate,
      runType: bulkRunType,
      date: bulkSelectedDate.toISOString(),
    });

    toasts.info('Bulk run creation', 'This feature is coming soon!');
  };

  // Filter templates based on search for bulk creation
  const filteredTemplates = templates.filter(
    template =>
      template.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchValue.toLowerCase()))
  );

  const bulkSelectedTemplateObj = templates.find(
    t => t.id === bulkSelectedTemplate
  );

  // Show loading state while checking admin access
  if (adminLoading || !isAdmin) {
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
            Create individual runs or bulk runs using organization report
            templates
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
            Create individual runs or bulk runs using organization report
            templates
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
            Create individual runs or bulk runs using organization report
            templates
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
              <Button
                onClick={() => router.navigate({ to: '/report-templates' })}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Templates
              </Button>
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
            : 'Create individual runs or bulk runs using organization report templates'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Run Creation
          </CardTitle>
          <CardDescription>
            Choose to create a single run with detailed fields or bulk runs with
            template defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={value => setActiveTab(value as 'single' | 'bulk')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Run</TabsTrigger>
              <TabsTrigger value="bulk" disabled={!!editingRun}>
                Bulk Runs
              </TabsTrigger>
            </TabsList>

            {/* Single Run Tab */}
            <TabsContent value="single" className="space-y-6">
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
                      onClick={() => router.navigate({ to: '/runs' })}
                      disabled={createRunMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-green-600 text-white hover:bg-green-700"
                      disabled={
                        createRunMutation.isPending || !selectedTemplate
                      }
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
            </TabsContent>

            {/* Bulk Runs Tab */}
            <TabsContent value="bulk" className="space-y-6">
              <div className="space-y-4">
                {/* Template Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Template</label>
                  <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={templateOpen}
                        className="w-full justify-between"
                      >
                        {bulkSelectedTemplateObj
                          ? bulkSelectedTemplateObj.name
                          : 'Select template...'}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <input
                            placeholder="Search templates..."
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <CommandList>
                          <CommandEmpty>No templates found.</CommandEmpty>
                          <CommandGroup>
                            {filteredTemplates.map(template => (
                              <CommandItem
                                key={template.id}
                                value={template.id}
                                onSelect={() => {
                                  setBulkSelectedTemplate(template.id);
                                  setTemplateOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    bulkSelectedTemplate === template.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {template.name}
                                  </span>
                                  {template.description && (
                                    <span className="text-sm text-muted-foreground">
                                      {template.description}
                                    </span>
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

                {/* Date Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-10',
                          !bulkSelectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bulkSelectedDate
                          ? format(bulkSelectedDate, 'PPP')
                          : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bulkSelectedDate}
                        onSelect={date => {
                          if (date) {
                            setBulkSelectedDate(date);
                            setDateOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Create Run CTA with Run Type Dropdown */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateBulkRun}
                    disabled={!bulkSelectedTemplate}
                    className="flex-1 bg-emerald-400 text-white hover:bg-emerald-400/90 font-bold"
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                    Create Bulk Runs
                  </Button>
                  <Select value={bulkRunType} onValueChange={setBulkRunType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-500" />
                          Pickup
                        </div>
                      </SelectItem>
                      <SelectItem value="dropoff">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          Dropoff
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/add-runs')({
  component: AddRuns,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      edit: search.edit as string | undefined,
    };
  },
});

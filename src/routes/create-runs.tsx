import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  MapPin,
  Plus,
  Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../components/ui/command';
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
import { reportTemplatesApi } from '../lib/api/client';
import { useNonAdminRedirect } from '../lib/hooks/use-non-admin-redirect';
import { cn } from '../lib/utils';

export const Route = createFileRoute('/create-runs')({
  component: CreateRunsPage,
});

function CreateRunsPage() {
  const { isAdmin, organization } = useNonAdminRedirect('/runs');

  // Fetch templates using the same API client as report-templates.tsx
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportTemplatesApi.getReportTemplates(),
    enabled: !!isAdmin,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [runType, setRunType] = useState<string>('pickup');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [templateOpen, setTemplateOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Set default template when templates load
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
      }
    }
  }, [templates, selectedTemplate]);

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate);

  // Filter templates based on search
  const filteredTemplates = templates.filter(
    template =>
      template.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchValue.toLowerCase()))
  );

  const handleCreateRun = () => {
    if (!selectedTemplate) return;

    // TODO: Implement run creation logic
    console.log('Creating run:', {
      templateId: selectedTemplate,
      runType,
      date: selectedDate.toISOString(),
    });
  };

  console.log(organization);

  // Show loading or nothing while redirecting non-admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-2 max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold">Create Runs</h1>
        </div>
        <p className="text-muted-foreground">
          Create & assign runs to organization drivers
        </p>
      </div>

      {/* Template Selector and Create Run CTA */}
      <div className="space-y-4 mb-8">
        {/* Template Selector */}
        <div className="space-y-2">
          <label className="text-md font-medium block text-muted-foreground mb-2">
            Report Template
          </label>
          <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={templateOpen}
                className="w-full justify-between h-10"
                disabled={templatesLoading}
              >
                {selectedTemplateObj ? (
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">
                      {selectedTemplateObj.name}
                    </span>
                    {selectedTemplateObj.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {selectedTemplateObj.description}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {templatesLoading
                      ? 'Loading templates...'
                      : 'Select template...'}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    placeholder="Search templates..."
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <CommandList>
                  <CommandEmpty>No templates found.</CommandEmpty>
                  <CommandGroup>
                    {filteredTemplates.map(template => (
                      <CommandItem
                        key={template.id}
                        value={template.id}
                        onSelect={currentValue => {
                          setSelectedTemplate(
                            currentValue === selectedTemplate
                              ? ''
                              : currentValue
                          );
                          setTemplateOpen(false);
                          setSearchValue('');
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          {template.description && (
                            <span className="text-xs text-muted-foreground">
                              {template.description}
                            </span>
                          )}
                          {template.isDefault && (
                            <span className="text-xs text-blue-600">
                              Default
                            </span>
                          )}
                        </div>
                        <Check
                          className={`ml-2 h-4 w-4 ${
                            selectedTemplate === template.id
                              ? 'opacity-100'
                              : 'opacity-0'
                          }`}
                        />
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
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-10',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  if (date) {
                    setSelectedDate(date);
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
            onClick={handleCreateRun}
            disabled={!selectedTemplate}
            className="flex-1 bg-green-400 text-white hover:bg-green-400/90 font-bold"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Create Run
          </Button>
          <Select value={runType} onValueChange={setRunType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pickup">
                <MapPin className="h-4 w-4 text-green-500" /> Pickup
              </SelectItem>
              <SelectItem value="dropoff">
                <MapPin className="h-4 w-4 text-blue-500" /> Dropoff
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

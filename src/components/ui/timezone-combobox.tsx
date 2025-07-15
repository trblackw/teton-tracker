import { Check, ChevronsUpDown, Clock } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface Timezone {
  id: string;
  label: string;
  region: string;
  abbreviation: string;
  utcOffset: string;
}

interface TimezoneComboboxProps {
  timezones: Timezone[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function TimezoneCombobox({
  timezones,
  value,
  onValueChange,
  placeholder = 'Select timezone...',
  emptyMessage = 'No timezone found.',
  disabled = false,
}: TimezoneComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedTimezone = React.useMemo(
    () => timezones.find(timezone => timezone.id === value),
    [timezones, value]
  );

  // Group timezones by region
  const groupedTimezones = React.useMemo(() => {
    const groups: Record<string, Timezone[]> = {};
    timezones.forEach(timezone => {
      if (!groups[timezone.region]) {
        groups[timezone.region] = [];
      }
      groups[timezone.region].push(timezone);
    });
    return groups;
  }, [timezones]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full min-w-0 inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            {selectedTimezone ? (
              <span className="truncate min-w-0">{selectedTimezone.label}</span>
            ) : (
              <span className="text-muted-foreground truncate min-w-0">
                {placeholder}
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search timezones..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {Object.entries(groupedTimezones).map(
              ([region, regionTimezones]) => (
                <CommandGroup key={region} heading={region}>
                  {regionTimezones.map(timezone => (
                    <CommandItem
                      key={timezone.id}
                      value={`${timezone.label} ${timezone.region} ${timezone.abbreviation} ${timezone.id}`}
                      onSelect={() => {
                        onValueChange?.(
                          timezone.id === value ? '' : timezone.id
                        );
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === timezone.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{timezone.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {timezone.abbreviation} • {timezone.utcOffset}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

TimezoneCombobox.displayName = 'TimezoneCombobox';

import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from './badge';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  maxDisplay?: number;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = 'Select items...',
  emptyMessage = 'No items found.',
  maxDisplay = 3,
  className = '',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    onSelectionChange(newSelected);
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selected.filter(item => item !== value));
  };

  const displayItems = selected.slice(0, maxDisplay);
  const remainingCount = selected.length - maxDisplay;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between min-h-[2.5rem] h-auto ${className}`}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {displayItems.map(item => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 gap-1"
                  >
                    {item}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={e => handleRemove(item, e)}
                    />
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    +{remainingCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            <CommandList className="max-h-64">
              {options.map(option => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selected.includes(option) ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { imageCache } from '../../lib/image-cache';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface Airline {
  id: string;
  lcc: string;
  name: string;
  logo: string;
}

interface AirlineComboboxProps {
  airlines: Airline[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  maxResults?: number;
}

export function AirlineCombobox({
  airlines,
  value,
  onValueChange,
  placeholder = 'Search airlines...',
  emptyMessage = 'No airlines found.',
  maxResults = 50,
}: AirlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedAirline = airlines.find(airline => airline.id === value);

  // Preload airline logos when component mounts
  useEffect(() => {
    const logoUrls = airlines
      .filter(airline => airline.logo && airline.logo.trim())
      .map(airline => airline.logo);

    if (logoUrls.length > 0) {
      imageCache
        .preloadImages(logoUrls)
        .then(() => {
          console.log(`📸 Preloaded ${imageCache.size()} airline logos`);
        })
        .catch(error => {
          console.warn('Some airline logos failed to preload:', error);
        });
    }
  }, [airlines]);

  // Filter airlines based on search term
  const filteredAirlines = airlines
    .filter(airline => {
      if (!searchValue.trim()) {
        // Show major airlines when no search term
        const majorAirlines = [
          'United Airlines',
          'American Airlines',
          'Delta Air Lines',
          'Southwest Airlines',
          'Lufthansa',
          'British Airways',
          'Air France',
          'KLM',
          'Emirates',
          'Qatar Airways',
          'Singapore Airlines',
          'Cathay Pacific',
          'Japan Airlines',
          'All Nippon Airways',
          'LATAM Airlines',
          'Air Canada',
          'Turkish Airlines',
          'Etihad Airways',
          'Qantas',
          'Virgin Atlantic',
          'Alaska Airlines',
          'JetBlue Airways',
          'Spirit Airlines',
          'Frontier Airlines',
          'Ryanair',
          'EasyJet',
          'Norwegian Air',
          'Vueling Airlines',
        ];
        return majorAirlines.some(major =>
          airline.name.includes(major.split(' ')[0])
        );
      }

      const term = searchValue.toLowerCase();
      return (
        airline.id.toLowerCase().includes(term) ||
        airline.name.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, maxResults);

  const AirlineImage = ({ airline }: { airline: Airline }) => {
    if (!airline.logo) return null;

    return (
      <img
        src={airline.logo}
        alt={airline.name}
        className="h-6 w-6 rounded shrink-0"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
        loading="lazy"
      />
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2"
        >
          {selectedAirline ? (
            <div className="flex items-center gap-2">
              <AirlineImage airline={selectedAirline} />
              <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                {selectedAirline.id}
              </span>
              <span className="truncate">{selectedAirline.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
      >
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search by airline code or name..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />
          </div>
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredAirlines.map(airline => (
                <CommandItem
                  key={airline.id}
                  value={airline.id}
                  onSelect={currentValue => {
                    const newValue = currentValue === value ? '' : currentValue;
                    onValueChange(newValue);
                    setOpen(false);
                    setSearchValue('');
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AirlineImage airline={airline} />
                    <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">
                      {airline.id}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">
                        {airline.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {airline.lcc === '1'
                          ? 'Low-cost carrier'
                          : 'Full-service carrier'}
                      </span>
                    </div>
                  </div>
                  <Check
                    className={`ml-auto h-4 w-4 ${
                      value === airline.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

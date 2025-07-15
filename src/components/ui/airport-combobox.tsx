import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface Airport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  state: string;
  elevation: number;
  lat: number;
  lon: number;
  tz: string;
}

interface AirportComboboxProps {
  airports: Airport[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  maxResults?: number;
}

export function AirportCombobox({
  airports,
  value,
  onValueChange,
  placeholder = 'Search airports...',
  emptyMessage = 'No airports found.',
  maxResults = 50,
}: AirportComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedAirport = airports.find(airport => airport.iata === value);

  // Filter airports based on search term
  const filteredAirports = airports
    .filter(airport => {
      if (!searchValue.trim()) {
        // Show major airports when no search term
        const majorCities = [
          'New York',
          'Los Angeles',
          'Chicago',
          'Houston',
          'Phoenix',
          'Philadelphia',
          'San Antonio',
          'San Diego',
          'Dallas',
          'San Jose',
          'Austin',
          'Jacksonville',
          'Fort Worth',
          'Columbus',
          'Charlotte',
          'Seattle',
          'Denver',
          'Boston',
          'Nashville',
          'Baltimore',
          'Louisville',
          'Portland',
          'Oklahoma City',
          'Milwaukee',
          'Las Vegas',
          'Albuquerque',
          'Tucson',
          'Atlanta',
          'Colorado Springs',
          'Raleigh',
          'Miami',
          'Oakland',
          'Minneapolis',
          'Tulsa',
          'Cleveland',
          'Wichita',
          'Arlington',
          'Tampa',
          'Bakersfield',
          'New Orleans',
          'Honolulu',
          'Anaheim',
          'Santa Ana',
          'Corpus Christi',
          'Riverside',
          'Saint Paul',
          'Lexington',
          'Anchorage',
          'Stockton',
          'Cincinnati',
          'Pittsburgh',
        ];
        return majorCities.some(city => airport.city.includes(city));
      }

      const term = searchValue.toLowerCase();
      return (
        airport.iata.toLowerCase().includes(term) ||
        airport.name.toLowerCase().includes(term) ||
        airport.city.toLowerCase().includes(term) ||
        airport.state.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, maxResults);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2"
        >
          {selectedAirport ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                {selectedAirport.iata}
              </span>
              <span className="truncate">{selectedAirport.name}</span>
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
              placeholder="Search by code, name, city, or state..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />
          </div>
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredAirports.map(airport => (
                <CommandItem
                  key={airport.iata}
                  value={airport.iata}
                  onSelect={currentValue => {
                    const newValue = currentValue === value ? '' : currentValue;
                    onValueChange(newValue);
                    setOpen(false);
                    setSearchValue('');
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">
                      {airport.iata}
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium truncate">
                        {airport.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {airport.city}, {airport.state}
                      </span>
                    </div>
                  </div>
                  <Check
                    className={`ml-auto h-4 w-4 ${
                      value === airport.iata ? 'opacity-100' : 'opacity-0'
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

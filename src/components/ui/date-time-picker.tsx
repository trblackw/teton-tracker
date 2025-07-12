import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DateTimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date and time',
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(new Date(value), 'HH:mm') : '09:00'
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      updateDateTime(date, timeValue);
      setIsOpen(false);
    }
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    if (selectedDate) {
      updateDateTime(selectedDate, time);
    }
  };

  const updateDateTime = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':');
    const newDateTime = new Date(date);
    newDateTime.setHours(parseInt(hours, 10));
    newDateTime.setMinutes(parseInt(minutes, 10));

    const formattedDateTime = format(newDateTime, "yyyy-MM-dd'T'HH:mm");
    onChange?.(formattedDateTime);
  };

  const displayValue = selectedDate
    ? `${format(selectedDate, 'PPP')} at ${timeValue}`
    : placeholder;

  return (
    <div className='flex gap-2'>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground',
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='single'
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <div className='relative'>
        <Input
          type='time'
          value={timeValue}
          onChange={e => handleTimeChange(e.target.value)}
          className='w-24'
          disabled={disabled}
        />
      </div>
    </div>
  );
}

DateTimePicker.displayName = 'DateTimePicker';

import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Input } from './input';

interface TimePickerProps {
  value?: string; // Format: "HH:mm" (24-hour)
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  step?: number; // Minutes step (default: 1)
  isAfterTime?: boolean;
  onIsAfterTimeChange?: (isAfter: boolean) => void;
}

export function TimePicker({
  value = '',
  onChange,
  placeholder = 'Select time',
  className,
  disabled = false,
  step = 1,
  isAfterTime = true,
  onIsAfterTimeChange,
}: TimePickerProps) {
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHours(h || '00');
      setMinutes(m || '00');
    } else {
      // Reset to 00:00 when value is cleared
      setHours('00');
      setMinutes('00');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format time string
  const formatTime = useCallback((h: string, m: string) => {
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }, []);

  // Update parent when time changes
  useEffect(() => {
    const timeString = formatTime(hours, minutes);
    if (onChange && timeString !== value) {
      onChange(timeString);
    }
  }, [hours, minutes, formatTime, onChange, value]);

  // Increment/decrement hours
  const adjustHours = (direction: 'up' | 'down') => {
    const currentHours = parseInt(hours) || 0;
    let newHours: number;

    if (direction === 'up') {
      newHours = currentHours === 23 ? 0 : currentHours + 1;
    } else {
      newHours = currentHours === 0 ? 23 : currentHours - 1;
    }

    setHours(newHours.toString().padStart(2, '0'));
  };

  // Increment/decrement minutes
  const adjustMinutes = (direction: 'up' | 'down') => {
    const currentMinutes = parseInt(minutes) || 0;
    let newMinutes: number;

    if (direction === 'up') {
      newMinutes = currentMinutes + step;
      if (newMinutes >= 60) {
        newMinutes = 0;
        adjustHours('up');
      }
    } else {
      newMinutes = currentMinutes - step;
      if (newMinutes < 0) {
        newMinutes = 60 - step;
        adjustHours('down');
      }
    }

    setMinutes(newMinutes.toString().padStart(2, '0'));
  };

  // Handle manual input
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
      setHours(val);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
      setMinutes(val);
    }
  };

  // Format display time
  const displayTime = () => {
    if (!value) return placeholder;
    return formatTime(hours, minutes);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <div className='flex items-center gap-2'>
        <div className='flex-1'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className='justify-start text-left font-normal w-full'
          >
            <Clock className='mr-2 h-4 w-4' />
            {displayTime()}
          </Button>
        </div>

        {/* Checkbox for after/before time */}
        <div className='flex items-center gap-1'>
          <input
            type='checkbox'
            id='isAfterTime'
            checked={isAfterTime}
            onChange={e => onIsAfterTimeChange?.(e.target.checked)}
            className='h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded'
          />
          <label
            htmlFor='isAfterTime'
            className='text-sm text-foreground whitespace-nowrap'
          >
            {isAfterTime ? 'At/after time' : 'Before time'}
          </label>
        </div>
      </div>

      {isOpen && (
        <div className='absolute top-full mt-1 left-0 z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-[200px]'>
          <div className='flex items-center justify-center gap-2'>
            {/* Hours Section */}
            <div className='flex flex-col items-center'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => adjustHours('up')}
                disabled={disabled}
                className='h-8 w-8 p-0'
              >
                <ChevronUp className='h-4 w-4' />
              </Button>
              <Input
                type='text'
                value={hours}
                onChange={handleHoursChange}
                onBlur={() => setHours(hours.padStart(2, '0'))}
                className='w-12 text-center text-lg font-mono'
                disabled={disabled}
                maxLength={2}
              />
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => adjustHours('down')}
                disabled={disabled}
                className='h-8 w-8 p-0'
              >
                <ChevronDown className='h-4 w-4' />
              </Button>
            </div>

            {/* Separator */}
            <div className='text-2xl font-bold'>:</div>

            {/* Minutes Section */}
            <div className='flex flex-col items-center'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => adjustMinutes('up')}
                disabled={disabled}
                className='h-8 w-8 p-0'
              >
                <ChevronUp className='h-4 w-4' />
              </Button>
              <Input
                type='text'
                value={minutes}
                onChange={handleMinutesChange}
                onBlur={() => setMinutes(minutes.padStart(2, '0'))}
                className='w-12 text-center text-lg font-mono'
                disabled={disabled}
                maxLength={2}
              />
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => adjustMinutes('down')}
                disabled={disabled}
                className='h-8 w-8 p-0'
              >
                <ChevronDown className='h-4 w-4' />
              </Button>
            </div>
          </div>

          {/* Close button */}
          <div className='mt-3 flex justify-end'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

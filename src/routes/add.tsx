import { Label } from '@radix-ui/react-label';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertCircle, Badge, FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  convertParsedRunToForm,
  parseScheduleMessage,
  type ParseResult,
} from '../lib/schedule-parser';
import { type NewRunForm, type Run, type RunType } from '../lib/schema';

function Add() {
  const navigate = useNavigate();
  const [newRun, setNewRun] = useState<Partial<NewRunForm>>({
    flightNumber: '',
    airline: '',
    departure: '',
    arrival: '',
    pickupLocation: '',
    dropoffLocation: '',
    scheduledTime: '',
    type: 'pickup',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Bulk import state
  const [scheduleText, setScheduleText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPasteDetected, setShowPasteDetected] = useState(false);

  // Global paste event listener for schedule detection
  useEffect(() => {
    const handleGlobalPaste = (event: any) => {
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const pastedText = event.clipboardData?.getData('text') || '';
      const isSchedule = isScheduleMessage(pastedText);

      if (isSchedule) {
        event.preventDefault();
        setScheduleText(pastedText);
        const result = parseScheduleMessage(pastedText);
        setParseResult(result);
        setShowBulkImport(true);
        setShowPasteDetected(true);

        if (result.success && result.runs.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const firstRun = result.runs[0];
          const formData = convertParsedRunToForm(firstRun, today);
          setNewRun(formData);
          window.setTimeout(() => setShowPasteDetected(false), 3000);
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const isScheduleMessage = (text: string): boolean => {
    if (!text || text.length < 20) return false;

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 4) return false;

    const hasFlightPattern = lines.some(line =>
      /[A-Z]{2,3}\s*\d{1,4}[A-Z]?|[A-Z]{2,3}\s*CABIN|ASAP/i.test(line)
    );
    const hasTimePattern = lines.some(line =>
      /\d{1,2}:?\d{0,2}\s*(AM|PM)|ASAP/i.test(line)
    );
    const hasVehiclePattern = lines.some(line => /SUV|EXEC|SEDAN/i.test(line));
    const hasPricePattern = lines.some(line => /\$\d+\.?\d*/i.test(line));
    const hasRunIdPattern = lines.some(line => /^\d+\*?\d*/i.test(line));
    const hasAirportPattern = lines.some(line =>
      /\b(AP|JLL|SK|DL|AA|UA)\b/i.test(line)
    );

    const patterns = [
      hasFlightPattern,
      hasTimePattern,
      hasVehiclePattern,
      hasPricePattern,
      hasRunIdPattern,
      hasAirportPattern,
    ];
    return patterns.filter(Boolean).length >= 2;
  };

  const addRun = () => {
    try {
      setFormErrors({});

      const run: Run = {
        id: crypto.randomUUID(),
        ...(newRun as NewRunForm),
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Get existing runs and add new one
      const existingRuns = JSON.parse(
        window.localStorage.getItem('airport-runs') || '[]'
      );
      const updatedRuns = [...existingRuns, run];
      window.localStorage.setItem('airport-runs', JSON.stringify(updatedRuns));

      // Reset form
      setNewRun({
        flightNumber: '',
        airline: '',
        departure: '',
        arrival: '',
        pickupLocation: '',
        dropoffLocation: '',
        scheduledTime: '',
        type: 'pickup',
        notes: '',
      });

      // Navigate to runs page
      navigate({ to: '/runs' });
    } catch (error) {
      console.error('Error adding run:', error);
      window.alert('Error adding run. Please check your input.');
    }
  };

  const handleScheduleParse = () => {
    if (!scheduleText.trim()) {
      setParseResult({
        success: false,
        runs: [],
        errors: ['Please enter a schedule message'],
        warnings: [],
      });
      return;
    }

    const result = parseScheduleMessage(scheduleText);
    setParseResult(result);

    if (result.success && result.runs.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const firstRun = result.runs[0];
      const formData = convertParsedRunToForm(firstRun, today);
      setNewRun(formData);
    }
  };

  const handleBulkImport = () => {
    if (!parseResult?.success || !parseResult.runs.length) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const newRuns: Run[] = [];

      parseResult.runs.forEach(parsedRun => {
        const formData = convertParsedRunToForm(parsedRun, today);
        const run: Run = {
          id: crypto.randomUUID(),
          ...formData,
          status: parsedRun.notes.includes('CANCELLED')
            ? 'cancelled'
            : 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        newRuns.push(run);
      });

      // Get existing runs and add new ones
      const existingRuns = JSON.parse(
        window.localStorage.getItem('airport-runs') || '[]'
      );
      const updatedRuns = [...existingRuns, ...newRuns];
      window.localStorage.setItem('airport-runs', JSON.stringify(updatedRuns));

      // Reset bulk import state
      setScheduleText('');
      setParseResult(null);
      setShowBulkImport(false);

      window.alert(`Successfully imported ${newRuns.length} runs!`);
      navigate({ to: '/runs' });
    } catch (error) {
      console.error('Error importing runs:', error);
      window.alert('Error importing runs. Please try again.');
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-foreground'>Add New Run</h2>
        <p className='text-muted-foreground mt-1'>
          Schedule a new airport pickup or dropoff
        </p>
      </div>

      {/* Paste Detection Notification */}
      {showPasteDetected && (
        <Card className='border-green-200 bg-green-50 animate-pulse'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2'>
              <FileText className='h-5 w-5 text-green-600' />
              <p className='text-green-800 font-medium'>
                Schedule detected! Found {parseResult?.runs.length || 0} runs
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Import Option */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <FileText className='h-5 w-5' />
                Quick Import
              </CardTitle>
              <CardDescription>
                Paste your schedule message to import multiple runs at once
              </CardDescription>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowBulkImport(!showBulkImport)}
            >
              {showBulkImport ? 'Hide' : 'Show'} Bulk Import
            </Button>
          </div>
        </CardHeader>
        {showBulkImport && (
          <CardContent className='space-y-4'>
            {/* Paste Detection Notification */}
            {showPasteDetected && (
              <div className='bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-4 rounded-lg shadow-md animate-pulse'>
                <div className='flex items-center gap-2 text-green-800'>
                  <FileText className='h-5 w-5 text-green-600' />
                  <span className='font-bold text-lg'>
                    🎉 Schedule Auto-Detected!
                  </span>
                </div>
                <p className='text-sm text-green-700 mt-2 font-medium'>
                  ✅ Successfully pasted and parsed your schedule message!
                  Review below and click "Import" to add the runs.
                </p>
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='schedule-text'>Schedule Message</Label>
              <textarea
                id='schedule-text'
                className='w-full min-h-32 p-3 border border-border rounded-md resize-vertical bg-background text-foreground'
                placeholder='Paste your schedule message here, or just paste anywhere on the page...'
                value={scheduleText}
                onChange={e => setScheduleText(e.target.value)}
              />
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={handleScheduleParse}
                disabled={!scheduleText.trim()}
              >
                Parse Schedule
              </Button>
              {parseResult?.success && (
                <Button
                  onClick={handleBulkImport}
                  disabled={!parseResult.runs.length}
                >
                  Import {parseResult.runs.length} Runs
                </Button>
              )}
            </div>

            {/* Parse Results */}
            {parseResult && (
              <div className='mt-4 space-y-2'>
                {parseResult.success ? (
                  <div className='bg-green-50 p-3 rounded-lg'>
                    <div className='flex items-center gap-2 text-green-800 font-medium'>
                      <Badge className='bg-green-100 text-green-800'>
                        ✓ Success
                      </Badge>
                      Found {parseResult.runs.length} runs
                    </div>
                    <div className='mt-2 text-sm text-green-700'>
                      {parseResult.runs.map((run, index) => (
                        <div key={index} className='mt-1'>
                          • {run.type.toUpperCase()}: {run.flightNumber} at{' '}
                          {run.time} ({run.airline})
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='bg-red-50 p-3 rounded-lg'>
                    <div className='flex items-center gap-2 text-red-800 font-medium'>
                      <AlertCircle className='h-4 w-4' />
                      Parse Failed
                    </div>
                    <div className='mt-2 text-sm text-red-700'>
                      {parseResult.errors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  </div>
                )}

                {parseResult.warnings.length > 0 && (
                  <div className='bg-yellow-50 p-3 rounded-lg'>
                    <div className='flex items-center gap-2 text-yellow-800 font-medium'>
                      <AlertCircle className='h-4 w-4' />
                      Warnings
                    </div>
                    <div className='mt-2 text-sm text-yellow-700'>
                      {parseResult.warnings.map((warning, index) => (
                        <div key={index}>• {warning}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Manual Add Form */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Entry</CardTitle>
          <CardDescription>Enter run details manually</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='flight-number'>Flight Number *</Label>
              <Input
                id='flight-number'
                placeholder='e.g., AA1234'
                value={newRun.flightNumber || ''}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    flightNumber: e.target.value.toUpperCase(),
                  }))
                }
                className={formErrors.flightNumber ? 'border-destructive' : ''}
              />
              {formErrors.flightNumber && (
                <p className='text-sm text-destructive'>
                  {formErrors.flightNumber}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='airline'>Airline *</Label>
              <Input
                id='airline'
                placeholder='e.g., American Airlines'
                value={newRun.airline || ''}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    airline: e.target.value,
                  }))
                }
                className={formErrors.airline ? 'border-destructive' : ''}
              />
              {formErrors.airline && (
                <p className='text-sm text-destructive'>{formErrors.airline}</p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='departure'>Departure Airport *</Label>
              <Input
                id='departure'
                placeholder='e.g., JFK'
                value={newRun.departure || ''}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    departure: e.target.value.toUpperCase(),
                  }))
                }
                className={formErrors.departure ? 'border-destructive' : ''}
              />
              {formErrors.departure && (
                <p className='text-sm text-destructive'>
                  {formErrors.departure}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='arrival'>Arrival Airport *</Label>
              <Input
                id='arrival'
                placeholder='e.g., LAX'
                value={newRun.arrival || ''}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    arrival: e.target.value.toUpperCase(),
                  }))
                }
                className={formErrors.arrival ? 'border-destructive' : ''}
              />
              {formErrors.arrival && (
                <p className='text-sm text-destructive'>{formErrors.arrival}</p>
              )}
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='pickup-location'>Pickup Location *</Label>
              <Input
                id='pickup-location'
                placeholder='e.g., 123 Main St, City, State'
                value={newRun.pickupLocation || ''}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    pickupLocation: e.target.value,
                  }))
                }
                className={
                  formErrors.pickupLocation ? 'border-destructive' : ''
                }
              />
              {formErrors.pickupLocation && (
                <p className='text-sm text-destructive'>
                  {formErrors.pickupLocation}
                </p>
              )}
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='dropoff-location'>Dropoff Location *</Label>
              <Input
                id='dropoff-location'
                placeholder='e.g., Airport Terminal 1'
                value={newRun.dropoffLocation || ''}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    dropoffLocation: e.target.value,
                  }))
                }
                className={
                  formErrors.dropoffLocation ? 'border-destructive' : ''
                }
              />
              {formErrors.dropoffLocation && (
                <p className='text-sm text-destructive'>
                  {formErrors.dropoffLocation}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='scheduled-time'>Scheduled Time *</Label>
              <Input
                id='scheduled-time'
                type='datetime-local'
                value={newRun.scheduledTime || ''}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    scheduledTime: e.target.value,
                  }))
                }
                className={formErrors.scheduledTime ? 'border-destructive' : ''}
              />
              {formErrors.scheduledTime && (
                <p className='text-sm text-destructive'>
                  {formErrors.scheduledTime}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='type'>Run Type *</Label>
              <select
                id='type'
                className='w-full p-2 border border-border rounded-md h-10 bg-background text-foreground'
                value={newRun.type || 'pickup'}
                onChange={e =>
                  setNewRun(prev => ({
                    ...prev,
                    type: e.target.value as RunType,
                  }))
                }
              >
                <option value='pickup'>Pickup (to airport)</option>
                <option value='dropoff'>Dropoff (from airport)</option>
              </select>
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='notes'>Notes (Optional)</Label>
              <Input
                id='notes'
                placeholder='Additional notes...'
                value={newRun.notes || ''}
                onChange={e =>
                  setNewRun(prev => ({ ...prev, notes: e.target.value }))
                }
                className={formErrors.notes ? 'border-destructive' : ''}
              />
              {formErrors.notes && (
                <p className='text-sm text-destructive'>{formErrors.notes}</p>
              )}
            </div>
          </div>
          <Button onClick={addRun} className='w-full h-12 text-lg'>
            <Plus className='h-5 w-5 mr-2' />
            Add Run
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute()({
  component: Add,
});

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Clock, MapPin, Plane, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { runsApi } from '../lib/api/client';
import { NewRunFormSchema, type NewRunForm } from '../lib/schema';
import { toasts } from '../lib/toast';

function AddRun() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<NewRunForm>({
    resolver: zodResolver(NewRunFormSchema),
    defaultValues: {
      flightNumber: '',
      airline: '',
      departure: '',
      arrival: '',
      pickupLocation: '',
      dropoffLocation: '',
      scheduledTime: '',
      type: 'pickup',
      notes: '',
    },
  });

  // Mutation for creating a new run
  const createRunMutation = useMutation({
    mutationFn: (data: NewRunForm) => runsApi.createRun(data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch runs
      queryClient.invalidateQueries({ queryKey: ['runs'] });

      // Show success toast
      toasts.success(
        'Run created successfully',
        `${variables.type === 'pickup' ? 'Pickup' : 'Dropoff'} run for flight ${variables.flightNumber} has been scheduled.`
      );

      // Reset form
      form.reset();

      // Navigate to runs page
      router.navigate({ to: '/runs' });
    },
    onError: error => {
      console.error('Failed to create run:', error);
      toasts.error(
        'Failed to create run',
        'Please check your information and try again.'
      );
    },
  });

  const onSubmit = (data: NewRunForm) => {
    createRunMutation.mutate(data);
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-foreground'>Add New Run</h2>
        <p className='text-muted-foreground mt-1'>
          Schedule a new pickup or dropoff run
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Plus className='h-5 w-5' />
            Run Details
          </CardTitle>
          <CardDescription>
            Enter the flight and location information for your run
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='flightNumber'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <Plane className='h-4 w-4' />
                        Flight Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., UA123'
                          {...field}
                          className='bg-background'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='airline'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Airline</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., United Airlines'
                          {...field}
                          className='bg-background'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='departure'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Airport</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., DEN'
                          {...field}
                          className='bg-background'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='arrival'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Airport</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., JAC'
                          {...field}
                          className='bg-background'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='pickupLocation'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4' />
                        Pickup Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Jackson Hole Airport'
                          {...field}
                          className='bg-background'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='dropoffLocation'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4' />
                        Dropoff Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='e.g., Snow King Resort'
                          {...field}
                          className='bg-background'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='scheduledTime'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <Clock className='h-4 w-4' />
                        Scheduled Time
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='datetime-local'
                          {...field}
                          className='bg-background'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Run Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='bg-background'>
                            <SelectValue placeholder='Select run type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='pickup'>Pickup</SelectItem>
                          <SelectItem value='dropoff'>Dropoff</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g., VIP guest, special instructions'
                        {...field}
                        className='bg-background'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex gap-3'>
                <Button
                  type='submit'
                  className='flex-1'
                  disabled={createRunMutation.isPending}
                >
                  {createRunMutation.isPending ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2'></div>
                      Creating Run...
                    </>
                  ) : (
                    <>
                      <Plus className='h-4 w-4 mr-2' />
                      Add Run
                    </>
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.navigate({ to: '/runs' })}
                  disabled={createRunMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/add')({
  component: AddRun,
});

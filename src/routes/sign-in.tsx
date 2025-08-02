import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LoaderIcon, Plane } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
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
import { signIn } from '../lib/auth-client';
import { checkAuthRedirect } from '../lib/hooks/use-auth-redirect';
import { toasts } from '../lib/toast';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SignInForm = z.infer<typeof signInSchema>;

function SignInPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: SignInForm) => {
    setIsLoading(true);
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
      });

      if (result.error) {
        // Handle specific better-auth errors
        const errorMessage = result.error.message || 'Failed to sign in';
        if (
          errorMessage.includes('Invalid credentials') ||
          errorMessage.includes('not found')
        ) {
          toasts.error(
            'Invalid email or password. Please check your credentials and try again.'
          );
        } else {
          toasts.error(errorMessage);
        }
        return;
      }

      // Success - user signed in
      toasts.success('Welcome back to Teton Tracker!');

      // Small delay to ensure session is established before navigation
      setTimeout(() => {
        if (redirect) {
          window.location.href = redirect; // Use window.location for external redirects
        } else {
          navigate({ to: '/' });
        }
      }, 100);
    } catch (error: any) {
      // Handle network errors or other unexpected errors
      if (
        error?.message?.includes('Invalid credentials') ||
        error?.message?.includes('not found')
      ) {
        toasts.error(
          'Invalid email or password. Please check your credentials and try again.'
        );
      } else {
        toasts.error('An unexpected error occurred. Please try again.');
      }
      console.error('Sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
            <Plane className="size-6 mr-2" />
            Teton Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-highlight text-white hover:bg-highlight/80 flex items-center justify-center"
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading && <LoaderIcon className="animate-spin size-3" />}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-highlight hover:text-highlight/80 underline"
                onClick={() =>
                  navigate({
                    to: '/sign-up',
                    search: redirect ? { redirect } : undefined,
                  })
                }
              >
                Sign up
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/sign-in')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: async () => {
    // Redirect authenticated users away from sign-in page
    await checkAuthRedirect();
  },
  component: SignInPage,
});

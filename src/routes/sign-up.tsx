import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Check } from 'lucide-react';
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
import { authClient, signUp } from '../lib/auth-client';
import { checkAuthRedirect } from '../lib/hooks/use-auth-redirect';
import { toasts } from '../lib/toast';

const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters')
      .trim(),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be less than 100 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignUpForm = z.infer<typeof signUpSchema>;

function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { redirect, email, org } = Route.useSearch();
  const acceptingInvitation = redirect?.startsWith('/accept-invitation/');

  // Extract invitation data from search parameters
  const invitationEmail = email || '';
  const organizationName = org || '';

  // Check if this is an invitation signup
  const isInvitationSignUp = acceptingInvitation && !!invitationEmail;

  // Extract invitation ID from redirect URL
  const getInvitationId = (): string | null => {
    if (!redirect || !redirect.startsWith('/accept-invitation/')) {
      return null;
    }
    return redirect.replace('/accept-invitation/', '');
  };

  // Get organization ID for callback URL
  const getOrganizationCallbackUrl = async (): Promise<string> => {
    if (!isInvitationSignUp) {
      return '/';
    }

    const invitationId = getInvitationId();
    if (!invitationId) {
      return '/';
    }

    try {
      const { data: invitation, error } =
        await authClient.organization.getInvitation({
          query: { id: invitationId },
        });

      if (!error && invitation) {
        return `/organizations/${invitation.organizationId}`;
      }
    } catch (err) {
      console.error('Failed to get organization for callback:', err);
    }

    return '/';
  };

  const form = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur', // Only validate when field loses focus
    reValidateMode: 'onBlur', // Re-validate on blur after first validation
    defaultValues: {
      name: '',
      email: invitationEmail,
      password: '',
      confirmPassword: '',
    },
  });

  // Get form validation state
  const { isValid, isDirty } = form.formState;

  // Watch password fields for real-time matching
  const [password, confirmPassword] = form.watch([
    'password',
    'confirmPassword',
  ]);
  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;

  // Check if form should be submittable (all fields filled + passwords match + basic validation)
  const isFormSubmittable = () => {
    const values = form.getValues();
    const nameValid = values.name && values.name.trim().length >= 2;
    const emailValid = values.email && values.email.includes('@');
    const passwordValid = values.password && values.password.length >= 8;
    const confirmPasswordValid = values.confirmPassword && passwordsMatch;

    return nameValid && emailValid && passwordValid && confirmPasswordValid;
  };

  const onSubmit = async (values: SignUpForm) => {
    setIsLoading(true);
    try {
      // Get the appropriate callback URL based on invitation context
      const callbackURL = await getOrganizationCallbackUrl();

      const result = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
        callbackURL,
      });

      if (result.error) {
        // Handle specific better-auth errors
        const errorMessage = result.error.message || 'Failed to create account';
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('unique')
        ) {
          toasts.error(
            'An account with this email already exists. Please use a different email or try signing in.'
          );
        } else {
          toasts.error(errorMessage);
        }
        return;
      }

      // Success - account created and user should be signed in
      if (isInvitationSignUp) {
        toasts.success(
          'Account created successfully! Completing invitation...'
        );

        // For invitation signups, redirect to accept invitation to complete the flow
        setTimeout(() => {
          if (redirect) {
            window.location.href = redirect; // Complete the invitation acceptance
          } else {
            navigate({ to: '/' });
          }
        }, 500);
      } else {
        toasts.success(
          'Account created successfully! Welcome to Teton Tracker!'
        );

        // Regular signup - redirect to home
        setTimeout(() => {
          navigate({ to: '/' });
        }, 500);
      }
    } catch (error: any) {
      // Handle network errors or other unexpected errors
      if (
        error?.message?.includes('already exists') ||
        error?.message?.includes('unique')
      ) {
        toasts.error(
          'An account with this email already exists. Please use a different email or try signing in.'
        );
      } else {
        toasts.error('An unexpected error occurred. Please try again.');
      }
      console.error('Sign-up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isInvitationSignUp ? 'Accept Invitation' : 'Create Account'}
          </CardTitle>
          <p className="text-muted-foreground text-center">
            {isInvitationSignUp ? (
              <>
                Create your account to join{' '}
                <span className="text-highlight/70 block">
                  {organizationName || 'the organization'}
                </span>
              </>
            ) : (
              'Sign up to get started with Teton Tracker'
            )}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Full Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={
                          isInvitationSignUp
                            ? 'Email from invitation'
                            : 'Enter your email'
                        }
                        disabled={isLoading}
                        readOnly={isInvitationSignUp}
                        className={
                          isInvitationSignUp
                            ? 'bg-muted cursor-not-allowed'
                            : ''
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {isInvitationSignUp && (
                      <p className="text-xs text-muted-foreground">
                        This email was provided with your invitation
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password <span className="text-destructive">*</span>
                    </FormLabel>
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Confirm Password{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          disabled={isLoading}
                          {...field}
                        />
                        {passwordsMatch && (
                          <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-highlight text-white hover:bg-highlight/80 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !isFormSubmittable()}
              >
                {isLoading
                  ? isInvitationSignUp
                    ? 'Accepting invitation...'
                    : 'Creating account...'
                  : !isFormSubmittable()
                    ? 'Please fill out all fields'
                    : isInvitationSignUp
                      ? 'Accept Invite & Create Account'
                      : 'Create Account'}
              </Button>
            </form>
          </Form>

          {!isInvitationSignUp && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto font-bold text-highlight hover:text-highlight/80 underline"
                  onClick={() =>
                    navigate({
                      to: '/sign-in',
                      search: redirect ? { redirect } : undefined,
                    })
                  }
                >
                  Sign in
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/sign-up')({
  validateSearch: z.object({
    redirect: z.string().optional(),
    email: z.string().optional(),
    org: z.string().optional(),
  }),
  beforeLoad: async () => {
    // Redirect authenticated users away from sign-up page
    await checkAuthRedirect();
  },
  component: SignUpPage,
});

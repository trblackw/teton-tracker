import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { signIn, signUp } from '../auth-client';
import { toasts } from '../toast';
import { getPostSignInNavigationPath } from './use-org-navigation';

interface SignInData {
  email: string;
  password: string;
}

interface SignUpData {
  name: string;
  email: string;
  password: string;
  callbackURL?: string;
}

export function useSignInMutation(redirect?: string) {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, password }: SignInData) =>
      signIn.email({ email, password }),
    onSuccess: result => {
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

      // Navigate with a delay to ensure session is established and provide smooth transition
      setTimeout(async () => {
        if (redirect) {
          window.location.href = redirect;
        } else {
          // Get the appropriate organization page to navigate to
          const navigationPath = await getPostSignInNavigationPath();
          navigate(navigationPath);
        }
      }, 1000);
    },
    onError: (error: any) => {
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
    },
  });
}

export function useSignUpMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ name, email, password, callbackURL }: SignUpData) =>
      signUp.email({ name, email, password, callbackURL }),
    onSuccess: (result, variables, context) => {
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

      // Success will be handled by the component since it has complex invitation logic
      // The component can access the mutation result directly
    },
    onError: (error: any) => {
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
    },
  });
}

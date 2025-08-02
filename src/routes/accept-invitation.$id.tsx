import { createFileRoute, redirect } from '@tanstack/react-router';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import PageWrapper from '../components/ui/page-wrapper';
import { authClient } from '../lib/auth-client';
import { toasts } from '../lib/toast';

interface AcceptInvitationParams {
  id: string;
}

function AcceptInvitation() {
  const { id: invitationId } = Route.useParams();
  const invitationData = Route.useLoaderData();
  const [isAccepting, setIsAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAcceptInvitation = async () => {
    try {
      setIsAccepting(true);

      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (error) {
        toasts.error(error.message || 'Failed to accept invitation');
        return;
      }

      setSuccess(true);
      toasts.success('Invitation accepted successfully!');

      // Set the organization as active and redirect
      if (data?.invitation?.organizationId) {
        await authClient.organization.setActive({
          organizationId: data.invitation.organizationId,
        });

        // Redirect to the organization page
        setTimeout(() => {
          window.location.href = `/organizations/${data.invitation.organizationId}`;
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      toasts.error('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectInvitation = async () => {
    try {
      await authClient.organization.rejectInvitation({
        invitationId,
      });

      toasts.success('Invitation declined');
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to reject invitation:', err);
      toasts.error('Failed to decline invitation');
    }
  };

  if (success) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto mt-16">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-xl font-semibold text-foreground mb-2">
                  Welcome to {invitationData?.organization?.name}!
                </h1>
                <p className="text-muted-foreground mb-6">
                  Your invitation has been accepted. Redirecting you to the
                  organization...
                </p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Organization Invitation
              </h1>

              {invitationData && (
                <div className="text-left bg-muted/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    You're invited to join:
                  </p>
                  <p className="font-medium text-foreground mb-1">
                    {invitationData.organization?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Role: {invitationData.role}
                  </p>
                  {invitationData.expiresAt && (
                    <p className="text-xs text-muted-foreground">
                      Expires:{' '}
                      {new Date(invitationData.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting}
                  className="w-full bg-highlight text-white"
                >
                  {isAccepting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Accepting...
                    </div>
                  ) : (
                    'Accept Invitation'
                  )}
                </Button>
                <Button
                  onClick={handleRejectInvitation}
                  variant="outline"
                  className="w-full"
                >
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export const Route = createFileRoute('/accept-invitation/$id')({
  validateSearch: z.object({
    email: z.string().optional(),
    org: z.string().optional(),
  }),
  beforeLoad: async ({ params, search }) => {
    // Check if user is authenticated
    const sessionResponse = await authClient.getSession();

    if (!sessionResponse.data?.user) {
      // Pass email and org parameters directly to sign-up route
      throw redirect({
        to: '/sign-up',
        search: {
          redirect: `/accept-invitation/${params.id}`,
          email: search.email,
          org: search.org,
        },
      });
    }
  },
  loader: async ({ params }) => {
    // User is authenticated, load invitation details
    const { data: invitation, error } =
      await authClient.organization.getInvitation({
        query: { id: params.id },
      });

    if (error || !invitation) {
      throw new Error('Invitation not found or has expired');
    }

    return invitation;
  },
  errorComponent: ({ error }) => (
    <PageWrapper>
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground mb-2">
                Invitation Error
              </h1>
              <p className="text-muted-foreground mb-6">
                {error.message || 'Invitation not found or has expired'}
              </p>
              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  ),
  component: AcceptInvitation,
});

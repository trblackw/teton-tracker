import { createClerkClient } from '@clerk/clerk-sdk-node';

// Initialize Clerk with secret key
if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  throw new Error('CLERK_SECRET_KEY environment variable is required');
}

// Create Clerk client instance with explicit secret key
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

console.log('✅ Clerk organizations API initialized with secret key');

// Helper function to handle Clerk API errors
function handleClerkError(error: any, operation: string): Response {
  console.error(`❌ Clerk API error in ${operation}:`, {
    status: error.status,
    message: error.message,
    clerkTraceId: error.clerkTraceId,
  });

  // Return appropriate error response based on status
  if (error.status === 401) {
    return new Response(
      JSON.stringify({
        error: 'Authentication failed. Please check your Clerk secret key.',
        details: 'The Clerk secret key is missing or invalid.',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error.status === 403) {
    return new Response(
      JSON.stringify({
        error:
          'Access forbidden. Organizations may not be enabled in your Clerk application.',
        details: 'Enable organizations in your Clerk dashboard.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      error: `Clerk API error: ${error.message}`,
      status: error.status,
    }),
    {
      status: error.status || 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// GET /api/organizations - Get all organizations for the current user
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Fetching organizations for user: ${userId}`);

    // Get user's organization memberships from Clerk
    const organizationMemberships =
      await clerk.users.getOrganizationMembershipList({
        userId,
      });

    console.log(
      `✅ Found ${organizationMemberships.data.length} organization memberships`
    );

    // Transform the data to include organization details and roles
    const userOrganizations = await Promise.all(
      organizationMemberships.data.map(async (membership: any) => {
        const organization = await clerk.organizations.getOrganization({
          organizationId: membership.organization.id,
        });

        return {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          imageUrl: organization.imageUrl,
          role: membership.role,
          permissions: membership.permissions,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
          membershipId: membership.id,
          membershipCreatedAt: membership.createdAt,
          membershipUpdatedAt: membership.updatedAt,
        };
      })
    );

    return new Response(JSON.stringify(userOrganizations), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Failed to get user organizations:', error);
    return handleClerkError(error, 'getUserOrganizations');
  }
}

// GET /api/organizations/:orgId/members - Get all members of an organization
export async function getOrganizationMembers(
  request: Request
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgId = (request as any).params?.orgId;
    const requestingUserId = url.searchParams.get('userId');

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!requestingUserId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if the requesting user is a member of the organization
    const userMembershipList = await clerk.organizations
      .getOrganizationMembershipList({
        organizationId: orgId,
      })
      .catch(() => null);

    const userMembership = userMembershipList?.data.find(
      (m: any) => m.publicUserData.userId === requestingUserId
    );

    if (!userMembership) {
      return new Response(
        JSON.stringify({
          error: 'Access denied. User is not a member of this organization.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get organization details and all members
    const [organization, memberships] = await Promise.all([
      clerk.organizations.getOrganization({ organizationId: orgId }),
      clerk.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      }),
    ]);

    // Transform member data
    const members = await Promise.all(
      memberships.data.map(async (membership: any) => {
        const user = await clerk.users.getUser(
          membership.publicUserData.userId
        );

        return {
          userId: user.id,
          email: user.emailAddresses[0]?.emailAddress || null,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          role: membership.role,
          permissions: membership.permissions,
          membershipId: membership.id,
          membershipCreatedAt: membership.createdAt,
          membershipUpdatedAt: membership.updatedAt,
        };
      })
    );

    const response = {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        imageUrl: organization.imageUrl,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
      members,
      requestingUserRole: userMembership.role,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Failed to get organization members:', error);
    return handleClerkError(error, 'getOrganizationMembers');
  }
}

// GET /api/organizations/:orgId/user-role - Get user's role in a specific organization
export async function getUserRole(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgId = (request as any).params?.orgId;
    const userId = url.searchParams.get('userId');

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user's membership in the organization
    const membershipList = await clerk.organizations
      .getOrganizationMembershipList({
        organizationId: orgId,
      })
      .catch(() => null);

    const membership = membershipList?.data.find(
      (m: any) => m.publicUserData.userId === userId
    );

    if (!membership) {
      return new Response(
        JSON.stringify({
          error: 'User is not a member of this organization',
          isMember: false,
          role: null,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = {
      isMember: true,
      role: membership.role,
      permissions: membership.permissions,
      membershipId: membership.id,
      membershipCreatedAt: membership.createdAt,
      membershipUpdatedAt: membership.updatedAt,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Failed to get user role:', error);
    return handleClerkError(error, 'getUserRole');
  }
}

// GET /api/organizations/check-permissions - Check if user has specific permissions
export async function checkPermissions(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    const userId = url.searchParams.get('userId');
    const permission = url.searchParams.get('permission');

    if (!orgId || !userId || !permission) {
      return new Response(
        JSON.stringify({
          error: 'Organization ID, User ID, and permission are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's membership in the organization
    const membershipList = await clerk.organizations
      .getOrganizationMembershipList({
        organizationId: orgId,
      })
      .catch(() => null);

    const membership = membershipList?.data.find(
      (m: any) => m.publicUserData.userId === userId
    );

    if (!membership) {
      return new Response(
        JSON.stringify({
          hasPermission: false,
          isMember: false,
          role: null,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has the specific permission
    const hasPermission = membership.permissions.includes(permission);

    const response = {
      hasPermission,
      isMember: true,
      role: membership.role,
      permissions: membership.permissions,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Failed to check permissions:', error);
    return handleClerkError(error, 'checkPermissions');
  }
}

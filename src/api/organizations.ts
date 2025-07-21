import { initJSONResponse } from '../lib/api/api-tools';
import {
  getOrganizationById,
  getOrganizationMembers as getOrgMembers,
  getUserOrganizations,
  getUserRoleInOrganization,
} from '../lib/db/organizations';
import { getCurrentAuthUser } from './auth';

console.log('✅ Organizations API initialized with BetterAuth');

// Helper function to handle organization API errors
function handleOrganizationError(error: any, operation: string): Response {
  console.error(`❌ Organization API error in ${operation}:`, error);

  if (error.message.includes('Authentication required')) {
    return initJSONResponse(
      {
        error: 'Authentication required',
        details: 'Please sign in to access organization data.',
      },
      401
    );
  }

  if (error.message.includes('Access denied')) {
    return initJSONResponse(
      {
        error: 'Access denied',
        details: 'You do not have permission to access this organization.',
      },
      403
    );
  }

  return initJSONResponse(
    {
      error: `Organization API error: ${error.message}`,
    },
    500
  );
}

// GET /api/organizations - Get all organizations for the current user
export async function GET(request: Request): Promise<Response> {
  try {
    // Get current user from BetterAuth session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get user's organizations from our database
    const userOrganizations = await getUserOrganizations(user.id);

    // Transform data to match expected API format
    const transformedOrganizations = userOrganizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.name.toLowerCase().replace(/\s+/g, '-'), // Generate slug from name
      imageUrl: org.imageUrl,
      role: org.userRole,
      permissions: org.userRole === 'admin' ? ['admin'] : ['member'], // Simplified permissions
      createdAt: org.createdAt,
      updatedAt: org.createdAt, // We don't track updatedAt separately yet
      membershipId: `${org.id}-${user.id}`, // Generate membership ID
      membershipCreatedAt: org.createdAt,
      membershipUpdatedAt: org.createdAt,
      memberCount: org.memberCount,
    }));

    return initJSONResponse(transformedOrganizations);
  } catch (error: any) {
    console.error('Failed to get user organizations:', error);
    return handleOrganizationError(error, 'getUserOrganizations');
  }
}

// GET /api/organizations/:orgId/members - Get all members of an organization
export async function getOrganizationMembers(
  request: Request
): Promise<Response> {
  try {
    const orgId = (request as any).params?.orgId;

    if (!orgId) {
      return initJSONResponse({ error: 'Organization ID is required' }, 400);
    }

    // Get current user from BetterAuth session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Check if the requesting user is a member of the organization
    const userRole = await getUserRoleInOrganization(user.id, orgId);

    if (!userRole) {
      return initJSONResponse(
        {
          error: 'Access denied. User is not a member of this organization.',
        },
        403
      );
    }

    // Get organization details and all members
    const [organization, members] = await Promise.all([
      getOrganizationById(orgId),
      getOrgMembers(orgId),
    ]);

    if (!organization) {
      return initJSONResponse({ error: 'Organization not found' }, 404);
    }

    // Transform member data to match expected format
    const transformedMembers = members.map(member => ({
      userId: member.id,
      email: member.email,
      firstName: member.name.split(' ')[0] || member.name,
      lastName: member.name.split(' ').slice(1).join(' ') || '',
      imageUrl: null, // We don't store imageUrl in user table yet
      role: member.role,
      permissions: member.role === 'admin' ? ['admin'] : ['member'],
      membershipId: `${orgId}-${member.id}`,
      membershipCreatedAt: member.joinedAt,
      membershipUpdatedAt: member.joinedAt,
    }));

    const res = {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.name.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: organization.imageUrl,
        createdAt: organization.createdAt,
        updatedAt: organization.createdAt,
      },
      members: transformedMembers,
      requestingUserRole: userRole,
    };

    return initJSONResponse(res);
  } catch (error: any) {
    console.error('Failed to get organization members:', error);
    return handleOrganizationError(error, 'getOrganizationMembers');
  }
}

// GET /api/organizations/:orgId/user-role - Get user's role in a specific organization
export async function getUserRole(request: Request): Promise<Response> {
  try {
    const orgId = (request as any).params?.orgId;

    if (!orgId) {
      return initJSONResponse({ error: 'Organization ID is required' }, 400);
    }

    // Get current user from BetterAuth session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get user's role in the organization
    const userRole = await getUserRoleInOrganization(user.id, orgId);

    if (!userRole) {
      return initJSONResponse(
        {
          error: 'User is not a member of this organization',
          isMember: false,
          role: null,
        },
        404
      );
    }

    const res = {
      isMember: true,
      role: userRole,
      permissions: userRole === 'admin' ? ['admin'] : ['member'],
      membershipId: `${orgId}-${user.id}`,
      membershipCreatedAt: new Date(), // We'd need to query this separately if needed
      membershipUpdatedAt: new Date(),
    };

    return initJSONResponse(res);
  } catch (error: any) {
    console.error('Failed to get user role:', error);
    return handleOrganizationError(error, 'getUserRole');
  }
}

// GET /api/organizations/check-permissions - Check if user has specific permissions
export async function checkPermissions(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    const permission = url.searchParams.get('permission');

    if (!orgId || !permission) {
      return initJSONResponse(
        {
          error: 'Organization ID and permission are required',
        },
        400
      );
    }

    // Get current user from BetterAuth session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse(
        {
          hasPermission: false,
          isMember: false,
          role: null,
        },
        401
      );
    }

    // Get user's role in the organization
    const userRole = await getUserRoleInOrganization(user.id, orgId);

    if (!userRole) {
      return initJSONResponse(
        {
          hasPermission: false,
          isMember: false,
          role: null,
        },
        403
      );
    }

    // Simple permission check - admins have all permissions, others have basic member permissions
    const hasPermission = userRole === 'admin' || permission === 'member';

    const res = {
      hasPermission,
      isMember: true,
      role: userRole,
      permissions: userRole === 'admin' ? ['admin'] : ['member'],
    };

    return initJSONResponse(res);
  } catch (error: any) {
    console.error('Failed to check permissions:', error);
    return handleOrganizationError(error, 'checkPermissions');
  }
}

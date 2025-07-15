import { getDatabase } from './db';

// Standard error types for access control
export class AccessControlError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403,
    public resourceType?: string,
    public resourceId?: string
  ) {
    super(message);
    this.name = 'AccessControlError';
  }
}

export class ResourceNotFoundError extends Error {
  constructor(
    message: string,
    public statusCode: number = 404,
    public resourceType?: string,
    public resourceId?: string
  ) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

// Resource types that support access control
export type ResourceType = 'run' | 'notification' | 'user_preferences';

// Interface for resources that have ownership
export interface OwnedResource {
  id: string;
  userId: string;
}

// Core access control functions
export async function validateResourceOwnership(
  resourceType: ResourceType,
  resourceId: string,
  currentUserId: string
): Promise<void> {
  if (!currentUserId) {
    throw new AccessControlError('User authentication required', 401);
  }

  if (!resourceId) {
    throw new ResourceNotFoundError(
      `${resourceType} ID is required`,
      400,
      resourceType
    );
  }

  const db = getDatabase();
  let tableName: string;
  let idColumn: string = 'id';

  // Map resource types to database tables
  switch (resourceType) {
    case 'run':
      tableName = 'runs';
      break;
    case 'notification':
      tableName = 'notifications';
      break;
    case 'user_preferences':
      tableName = 'user_preferences';
      break;
    default:
      throw new Error(`Unsupported resource type: ${resourceType}`);
  }

  try {
    const result = await db.query(
      `SELECT user_id FROM ${tableName} WHERE ${idColumn} = $1`,
      [resourceId]
    );

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError(
        `${resourceType} not found`,
        404,
        resourceType,
        resourceId
      );
    }

    const resourceUserId = result.rows[0].user_id;

    if (resourceUserId !== currentUserId) {
      throw new AccessControlError(
        `Access denied: You do not have permission to access this ${resourceType}`,
        403,
        resourceType,
        resourceId
      );
    }
  } catch (error) {
    if (
      error instanceof AccessControlError ||
      error instanceof ResourceNotFoundError
    ) {
      throw error;
    }
    throw new Error(`Failed to validate ${resourceType} ownership: ${error}`);
  }
}

// Validate ownership of multiple resources
export async function validateMultipleResourceOwnership(
  resourceType: ResourceType,
  resourceIds: string[],
  currentUserId: string
): Promise<void> {
  if (!currentUserId) {
    throw new AccessControlError('User authentication required', 401);
  }

  if (!resourceIds || resourceIds.length === 0) {
    return; // No resources to validate
  }

  const db = getDatabase();
  let tableName: string;

  switch (resourceType) {
    case 'run':
      tableName = 'runs';
      break;
    case 'notification':
      tableName = 'notifications';
      break;
    case 'user_preferences':
      tableName = 'user_preferences';
      break;
    default:
      throw new Error(`Unsupported resource type: ${resourceType}`);
  }

  try {
    const placeholders = resourceIds
      .map((_, index) => `$${index + 1}`)
      .join(',');
    const result = await db.query(
      `SELECT id, user_id FROM ${tableName} WHERE id IN (${placeholders})`,
      resourceIds
    );

    // Check if all resources were found
    if (result.rows.length !== resourceIds.length) {
      const foundIds = result.rows.map(row => row.id);
      const missingIds = resourceIds.filter(id => !foundIds.includes(id));
      throw new ResourceNotFoundError(
        `${resourceType}(s) not found: ${missingIds.join(', ')}`,
        404,
        resourceType
      );
    }

    // Check ownership of all resources
    const unauthorizedResources = result.rows.filter(
      row => row.user_id !== currentUserId
    );
    if (unauthorizedResources.length > 0) {
      const unauthorizedIds = unauthorizedResources.map(row => row.id);
      throw new AccessControlError(
        `Access denied: You do not have permission to access ${resourceType}(s): ${unauthorizedIds.join(', ')}`,
        403,
        resourceType
      );
    }
  } catch (error) {
    if (
      error instanceof AccessControlError ||
      error instanceof ResourceNotFoundError
    ) {
      throw error;
    }
    throw new Error(
      `Failed to validate multiple ${resourceType} ownership: ${error}`
    );
  }
}

// Check if a user owns a specific resource (non-throwing version)
export async function hasResourceAccess(
  resourceType: ResourceType,
  resourceId: string,
  currentUserId: string
): Promise<boolean> {
  try {
    await validateResourceOwnership(resourceType, resourceId, currentUserId);
    return true;
  } catch (error) {
    if (
      error instanceof AccessControlError ||
      error instanceof ResourceNotFoundError
    ) {
      return false;
    }
    throw error; // Re-throw unexpected errors
  }
}

// Utility to create consistent HTTP responses for access control errors
export function createAccessControlResponse(error: Error): Response {
  if (error instanceof AccessControlError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        type: 'access_denied',
        resourceType: error.resourceType,
        resourceId: error.resourceId,
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error instanceof ResourceNotFoundError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        type: 'resource_not_found',
        resourceType: error.resourceType,
        resourceId: error.resourceId,
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Generic error response
  return new Response(
    JSON.stringify({
      error: 'An error occurred while validating access',
      type: 'internal_error',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Middleware-style wrapper for API handlers with access control
export function withAccessControl<T extends any[]>(
  resourceType: ResourceType,
  getResourceId: (...args: T) => string,
  getCurrentUserId: (...args: T) => string
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: T) {
      try {
        const resourceId = getResourceId(...args);
        const currentUserId = getCurrentUserId(...args);

        await validateResourceOwnership(
          resourceType,
          resourceId,
          currentUserId
        );

        return await method.apply(this, args);
      } catch (error) {
        if (
          error instanceof AccessControlError ||
          error instanceof ResourceNotFoundError
        ) {
          throw error;
        }
        throw new Error(`Access control validation failed: ${error}`);
      }
    };

    return descriptor;
  };
}

// Helper function to extract user ID from request
export function getUserIdFromRequest(request: Request): string {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    throw new AccessControlError('User ID is required', 401);
  }

  return userId;
}

// Helper function to extract user ID from request body
export async function getUserIdFromBody(request: Request): Promise<string> {
  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      throw new AccessControlError('User ID is required in request body', 401);
    }

    return userId;
  } catch (error) {
    if (error instanceof AccessControlError) {
      throw error;
    }
    throw new AccessControlError('Invalid request body', 400);
  }
}

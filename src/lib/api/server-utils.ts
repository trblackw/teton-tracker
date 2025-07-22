import { getDatabase } from '../db';
import type { OrganizationRequest } from './api-tools';

/**
 * Server-only helper function to get user's organization ID for API handlers
 * Handles both super-admin users (using organizationId from middleware)
 * and regular users (looking up their organization membership)
 */
export async function getUserOrganizationId(
  userId: string,
  request: OrganizationRequest
): Promise<string | null> {
  try {
    // Check if user is super-admin (set by organization middleware)
    const isSuperAdmin = request.params.isSuperAdmin;

    if (isSuperAdmin) {
      // For super-admins, get organizationId from request params (set by organization middleware)
      const organizationId = request.params.organizationId;
      return organizationId || null;
    }

    // For regular users, get their organization membership
    const db = getDatabase();

    const result = await db.query(
      'SELECT organization_id FROM organization_memberships WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0].organization_id : null;
  } catch (error) {
    console.error('Error fetching user organization:', error);
    return null;
  }
}

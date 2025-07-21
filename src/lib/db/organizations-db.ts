import type { Organization } from '../schema';
import { getDatabase, handleDatabaseError } from './index';

export interface OrganizationWithMembership extends Organization {
  userRole: 'admin' | 'driver';
  memberCount: number;
}

// Get user's organization memberships
async function getUserOrganizations(
  userId: string
): Promise<OrganizationWithMembership[]> {
  try {
    const db = getDatabase();

    const result = await db.query(
      `
      SELECT 
        o.id, o.name, o.image_url, o.created_by, o.created_at,
        om.role as user_role,
        (SELECT COUNT(*) FROM organization_memberships WHERE organization_id = o.id) as member_count
      FROM organizations o
      JOIN organization_memberships om ON o.id = om.organization_id
      WHERE om.user_id = $1
      ORDER BY o.created_at DESC
    `,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      createdBy: row.created_by,
      createdAt: row.created_at,
      userRole: row.user_role,
      memberCount: parseInt(row.member_count),
    }));
  } catch (error) {
    handleDatabaseError(error, 'get user organizations');
    return [];
  }
}

// Get organization members
async function getOrganizationMembers(organizationId: string): Promise<
  {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'driver';
    joinedAt: Date;
  }[]
> {
  try {
    const db = getDatabase();

    const result = await db.query(
      `
      SELECT 
        u.id, u.name, u.email,
        om.role, om.created_at as joined_at
      FROM users u
      JOIN organization_memberships om ON u.id = om.user_id
      WHERE om.organization_id = $1
      ORDER BY om.created_at ASC
    `,
      [organizationId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      joinedAt: row.joined_at,
    }));
  } catch (error) {
    handleDatabaseError(error, 'get organization members');
    return [];
  }
}

// Get user's role in organization
async function getUserRoleInOrganization(
  userId: string,
  organizationId: string
): Promise<'admin' | 'driver' | null> {
  try {
    const db = getDatabase();

    const result = await db.query(
      `
      SELECT role 
      FROM organization_memberships 
      WHERE user_id = $1 AND organization_id = $2
    `,
      [userId, organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].role;
  } catch (error) {
    handleDatabaseError(error, 'get user role in organization');
    return null;
  }
}

// Get organization by id
async function getOrganizationById(
  organizationId: string
): Promise<Organization | null> {
  try {
    const db = getDatabase();

    const result = await db.query(
      `
      SELECT id, name, image_url, created_by, created_at
      FROM organizations
      WHERE id = $1
    `,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  } catch (error) {
    handleDatabaseError(error, 'get organization by id');
    return null;
  }
}

// Get all user IDs in an organization
async function getOrganizationMemberIds(
  organizationId: string
): Promise<string[]> {
  try {
    const db = getDatabase();

    const result = await db.query(
      `
      SELECT user_id 
      FROM organization_memberships 
      WHERE organization_id = $1
    `,
      [organizationId]
    );

    return result.rows.map(row => row.user_id);
  } catch (error) {
    handleDatabaseError(error, 'get organization member ids');
    return [];
  }
}

export const organizationsDb = {
  getUserOrganizations,
  getOrganizationMembers,
  getUserRoleInOrganization,
  getOrganizationById,
  getOrganizationMemberIds,
} as const;

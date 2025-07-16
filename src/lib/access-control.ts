import { getDatabase } from './db';

/**
 * Simple access control utilities
 *
 * Just checks:
 * 1. Is user authenticated?
 * 2. Do they own the resource they're trying to access?
 */

// Basic auth check
export function requireAuth(userId: string | null | undefined): string {
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

// Check if user owns a run
export async function checkRunOwnership(
  runId: string,
  userId: string
): Promise<void> {
  const db = getDatabase();
  const result = await db.query('SELECT user_id FROM runs WHERE id = $1', [
    runId,
  ]);

  if (result.rows.length === 0) {
    throw new Error('Run not found');
  }

  if (result.rows[0].user_id !== userId) {
    throw new Error('Access denied');
  }
}

// Check if user owns a notification
export async function checkNotificationOwnership(
  notificationId: string,
  userId: string
): Promise<void> {
  const db = getDatabase();
  const result = await db.query(
    'SELECT user_id FROM notifications WHERE id = $1',
    [notificationId]
  );

  if (result.rows.length === 0) {
    throw new Error('Notification not found');
  }

  if (result.rows[0].user_id !== userId) {
    throw new Error('Access denied');
  }
}

// For preferences, just check if the user is trying to update their own preferences
export function checkPreferencesOwnership(
  targetUserId: string,
  currentUserId: string
): void {
  if (targetUserId !== currentUserId) {
    throw new Error('Access denied - can only update your own preferences');
  }
}

// Helper to create error responses
export function createErrorResponse(
  error: Error,
  statusCode: number = 500
): Response {
  let status = statusCode;
  let message = error.message;

  if (message.includes('Authentication required')) {
    status = 401;
  } else if (
    message.includes('Access denied') ||
    message.includes('not found')
  ) {
    status = 403;
  }

  return new Response(
    JSON.stringify({
      error: message,
      type: 'access_error',
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

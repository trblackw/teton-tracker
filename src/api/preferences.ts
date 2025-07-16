import {
  checkPreferencesOwnership,
  createErrorResponse,
  requireAuth,
} from '../lib/access-control';
import { getUserPreferences, saveUserPreferences } from '../lib/db/preferences';
import { type UserPreferences } from '../lib/schema';

// GET /api/preferences
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    // Check auth
    const authUserId = requireAuth(userId);

    // Get preferences (only returns user's own preferences anyway)
    const preferences = await getUserPreferences(authUserId);

    return new Response(JSON.stringify(preferences), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Unknown error')
    );
  }
}

// PUT /api/preferences
export async function PUT(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { preferencesData, userId } = body as {
      preferencesData: Partial<UserPreferences>;
      userId: string;
    };

    // Check auth
    const authUserId = requireAuth(userId);

    // Simple check: can only update your own preferences
    checkPreferencesOwnership(userId, authUserId);

    // Save preferences
    const preferences = await saveUserPreferences(preferencesData, authUserId);

    return new Response(JSON.stringify(preferences), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Unknown error')
    );
  }
}

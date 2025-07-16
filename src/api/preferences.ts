import {
  createAccessControlResponse,
  validateResourceOwnership,
} from '../lib/access-control';
import { getUserPreferences, saveUserPreferences } from '../lib/db/preferences';
import { type UserPreferences } from '../lib/schema';

// GET /api/preferences
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

    // Preferences are user-specific by design - we only return the user's own preferences
    const preferences = await getUserPreferences(userId);

    return new Response(JSON.stringify(preferences), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get preferences' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
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

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // For preferences updates, we check if preferences exist for this user
    // If they exist, we validate ownership; if not, we're creating new ones
    const existingPreferences = await getUserPreferences(userId);

    if (existingPreferences) {
      // Validate that the user owns these preferences before allowing updates
      try {
        await validateResourceOwnership(
          'user_preferences',
          existingPreferences.userId,
          userId
        );
      } catch (error) {
        return createAccessControlResponse(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    // Save/update preferences for the authenticated user
    const preferences = await saveUserPreferences(preferencesData, userId);

    return new Response(JSON.stringify(preferences), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update preferences' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

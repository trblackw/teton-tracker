import { createErrorResponse } from '../lib/access-control';
import { initJSONResponse } from '../lib/api/api-tools';
import { getUserPreferences, saveUserPreferences } from '../lib/db/preferences';
import { type UserPreferences } from '../lib/schema';
import { getCurrentAuthUser } from './auth';

// GET /api/preferences
export async function GET(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    // Get preferences (only returns user's own preferences anyway)
    const preferences = await getUserPreferences(user.id);

    return initJSONResponse(preferences);
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
    // Validate auth and get user from session
    const [user, response] = await getCurrentAuthUser(request);

    if (response && response.status !== 200) {
      return response;
    }

    if (!user) {
      return initJSONResponse({ error: 'Authentication required' }, 401);
    }

    const body = await request.json();
    const { preferencesData } = body as {
      preferencesData: Partial<UserPreferences>;
    };

    // Save preferences for the authenticated user
    const preferences = await saveUserPreferences(preferencesData, user.id);

    return initJSONResponse(preferences);
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Unknown error')
    );
  }
}

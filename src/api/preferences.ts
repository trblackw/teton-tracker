import { generateUserId } from '../lib/db';
import {
  getUserPreferences,
  updateUserPreferences,
  type UpdatePreferencesData,
} from '../lib/db/preferences';

// GET /api/preferences
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || generateUserId();

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
      preferencesData: UpdatePreferencesData;
      userId?: string;
    };

    const preferences = await updateUserPreferences(preferencesData, userId);

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

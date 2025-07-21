/**
 * Authentication API endpoints
 *
 * This handles the temporary password gate for development access.
 * All user authentication is now handled by BetterAuth.
 */

import { initJSONResponse } from '../lib/api/api-tools';

// Validate temporary access password (development gate)
export async function validatePassword(password: string): Promise<boolean> {
  const correctPassword = process.env.TEMP_ENTRY_PASSWORD;

  if (!correctPassword) {
    console.error('TEMP_ENTRY_PASSWORD environment variable not set');
    return false;
  }

  return password === correctPassword;
}

// Simple session storage for temporary password validation (development only)
const tempPasswordSessions = new Set<string>();

// Generate a simple token for temporary password access
function generateTempAccessToken(): string {
  return crypto.randomUUID();
}

// API handler for temporary password validation (development gate)
export const passwordValidationHandler = async (
  request: Request
): Promise<Response> => {
  if (request.method !== 'POST') {
    return initJSONResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { password } = await request.json();

    const isValid = await validatePassword(password);

    if (isValid) {
      const tempAccessToken = generateTempAccessToken();
      tempPasswordSessions.add(tempAccessToken);

      const response = initJSONResponse({
        success: true,
        message: 'Development access granted',
      });

      // Set temporary access cookie (separate from BetterAuth sessions)
      response.headers.set(
        'Set-Cookie',
        `temp_access=${tempAccessToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
      );

      return response;
    } else {
      return initJSONResponse(
        { success: false, error: 'Invalid temporary password' },
        401
      );
    }
  } catch (error) {
    console.error('Temporary password validation error:', error);
    return initJSONResponse(
      { success: false, error: 'An error occurred during password validation' },
      500
    );
  }
};

// API handler for checking temporary access status (development gate)
export const checkAuthHandler = async (request: Request): Promise<Response> => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const cookies = request.headers.get('cookie') || '';
    const tempAccessMatch = cookies.match(/temp_access=([^;]+)/);
    const tempAccessToken = tempAccessMatch ? tempAccessMatch[1] : null;

    const hasTemporaryAccess = tempAccessToken
      ? tempPasswordSessions.has(tempAccessToken)
      : false;

    return initJSONResponse({ authenticated: hasTemporaryAccess });
  } catch (error) {
    console.error('Temporary access check error:', error);
    return initJSONResponse({ authenticated: false }, 500);
  }
};

// API handler for temporary access logout (development gate)
export const logoutHandler = async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const cookies = request.headers.get('cookie') || '';
    const tempAccessMatch = cookies.match(/temp_access=([^;]+)/);
    const tempAccessToken = tempAccessMatch ? tempAccessMatch[1] : null;

    if (tempAccessToken) {
      tempPasswordSessions.delete(tempAccessToken);
    }

    const response = initJSONResponse({
      success: true,
      message: 'Temporary access revoked',
    });

    // Clear temporary access cookie
    response.headers.set(
      'Set-Cookie',
      'temp_access=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    );

    return response;
  } catch (error) {
    console.error('Temporary access logout error:', error);
    return initJSONResponse(
      { success: false, error: 'An error occurred during logout' },
      500
    );
  }
};

/**
 * Authentication API endpoints
 *
 * Note: User management is now handled entirely by Clerk.
 * This file only contains temporary password protection for development.
 */

// Session storage for authenticated sessions (in production, use Redis or database)
const authenticatedSessions = new Set<string>();

// Generate a secure session token
function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + Date.now();
}

// Validate temporary access password
export async function validatePassword(password: string): Promise<boolean> {
  const correctPassword = process.env.TEMP_ENTRY_PASSWORD;

  if (!correctPassword) {
    console.error('TEMP_ENTRY_PASSWORD environment variable not set');
    return false;
  }

  return password === correctPassword;
}

// API handler for password validation
export const passwordValidationHandler = async (
  request: Request
): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { password } = await request.json();

    const isValid = await validatePassword(password);

    if (isValid) {
      const sessionToken = generateSessionToken();
      authenticatedSessions.add(sessionToken);

      const response = new Response(
        JSON.stringify({ success: true, message: 'Access granted' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Set session cookie
      response.headers.set(
        'Set-Cookie',
        `session=${sessionToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
      );

      return response;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Password validation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred during authentication',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// API handler for checking authentication status
export const checkAuthHandler = async (request: Request): Promise<Response> => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const cookies = request.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    const authenticated = sessionToken
      ? authenticatedSessions.has(sessionToken)
      : false;

    return new Response(JSON.stringify({ authenticated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// API handler for logout
export const logoutHandler = async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const cookies = request.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;

    if (sessionToken) {
      authenticatedSessions.delete(sessionToken);
    }

    const response = new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Clear session cookie
    response.headers.set(
      'Set-Cookie',
      'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    );

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred during logout',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

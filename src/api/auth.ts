/**
 * Authentication API endpoints
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

    if (!password || typeof password !== 'string') {
      return new Response('Invalid password format', { status: 400 });
    }

    const isValid = await validatePassword(password);

    if (isValid) {
      // Generate secure session token
      const sessionToken = generateSessionToken();
      authenticatedSessions.add(sessionToken);

      // Set secure HTTP-only cookie (in production)
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = isProduction
        ? 'HttpOnly; Secure; SameSite=Strict; Max-Age=86400' // 24 hours
        : 'HttpOnly; SameSite=Strict; Max-Age=86400'; // 24 hours

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `teton-auth=${sessionToken}; ${cookieOptions}`,
        },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Password validation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Check if session is authenticated
export const checkAuthHandler = async (request: Request): Promise<Response> => {
  const cookies = request.headers.get('Cookie') || '';
  const authCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('teton-auth='))
    ?.split('=')[1];

  const isAuthenticated = authCookie && authenticatedSessions.has(authCookie);

  return new Response(JSON.stringify({ authenticated: isAuthenticated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Logout handler
export const logoutHandler = async (request: Request): Promise<Response> => {
  const cookies = request.headers.get('Cookie') || '';
  const authCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('teton-auth='))
    ?.split('=')[1];

  if (authCookie) {
    authenticatedSessions.delete(authCookie);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'teton-auth=; HttpOnly; Max-Age=0; Path=/',
    },
  });
};

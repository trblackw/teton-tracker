/**
 * Authentication API endpoints
 */

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
      return new Response('OK', { status: 200 });
    } else {
      return new Response('Invalid password', { status: 401 });
    }
  } catch (error) {
    console.error('Password validation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

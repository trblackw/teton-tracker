/**
 * Authentication API endpoints
 */

import { updateUser } from '../lib/db';

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

// Verify Clerk webhook signature
async function verifyClerkWebhook(request: Request): Promise<boolean> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn(
      '⚠️ CLERK_WEBHOOK_SECRET not configured - webhook verification disabled'
    );
    // In development, you might want to proceed without verification
    // In production, this should return false
    return process.env.NODE_ENV !== 'production';
  }

  const signature = request.headers.get('svix-signature');
  if (!signature) {
    console.error('❌ Missing webhook signature');
    return false;
  }

  try {
    const body = await request.clone().text();
    const timestamp = request.headers.get('svix-timestamp');
    const id = request.headers.get('svix-id');

    if (!timestamp || !id) {
      console.error('❌ Missing required webhook headers');
      return false;
    }

    // Create the payload that was signed
    const payload = `${id}.${timestamp}.${body}`;

    // Create HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature_bytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    const expected_signature = btoa(
      String.fromCharCode(...Array.from(new Uint8Array(signature_bytes)))
    );

    // Extract the signature from the header (format: "v1,signature1 v1,signature2")
    const signatures = signature.split(' ');
    for (const sig of signatures) {
      const [version, sig_value] = sig.split(',');
      if (version === 'v1' && sig_value === expected_signature) {
        return true;
      }
    }

    console.error('❌ Webhook signature verification failed');
    return false;
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
}

// Clerk webhook handler for user events
export const clerkWebhookHandler = async (
  request: Request
): Promise<Response> => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify webhook signature
  const isVerified = await verifyClerkWebhook(request);
  if (!isVerified) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, data } = body;

    console.log('📨 Clerk webhook received:', type);

    if (type === 'user.created') {
      // New user signed up - sync their data immediately
      const userId = data.id;
      const email = data.email_addresses?.[0]?.email_address;
      const phoneNumber = data.phone_numbers?.[0]?.phone_number;
      const firstName = data.first_name;
      const lastName = data.last_name;

      // Construct full name from first and last name
      const name = [firstName, lastName].filter(Boolean).join(' ') || undefined;

      console.log(`👤 New user signed up: ${userId}`);

      const userData: {
        name?: string;
        email?: string;
        phoneNumber?: string;
      } = {};

      if (name) {
        userData.name = name;
      }

      if (email) {
        userData.email = email;
      }

      if (phoneNumber) {
        userData.phoneNumber = phoneNumber;
      }

      const updatedUser = await updateUser(userId, userData);

      if (updatedUser) {
        console.log(`✅ Synced new user data for ${userId}:`, {
          name: userData.name || '(none)',
          email: userData.email || '(none)',
          phoneNumber: userData.phoneNumber || '(none)',
        });
      }
    } else if (type === 'user.updated') {
      // User updated their profile - sync changes
      const userId = data.id;
      const email = data.email_addresses?.[0]?.email_address;
      const phoneNumber = data.phone_numbers?.[0]?.phone_number;
      const firstName = data.first_name;
      const lastName = data.last_name;

      // Construct full name from first and last name
      const name = [firstName, lastName].filter(Boolean).join(' ') || undefined;

      console.log(`👤 User updated profile: ${userId}`);

      const userData: {
        name?: string;
        email?: string;
        phoneNumber?: string;
      } = {};

      if (name) {
        userData.name = name;
      }

      if (email) {
        userData.email = email;
      }

      if (phoneNumber) {
        userData.phoneNumber = phoneNumber;
      }

      const updatedUser = await updateUser(userId, userData);

      if (updatedUser) {
        console.log(`✅ Updated user data for ${userId}:`, {
          name: userData.name || '(none)',
          email: userData.email || '(none)',
          phoneNumber: userData.phoneNumber || '(none)',
        });
      }
    } else if (type === 'user.deleted') {
      // User deleted their account - handle cleanup
      const userId = data.id;
      console.log(`🗑️ User deleted account: ${userId}`);

      // You might want to implement user deletion logic here
      // For now, we'll just log it
      console.log(
        `ℹ️ User deletion logged - implement cleanup logic if needed`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

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

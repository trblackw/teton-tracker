// GET /api/config
export async function GET(request: Request): Promise<Response> {
  try {
    // Get the Clerk publishable key from environment variables
    const clerkPublishableKey =
      process.env.VITE_CLERK_PUBLISHABLE_KEY ||
      process.env.CLERK_PUBLISHABLE_KEY;

    if (!clerkPublishableKey) {
      console.error('Missing Clerk publishable key in environment variables');
      return new Response(
        JSON.stringify({
          error: 'Missing Clerk publishable key configuration',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const config = {
      clerkPublishableKey,
    };

    return new Response(JSON.stringify(config), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Failed to get config:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to load configuration',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

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

    // Get API keys for flight and mapping services
    const aviationStackApiKey = process.env.AVIATIONSTACK_API_KEY;
    const tomtomApiKey = process.env.TOMTOM_API_KEY;
    const environment = process.env.NODE_ENV || 'development';

    const config = {
      // Clerk authentication
      clerkPublishableKey,

      // Flight service configuration (AviationStack API)
      hasApiKey: !!aviationStackApiKey,
      apiKey: aviationStackApiKey || null,
      environment,

      // TomTom service configuration
      tomtomKey: tomtomApiKey || null,
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

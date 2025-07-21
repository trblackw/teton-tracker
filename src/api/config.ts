import { getBetterAuthUrl, initJSONResponse } from '../lib/api/api-tools';

// GET /api/config
export async function GET(request: Request): Promise<Response> {
  try {
    // Get API keys for flight and mapping services
    const aviationStackApiKey = process.env.AVIATIONSTACK_API_KEY;
    const tomtomApiKey = process.env.TOMTOM_API_KEY;
    const environment = process.env.NODE_ENV || 'development';

    // BetterAuth configuration (if frontend needs any specific config)
    const betterAuthUrl = getBetterAuthUrl();

    const config = {
      // Authentication configuration
      authUrl: betterAuthUrl,
      environment,

      // Flight service configuration (AviationStack API)
      hasApiKey: !!aviationStackApiKey,
      apiKey: aviationStackApiKey || null,

      // TomTom service configuration
      tomtomKey: tomtomApiKey || null,
    };

    return initJSONResponse(config, 200, {
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    });
  } catch (error) {
    console.error('Failed to get config:', error);
    return initJSONResponse({ error: 'Failed to load configuration' }, 500);
  }
}

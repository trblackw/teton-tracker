#!/usr/bin/env bun
import { serve } from 'bun';
import * as configApi from './api/config';
import * as notificationsApi from './api/notifications';
import * as organizationsApi from './api/organizations';
import * as preferencesApi from './api/preferences';
import * as reportTemplatesApi from './api/report-templates';
import * as runsApi from './api/runs';
import * as seedApi from './api/seed';
import { initJSONResponse } from './lib/api/api-tools';
import { auth } from './lib/auth';
import { initializeDatabase } from './lib/db';

// Initialize database
initializeDatabase();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
} as const;

// Generic API routes
const genericApiRoutes = {
  '/api/config': configApi,
  '/api/notifications': notificationsApi,
  '/api/organizations': organizationsApi,
  '/api/preferences': preferencesApi,
  '/api/report-templates': reportTemplatesApi,
  '/api/runs': runsApi,
  '/api/seed': seedApi,
} as const;

// Generic API route handler
async function handleApiRoute(
  request: Request,
  apiModule: any
): Promise<Response> {
  const method = request.method;
  const handler = apiModule[method];

  if (typeof handler === 'function') {
    try {
      const response = await handler(request);
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
      return response;
    } catch (error) {
      console.error(`${method} ${request.url} error:`, error);
      return new Response(
        JSON.stringify({ error: `Failed to ${method.toLowerCase()} resource` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Create the server
const server = serve({
  port: process.env.API_PORT || 3001,
  async fetch(request) {
    const url = new URL(request.url);

    // Handle OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // Handle better-auth routes (all /api/auth/* routes)
      if (url.pathname.startsWith('/api/auth/')) {
        try {
          const response = await auth.handler(request);

          // Add CORS headers to better-auth responses
          const headers = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            headers.set(key, value);
          });

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        } catch (error) {
          console.error('🚨 Better-auth error:', error);
          console.error(
            '🚨 Error stack:',
            error instanceof Error ? error.stack : 'No stack trace'
          );
          return initJSONResponse(
            {
              error: 'Authentication failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
            corsHeaders
          );
        }
      }

      // Check for special sub-path routes
      if (url.pathname === '/api/notifications/stats') {
        if (
          request.method === 'GET' &&
          typeof notificationsApi.getStats === 'function'
        ) {
          const response = await notificationsApi.getStats(request);
          response.headers.set('Access-Control-Allow-Origin', '*');
          response.headers.set(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS'
          );
          response.headers.set(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization'
          );
          return response;
        } else {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (url.pathname === '/api/runs/organization') {
        if (
          request.method === 'GET' &&
          typeof runsApi.getOrganizationRuns === 'function'
        ) {
          const response = await runsApi.getOrganizationRuns(request);
          response.headers.set('Access-Control-Allow-Origin', '*');
          response.headers.set(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS'
          );
          response.headers.set(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization'
          );
          return response;
        } else {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Check for organization sub-routes
      const orgMembersMatch = url.pathname.match(
        /^\/api\/organizations\/([^\/]+)\/members$/
      );
      if (orgMembersMatch && request.method === 'GET') {
        (request as any).params = { orgId: orgMembersMatch[1] };
        const response = await organizationsApi.getOrganizationMembers(request);
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, OPTIONS'
        );
        response.headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization'
        );
        return response;
      }

      const orgUserRoleMatch = url.pathname.match(
        /^\/api\/organizations\/([^\/]+)\/user-role$/
      );
      if (orgUserRoleMatch && request.method === 'GET') {
        (request as any).params = { orgId: orgUserRoleMatch[1] };
        const response = await organizationsApi.getUserRole(request);
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, OPTIONS'
        );
        response.headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization'
        );
        return response;
      }

      if (
        url.pathname === '/api/organizations/check-permissions' &&
        request.method === 'GET'
      ) {
        const response = await organizationsApi.checkPermissions(request);
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, OPTIONS'
        );
        response.headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization'
        );
        return response;
      }

      // Check for standard API routes
      const apiModule =
        genericApiRoutes[url.pathname as keyof typeof genericApiRoutes];
      if (apiModule) {
        // Special handling for seed endpoint (development only)
        if (
          url.pathname === '/api/seed' &&
          process.env.NODE_ENV === 'production'
        ) {
          return new Response(
            JSON.stringify({ error: 'Not available in production' }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return await handleApiRoute(request, apiModule);
      }

      // No matching route found
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Server error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
});

console.log(`🌐 API server running at http://localhost:${server.port}`);
console.log('📊 Database initialized and API routes available');
console.log(
  `🔑 AviationStack API key: ${process.env.AVIATIONSTACK_API_KEY ? '✅ Configured' : '❌ Not found'}`
);

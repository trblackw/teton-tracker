#!/usr/bin/env bun
import { serve } from 'bun';
import * as authApi from './api/auth';
import * as notificationsApi from './api/notifications';
import * as preferencesApi from './api/preferences';
import * as runsApi from './api/runs';
import { seedDataForUser } from './api/seed';
import { initializeDatabase } from './lib/db';

// Initialize database
initializeDatabase();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
      // Config endpoint for frontend environment variables
      if (url.pathname === '/api/config') {
        const config = {
          clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
          environment: process.env.NODE_ENV || 'development',
        };

        return new Response(JSON.stringify(config), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      // Seed endpoint for development data generation
      if (url.pathname === '/api/seed') {
        // Only allow in development mode
        if (process.env.NODE_ENV === 'production') {
          return new Response(
            JSON.stringify({ error: 'Not available in production' }),
            {
              status: 403,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        if (request.method === 'POST') {
          try {
            const body = await request.json();
            const { userId } = body as { userId: string };

            if (!userId) {
              return new Response(
                JSON.stringify({ error: 'User ID is required' }),
                {
                  status: 400,
                  headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                  },
                }
              );
            }

            const result = await seedDataForUser(userId);

            return new Response(JSON.stringify(result), {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            });
          } catch (error) {
            console.error('Seed endpoint error:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to seed data' }),
              {
                status: 500,
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json',
                },
              }
            );
          }
        } else {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          });
        }
      }

      // Auth endpoint for password validation
      if (url.pathname === '/api/auth/validate-password') {
        const response = await authApi.passwordValidationHandler(request);

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // Auth session check endpoint
      if (url.pathname === '/api/auth/check') {
        const response = await authApi.checkAuthHandler(request);

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // Logout endpoint
      if (url.pathname === '/api/auth/logout') {
        const response = await authApi.logoutHandler(request);

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // API routes only
      if (url.pathname === '/api/runs') {
        const response =
          request.method === 'GET'
            ? await runsApi.GET(request)
            : request.method === 'POST'
              ? await runsApi.POST(request)
              : new Response('Method not allowed', { status: 405 });

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      if (url.pathname === '/api/preferences') {
        const response =
          request.method === 'GET'
            ? await preferencesApi.GET(request)
            : request.method === 'PUT'
              ? await preferencesApi.PUT(request)
              : new Response('Method not allowed', { status: 405 });

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // Notifications API routes
      if (url.pathname === '/api/notifications') {
        const response =
          request.method === 'GET'
            ? await notificationsApi.GET(request)
            : request.method === 'POST'
              ? await notificationsApi.POST(request)
              : request.method === 'PUT'
                ? await notificationsApi.PUT(request)
                : request.method === 'DELETE'
                  ? await notificationsApi.DELETE(request)
                  : new Response('Method not allowed', { status: 405 });

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // Notifications stats endpoint
      if (url.pathname === '/api/notifications/stats') {
        const response =
          request.method === 'GET'
            ? await notificationsApi.getStats(request)
            : new Response('Method not allowed', { status: 405 });

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      // Handle parameterized routes
      const runIdMatch = url.pathname.match(/^\/api\/runs\/([^\/]+)$/);
      if (runIdMatch && request.method === 'DELETE') {
        (request as any).params = { id: runIdMatch[1] };
        const response = await runsApi.DELETE(request);

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      const statusMatch = url.pathname.match(/^\/api\/runs\/([^\/]+)\/status$/);
      if (statusMatch && request.method === 'PUT') {
        (request as any).params = { id: statusMatch[1] };
        const response = await runsApi.PUT(request);

        // Add CORS headers to response
        const headers = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return new Response('API endpoint not found', {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Error fetching:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
});

console.log(`🌐 API server running at http://localhost:${server.port}`);
console.log('📊 Database initialized and API routes available');
console.log(
  `🔑 AviationStack API key: ${process.env.AVIATIONSTACK_API_KEY ? '✅ Configured' : '❌ Not found'}`
);

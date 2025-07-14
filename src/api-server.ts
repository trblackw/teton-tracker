#!/usr/bin/env bun
import * as authApi from './api/auth';
import * as notificationsApi from './api/notifications';
import * as preferencesApi from './api/preferences';
import * as runsApi from './api/runs';

// Configuration endpoint
async function handleConfigRequest(request: Request): Promise<Response> {
  const aviationStackAPIKey = process.env.AVIATIONSTACK_API_KEY;
  const tomtomAPIKey = process.env.TOMTOM_API_KEY;

  const config = {
    hasApiKey: !!aviationStackAPIKey,
    apiKey: aviationStackAPIKey || null,
    tomtomKey: tomtomAPIKey || null,
    environment: process.env.NODE_ENV || 'development',
  };

  return new Response(JSON.stringify(config), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// API-only server
async function startApiServer() {
  const server = Bun.serve({
    port: process.env.API_PORT || 3001,

    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      // Add CORS headers for development
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Configuration endpoint
      if (url.pathname === '/api/config') {
        const response = await handleConfigRequest(request);

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
    },
  });

  console.log(`🌐 API server running at http://localhost:${server.port}`);
  console.log('📊 Database initialized and API routes available');
  console.log(
    `🔑 AviationStack API key: ${process.env.AVIATIONSTACK_API_KEY ? '✅ Configured' : '❌ Not found'}`
  );
}

startApiServer().catch(console.error);

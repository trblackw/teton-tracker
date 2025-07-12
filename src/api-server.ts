#!/usr/bin/env bun
import * as preferencesApi from './api/preferences';
import * as runsApi from './api/runs';
import { initializeSchema } from './lib/db';

// Initialize database on server startup
async function initializeServer() {
  try {
    console.log('🚀 Initializing Teton Tracker API server...');
    await initializeSchema();
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// API-only server
async function startApiServer() {
  await initializeServer();

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
}

startApiServer().catch(console.error);

#!/usr/bin/env bun
import * as preferencesApi from './api/preferences';
import * as runsApi from './api/runs';
import { initializeSchema } from './lib/db';

// Initialize database on server startup
async function initializeServer() {
  try {
    console.log('🚀 Initializing Teton Tracker development server...');
    await initializeSchema();
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Start minimal development server - let Bun handle everything else
async function startDevServer() {
  await initializeServer();

  const server = Bun.serve({
    port: process.env.PORT || 3000,

    async fetch(request: Request): Promise<Response | undefined> {
      const url = new URL(request.url);

      // Only handle API routes - let Bun handle everything else automatically
      if (url.pathname.startsWith('/api/')) {
        // Simple routing for API endpoints
        if (url.pathname === '/api/runs') {
          return request.method === 'GET'
            ? runsApi.GET(request)
            : request.method === 'POST'
              ? runsApi.POST(request)
              : new Response('Method not allowed', { status: 405 });
        }

        if (url.pathname === '/api/preferences') {
          return request.method === 'GET'
            ? preferencesApi.GET(request)
            : request.method === 'PUT'
              ? preferencesApi.PUT(request)
              : new Response('Method not allowed', { status: 405 });
        }

        // Handle parameterized routes
        const runIdMatch = url.pathname.match(/^\/api\/runs\/([^\/]+)$/);
        if (runIdMatch && request.method === 'DELETE') {
          (request as any).params = { id: runIdMatch[1] };
          return runsApi.DELETE(request);
        }

        const statusMatch = url.pathname.match(
          /^\/api\/runs\/([^\/]+)\/status$/
        );
        if (statusMatch && request.method === 'PUT') {
          (request as any).params = { id: statusMatch[1] };
          return runsApi.PUT(request);
        }

        return new Response('API endpoint not found', { status: 404 });
      }

      // Serve index.html for root and SPA routes
      if (
        url.pathname === '/' ||
        (!url.pathname.includes('.') && !url.pathname.startsWith('/api'))
      ) {
        return new Response(Bun.file('./index.html'));
      }

      // For static files, let Bun handle them by serving directly
      const filePath = url.pathname.startsWith('/')
        ? `.${url.pathname}`
        : url.pathname;
      const file = Bun.file(filePath);

      // Check if file exists
      if (await file.exists()) {
        return new Response(file);
      }

      // File not found
      return new Response('Not Found', { status: 404 });
    },
  } as any);

  console.log(
    `🌐 Development server running at http://localhost:${server.port}`
  );
  console.log('📊 Database initialized and API routes available');
  console.log('🔥 Bun handling static files, bundling, and CSS automatically');
}

startDevServer().catch(console.error);

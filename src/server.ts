#!/usr/bin/env bun
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as configApi from './api/config';
import * as notificationsApi from './api/notifications';
import * as organizationsApi from './api/organizations';
import * as preferencesApi from './api/preferences';
import * as reportTemplatesApi from './api/report-templates';
import * as runsApi from './api/runs';
import * as seedApi from './api/seed';
import { auth } from './lib/auth';

// Server configuration interface
export interface ServerConfig {
  corsOrigin: string | string[] | ((origin: string) => string | null);
  isDevelopment: boolean;
  hostname?: string;
}

function isAuthRoute(path: string) {
  return path.startsWith('/api/auth/');
}

// Create and configure Hono app
export function createApp(config: ServerConfig) {
  const app = new Hono();

  // BetterAuth integration - with manual CORS handling
  app.all('/api/auth/*', async c => {
    console.log('🔐 BetterAuth handling:', c.req.method, c.req.path);

    // Handle CORS preflight for auth routes
    if (c.req.method === 'OPTIONS') {
      return c.json(null, 200, {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Allow-Credentials': 'true',
      });
    }

    // Process the auth request
    const response = await auth.handler(c.req.raw);

    // Add CORS headers to the response
    response.headers.set(
      'Access-Control-Allow-Origin',
      'http://localhost:3000'
    );
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  });

  // Enhanced CORS configuration
  app.use(
    '*',
    cors({
      origin: 'http://localhost:3000', // Specific origin for credentials
      credentials: true, // Allow credentials (cookies)
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    })
  );

  // API Routes - Clean and declarative!
  app.get('/api/config', async c => configApi.GET(c.req.raw));

  app.get('/api/organizations', async c => organizationsApi.GET(c.req.raw));
  app.get('/api/organizations/:orgId/members', async c => {
    const request = c.req.raw;
    (request as any).params = { orgId: c.req.param('orgId') };
    return organizationsApi.getOrganizationMembers(request);
  });
  app.get('/api/organizations/:orgId/user-role', async c => {
    const request = c.req.raw;
    (request as any).params = { orgId: c.req.param('orgId') };
    return organizationsApi.getUserRole(request);
  });

  app.get('/api/runs', async c => runsApi.GET(c.req.raw));
  app.post('/api/runs', async c => runsApi.POST(c.req.raw));
  app.delete('/api/runs/:id', async c => {
    const request = c.req.raw;
    (request as any).params = { id: c.req.param('id') };
    return runsApi.DELETE(request);
  });
  app.put('/api/runs/:id/status', async c => {
    const request = c.req.raw;
    (request as any).params = { id: c.req.param('id') };
    return runsApi.PUT(request);
  });
  app.get('/api/runs/organization', async c =>
    runsApi.getOrganizationRuns(c.req.raw)
  );

  app.get('/api/preferences', async c => preferencesApi.GET(c.req.raw));
  app.put('/api/preferences', async c => preferencesApi.PUT(c.req.raw));

  app.get('/api/report-templates', async c =>
    reportTemplatesApi.GET(c.req.raw)
  );
  app.post('/api/report-templates', async c =>
    reportTemplatesApi.POST(c.req.raw)
  );
  app.put('/api/report-templates', async c =>
    reportTemplatesApi.PUT(c.req.raw)
  );
  app.delete('/api/report-templates', async c =>
    reportTemplatesApi.DELETE(c.req.raw)
  );

  app.get('/api/notifications', async c => notificationsApi.GET(c.req.raw));
  app.post('/api/notifications', async c => notificationsApi.POST(c.req.raw));
  app.put('/api/notifications', async c => notificationsApi.PUT(c.req.raw));
  app.delete('/api/notifications', async c =>
    notificationsApi.DELETE(c.req.raw)
  );
  app.get('/api/notifications/stats', async c =>
    notificationsApi.getStats(c.req.raw)
  );

  // Development-only routes
  if (config.isDevelopment) {
    app.post('/api/seed', async c => seedApi.POST(c.req.raw));
    app.delete('/api/seed', async c => seedApi.DELETE(c.req.raw));
  }

  // 404 handler for unknown API routes
  app.all('/api/*', c => c.json({ error: 'API endpoint not found' }, 404));

  return app;
}

// Create server with shared logic
export function createServer(config: ServerConfig) {
  const app = createApp(config);

  const serverOptions: any = {
    port: process.env.PORT || 3000,
    hostname: config.hostname,
    fetch: async (request: Request) => {
      const url = new URL(request.url);

      // Handle API routes through Hono
      if (url.pathname.startsWith('/api/')) {
        return app.fetch(request);
      }

      // In development: let Bun handle everything else (hot reload, compilation, etc.)
      if (config.isDevelopment) {
        // Don't handle non-API routes - let Bun's built-in dev server handle them
        return new Response('Not handled by custom server', { status: 404 });
      }

      // In production: serve from built dist folder
      const filePath =
        url.pathname === '/' ? './dist/index.html' : `./dist${url.pathname}`;

      try {
        const file = Bun.file(filePath);
        const exists = await file.exists();

        if (exists) {
          return new Response(file);
        } else {
          // SPA fallback - serve index.html for client-side routing
          const indexFile = Bun.file('./dist/index.html');
          return new Response(indexFile);
        }
      } catch (error) {
        console.error('Error serving file:', error);
        return new Response(
          JSON.stringify({ error: 'Internal Server Error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    },
  };

  // In development, enable Bun's built-in dev server features
  if (config.isDevelopment) {
    serverOptions.development = true;
  }

  return Bun.serve(serverOptions);
}

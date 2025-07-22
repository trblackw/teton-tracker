#!/usr/bin/env bun
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import * as configApi from './api/config';
import * as notificationsApi from './api/notifications';
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

// Type definitions for context variables
type Variables = {
  organizationId: string;
};

// Custom middleware to extract and validate organizationId from route parameters
const organizationMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const organizationId = c.req.param('organizationId');

    if (!organizationId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    // Set organizationId in context for downstream handlers
    c.set('organizationId', organizationId);

    await next();
  }
);

// Helper function to create request with organizationId and additional params
function createRequestWithOrgContext(
  c: any,
  additionalParams: Record<string, string> = {}
) {
  const request = new Request(c.req.raw.url, {
    method: c.req.raw.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  });

  // Add organizationId and any additional params for compatibility with existing API handlers
  (request as any).params = {
    organizationId: c.get('organizationId'),
    ...additionalParams,
  };

  return request;
}

// Create and configure Hono app
export function createApp(config: ServerConfig) {
  const app = new Hono<{ Variables: Variables }>();

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

  // Global API Routes (not organization-scoped)
  app.get('/api/config', async c => configApi.GET(c.req.raw));

  // Apply organization middleware to all organization-scoped routes
  app.use('/api/organizations/:organizationId/*', organizationMiddleware);

  // Organization-scoped API Routes - now using context instead of manual param injection
  app.get('/api/organizations/:organizationId/runs', async c => {
    return runsApi.GET(createRequestWithOrgContext(c));
  });

  app.post('/api/organizations/:organizationId/runs', async c => {
    return runsApi.POST(createRequestWithOrgContext(c));
  });

  app.delete('/api/organizations/:organizationId/runs/:id', async c => {
    return runsApi.DELETE(
      createRequestWithOrgContext(c, { id: c.req.param('id') })
    );
  });

  app.put('/api/organizations/:organizationId/runs/:id/status', async c => {
    return runsApi.PUT(
      createRequestWithOrgContext(c, { id: c.req.param('id') })
    );
  });

  app.get('/api/organizations/:organizationId/preferences', async c => {
    return preferencesApi.GET(createRequestWithOrgContext(c));
  });

  app.put('/api/organizations/:organizationId/preferences', async c => {
    return preferencesApi.PUT(createRequestWithOrgContext(c));
  });

  app.get('/api/organizations/:organizationId/report-templates', async c => {
    return reportTemplatesApi.GET(createRequestWithOrgContext(c));
  });

  app.post('/api/organizations/:organizationId/report-templates', async c => {
    return reportTemplatesApi.POST(createRequestWithOrgContext(c));
  });

  app.put('/api/organizations/:organizationId/report-templates', async c => {
    return reportTemplatesApi.PUT(createRequestWithOrgContext(c));
  });

  app.delete('/api/organizations/:organizationId/report-templates', async c => {
    return reportTemplatesApi.DELETE(createRequestWithOrgContext(c));
  });

  app.get('/api/organizations/:organizationId/notifications', async c => {
    return notificationsApi.GET(createRequestWithOrgContext(c));
  });

  app.post('/api/organizations/:organizationId/notifications', async c => {
    return notificationsApi.POST(createRequestWithOrgContext(c));
  });

  app.put('/api/organizations/:organizationId/notifications', async c => {
    return notificationsApi.PUT(createRequestWithOrgContext(c));
  });

  app.delete('/api/organizations/:organizationId/notifications', async c => {
    return notificationsApi.DELETE(createRequestWithOrgContext(c));
  });

  app.get('/api/organizations/:organizationId/notifications/stats', async c => {
    return notificationsApi.getStats(createRequestWithOrgContext(c));
  });

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

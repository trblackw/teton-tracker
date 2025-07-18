#!/usr/bin/env bun
import * as authApi from './api/auth';
import * as configApi from './api/config';
import * as notificationsApi from './api/notifications';
import * as preferencesApi from './api/preferences';
import * as runsApi from './api/runs';

// API route handlers
const apiRoutes = {
  '/api/config': {
    GET: configApi.GET,
  },
  '/api/auth/validate-password': {
    POST: authApi.passwordValidationHandler,
  },
  '/api/auth/check': {
    GET: authApi.checkAuthHandler,
  },
  '/api/auth/logout': {
    POST: authApi.logoutHandler,
  },
  '/api/runs': {
    GET: runsApi.GET,
    POST: runsApi.POST,
  },
  '/api/runs/organization': {
    GET: runsApi.getOrganizationRuns,
  },
  '/api/runs/:id/status': {
    PUT: runsApi.PUT,
  },
  '/api/runs/:id': {
    DELETE: runsApi.DELETE,
  },
  '/api/preferences': {
    GET: preferencesApi.GET,
    PUT: preferencesApi.PUT,
  },
  '/api/notifications': {
    GET: notificationsApi.GET,
    POST: notificationsApi.POST,
    PUT: notificationsApi.PUT,
    DELETE: notificationsApi.DELETE,
  },
  '/api/notifications/stats': {
    GET: notificationsApi.getStats,
  },
};

// Route matcher for parameterized routes
function matchRoute(pathname: string): {
  handler?: any;
  params?: Record<string, string>;
} {
  // Exact matches first
  for (const [route, methods] of Object.entries(apiRoutes)) {
    if (pathname === route && methods) {
      return { handler: methods };
    }
  }

  // Parameterized routes
  if (pathname.startsWith('/api/runs/') && pathname.endsWith('/status')) {
    const id = pathname.split('/')[3];
    return {
      handler: apiRoutes['/api/runs/:id/status'],
      params: { id },
    };
  }

  if (pathname.startsWith('/api/runs/') && pathname.split('/').length === 4) {
    const id = pathname.split('/')[3];
    return {
      handler: apiRoutes['/api/runs/:id'],
      params: { id },
    };
  }

  return {};
}

// Start server
async function startServer() {
  const server = Bun.serve({
    port: process.env.PORT || 3000,
    hostname: '0.0.0.0', // Listen on all interfaces for Railway

    async fetch(request) {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Temporarily redirect non-www to www (until main domain DNS is ready)
      // if (url.hostname === 'tetontracker.com') {
      //   return new Response(null, {
      //     status: 301,
      //     headers: {
      //       Location: `https://www.tetontracker.com${url.pathname}${url.search}`,
      //     },
      //   });
      // }

      // Handle API routes
      if (pathname.startsWith('/api/')) {
        const { handler, params } = matchRoute(pathname);

        if (handler && typeof handler === 'object') {
          const methodHandler = handler[request.method as keyof typeof handler];
          if (methodHandler) {
            // Add params to request if needed
            if (params) {
              (request as any).params = params;
            }
            return await methodHandler(request);
          }
        }

        return new Response('Not Found', { status: 404 });
      }

      // Serve static files and SPA routes
      const filePath =
        pathname === '/' ? './dist/index.html' : `./dist${pathname}`;

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
        return new Response('Internal Server Error', { status: 500 });
      }
    },

    development: process.env.NODE_ENV !== 'production',
  });

  console.log(`🌐 Server running at http://0.0.0.0:${server.port}`);
}

startServer().catch(console.error);

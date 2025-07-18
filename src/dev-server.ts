#!/usr/bin/env bun
import * as configApi from './api/config';
import * as organizationsApi from './api/organizations';
import * as preferencesApi from './api/preferences';
import * as reportTemplatesApi from './api/report-templates';
import * as runsApi from './api/runs';

// Start minimal development server - let Bun handle everything else
async function startDevServer() {
  const server = Bun.serve({
    port: process.env.PORT || 3000,

    async fetch(request: Request): Promise<Response | undefined> {
      const url = new URL(request.url);

      // Only handle API routes - let Bun handle everything else automatically
      if (url.pathname.startsWith('/api/')) {
        // Simple routing for API endpoints
        if (url.pathname === '/api/config') {
          return request.method === 'GET'
            ? configApi.GET(request)
            : new Response('Method not allowed', { status: 405 });
        }

        if (url.pathname === '/api/organizations') {
          return request.method === 'GET'
            ? organizationsApi.GET(request)
            : new Response('Method not allowed', { status: 405 });
        }

        // Handle organization member routes
        const orgMembersMatch = url.pathname.match(
          /^\/api\/organizations\/([^\/]+)\/members$/
        );
        if (orgMembersMatch && request.method === 'GET') {
          (request as any).params = { orgId: orgMembersMatch[1] };
          return organizationsApi.getOrganizationMembers(request);
        }

        if (url.pathname === '/api/runs') {
          return request.method === 'GET'
            ? runsApi.GET(request)
            : request.method === 'POST'
              ? runsApi.POST(request)
              : new Response('Method not allowed', { status: 405 });
        }

        if (url.pathname === '/api/runs/organization') {
          return request.method === 'GET'
            ? runsApi.getOrganizationRuns(request)
            : new Response('Method not allowed', { status: 405 });
        }

        if (url.pathname === '/api/preferences') {
          return request.method === 'GET'
            ? preferencesApi.GET(request)
            : request.method === 'PUT'
              ? preferencesApi.PUT(request)
              : new Response('Method not allowed', { status: 405 });
        }

        if (url.pathname === '/api/report-templates') {
          return request.method === 'GET'
            ? reportTemplatesApi.GET(request)
            : request.method === 'POST'
              ? reportTemplatesApi.POST(request)
              : request.method === 'PUT'
                ? reportTemplatesApi.PUT(request)
                : request.method === 'DELETE'
                  ? reportTemplatesApi.DELETE(request)
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

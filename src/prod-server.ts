#!/usr/bin/env bun
import { serve } from 'bun';

const prodServer = serve({
  port: process.env.PORT || 3000,
  routes: {
    // Serve PWA static files
    '/manifest.json': () => new Response(Bun.file("dist/manifest.json")),
    '/sw.js': () => new Response(Bun.file("dist/sw.js")),
    '/logo.svg': () => new Response(Bun.file("dist/logo.svg")),
    // Serve index.html for all unmatched routes.
    '/*': () => new Response(Bun.file("dist/index.html"), {
      headers: {
        "Content-Type": "text/html",
      },
    }),
  },
});

console.log(`🚀 Production server running at ${prodServer.url}`); 
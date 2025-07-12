import { serve } from 'bun';

const server = serve({
  routes: {
    // Serve PWA static files from public directory
    '/manifest.json': () => new Response(Bun.file("public/manifest.json")),
    '/sw.js': () => new Response(Bun.file("public/sw.js")),
    '/logo.svg': () => new Response(Bun.file("public/logo.svg")),
    '/frontend.css': () => new Response(Bun.file("public/frontend.css"), {
      headers: { "Content-Type": "text/css" }
    }),
    '/frontend.js': () => new Response(Bun.file("public/frontend.js"), {
      headers: { "Content-Type": "application/javascript" }
    }),
    // Serve index.html for all unmatched routes.
    '/*': () => new Response(Bun.file("src/index.html"), {
      headers: { "Content-Type": "text/html" }
    }),
  },

  development: process.env.NODE_ENV !== 'production' && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

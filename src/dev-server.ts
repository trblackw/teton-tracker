#!/usr/bin/env bun
import { createServer } from './server';

// Development server configuration
async function startDevServer() {
  const server = createServer({
    corsOrigin: '*', // Permissive CORS for development
    isDevelopment: true, // Enables /api/seed routes
    // No hostname specified - defaults to localhost
  });

  console.log(
    `🚀 Development server running at http://localhost:${server.port}/`
  );
}

startDevServer().catch(error => {
  console.error('Failed to start development server:', error);
  process.exit(1);
});

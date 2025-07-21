#!/usr/bin/env bun
import { createServer } from './server';

// Production server configuration
async function startServer() {
  const server = createServer({
    corsOrigin: origin => {
      // Allow same-origin requests (no origin header)
      if (!origin) return null;

      // Allow production domains
      const allowedOrigins = [
        'https://tetontracker.com',
        'https://www.tetontracker.com',
        // Add localhost for testing
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      return allowedOrigins.includes(origin) ? origin : null;
    },
    isDevelopment: false, // Disables /api/seed routes
    hostname: '0.0.0.0', // Listen on all interfaces for Railway
  });

  console.log(
    `🚀 Production server running at http://localhost:${server.port}/`
  );
}

startServer().catch(error => {
  console.error('Failed to start production server:', error);
  process.exit(1);
});

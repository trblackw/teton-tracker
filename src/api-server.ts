#!/usr/bin/env bun
import { initializeDatabase } from './lib/db';
import { createApp } from './server';

// Initialize database
initializeDatabase();

// Create the API app with development settings
const app = createApp({
  corsOrigin: '*', // Permissive CORS for development
  isDevelopment: true, // Enables /api/seed routes
});

// Start the API server on port 3001
const server = Bun.serve({
  port: process.env.API_PORT || 3001,
  fetch: app.fetch,
});

console.log(`🌐 API server running at http://localhost:${server.port}`);
console.log('🎯 Using Hono for clean API routing');
console.log('📊 Database initialized and API routes available');
console.log(
  `🔑 AviationStack API key: ${process.env.AVIATIONSTACK_API_KEY ? '✅ Configured' : '❌ Not found'}`
);

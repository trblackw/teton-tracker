#!/usr/bin/env bun
import { $, build } from 'bun';
import plugin from 'bun-plugin-tailwind';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Starting development server...\n');

// Build frontend with Tailwind plugin
console.log('📦 Building frontend with Tailwind support...');
await build({
  entrypoints: ['src/frontend.tsx'],
  outdir: 'public',
  target: 'browser',
  plugins: [plugin],
  sourcemap: 'linked',
  minify: false, // Don't minify in development
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
});

// Copy static files to public directory
const staticFiles = ['manifest.json', 'sw.js', 'logo.svg'];
for (const file of staticFiles) {
  const srcPath = path.join('public', file);
  if (existsSync(srcPath)) {
    console.log(`📄 Static file ${file} already exists`);
  }
}

console.log('✅ Frontend build completed\n');

// Start the server with hot reloading
console.log('🌟 Starting server with hot reloading...');
await $`bun --hot src/index.tsx`; 
#!/usr/bin/env bun
import { build, type BuildConfig } from 'bun';
import plugin from 'bun-plugin-tailwind';
import { existsSync } from 'fs';
import { cp, rm } from 'fs/promises';
import path from 'path';

// Print help text if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🏗️  Bun Build Script

Usage: bun run build.ts [options]

Common Options:
  --outdir <path>          Output directory (default: "dist")
  --minify                 Enable minification (or --minify.whitespace, --minify.syntax, etc)
  --source-map <type>      Sourcemap type: none|linked|inline|external
  --target <target>        Build target: browser|bun|node
  --format <format>        Output format: esm|cjs|iife
  --splitting              Enable code splitting
  --packages <type>        Package handling: bundle|external
  --public-path <path>     Public path for assets
  --env <mode>             Environment handling: inline|disable|prefix*
  --conditions <list>      Package.json export conditions (comma separated)
  --external <list>        External packages (comma separated)
  --banner <text>          Add banner text to output
  --footer <text>          Add footer text to output
  --define <obj>           Define global constants (e.g. --define.VERSION=1.0.0)
  --help, -h               Show this help message

Example:
  bun run build.ts --outdir=dist --minify --source-map=linked --external=react,react-dom
`);
  process.exit(0);
}

// Helper function to convert kebab-case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
};

// Helper function to parse a value into appropriate type
const parseValue = (value: string): any => {
  // Handle true/false strings
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Handle numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

  // Handle arrays (comma-separated)
  if (value.includes(',')) return value.split(',').map(v => v.trim());

  // Default to string
  return value;
};

// Magical argument parser that converts CLI args to BuildConfig
function parseArgs(): Partial<BuildConfig> {
  const config: Record<string, any> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;

    // Handle --no-* flags
    if (arg.startsWith('--no-')) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    // Handle --flag (boolean true)
    if (
      !arg.includes('=') &&
      (i === args.length - 1 || args[i + 1].startsWith('--'))
    ) {
      const key = toCamelCase(arg.slice(2));
      config[key] = true;
      continue;
    }

    // Handle --key=value or --key value
    let key: string;
    let value: string;

    if (arg.includes('=')) {
      [key, value] = arg.slice(2).split('=', 2);
    } else {
      key = arg.slice(2);
      value = args[++i];
    }

    // Convert kebab-case key to camelCase
    key = toCamelCase(key);

    // Handle nested properties (e.g. --minify.whitespace)
    if (key.includes('.')) {
      const [parentKey, childKey] = key.split('.');
      config[parentKey] = config[parentKey] || {};
      config[parentKey][childKey] = parseValue(value);
    } else {
      config[key] = parseValue(value);
    }
  }

  return config as Partial<BuildConfig>;
}

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

console.log('\n🚀 Starting build process...\n');

// Parse CLI arguments with our magical parser
const cliConfig = parseArgs();
const outdir = cliConfig.outdir || path.join(process.cwd(), 'dist');

if (existsSync(outdir)) {
  console.log(`🗑️ Cleaning previous build at ${outdir}`);
  await rm(outdir, { recursive: true, force: true });
}

const start = performance.now();

// Build the frontend entry point
const entrypoints = ['./src/frontend.tsx'];
console.log(`📄 Building frontend entry point: ${entrypoints[0]}\n`);

// Build the frontend
const result = await build({
  entrypoints,
  outdir,
  plugins: [plugin],
  minify: true,
  target: 'browser',
  sourcemap: 'linked',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  ...cliConfig, // Merge in any CLI-provided options
});

// Create production HTML file
console.log('📦 Creating production HTML file...');
const productionHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Teton Tracker</title>
    <meta name="description" content="Track airport runs with real-time flight & traffic data. Never miss a pickup again with intelligent arrival predictions and traffic-aware routing." />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://tetontracker.com/" />
    <meta property="og:title" content="Teton Tracker - Smart Airport Run Tracking" />
    <meta property="og:description" content="Track airport runs with real-time flight & traffic data. Never miss a pickup again with intelligent arrival predictions and traffic-aware routing." />
    <meta property="og:image" content="https://tetontracker.com/social-preview.png" />
    <meta property="og:image:alt" content="Teton Tracker - Smart Airport Run Tracking" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Teton Tracker" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://tetontracker.com/" />
    <meta name="twitter:title" content="Teton Tracker - Smart Airport Run Tracking" />
    <meta name="twitter:description" content="Track airport runs with real-time flight & traffic data. Never miss a pickup again with intelligent arrival predictions and traffic-aware routing." />
    <meta name="twitter:image" content="https://tetontracker.com/social-preview.png" />
    <meta name="twitter:image:alt" content="Teton Tracker - Smart Airport Run Tracking" />
    
    <!-- Additional SEO -->
    <meta name="keywords" content="airport, flight tracking, traffic, transportation, pickup, arrival times, real-time" />
    <meta name="author" content="Teton Tracker" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://tetontracker.com/" />
    
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="stylesheet" href="./frontend.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./frontend.js"></script>
  </body>
</html>`;

const htmlDestPath = path.join(outdir, 'index.html');
await Bun.write(htmlDestPath, productionHtml);
console.log(`📄 Created production index.html`);

// Copy static files from public directory
const staticFiles = [
  'manifest.json',
  'sw.js',
  'logo.svg',
  'favicon.ico',
  'social-preview.png',
  'social-preview-twitter.png',
];
for (const file of staticFiles) {
  const srcPath = path.join('public', file);
  const destPath = path.join(outdir, file);
  if (existsSync(srcPath)) {
    await cp(srcPath, destPath);
    console.log(`📄 Copied ${file} to output directory`);
  }
}

// Print the results
const end = performance.now();

const outputTable = result.outputs.map(output => ({
  File: path.relative(process.cwd(), output.path),
  Type: output.kind,
  Size: formatFileSize(output.size),
}));

console.table(outputTable);
const buildTime = (end - start).toFixed(2);

console.log(`\n✅ Build completed in ${buildTime}ms\n`);

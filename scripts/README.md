# Development Scripts

This directory contains scripts to help manage the Teton Tracker development environment.

## Scripts

### `bun run dev` (./scripts/dev.sh)

**Recommended way to start development**

This script:

1. 🧹 Automatically kills any existing processes on ports 3000 and 3001
2. 🧹 Cleans up any lingering bun processes related to the project
3. 🚀 Starts fresh API server (port 3001) and frontend dev server (port 3000)

**No more "port already in use" errors!**

```bash
bun run dev
```

### `bun run dev:cleanup` (./scripts/cleanup.sh)

**Stop all development servers**

Use this when you want to stop all running development servers without restarting them:

```bash
bun run dev:cleanup
```

### Individual server commands

If you need to run servers individually:

```bash
# API server only (port 3001)
bun run dev:api

# Frontend only (port 3000)
bun run dev:frontend
```

## Port Information

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Database**: Turso (remote)

## Database Management

The database schema is managed through dedicated scripts (not baked into the app):

### Setup Database Schema

```bash
bun run scripts/setup-db.ts
```

This script:

- Creates all database tables
- Adds indexes for performance
- Runs any necessary migrations
- Should be run when setting up a new environment

### Generate Mock Data (Development)

```bash
bun run scripts/generate-mock-data.ts
```

This script:

- Generates realistic test data for development
- Creates sample runs, notifications, and users
- Only generates data if tables are empty

### Setup New Environment

For a new development environment:

```bash
# 1. Setup database schema
bun run scripts/setup-db.ts

# 2. Generate mock data (optional for development)
bun run scripts/generate-mock-data.ts

# 3. Start development servers
bun run dev
```

## Troubleshooting

### Still getting port conflicts?

Try the cleanup script first:

```bash
bun run dev:cleanup
# Wait a moment, then:
bun run dev
```

### Manual port cleanup

If scripts fail, you can manually kill processes:

```bash
# Find processes on specific ports
lsof -i :3000
lsof -i :3001

# Kill specific process by PID
kill -9 <PID>

# Kill all bun processes (nuclear option)
pkill bun
```

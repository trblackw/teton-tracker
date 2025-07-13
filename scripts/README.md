# Scripts

This directory contains development and build scripts for the project.

## Available Scripts

### `dev.sh`

Development server startup script that:

- Cleans up any existing servers on ports 3000/3001
- Starts the API server (port 3001)
- Starts the frontend development server (port 3000)

### `cleanup.sh`

Cleans up development processes:

- Kills any processes running on ports 3000/3001
- Terminates lingering bun processes

### `production-check.sh`

Verifies the production build works correctly by:

- Building the application
- Starting the production server
- Running health checks

### `generate-social-preview.ts`

Generates social media preview images using Puppeteer:

- Creates OpenGraph preview images
- Generates Twitter card images
- Outputs to `public/` directory

### `seed-data.ts` 🌱

Generates mock data for development and testing:

- Creates 20 realistic mock runs with various statuses
- Generates 40+ related notifications
- Uses authentic Jackson Hole locations and major airlines
- Creates a user in the database automatically
- **Local development only** - cannot be run in production

**Usage:**

```bash
# Generate seed data
bun run seed

# The script will output:
# • Number of runs created
# • Number of notifications created
# • User ID used
```

**Features:**

- Realistic flight numbers and airline data
- Jackson Hole specific locations (hotels, resorts, private residences)
- Various run statuses based on scheduled times
- Multiple notification types per run
- Random pricing between $100-$500
- Occasional notes with realistic client requests

### `setup-db.ts`

Database setup and migration script:

- Initializes database schema
- Creates required tables
- Handles database migrations

## Running Scripts

All scripts can be run via npm/bun:

```bash
# Development
bun run dev

# Seed data (development only)
bun run seed

# Production check
bun run production-check

# Generate social previews
bun run generate-social-preview
```

## Environment Requirements

- **Development:** Requires local database setup
- **Production:** Scripts check environment and prevent certain operations
- **Seeding:** Only works in local/development environment

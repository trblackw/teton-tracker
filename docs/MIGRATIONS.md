# Database Migration System

Teton Tracker uses a robust database migration system to manage schema changes over time. This system tracks version numbers and ensures database changes are applied consistently across all environments.

## Quick Start

### Check Current Status

```bash
bun run migration-status
```

### Create a New Migration

```bash
bun run create-migration add_user_avatar
```

### Run Pending Migrations

```bash
bun run migrate
```

### Rollback Last Migration

```bash
bun run rollback
```

## How It Works

### 1. Schema Version Tracking

- A `schema_migrations` table tracks applied migrations
- Each migration has a unique version number
- Migrations are applied in sequential order

### 2. Migration Files

Located in `/migrations/` directory:

```
migrations/
├── 001_add_name_to_users.ts
├── 002_create_audit_table.ts
└── 003_add_user_indexes.ts
```

### 3. Migration Structure

Each migration exports `up()` and `down()` functions:

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();
  // Apply changes
  await db.query(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
}

export async function down(): Promise<void> {
  const db = getDatabase();
  // Reverse changes
  await db.query(`ALTER TABLE users DROP COLUMN avatar_url`);
}
```

## Development Workflow

### 1. Update Schema

First, update your TypeScript schema in `src/lib/schema.ts`:

```typescript
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(), // ← New field
  // ...
});
```

### 2. Create Migration

```bash
bun run create-migration add_user_avatar_url
```

This creates: `migrations/002_add_user_avatar_url.ts`

### 3. Edit Migration

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  console.log('⏭️  Adding avatar_url column to users table');

  await db.query(`
    ALTER TABLE users 
    ADD COLUMN avatar_url TEXT
  `);

  console.log('✅ Migration completed');
}

export async function down(): Promise<void> {
  const db = getDatabase();

  console.log('⏪ Removing avatar_url column from users table');

  await db.query(`
    ALTER TABLE users 
    DROP COLUMN avatar_url
  `);

  console.log('✅ Rollback completed');
}
```

### 4. Test Migration

```bash
# Check status
bun run migration-status

# Run migration
bun run migrate

# Test rollback (optional)
bun run rollback

# Re-run migration
bun run migrate
```

## Available Commands

| Command              | Description                  | Example                                |
| -------------------- | ---------------------------- | -------------------------------------- |
| `migrate-db`         | Show help                    | `bun run migrate-db`                   |
| `migrate`            | Run pending migrations       | `bun run migrate`                      |
| `rollback`           | Rollback last migration      | `bun run rollback`                     |
| `rollback [version]` | Rollback to specific version | `bun run migrate-db rollback 5`        |
| `migration-status`   | Show migration status        | `bun run migration-status`             |
| `create-migration`   | Create new migration         | `bun run create-migration add_feature` |

## Production Deployment

### Automated Deployment

Add to your deployment pipeline:

```bash
# 1. Deploy code
git pull origin main

# 2. Run migrations
bun run migrate

# 3. Restart application
pm2 restart app
```

### Railway Deployment

```bash
# Deploy with automatic migrations
railway up && railway run bun run migrate
```

### Manual Deployment

```bash
# Check what will be applied
bun run migration-status

# Apply migrations
bun run migrate
```

## Common Migration Patterns

### Adding a Column

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    ALTER TABLE users 
    ADD COLUMN phone_verified BOOLEAN DEFAULT false
  `);
}

export async function down(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    ALTER TABLE users 
    DROP COLUMN phone_verified
  `);
}
```

### Creating a Table

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    CREATE TABLE user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id)
  `);
}

export async function down(): Promise<void> {
  const db = getDatabase();

  await db.query(`DROP TABLE user_sessions`);
}
```

### Adding an Index

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_runs_status_user 
    ON runs(status, user_id)
  `);
}

export async function down(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    DROP INDEX IF EXISTS idx_runs_status_user
  `);
}
```

### Data Migration

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  // Add new column
  await db.query(`
    ALTER TABLE runs 
    ADD COLUMN status_updated_at TIMESTAMP
  `);

  // Populate with existing data
  await db.query(`
    UPDATE runs 
    SET status_updated_at = updated_at 
    WHERE status_updated_at IS NULL
  `);
}

export async function down(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    ALTER TABLE runs 
    DROP COLUMN status_updated_at
  `);
}
```

## Best Practices

### ✅ DO:

- **Test locally first**: Always test migrations in development
- **Write reversible migrations**: Include proper `down()` functions
- **Use descriptive names**: `add_user_avatar` not `migration_2`
- **Check for existing changes**: Handle cases where changes might already exist
- **Backup before production**: Always backup production before migrations

### ❌ DON'T:

- **Modify existing migrations**: Never change migrations that have been applied
- **Delete migration files**: Keep all migration files in version control
- **Skip version numbers**: Let the system assign sequential numbers
- **Make breaking changes**: Avoid removing columns with data without careful planning

## Troubleshooting

### Migration Failed

```bash
# Check what went wrong
bun run migration-status

# Rollback if needed
bun run rollback

# Fix the migration file and try again
bun run migrate
```

### Out of Sync Database

```bash
# Reset development database
bun run cleanup-db
bun run setup-db
bun run migrate
```

### Schema Mismatch

1. Check current schema version: `bun run migration-status`
2. Compare with expected version in your code
3. Run pending migrations: `bun run migrate`

## Examples from Teton Tracker

### Real Migration: Adding Name Column

```typescript
// migrations/001_add_name_to_users.ts
export async function up(): Promise<void> {
  const db = getDatabase();

  // Check if column already exists (for existing databases)
  const columnCheck = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'name'
  `);

  if (columnCheck.rows.length > 0) {
    console.log('⏩ Name column already exists, skipping');
    return;
  }

  await db.query(`
    ALTER TABLE users 
    ADD COLUMN name VARCHAR(255)
  `);
}
```

This migration system ensures your database schema changes are:

- **Tracked**: Every change is versioned
- **Reversible**: Can rollback changes if needed
- **Consistent**: Same changes applied everywhere
- **Automated**: Can be run in CI/CD pipelines

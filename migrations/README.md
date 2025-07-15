# Database Migrations

This directory contains database migrations for Teton Tracker. Migrations use **semantic versioning** to track and version database schema changes over time.

## How It Works

1. **Semantic Version Tracking**: The `schema_migrations` table tracks which migrations have been applied using semver (0.0.1, 0.0.2, 0.1.0, etc.)
2. **Sequential Execution**: Migrations run in semver order (0.0.1 → 0.0.2 → 0.1.0 → 1.0.0)
3. **Rollback Support**: Each migration has an `up` (apply) and `down` (rollback) function
4. **Idempotent**: Migrations can be run multiple times safely

## Migration Files

Migration files follow the semantic versioning convention:

```
{version}_{description}.ts
```

Examples:

- `0.0.1_add_name_to_users.ts` (patch: small change)
- `0.0.2_fix_user_indexes.ts` (patch: bug fix)
- `0.1.0_add_user_sessions.ts` (minor: new feature)
- `1.0.0_restructure_database.ts` (major: breaking change)

## Commands

### Run Pending Migrations

```bash
bun run migrate
```

### Check Migration Status

```bash
bun run migration-status
```

### Create New Migration

```bash
# Patch increment (default): 0.0.1 → 0.0.2
bun run create-migration add_user_avatar

# Minor increment: 0.0.1 → 0.1.0
bun run create-migration add_user_sessions minor

# Major increment: 0.1.0 → 1.0.0
bun run create-migration restructure_database major
```

### Rollback Migrations

```bash
# Rollback to previous version
bun run rollback

# Rollback to specific version
bun run migrate-db rollback 0.0.1
```

## Semantic Versioning Guide

### Version Types

- **Patch (0.0.X)**: Bug fixes, small changes, index additions

  ```bash
  bun run create-migration fix_user_constraint
  bun run create-migration add_user_index
  ```

- **Minor (0.X.0)**: New features, new tables, new columns

  ```bash
  bun run create-migration add_user_sessions minor
  bun run create-migration add_audit_logging minor
  ```

- **Major (X.0.0)**: Breaking changes, schema restructuring
  ```bash
  bun run create-migration restructure_users major
  bun run create-migration remove_legacy_tables major
  ```

## Workflow

1. **Update Schema**: Modify `src/lib/schema.ts` with your changes
2. **Create Migration**:
   ```bash
   bun run create-migration your_change_description [patch|minor|major]
   ```
3. **Edit Migration**: Add your SQL changes to the generated migration file
4. **Test Migration**: Run `bun run migrate` in development
5. **Deploy**: Run migrations in production after deployment

## Migration Template

Each migration file exports two functions:

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  // Apply changes
  await db.query(`
    ALTER TABLE users 
    ADD COLUMN avatar_url TEXT
  `);
}

export async function down(): Promise<void> {
  const db = getDatabase();

  // Reverse changes
  await db.query(`
    ALTER TABLE users 
    DROP COLUMN avatar_url
  `);
}
```

## Best Practices

### DO:

- ✅ Always write reversible migrations
- ✅ Test migrations in development first
- ✅ Use descriptive migration names
- ✅ Choose appropriate version increments:
  - **Patch**: Small fixes, indexes, constraints
  - **Minor**: New features, tables, columns
  - **Major**: Breaking changes, restructuring
- ✅ Check if changes already exist (for compatibility)
- ✅ Make migrations idempotent when possible

### DON'T:

- ❌ Delete migration files after they've been applied
- ❌ Modify existing migration files
- ❌ Skip version numbers (let the system increment automatically)
- ❌ Use wrong version types (major for small changes, patch for breaking changes)

## Example Migrations

### Patch: Adding an Index (0.0.1 → 0.0.2)

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email 
    ON users(email)
  `);
}

export async function down(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    DROP INDEX IF EXISTS idx_users_email
  `);
}
```

### Minor: Adding a Table (0.0.2 → 0.1.0)

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    CREATE TABLE user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

export async function down(): Promise<void> {
  const db = getDatabase();

  await db.query(`DROP TABLE user_sessions`);
}
```

### Major: Restructuring (0.1.0 → 1.0.0)

```typescript
export async function up(): Promise<void> {
  const db = getDatabase();

  // Breaking change: rename column
  await db.query(`
    ALTER TABLE users 
    RENAME COLUMN phone_number TO mobile_number
  `);

  // Update schema version to indicate major change
  console.log('🚨 BREAKING CHANGE: phone_number renamed to mobile_number');
}

export async function down(): Promise<void> {
  const db = getDatabase();

  await db.query(`
    ALTER TABLE users 
    RENAME COLUMN mobile_number TO phone_number
  `);
}
```

## Troubleshooting

### Migration Failed

1. Check the error message
2. Fix the migration file
3. Rollback if needed: `bun run rollback`
4. Fix and re-run: `bun run migrate`

### Schema Out of Sync

1. Check status: `bun run migration-status`
2. Run pending migrations: `bun run migrate`

### Development Reset

If you need to reset your development database:

```bash
bun run cleanup-db
bun run setup-db
bun run migrate
```

## Version History Example

```
v0.0.1 ✅ add_name_to_users
v0.0.2 ✅ add_user_indexes
v0.0.3 ⏳ fix_user_constraints
v0.1.0 ⏳ add_user_sessions
v0.1.1 ⏳ add_session_cleanup
v1.0.0 ⏳ restructure_for_v1
```

This semantic versioning approach makes it clear what type of changes each migration contains and helps with planning deployment strategies.

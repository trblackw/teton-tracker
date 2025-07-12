# Database Setup Guide for Teton Tracker

This guide will help you set up Turso (libSQL) for production deployment of Teton Tracker.

## Quick Start

### 1. Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### 2. Create Account & Database

```bash
# Sign up for Turso
turso auth signup

# Create database
turso db create teton-tracker

# Get database URL
turso db show teton-tracker

# Create auth token
turso db tokens create teton-tracker
```

### 3. Configure Environment Variables

```bash
# Add to your .env file or deployment environment
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here
```

### 4. Deploy & Verify

Your application will automatically:

- Connect to Turso database
- Create required tables
- Initialize schema
- Start accepting data

## Database Schema

The application creates these tables automatically:

### `user_preferences`

- User settings and home airport
- Theme preferences
- Notification settings

### `runs`

- Historical shuttle runs
- Flight information
- Pickup/dropoff locations
- Run status and timing

### `flight_cache`

- Cached flight data
- Reduces API calls
- Automatic expiration

## Environment Variables

| Variable             | Description             | Required         |
| -------------------- | ----------------------- | ---------------- |
| `TURSO_DATABASE_URL` | Your Turso database URL | Yes (production) |
| `TURSO_AUTH_TOKEN`   | Your Turso auth token   | Yes (production) |
| `DATABASE_URL`       | Local SQLite file path  | No (development) |

## Development vs Production

### Development

- Uses local SQLite (`local.db`)
- No setup required
- Data persists locally

### Production

- Uses Turso cloud database
- Requires environment variables
- Data synced globally

## Troubleshooting

### Connection Issues

1. Verify your environment variables are set
2. Check your auth token is valid
3. Ensure database URL is correct

### Schema Issues

If you see table errors:

1. Check logs for initialization messages
2. Verify database permissions
3. Try restarting the application

### Performance

- Turso provides edge caching automatically
- Database queries are optimized with indexes
- Flight data is cached to reduce API calls

## Advanced Configuration

### Custom Database Location

```bash
# Use specific region
turso db create teton-tracker --location lax

# List available locations
turso db locations
```

### Database Branching

```bash
# Create development branch
turso db create teton-tracker-dev --from-db teton-tracker

# Use development database
export TURSO_DATABASE_URL="libsql://teton-tracker-dev.turso.io"
```

### Backup & Recovery

```bash
# Turso provides automatic backups
turso db inspect teton-tracker

# Point-in-time recovery available through dashboard
```

## Support

- [Turso Documentation](https://docs.turso.tech/)
- [Turso Discord](https://discord.gg/turso)
- [Teton Tracker Issues](https://github.com/your-repo/issues)

## Security

- Auth tokens are scoped to specific databases
- All connections use TLS encryption
- Data is replicated across multiple regions
- No sensitive data is stored in the database

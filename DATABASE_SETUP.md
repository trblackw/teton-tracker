# Database Setup Guide for Teton Tracker

This guide will help you set up Railway PostgreSQL for Teton Tracker deployment.

## Option 1: Railway PostgreSQL (Recommended)

Railway provides a managed PostgreSQL database that's perfect for production deployments.

### 1. Install Railway CLI

```bash
# Install Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# Or using npm
npm install -g @railway/cli

# Or using bun
bun install -g @railway/cli
```

### 2. Connect to Railway Project

```bash
# Connect to your Railway project
railway link

# Or connect with project ID (from Railway dashboard)
railway link [project-id]
```

### 3. Add PostgreSQL Database

In your Railway dashboard:

1. Click "New Service"
2. Choose "Database"
3. Select "PostgreSQL"
4. Railway will automatically provision your database

### 4. Configure Environment Variables

```bash
# Get your database URL from Railway
railway variables

# Set DATABASE_URL in your environment
export DATABASE_URL="postgres://user:password@hostname:port/database"

# Or add to your .env file
DATABASE_URL=postgres://user:password@hostname:port/database
```

### 5. Deploy & Initialize

```bash
# Deploy your application
railway up

# Initialize database schema
railway run bun run setup-db
```

### 6. Local Development with Railway DB

To connect locally to your Railway PostgreSQL database:

```bash
# Connect to Railway database locally
railway connect

# Or set DATABASE_URL locally
railway variables --format env > .env
```

## Option 2: Turso (libSQL)

Turso provides a globally distributed SQLite-compatible database.

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

### `users`

- User accounts and authentication
- Browser-based user identification

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

### `notifications`

- System notifications
- Flight updates and alerts
- Run reminders

## Environment Variables

| Variable             | Description               | Required      | Database Type |
| -------------------- | ------------------------- | ------------- | ------------- |
| `DATABASE_URL`       | PostgreSQL connection URL | Yes (Railway) | PostgreSQL    |
| `TURSO_DATABASE_URL` | Your Turso database URL   | Yes (Turso)   | libSQL        |
| `TURSO_AUTH_TOKEN`   | Your Turso auth token     | Yes (Turso)   | libSQL        |

## Development vs Production

### Development

- **Local SQLite**: Uses `local.db` file (no setup required)
- **Railway PostgreSQL**: Connect to production database locally
- **Turso**: Use development branch or main database

### Production

- **Railway**: Managed PostgreSQL with automatic backups
- **Turso**: Globally distributed with edge caching

## Database Selection Guide

### Choose Railway PostgreSQL if:

- ✅ You want a traditional PostgreSQL database
- ✅ You need full SQL compatibility
- ✅ You prefer managed infrastructure
- ✅ You want to develop against production database locally

### Choose Turso if:

- ✅ You want globally distributed data
- ✅ You prefer SQLite-compatible syntax
- ✅ You want automatic edge caching
- ✅ You need minimal latency worldwide

## Troubleshooting

### Railway PostgreSQL Issues

1. **Connection Issues**

   ```bash
   # Check railway connection
   railway status

   # Get fresh environment variables
   railway variables
   ```

2. **Schema Issues**

   ```bash
   # Reinitialize database
   railway run bun run setup-db

   # Check logs
   railway logs
   ```

### Turso Issues

1. **Connection Issues**
   - Verify your environment variables are set
   - Check your auth token is valid
   - Ensure database URL is correct

2. **Schema Issues**
   - Check logs for initialization messages
   - Verify database permissions
   - Try restarting the application

## Performance Optimization

### Railway PostgreSQL

- Connection pooling is handled automatically
- Database queries are optimized with indexes
- Consider read replicas for high-traffic applications

### Turso

- Edge caching is provided automatically
- Global distribution reduces latency
- Automatic replication across regions

## Security

### Railway PostgreSQL

- Managed SSL certificates
- Network isolation
- Automatic security updates
- Database backups and point-in-time recovery

### Turso

- Auth tokens are scoped to specific databases
- All connections use TLS encryption
- Data is replicated across multiple regions
- Row-level security available

## Support

- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Turso Documentation](https://docs.turso.tech/)
- [Turso Discord](https://discord.gg/turso)
- [Teton Tracker Issues](https://github.com/your-repo/issues)

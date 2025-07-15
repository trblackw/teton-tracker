# Clerk Authentication Setup Guide

## 🔐 Setting Up Clerk Authentication

### Step 1: Create a Clerk Account

1. Go to [clerk.dev](https://clerk.dev)
2. Sign up for a free account
3. Create a new application
4. Choose "React" as your framework

### Step 2: Get Your API Keys

1. In your Clerk dashboard, go to "API Keys"
2. Copy the "Publishable Key" (starts with `pk_test_` or `pk_live_`)
3. Copy the "Secret Key" (starts with `sk_test_` or `sk_live_`)

### Step 3: Configure Environment Variables

Create a `.env` file in your project root with:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Existing environment variables...
AVIATIONSTACK_API_KEY=your_aviationstack_api_key_here
TOMTOM_API_KEY=your_tomtom_api_key_here
TURSO_DATABASE_URL=your_turso_database_url_here
TURSO_AUTH_TOKEN=your_turso_auth_token_here
```

### Step 4: Configure Clerk Settings

In your Clerk dashboard:

1. **Authentication Methods**: Enable email/password and any social logins you want
2. **User Profile**: Configure required/optional fields
3. **Sessions**: Set session timeout (default is fine)
4. **Domains**: Add your development and production domains

### Step 5: Test the Setup

1. Start your development server: `bun run dev`
2. You should see a sign-in screen when you visit the app
3. Create a test account and verify authentication works

## 🔄 Migration from Current System

### What Changes:

- **User IDs**: Now come from Clerk (stable, persistent)
- **Authentication**: Handled by Clerk (no more password protection)
- **User Profiles**: Available through Clerk (email, name, avatar)
- **Sessions**: Automatically managed by Clerk

### What Stays the Same:

- **Database schema**: Your existing tables work as-is
- **API endpoints**: Same endpoints, now with proper auth
- **User preferences**: Will be linked to Clerk user IDs
- **Existing runs**: Will be preserved and linked to new user accounts

## 🚀 Next Steps

1. **Set up Clerk account and get API keys**
2. **Add environment variables**
3. **Test authentication flow**
4. **Migrate existing data** (if needed)
5. **Remove old authentication system**

## 📋 Features You Get

- ✅ **Email/Password Authentication**
- ✅ **Social Logins** (Google, GitHub, etc.)
- ✅ **User Profiles** with avatars
- ✅ **Password Reset** flows
- ✅ **Multi-factor Authentication**
- ✅ **Session Management**
- ✅ **User Management Dashboard**

## 🔧 Development Notes

- The app will redirect to Clerk's sign-in page for unauthenticated users
- All API calls now include authentication headers
- User preferences will be automatically linked to Clerk user IDs
- The old `getCurrentUserId()` function is deprecated in favor of Clerk's user hooks

## 🆘 Troubleshooting

**"Missing Clerk Publishable Key" Error:**

- Make sure you've added `VITE_CLERK_PUBLISHABLE_KEY` to your `.env` file
- Restart your development server after adding environment variables

**Authentication Not Working:**

- Check that your domain is added to Clerk's allowed domains
- Verify your API keys are correct
- Check the browser console for any errors

**User Not Authenticated Errors:**

- This happens when the user is not signed in
- The app will automatically redirect to sign-in page
- Make sure Clerk is properly configured in your dashboard

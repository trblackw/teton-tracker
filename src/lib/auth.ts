import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { getBetterAuthUrl } from './api/api-tools';

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: getBetterAuthUrl(),
  basePath: '/api/auth',

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  user: {
    additionalFields: {
      phoneNumber: {
        type: 'string',
        required: false,
      },
    },
  },

  // Let BetterAuth handle its own table creation and management
  // This will create: user, session, account, verification tables
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

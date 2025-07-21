import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
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

  plugins: [
    organization({
      allowUserToCreateOrganization: true, // Allow any user to create orgs
      organizationLimit: 5, // Max 5 orgs per user (can adjust)
      membershipLimit: 100, // Max 100 members per org
      creatorRole: 'admin', // Creator gets admin role
      invitationExpiresIn: 60 * 60 * 48, // 48 hours
    }),
  ],

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
  // + organization, member, invitation tables
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

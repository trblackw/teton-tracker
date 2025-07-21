import { betterAuth } from 'better-auth';
import { getBetterAuthUrl } from './api/api-tools';
import { getDatabase } from './db/index';

export const auth = betterAuth({
  database: getDatabase(),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: getBetterAuthUrl(),
  basePath: '/api/auth', // Explicitly set to ensure correct routing

  emailAndPassword: {
    enabled: true,
  },

  // Social providers can be added later
  socialProviders: {
    // Add providers as needed
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  user: {
    additionalFields: {
      phoneNumber: {
        type: 'string',
        required: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

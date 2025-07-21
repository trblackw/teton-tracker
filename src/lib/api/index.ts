import { authApi } from './auth-api';
import { notificationsApi } from './notifications-api';
import { preferencesApi } from './preferences-api';
import { runsApi } from './runs-api';
import { seedApi } from './seed-api';
import { smsApi } from './sms-api';

export const api = {
  auth: authApi,
  notifications: notificationsApi,
  preferences: preferencesApi,
  runs: runsApi,
  seed: seedApi,
  sms: smsApi,
} as const;

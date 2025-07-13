// Pure frontend utility for user ID management
// This file has no database dependencies

// Fixed development user ID (same as seed script)
const DEVELOPMENT_USER_ID = 'user_dev_seed_12345';

// Pure utility function for browser-based user ID generation
export function generateBrowserUserId(): string {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return `user_${crypto.randomUUID()}`;
  }

  // Try to get existing user ID from localStorage
  let userId = window.localStorage.getItem('user-id');
  if (!userId) {
    // Generate UUID-based user ID with localStorage + cookie persistence
    const LS_KEY = 'user_fingerprint';
    const COOKIE_KEY = 'user_fingerprint';

    const getFromCookie = (): string | null => {
      const match = document.cookie.match(
        new RegExp(`(^| )${COOKIE_KEY}=([^;]+)`)
      );
      return match ? match[2] : null;
    };

    const setCookie = (value: string) => {
      document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=31536000`; // 1 year
    };

    let uuid = localStorage.getItem(LS_KEY) || getFromCookie();

    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem(LS_KEY, uuid);
      setCookie(uuid);
    } else {
      // Sync cookie and localStorage if one is missing
      if (!localStorage.getItem(LS_KEY) && uuid)
        localStorage.setItem(LS_KEY, uuid);
      if (!getFromCookie() && uuid) setCookie(uuid);
    }

    userId = `user_${uuid}`;
    window.localStorage.setItem('user-id', userId);
  }
  return userId;
}

// Frontend utility for getting the current user ID
// This handles environment detection without database concerns
export function getCurrentUserId(): string {
  // In development (localhost), use the fixed development user ID for consistency with seed data
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return DEVELOPMENT_USER_ID;
  }

  // In production, use browser-based generation
  return generateBrowserUserId();
}

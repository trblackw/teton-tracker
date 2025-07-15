import { type UserMetadata } from './schema';

const METADATA_STORAGE_KEY = 'teton-tracker-user-metadata';

// Browser detection utility functions
function detectBrowserInfo(userId: string): UserMetadata {
  if (typeof window === 'undefined') {
    return { userId }; // Server-side rendering, no browser info available
  }

  const userAgent = navigator.userAgent;
  const data: UserMetadata = {
    userId,
    userAgent,
  };

  // Detect device type
  if (/Mobi|Android/i.test(userAgent)) {
    data.deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(userAgent)) {
    data.deviceType = 'tablet';
  } else {
    data.deviceType = 'desktop';
  }

  // Detect browser
  if (userAgent.includes('Firefox')) {
    data.browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    data.browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    data.browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    data.browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    data.browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    data.browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes('Edg')) {
    data.browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    data.browserVersion = match ? match[1] : undefined;
  } else {
    data.browser = 'Unknown';
  }

  // Detect operating system
  if (userAgent.includes('Win')) {
    data.operatingSystem = 'Windows';
  } else if (userAgent.includes('Mac')) {
    data.operatingSystem = 'macOS';
  } else if (userAgent.includes('Linux')) {
    data.operatingSystem = 'Linux';
  } else if (userAgent.includes('Android')) {
    data.operatingSystem = 'Android';
  } else if (userAgent.includes('iOS')) {
    data.operatingSystem = 'iOS';
  } else {
    data.operatingSystem = 'Unknown';
  }

  // Screen resolution
  if (window.screen) {
    data.screenResolution = `${window.screen.width}x${window.screen.height}`;
  }

  // Timezone detection
  try {
    data.timezoneDetected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect timezone:', error);
    data.timezoneDetected = 'UTC';
  }

  // Session tracking
  data.lastSeen = new Date();

  return data;
}

// Get user metadata from localStorage
export function getUserMetadata(): UserMetadata | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(METADATA_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    if (parsed.lastSeen) {
      parsed.lastSeen = new Date(parsed.lastSeen);
    }
    if (parsed.firstSeen) {
      parsed.firstSeen = new Date(parsed.firstSeen);
    }

    return parsed as UserMetadata;
  } catch (error) {
    console.warn('Failed to parse user metadata from localStorage:', error);
    return null;
  }
}

// Save user metadata to localStorage
export function saveUserMetadata(metadata: UserMetadata): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.warn('Failed to save user metadata to localStorage:', error);
  }
}

// Initialize or update user metadata
export function initializeUserMetadata(userId: string): UserMetadata {
  if (!userId || typeof window === 'undefined') {
    return { userId };
  }

  // Get existing metadata
  const existing = getUserMetadata();

  // If no existing metadata or it's for a different user, create new
  if (!existing || existing.userId !== userId) {
    const newMetadata = detectBrowserInfo(userId);
    newMetadata.firstSeen = new Date();
    newMetadata.sessionCount = 1;

    saveUserMetadata(newMetadata);
    console.log(
      `✅ Created user metadata for ${userId} - ${newMetadata.browser} on ${newMetadata.operatingSystem}`
    );
    return newMetadata;
  }

  // Update existing metadata
  const updatedMetadata: UserMetadata = {
    ...existing,
    ...detectBrowserInfo(userId), // Update browser info in case it changed
    sessionCount: (existing.sessionCount || 0) + 1,
    lastSeen: new Date(),
    // Keep original firstSeen
    firstSeen: existing.firstSeen || new Date(),
  };

  saveUserMetadata(updatedMetadata);
  console.log(
    `✅ Updated user metadata for ${userId} (session ${updatedMetadata.sessionCount})`
  );
  return updatedMetadata;
}

// Clear user metadata (for logout)
export function clearUserMetadata(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(METADATA_STORAGE_KEY);
    console.log('🧹 Cleared user metadata from localStorage');
  } catch (error) {
    console.warn('Failed to clear user metadata from localStorage:', error);
  }
}

// Get detected timezone from metadata
export function getDetectedTimezone(): string | null {
  const metadata = getUserMetadata();
  return metadata?.timezoneDetected || null;
}

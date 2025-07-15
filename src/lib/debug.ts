/**
 * Debug configuration utility
 * Controls whether development tools are shown
 */

// Check if debug mode is enabled
export const isDebugMode = (): boolean => {
  // Check if we're on localhost
  const isLocalhost = Boolean(
    typeof window !== 'undefined' &&
      (window?.location?.hostname === 'localhost' ||
        window?.location?.hostname === '127.0.0.1' ||
        window?.location?.hostname === '' || // blank hostname edge case
        // IPv6 localhost
        window?.location?.hostname === '[::1]')
  );

  // Check if we're in development mode
  const isDevelopment =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

  // Check localStorage for debug flag
  const localStorageDebug =
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('debug') === 'true';

  // Check URL params for debug flag
  const urlDebug =
    typeof window !== 'undefined' &&
    window.location?.search?.includes('debug=true');

  // Check explicit environment variables
  const envDebug =
    typeof process !== 'undefined' &&
    (process.env.DEBUG === 'true' || process.env.BUN_DEBUG === 'true');

  // Auto-enable debug mode for local development
  const autoDebug = isLocalhost || isDevelopment;

  return autoDebug || envDebug || localStorageDebug || urlDebug;
};

// Enable debug mode via localStorage (for runtime toggling)
export const enableDebugMode = (): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('debug', 'true');
    console.log('🐛 Debug mode enabled. Refresh the page to see devtools.');
  }
};

// Disable debug mode
export const disableDebugMode = (): void => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('debug');
    console.log('🐛 Debug mode disabled. Refresh the page to hide devtools.');
  }
};

// Log debug status for development
export const logDebugStatus = (): void => {
  if (typeof window !== 'undefined' && typeof console !== 'undefined') {
    const status = isDebugMode();
    const isLocalhost = Boolean(
      window?.location?.hostname === 'localhost' ||
        window?.location?.hostname === '127.0.0.1' ||
        window?.location?.hostname === '' ||
        window?.location?.hostname === '[::1]'
    );
    const isDevelopment =
      typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

    console.log('🐛 Debug Mode Status:', {
      enabled: status,
      localhost: isLocalhost,
      development: isDevelopment,
      hostname: window?.location?.hostname,
      nodeEnv:
        typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown',
    });
  }
};

// Make debug controls available globally in development
if (
  typeof window !== 'undefined' &&
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'development'
) {
  (window as any).enableDebug = enableDebugMode;
  (window as any).disableDebug = disableDebugMode;
  (window as any).isDebug = isDebugMode;
  (window as any).debugStatus = logDebugStatus;

  // Auto-log debug status in development
  setTimeout(() => {
    console.log('🐛 Debug controls available:');
    console.log('  - enableDebug() - Force enable devtools');
    console.log('  - disableDebug() - Force disable devtools');
    console.log('  - isDebug() - Check current state');
    console.log('  - debugStatus() - Show debug status details');
    console.log('  - Or add ?debug=true to URL');
    logDebugStatus();
  }, 1000);
}

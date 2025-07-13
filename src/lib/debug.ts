/**
 * Debug configuration utility
 * Controls whether development tools are shown
 */

// Check if debug mode is enabled
export const isDebugMode = (): boolean => {
  const isLocalhost = Boolean(
    window?.location?.hostname === 'localhost' ||
      window?.location?.hostname === '127.0.0.1' ||
      window?.location?.hostname === '' || // blank hostname edge case
      // IPv6 localhost
      window?.location?.hostname === '[::1]'
  );

  // Only enable via explicit environment variables, not just development mode
  const envDebug =
    typeof process !== 'undefined' &&
    (process.env.DEBUG === 'true' || process.env.BUN_DEBUG === 'true');

  return isLocalhost || envDebug;
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

// Make debug controls available globally in development
if (
  typeof window !== 'undefined' &&
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'development'
) {
  (window as any).enableDebug = enableDebugMode;
  (window as any).disableDebug = disableDebugMode;
  (window as any).isDebug = isDebugMode;

  // Log available debug controls
  console.log('🐛 Debug controls available:');
  console.log('  - enableDebug() - Show devtools');
  console.log('  - disableDebug() - Hide devtools');
  console.log('  - isDebug() - Check current state');
  console.log('  - Or add ?debug=true to URL');
}

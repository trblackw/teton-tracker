/**
 * Debug configuration utility
 * Controls whether development tools are shown
 */

import { isBrowser, isDevelopment } from './environment';

// Check if debug mode is enabled
export const isDebugMode = (): boolean => {
  // Base development mode check
  const baseDebug = isDevelopment();

  // Additional debug flags
  const localStorageDebug =
    isBrowser() && window.localStorage?.getItem('debug') === 'true';

  const urlDebug =
    isBrowser() && window.location?.search?.includes('debug=true');

  // Server environment debug flags
  const envDebug =
    !isBrowser() &&
    (process.env.DEBUG === 'true' || process.env.BUN_DEBUG === 'true');

  return baseDebug || envDebug || localStorageDebug || urlDebug;
};

// Enable debug mode via localStorage (for runtime toggling)
export const enableDebugMode = (): void => {
  if (isBrowser()) {
    window.localStorage.setItem('debug', 'true');
    console.log('🐛 Debug mode enabled. Refresh the page to see devtools.');
  }
};

// Disable debug mode via localStorage
export const disableDebugMode = (): void => {
  if (isBrowser()) {
    window.localStorage.removeItem('debug');
    console.log('🐛 Debug mode disabled. Refresh the page to hide devtools.');
  }
};

// Debug state info for troubleshooting
export const getDebugInfo = () => {
  if (!isBrowser()) {
    return {
      environment: 'server',
      isDevelopment: isDevelopment(),
      envDebug:
        process.env.DEBUG === 'true' || process.env.BUN_DEBUG === 'true',
    };
  }

  return {
    environment: 'browser',
    isDevelopment: isDevelopment(),
    hostname: window.location?.hostname,
    localhost: isDevelopment(),
    localStorage: window.localStorage?.getItem('debug'),
    urlParams: window.location?.search,
    isDebugMode: isDebugMode(),
  };
};

// Make debug controls available globally in development
if (isBrowser() && isDevelopment()) {
  (window as any).enableDebug = enableDebugMode;
  (window as any).disableDebug = disableDebugMode;
  (window as any).isDebug = isDebugMode;
  (window as any).debugStatus = getDebugInfo;

  // Auto-log debug status in development
  setTimeout(() => {
    console.log('🐛 Debug controls available:');
    console.log('  - enableDebug() - Force enable devtools');
    console.log('  - disableDebug() - Force disable devtools');
    console.log('  - isDebug() - Check current state');
    console.log('  - debugStatus() - Show debug status details');
    console.log('  - Or add ?debug=true to URL');
    getDebugInfo();
  }, 1000);
}

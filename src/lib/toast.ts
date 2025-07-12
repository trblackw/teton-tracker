import { toast } from 'sonner';

// Custom styles for different toast types
const getToastStyle = (type: 'success' | 'error' | 'info') => {
  const isDark = document.documentElement.classList.contains('dark');

  switch (type) {
    case 'success':
      return {
        background: isDark ? '#0f2a1a' : '#f0fdf4',
        color: isDark ? '#86efac' : '#166534',
        border: `1px solid ${isDark ? '#16a34a' : '#bbf7d0'}`,
      };
    case 'error':
      return {
        background: isDark ? '#2a0f0f' : '#fef2f2',
        color: isDark ? '#fca5a5' : '#dc2626',
        border: `1px solid ${isDark ? '#dc2626' : '#fecaca'}`,
      };
    case 'info':
      return {
        background: isDark ? '#0f172a' : '#f0f9ff',
        color: isDark ? '#93c5fd' : '#1e40af',
        border: `1px solid ${isDark ? '#3b82f6' : '#bfdbfe'}`,
      };
    default:
      return {};
  }
};

// Common toast patterns for consistent UI across the app
export const toasts = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 3000,
      style: getToastStyle('success'),
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 4000,
      style: getToastStyle('error'),
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 3000,
      style: getToastStyle('info'),
    });
  },

  loading: (message: string, description?: string) => {
    return toast.loading(message, {
      description,
    });
  },

  // App-specific toast patterns
  runStarted: (runType: string) => {
    toast.success('Run started', {
      description: `Your ${runType} run has been started and is now being tracked.`,
      duration: 3000,
      style: getToastStyle('success'),
    });
  },

  runEnded: (runType: string, duration?: string) => {
    toast.success('Run completed', {
      description: duration
        ? `Your ${runType} run lasted ${duration}.`
        : `Your ${runType} run has been completed.`,
      duration: 3000,
      style: getToastStyle('success'),
    });
  },

  flightAdded: (flightNumber?: string) => {
    toast.success('Flight added', {
      description: flightNumber
        ? `Flight ${flightNumber} has been added to your tracking list.`
        : 'Flight has been added to your tracking list.',
      duration: 3000,
      style: getToastStyle('success'),
    });
  },

  settingsUpdated: (setting: string, value?: string) => {
    toast.success(`${setting} updated`, {
      description: value
        ? `Set to ${value}`
        : 'Your preferences have been saved.',
      duration: 3000,
      style: getToastStyle('success'),
    });
  },

  networkError: () => {
    toast.error('Network error', {
      description: 'Please check your connection and try again.',
      duration: 4000,
      style: getToastStyle('error'),
    });
  },

  // Dismiss all toasts
  dismissAll: () => {
    toast.dismiss();
  },
};

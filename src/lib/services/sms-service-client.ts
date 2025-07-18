import { smsApi } from '../api/client';
import { isDevelopmentMode } from '../utils';

/**
 * Client-side SMS service for browser-safe SMS functionality
 * This service provides testing and validation without Node.js dependencies
 */
class ClientSMSService {
  private static instance: ClientSMSService;
  private debug = isDevelopmentMode();

  private constructor() {}

  static getInstance(): ClientSMSService {
    if (!ClientSMSService.instance) {
      ClientSMSService.instance = new ClientSMSService();
    }
    return ClientSMSService.instance;
  }

  /**
   * Validate a phone number (client-side)
   */
  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    formatted?: string;
    country?: string;
    type?: string;
    error?: string;
  }> {
    try {
      return await smsApi.validatePhoneNumber(phoneNumber);
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Send a test SMS (development only)
   */
  async testSMS(phoneNumber: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!isDevelopmentMode()) {
      return {
        success: false,
        error: 'Test SMS only available in development mode',
      };
    }

    try {
      const result = await smsApi.sendSMS(
        phoneNumber,
        'Test SMS from Teton Tracker! Your SMS notifications are working correctly. 🚁'
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to send test SMS',
      };
    }
  }

  /**
   * Get SMS service status
   */
  async getStatus(): Promise<{
    configured: boolean;
    provider: string;
    fromNumber: string | null;
    mode: string;
  }> {
    try {
      return await smsApi.getStatus();
    } catch (error) {
      console.error('Failed to get SMS status:', error);
      return {
        configured: false,
        provider: 'Unknown',
        fromNumber: null,
        mode: 'unknown',
      };
    }
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Basic formatting - for full formatting, use the server-side validation
    if (!phoneNumber) return '';

    // Remove non-digits
    const digits = phoneNumber.replace(/\D/g, '');

    // Format US numbers
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Return as-is for international numbers
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
  }
}

// Export singleton instance
export const clientSMSService = ClientSMSService.getInstance();

// Development testing helper
if (isDevelopmentMode() && typeof window !== 'undefined') {
  (window as any).testSMS = {
    send: (phoneNumber: string) => clientSMSService.testSMS(phoneNumber),
    validate: (phoneNumber: string) =>
      clientSMSService.validatePhoneNumber(phoneNumber),
    status: () => clientSMSService.getStatus(),
    format: (phoneNumber: string) =>
      clientSMSService.formatPhoneNumber(phoneNumber),
  };
}

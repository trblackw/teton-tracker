import { parsePhoneNumber } from 'libphonenumber-js';
import { Twilio } from 'twilio';
import { isDevelopmentMode } from '../utils';

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed';
}

export interface PhoneValidationResult {
  isValid: boolean;
  formatted?: string;
  country?: string;
  type?: 'mobile' | 'landline' | 'unknown';
  error?: string;
}

class SMSService {
  private static instance: SMSService;
  private twilioClient: Twilio | null = null;
  private fromNumber: string | null = null;
  private debug = isDevelopmentMode();

  private constructor() {
    this.initialize();
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Initialize Twilio client with environment variables
   */
  private initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || null;

    if (!accountSid || !authToken) {
      if (this.debug) {
        console.warn(
          '⚠️ Twilio credentials not configured. SMS service will run in mock mode.'
        );
      }
      return;
    }

    if (!this.fromNumber) {
      console.warn(
        '⚠️ TWILIO_PHONE_NUMBER not configured. Using Twilio messaging service.'
      );
    }

    try {
      this.twilioClient = new Twilio(accountSid, authToken);

      if (this.debug) {
        console.log('📱 SMS service initialized with Twilio');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error);
    }
  }

  /**
   * Validate a phone number
   */
  validatePhoneNumber(
    phoneNumber: string,
    defaultCountry: string = 'US'
  ): PhoneValidationResult {
    try {
      if (!phoneNumber || phoneNumber.trim().length === 0) {
        return {
          isValid: false,
          error: 'Phone number is required',
        };
      }

      const parsed = parsePhoneNumber(phoneNumber, defaultCountry as any);

      if (!parsed) {
        return {
          isValid: false,
          error: 'Invalid phone number format',
        };
      }

      const isValid = parsed.isValid();

      return {
        isValid,
        formatted: isValid ? parsed.formatInternational() : undefined,
        country: parsed.country,
        type:
          (parsed.getType() as 'mobile' | 'landline' | undefined) || 'unknown',
        error: isValid ? undefined : 'Phone number is not valid',
      };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error ? error.message : 'Phone validation failed',
      };
    }
  }

  /**
   * Send an SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    // Validate phone number first
    const validation = this.validatePhoneNumber(message.to);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Invalid phone number',
      };
    }

    // In development mode, return mock response
    if (isDevelopmentMode() || !this.twilioClient) {
      if (this.debug) {
        console.log('📱 Mock SMS sent:', {
          to: validation.formatted,
          body: message.body,
          from: message.from || this.fromNumber || 'Mock SMS Service',
        });
      }

      return {
        success: true,
        messageId: `mock_${Date.now()}`,
        deliveryStatus: 'delivered',
      };
    }

    try {
      const fromNumber = message.from || this.fromNumber;

      if (!fromNumber) {
        return {
          success: false,
          error: 'No sender phone number configured',
        };
      }

      const response = await this.twilioClient.messages.create({
        body: message.body,
        from: fromNumber,
        to: validation.formatted!,
      });

      if (this.debug) {
        console.log('📱 SMS sent successfully:', {
          messageId: response.sid,
          to: validation.formatted,
          status: response.status,
        });
      }

      return {
        success: true,
        messageId: response.sid,
        deliveryStatus: this.mapTwilioStatus(response.status),
      };
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSMS(
    phoneNumbers: string[],
    body: string
  ): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];

    for (const phoneNumber of phoneNumbers) {
      const result = await this.sendSMS({
        to: phoneNumber,
        body,
      });
      results.push(result);

      // Add small delay to avoid rate limiting
      if (!isDevelopmentMode()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Check if SMS service is properly configured
   */
  isConfigured(): boolean {
    return this.twilioClient !== null || isDevelopmentMode();
  }

  /**
   * Get SMS service status
   */
  getStatus(): {
    configured: boolean;
    provider: string;
    fromNumber: string | null;
    mode: 'production' | 'development';
  } {
    return {
      configured: this.isConfigured(),
      provider: 'Twilio',
      fromNumber: this.fromNumber,
      mode: isDevelopmentMode() ? 'development' : 'production',
    };
  }

  /**
   * Map Twilio status to our standard status
   */
  private mapTwilioStatus(
    status: string
  ): 'queued' | 'sent' | 'delivered' | 'failed' {
    switch (status) {
      case 'queued':
      case 'accepted':
        return 'queued';
      case 'sending':
      case 'sent':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'failed':
      case 'undelivered':
        return 'failed';
      default:
        return 'queued';
    }
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(
    phoneNumber: string,
    defaultCountry: string = 'US'
  ): string {
    const validation = this.validatePhoneNumber(phoneNumber, defaultCountry);
    return validation.formatted || phoneNumber;
  }

  /**
   * Test SMS functionality (development only)
   */
  async testSMS(phoneNumber: string): Promise<SMSResponse> {
    if (!isDevelopmentMode()) {
      return {
        success: false,
        error: 'Test SMS only available in development mode',
      };
    }

    return this.sendSMS({
      to: phoneNumber,
      body: 'Test SMS from Teton Tracker! Your SMS notifications are working correctly. 🚁',
    });
  }
}

// Export singleton instance
export const smsService = SMSService.getInstance();

// Development testing helper
if (isDevelopmentMode() && typeof window !== 'undefined') {
  (window as any).testSMS = {
    send: (phoneNumber: string) => smsService.testSMS(phoneNumber),
    validate: (phoneNumber: string) =>
      smsService.validatePhoneNumber(phoneNumber),
    status: () => smsService.getStatus(),
  };
}

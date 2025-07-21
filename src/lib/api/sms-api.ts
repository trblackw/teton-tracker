import { API_BASE, createFetchOptions } from './api-tools';

export const smsApi = {
  // Send SMS message
  async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<{
    success: boolean;
    messageId?: string;
    deliveryStatus?: string;
    error?: string;
  }> {
    const response = await fetch(
      `${API_BASE}/sms/send`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ phoneNumber, message }),
      })
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send SMS');
    }

    return response.json();
  },

  // Validate phone number
  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    formatted?: string;
    country?: string;
    type?: string;
    error?: string;
  }> {
    const response = await fetch(
      `${API_BASE}/sms/validate`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      })
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to validate phone number');
    }

    return response.json();
  },

  // Get SMS service status
  async getStatus(): Promise<{
    configured: boolean;
    provider: string;
    fromNumber: string | null;
    mode: string;
  }> {
    const response = await fetch(
      `${API_BASE}/sms/status`,
      createFetchOptions()
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get SMS status');
    }

    return response.json();
  },
};

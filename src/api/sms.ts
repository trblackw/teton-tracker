import { createErrorResponse } from '../lib/access-control';
import { initJSONResponse } from '../lib/api/api-tools';
import { smsService } from '../lib/services/sms-service';

// POST /api/sms/send
export async function POST(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    // const user = await requireAuth(request);

    const body = await request.json();
    const { phoneNumber, message } = body as {
      phoneNumber: string;
      message: string;
    };

    // Validate required fields
    if (!phoneNumber || !message) {
      return initJSONResponse(
        { error: 'Phone number and message are required' },
        400
      );
    }

    // Send SMS using server-side SMS service
    const result = await smsService.sendSMS({
      to: phoneNumber,
      body: message,
    });

    if (result.success) {
      return initJSONResponse({
        success: true,
        messageId: result.messageId,
        deliveryStatus: result.deliveryStatus,
      });
    } else {
      return initJSONResponse({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('SMS API error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Unknown SMS error')
    );
  }
}

// POST /api/sms/validate
export async function validate(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    // const user = await requireAuth(request);

    const body = await request.json();
    const { phoneNumber } = body as {
      phoneNumber: string;
    };

    if (!phoneNumber) {
      return initJSONResponse({
        error: 'Phone number is required',
      });
    }

    // Validate phone number using server-side SMS service
    const validation = smsService.validatePhoneNumber(phoneNumber);

    return initJSONResponse(validation);
  } catch (error) {
    console.error('SMS validation API error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Unknown validation error')
    );
  }
}

// GET /api/sms/status
export async function GET(request: Request): Promise<Response> {
  try {
    // Validate auth and get user from session
    // const user = await requireAuth(request);

    // Get SMS service status
    const status = smsService.getStatus();

    return initJSONResponse(status);
  } catch (error) {
    console.error('SMS status API error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Unknown status error')
    );
  }
}

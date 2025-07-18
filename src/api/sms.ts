import { createErrorResponse, requireAuth } from '../lib/access-control';
import { smsService } from '../lib/services/sms-service';

// POST /api/sms/send
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { phoneNumber, message, userId } = body as {
      phoneNumber: string;
      message: string;
      userId: string;
    };

    // Validate required fields
    if (!phoneNumber || !message || !userId) {
      return new Response(
        JSON.stringify({
          error: 'Phone number, message, and user ID are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Require authentication
    const authUserId = requireAuth(userId);

    // Send SMS using server-side SMS service
    const result = await smsService.sendSMS({
      to: phoneNumber,
      body: message,
    });

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          messageId: result.messageId,
          deliveryStatus: result.deliveryStatus,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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
    const body = await request.json();
    const { phoneNumber, userId } = body as {
      phoneNumber: string;
      userId: string;
    };

    if (!phoneNumber || !userId) {
      return new Response(
        JSON.stringify({
          error: 'Phone number and user ID are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Require authentication
    requireAuth(userId);

    // Validate phone number using server-side SMS service
    const validation = smsService.validatePhoneNumber(phoneNumber);

    return new Response(JSON.stringify(validation), {
      headers: { 'Content-Type': 'application/json' },
    });
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
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Require authentication
    requireAuth(userId);

    // Get SMS service status
    const status = smsService.getStatus();

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SMS status API error:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Unknown status error')
    );
  }
}

# SMS Notification Setup

This guide explains how to set up SMS notifications for Teton Tracker using Twilio.

## Overview

Teton Tracker supports sending SMS notifications for:

- Flight status changes
- Traffic alerts
- Run reminders

SMS notifications work alongside push notifications and can be configured per notification type.

## Prerequisites

1. A Twilio account
2. A verified phone number for sending SMS
3. Environment variables configured

## Setup Steps

### 1. Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a new account or log in
3. Complete phone number verification

### 2. Get Twilio Credentials

1. In the Twilio Console, go to **Account** > **API Keys & Tokens**
2. Note down your:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (keep this secret)

### 3. Get a Phone Number

#### Option A: Trial Account (Development)

- Twilio trial accounts include a free phone number
- Can only send to verified numbers
- Messages include "Sent from your Twilio trial account"

#### Option B: Paid Account (Production)

1. Go to **Phone Numbers** > **Manage** > **Buy a number**
2. Choose a number that supports SMS
3. Purchase the number

### 4. Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Required Variables:**

- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number (with country code)

### 5. Test SMS Setup

You can test SMS functionality in development mode:

```javascript
// Open browser console on your app
window.testSMS.send('+1234567890'); // Replace with your phone number
```

## User Configuration

### For Users to Enable SMS:

1. Go to **Settings** page
2. Add phone number in international format (+1234567890)
3. Enable "SMS Notifications"
4. Choose which types of SMS notifications to receive:
   - Flight Updates
   - Traffic Alerts
   - Run Reminders

## SMS Message Format

SMS messages are automatically formatted for readability and stay within the 160-character limit:

**Flight Updates:**

```
Flight AA1234: Delayed (Gate B5) - Teton Tracker
```

**Traffic Alerts:**

```
Traffic Alert: heavy conditions on your route - Teton Tracker
```

**Run Reminders:**

```
Run reminder: Pickup at Airport Terminal at 3:30 PM - Teton Tracker
```

## Pricing

### Twilio Pricing (as of 2024):

- **SMS**: ~$0.0075 per message in the US
- **Phone Number**: ~$1.00/month for US numbers
- **International**: Varies by country

### Cost Estimation:

- **Light usage** (10 SMS/month): ~$0.08/month
- **Moderate usage** (100 SMS/month): ~$0.75/month
- **Heavy usage** (500 SMS/month): ~$3.75/month

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate tokens regularly** in production
4. **Validate phone numbers** before sending
5. **Implement rate limiting** to prevent abuse

## Development vs Production

### Development Mode:

- SMS messages are logged to console instead of sent
- No actual SMS charges incurred
- Can test without valid Twilio credentials

### Production Mode:

- Requires valid Twilio credentials
- Actual SMS messages are sent
- SMS charges apply

## Troubleshooting

### Common Issues:

1. **SMS not sending:**
   - Check Twilio credentials are correct
   - Verify phone number format (+1234567890)
   - Check Twilio account balance
   - Verify phone number is not blocked

2. **"Phone number not verified" error:**
   - In trial accounts, add recipient number to verified numbers
   - Upgrade to paid account for unrestricted sending

3. **Invalid phone number:**
   - Ensure number includes country code
   - Use international format (+1234567890)
   - Verify number is mobile (SMS-capable)

### Debug Mode:

Enable debug logging by checking browser console for SMS-related logs:

- `📱 SMS service initialized with Twilio`
- `📱 SMS sent successfully: [message_id]`
- `❌ Failed to send SMS: [error]`

## Alternative SMS Providers

While this setup uses Twilio, the SMS service can be adapted for other providers:

- **Telnyx**: Cost-effective alternative
- **Sinch**: Good international coverage
- **AWS SNS**: If already using AWS
- **Vonage**: Simple API

To use a different provider, modify `src/lib/services/sms-service.ts`.

## Support

For issues specific to:

- **Twilio**: Check [Twilio Documentation](https://www.twilio.com/docs)
- **SMS Service**: Check application logs and console
- **Configuration**: Verify environment variables and user preferences

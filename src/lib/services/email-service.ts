/**
 * Email Service for sending invitation emails
 *
 * This service handles sending organization invitation emails.
 * - Development: Uses MailHog via SMTP (localhost:1025)
 * - Production: Uses SendGrid
 */

import * as nodemailer from 'nodemailer';
import { getBaseUrl, isDevelopment } from '../environment';

export interface InvitationEmailData {
  email: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  teamName?: string;
  inviteLink: string;
  expiresAt?: Date;
}

export class EmailService {
  /**
   * Send an organization invitation email
   */
  static async sendOrganizationInvitation(
    data: InvitationEmailData
  ): Promise<void> {
    try {
      if (isDevelopment()) {
        // Development: Send via MailHog SMTP
        await this.sendWithSMTP(data);
        console.log(
          `📧 Development email sent to ${data.email} (check http://localhost:8025)`
        );
      } else {
        // Production: Send via SendGrid
        await this.sendWithSendGrid(data);
        console.log(`✅ Production email sent to ${data.email} via SendGrid`);
      }
    } catch (error) {
      console.error('❌ Failed to send invitation email:', error);
      throw new Error('Failed to send invitation email');
    }
  }

  /**
   * Generate invitation email HTML content
   */
  private static generateInvitationHTML(data: InvitationEmailData): string {
    const baseUrl = getBaseUrl();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>You're invited to ${data.organizationName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .content { background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Teton Tracker</div>
            </div>
            
            <div class="content">
              <h2>You're invited to join ${data.organizationName}</h2>
              <p>Hi there!</p>
              <p>${data.inviterName} (${data.inviterEmail}) has invited you to join <strong>${data.organizationName}</strong> on Teton Tracker.</p>
              ${data.teamName ? `<p>You'll be added to the <strong>${data.teamName}</strong> team.</p>` : ''}
              <p>Click the button below to accept the invitation:</p>
              <a href="${data.inviteLink}" class="button">Accept Invitation</a>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${data.inviteLink}</p>
              ${data.expiresAt ? `<p><small>This invitation expires on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}.</small></p>` : ''}
            </div>
            
            <div class="footer">
              <p>This invitation was sent by ${data.inviterName} from ${data.organizationName}.</p>
              <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate invitation email text content
   */
  private static generateInvitationText(data: InvitationEmailData): string {
    return `
You're invited to join ${data.organizationName}

Hi there!

${data.inviterName} (${data.inviterEmail}) has invited you to join ${data.organizationName} on Teton Tracker.
${data.teamName ? `You'll be added to the ${data.teamName} team.\n` : ''}
Click the link below to accept the invitation:

${data.inviteLink}

${data.expiresAt ? `This invitation expires on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}.\n` : ''}
If you weren't expecting this invitation, you can safely ignore this email.

This invitation was sent by ${data.inviterName} from ${data.organizationName}.
    `.trim();
  }

  /**
   * Send email via SMTP (MailHog in development, real SMTP in production)
   */
  private static async sendWithSMTP(data: InvitationEmailData): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@tetontracker.com',
      to: data.email,
      subject: `You're invited to join ${data.organizationName}`,
      text: this.generateInvitationText(data),
      html: this.generateInvitationHTML(data),
    });
  }

  /**
   * Send email via SendGrid (Production)
   */
  private static async sendWithSendGrid(
    data: InvitationEmailData
  ): Promise<void> {
    // Install: bun add @sendgrid/mail
    const sgMail = require('@sendgrid/mail');

    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: data.email,
      from: process.env.FROM_EMAIL || 'noreply@tetontracker.com',
      subject: `You're invited to join ${data.organizationName}`,
      text: this.generateInvitationText(data),
      html: this.generateInvitationHTML(data),
    };

    await sgMail.send(msg);
  }
}

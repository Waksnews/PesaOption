/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';

export class EmailService {
  private static getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });
    }

    return null; // SMTP not fully configured
  }

  /**
   * Sends a styled Password Reset Email to the user
   */
  public static async sendPasswordResetEmail(
    recipientEmail: string,
    username: string,
    resetUrl: string
  ): Promise<boolean> {
    const fromAddress = process.env.EMAIL_FROM || 'PesaOption Security <no-reply@pesaoption.com>';

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - PesaOption</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060913; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #060913; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #090D1A; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-b: 1px solid #1E293B; background-color: #0D1326; text-align: center;">
              <div style="font-size: 24px; font-weight: 800; tracking: 1px; color: #FFFFFF; font-family: monospace;">
                PESA<span style="color: #3B82F6;">OPTION</span>
              </div>
              <div style="font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; font-family: monospace;">
                Account Security Notice
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #F8FAFC; margin-top: 0; margin-bottom: 16px;">
                Hello ${username},
              </h2>
              
              <p style="font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 24px;">
                We received a request to reset your password for your <strong>PesaOption</strong> trading account.
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 28px;">
                Click the button below to set a new password for your account:
              </p>

              <!-- Reset Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #2563EB;">
                    <a href="${resetUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; inline-block; padding: 14px 32px; border-radius: 12px; display: inline-block;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #0F172A; border: 1px solid #1E293B; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; text-align: left;">
                <p style="font-size: 12px; color: #94A3B8; margin: 0; line-height: 1.5;">
                  ⏱️ <strong>Note:</strong> This password reset link expires in <strong>15 minutes</strong> for security.
                </p>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0;">
                If you didn't request this, simply ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Direct Link Section -->
          <tr>
            <td style="padding: 0 32px 32px 32px; font-size: 11px; color: #475569; word-break: break-all;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3B82F6; text-decoration: underline;">${resetUrl}</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #060913; border-top: 1px solid #1E293B; text-align: center; font-size: 12px; color: #475569;">
              © PesaOption. All rights reserved.<br>
              <span style="font-size: 10px; color: #334155;">Institutional Digital Trading Platform</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const transporter = this.getTransporter();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: recipientEmail,
          subject: 'Reset Your PesaOption Password',
          html: htmlContent,
        });
        console.log(`[EMAIL SERVICE] Password reset email sent to ${recipientEmail}`);
        return true;
      } catch (error) {
        console.error('[EMAIL SERVICE ERROR] Failed to send SMTP email:', error);
      }
    }

    // Dev Fallback / Log link to console for immediate preview/testing
    console.log(`\n==================================================`);
    console.log(`[EMAIL SERVICE FALLBACK - PASSWORD RESET URL]`);
    console.log(`Recipient: ${recipientEmail} (${username})`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`==================================================\n`);
    return true;
  }
}

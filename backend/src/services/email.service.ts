/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Resend } from 'resend';

export class EmailService {
  private static getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      return new Resend(apiKey);
    }
    return null;
  }

  /**
   * Sends a styled Password Reset Email to the user using the Resend API
   */
  public static async sendPasswordResetEmail(
    recipientEmail: string,
    fullName: string,
    resetUrl: string
  ): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const fromAddress = process.env.EMAIL_FROM || `${appName} <onboarding@resend.dev>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - ${appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F3F4F6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0B0F19; padding: 40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background-color: #0F172A; border-bottom: 1px solid #1F2937; text-align: center;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <span style="font-size: 26px; font-weight: 900; tracking: -0.5px; color: #FFFFFF; font-family: sans-serif;">
                      Pesa<span style="color: #0EA5E9;">Option</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-size: 11px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 2px;">
                      Trading Platform
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #F9FAFB; margin-top: 0; margin-bottom: 16px;">
                Hi ${fullName},
              </h2>
              
              <p style="font-size: 15px; line-height: 1.6; color: #9CA3AF; margin-bottom: 20px;">
                We received a request to reset the password for your account on <strong>${appName} Trading Platform</strong>.
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #9CA3AF; margin-bottom: 28px;">
                Please click the button below to set a new secure password and regain full access to your trading desk:
              </p>

              <!-- Reset Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 28px auto; width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; width: 80%; max-width: 280px; padding: 16px 24px; background-color: #0EA5E9; color: #FFFFFF; font-size: 15px; font-weight: 700; text-align: center; text-decoration: none; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Box -->
              <div style="background-color: #1E293B; border-left: 4px solid #10B981; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; text-align: left;">
                <p style="font-size: 13px; color: #E2E8F0; margin: 0; line-height: 1.5; font-weight: 500;">
                  ⏱️ <strong>Security Notice:</strong> This link expires in 15 minutes.
                </p>
              </div>

              <!-- Security Warning -->
              <p style="font-size: 13px; line-height: 1.5; color: #6B7280; margin: 0;">
                If you didn't request this reset simply ignore this email. Your password will remain completely unchanged and secure.
              </p>
            </td>
          </tr>

          <!-- Direct Link Alternative -->
          <tr>
            <td style="padding: 0 32px 32px 32px; font-size: 12px; color: #4B5563; word-break: break-all; line-height: 1.5;">
              If the button doesn't work, copy and paste this link into your web browser:<br>
              <a href="${resetUrl}" style="color: #0EA5E9; text-decoration: underline;">${resetUrl}</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0B0F19; border-top: 1px solid #1F2937; text-align: center; font-size: 12px; color: #6B7280;">
              © ${appName} Trading Platform. All rights reserved.<br>
              <span style="font-size: 11px; color: #4B5563; margin-top: 4px; display: inline-block;">Institutional-Grade Financial Markets Infrastructure</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      const resend = this.getResendClient();

      if (resend) {
        const response = await resend.emails.send({
          from: fromAddress,
          to: [recipientEmail],
          subject: `Reset Your ${appName} Password`,
          html: htmlContent,
        });

        if (response.error) {
          console.error('[EMAIL SERVICE ERROR] Resend API error:', response.error);
          return true;
        }

        console.log(`[EMAIL SERVICE] Password reset email sent via Resend to ${recipientEmail} (ID: ${response.data?.id})`);
        return true;
      } else {
        console.warn('[EMAIL SERVICE WARN] RESEND_API_KEY environment variable is not configured. Falling back to logger.');
        console.log(`\n==================================================`);
        console.log(`[EMAIL SERVICE FALLBACK - PASSWORD RESET URL]`);
        console.log(`Recipient: ${recipientEmail} (${fullName})`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log(`==================================================\n`);
        return true;
      }
    } catch (error: any) {
      console.error('[EMAIL SERVICE ERROR] Failed to send email via Resend:', error?.message || error);
      return true;
    }
  }
}

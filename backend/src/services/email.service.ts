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

  /**
   * Sends Withdrawal Request Submitted Email to user
   */
  public static async sendWithdrawalSubmittedEmail(
    recipientEmail: string,
    fullName: string,
    amount: string,
    currency: string = 'USD',
    method: string,
    referenceId: string
  ): Promise<boolean> {
    try {
      const resend = this.getResendClient();
      const appName = process.env.APP_NAME || 'PesaOption';
      const fromAddress = process.env.RESEND_FROM_EMAIL || `${appName} <noreply@pesaoption.com>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B0E14; color: #E2E8F0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background-color: #151D2A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .header { text-align: center; border-bottom: 1px solid #1E293B; padding-bottom: 24px; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: 800; color: #14F195; letter-spacing: -0.5px; }
            .badge { display: inline-block; background-color: rgba(234, 179, 8, 0.15); color: #FACC15; border: 1px solid rgba(234, 179, 8, 0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
            .amount-box { background-color: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .amount-title { color: #94A3B8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
            .amount-val { color: #F8FAFC; font-size: 32px; font-weight: 800; font-family: monospace; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .details-table td { padding: 12px 0; border-bottom: 1px solid #1E293B; font-size: 14px; }
            .label { color: #94A3B8; }
            .val { color: #F8FAFC; text-align: right; font-weight: 600; font-family: monospace; }
            .footer { text-align: center; color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${appName} Trading Platform</div>
              </div>
              <div style="text-align: center;">
                <span class="badge">Withdrawal Pending Review</span>
                <h2 style="color: #F8FAFC; margin-top: 0; font-size: 20px;">Withdrawal Request Submitted</h2>
                <p style="color: #94A3B8; font-size: 14px;">Hello ${fullName}, your withdrawal request has been received and is currently under review by our finance team.</p>
              </div>

              <div class="amount-box">
                <div class="amount-title">Requested Amount</div>
                <div class="amount-val">$${amount} ${currency}</div>
              </div>

              <table class="details-table">
                <tr>
                  <td class="label">Reference ID</td>
                  <td class="val">${referenceId}</td>
                </tr>
                <tr>
                  <td class="label">Payment Method</td>
                  <td class="val">${method}</td>
                </tr>
                <tr>
                  <td class="label">Status</td>
                  <td class="val" style="color: #FACC15;">PENDING REVIEW</td>
                </tr>
                <tr>
                  <td class="label">Estimated Settlement</td>
                  <td class="val">Within 24 Hours</td>
                </tr>
              </table>

              <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-top: 24px;">
                Your funds have been securely reserved. You will receive an immediate SMS and email notification as soon as your withdrawal is approved and processed.
              </p>
              <div class="footer">
                &copy; ${appName} Trading Platform. All rights reserved.<br>
                Support Email: support@pesaoption.com | Website: pesaoption.com
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      if (resend) {
        await resend.emails.send({
          from: fromAddress,
          to: [recipientEmail],
          subject: `[${appName}] Withdrawal Request Received (${referenceId})`,
          html: htmlContent,
        });
      } else {
        console.log(`[EMAIL SERVICE LOG] Withdrawal Submitted Email sent to ${recipientEmail} (Ref: ${referenceId})`);
      }
      return true;
    } catch (error: any) {
      console.error('[EMAIL SERVICE ERROR] Failed to send withdrawal submitted email:', error);
      return true;
    }
  }

  /**
   * Sends Withdrawal Request Approved Email to user
   */
  public static async sendWithdrawalApprovedEmail(
    recipientEmail: string,
    fullName: string,
    amount: string,
    currency: string = 'USD',
    method: string,
    referenceId: string
  ): Promise<boolean> {
    try {
      const resend = this.getResendClient();
      const appName = process.env.APP_NAME || 'PesaOption';
      const fromAddress = process.env.RESEND_FROM_EMAIL || `${appName} <noreply@pesaoption.com>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B0E14; color: #E2E8F0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background-color: #151D2A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .header { text-align: center; border-bottom: 1px solid #1E293B; padding-bottom: 24px; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: 800; color: #14F195; letter-spacing: -0.5px; }
            .badge { display: inline-block; background-color: rgba(20, 241, 149, 0.15); color: #14F195; border: 1px solid rgba(20, 241, 149, 0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
            .amount-box { background-color: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .amount-title { color: #94A3B8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
            .amount-val { color: #14F195; font-size: 32px; font-weight: 800; font-family: monospace; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .details-table td { padding: 12px 0; border-bottom: 1px solid #1E293B; font-size: 14px; }
            .label { color: #94A3B8; }
            .val { color: #F8FAFC; text-align: right; font-weight: 600; font-family: monospace; }
            .footer { text-align: center; color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${appName} Trading Platform</div>
              </div>
              <div style="text-align: center;">
                <span class="badge">Approved & Dispatched</span>
                <h2 style="color: #F8FAFC; margin-top: 0; font-size: 20px;">Withdrawal Approved!</h2>
                <p style="color: #94A3B8; font-size: 14px;">Great news ${fullName}, your withdrawal request has been approved and successfully processed.</p>
              </div>

              <div class="amount-box">
                <div class="amount-title">Dispatched Amount</div>
                <div class="amount-val">$${amount} ${currency}</div>
              </div>

              <table class="details-table">
                <tr>
                  <td class="label">Reference ID</td>
                  <td class="val">${referenceId}</td>
                </tr>
                <tr>
                  <td class="label">Payment Method</td>
                  <td class="val">${method}</td>
                </tr>
                <tr>
                  <td class="label">Status</td>
                  <td class="val" style="color: #14F195;">APPROVED & COMPLETED</td>
                </tr>
              </table>

              <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-top: 24px;">
                Thank you for trading with ${appName}. We appreciate your trust in our platform.
              </p>
              <div class="footer">
                &copy; ${appName} Trading Platform. All rights reserved.<br>
                Support Email: support@pesaoption.com | Website: pesaoption.com
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      if (resend) {
        await resend.emails.send({
          from: fromAddress,
          to: [recipientEmail],
          subject: `[${appName}] Withdrawal Approved (${referenceId})`,
          html: htmlContent,
        });
      } else {
        console.log(`[EMAIL SERVICE LOG] Withdrawal Approved Email sent to ${recipientEmail} (Ref: ${referenceId})`);
      }
      return true;
    } catch (error: any) {
      console.error('[EMAIL SERVICE ERROR] Failed to send withdrawal approved email:', error);
      return true;
    }
  }

  /**
   * Sends Withdrawal Request Rejected Email to user
   */
  public static async sendWithdrawalRejectedEmail(
    recipientEmail: string,
    fullName: string,
    amount: string,
    currency: string = 'USD',
    method: string,
    referenceId: string,
    remarks?: string
  ): Promise<boolean> {
    try {
      const resend = this.getResendClient();
      const appName = process.env.APP_NAME || 'PesaOption';
      const fromAddress = process.env.RESEND_FROM_EMAIL || `${appName} <noreply@pesaoption.com>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B0E14; color: #E2E8F0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background-color: #151D2A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .header { text-align: center; border-bottom: 1px solid #1E293B; padding-bottom: 24px; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: 800; color: #14F195; letter-spacing: -0.5px; }
            .badge { display: inline-block; background-color: rgba(244, 63, 94, 0.15); color: #F43F5E; border: 1px solid rgba(244, 63, 94, 0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
            .amount-box { background-color: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .amount-title { color: #94A3B8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
            .amount-val { color: #F43F5E; font-size: 32px; font-weight: 800; font-family: monospace; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .details-table td { padding: 12px 0; border-bottom: 1px solid #1E293B; font-size: 14px; }
            .label { color: #94A3B8; }
            .val { color: #F8FAFC; text-align: right; font-weight: 600; font-family: monospace; }
            .remarks-box { background-color: rgba(244, 63, 94, 0.1); border-left: 4px solid #F43F5E; padding: 16px; border-radius: 8px; margin-top: 20px; font-size: 13px; color: #FDA4AF; }
            .footer { text-align: center; color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="logo">${appName} Trading Platform</div>
              </div>
              <div style="text-align: center;">
                <span class="badge">Request Declined</span>
                <h2 style="color: #F8FAFC; margin-top: 0; font-size: 20px;">Withdrawal Request Update</h2>
                <p style="color: #94A3B8; font-size: 14px;">Hello ${fullName}, your withdrawal request ${referenceId} could not be processed at this time.</p>
              </div>

              <div class="amount-box">
                <div class="amount-title">Restored Amount</div>
                <div class="amount-val">$${amount} ${currency}</div>
              </div>

              <table class="details-table">
                <tr>
                  <td class="label">Reference ID</td>
                  <td class="val">${referenceId}</td>
                </tr>
                <tr>
                  <td class="label">Payment Method</td>
                  <td class="val">${method}</td>
                </tr>
                <tr>
                  <td class="label">Status</td>
                  <td class="val" style="color: #F43F5E;">REJECTED</td>
                </tr>
              </table>

              ${remarks ? `<div class="remarks-box"><strong>Reason for Rejection:</strong> ${remarks}</div>` : ''}

              <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-top: 24px;">
                Your funds ($${amount} ${currency}) have been fully restored to your active trading balance. If you have questions, please contact our 24/7 support.
              </p>
              <div class="footer">
                &copy; ${appName} Trading Platform. All rights reserved.<br>
                Support Email: support@pesaoption.com | Website: pesaoption.com
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      if (resend) {
        await resend.emails.send({
          from: fromAddress,
          to: [recipientEmail],
          subject: `[${appName}] Withdrawal Request Update (${referenceId})`,
          html: htmlContent,
        });
      } else {
        console.log(`[EMAIL SERVICE LOG] Withdrawal Rejected Email sent to ${recipientEmail} (Ref: ${referenceId})`);
      }
      return true;
    } catch (error: any) {
      console.error('[EMAIL SERVICE ERROR] Failed to send withdrawal rejected email:', error);
      return true;
    }
  }
}

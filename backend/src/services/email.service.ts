/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Resend } from 'resend';

export class EmailService {
  private static getFromAddress(): string {
    const appName = process.env.APP_NAME || 'PesaOption';
    const customFrom = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
    if (customFrom && customFrom.trim()) {
      return customFrom.trim();
    }
    // Default fallback to onboarding@resend.dev which works with default Resend test domains
    return `${appName} <onboarding@resend.dev>`;
  }

  private static getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = this.getFromAddress();
    const maskedKey = apiKey ? `${apiKey.substring(0, 5)}...${apiKey.slice(-4)}` : 'MISSING';
    
    console.log(`[EMAIL SERVICE INIT] RESEND_API_KEY: ${maskedKey} | From Address: "${fromAddress}"`);

    if (apiKey) {
      try {
        return new Resend(apiKey);
      } catch (err: any) {
        console.error('[EMAIL SERVICE INIT ERROR] Failed to instantiate Resend client:', err?.message || err);
        return null;
      }
    }
    return null;
  }

  /**
   * Internal helper to dispatch email via Resend and handle errors & logs gracefully
   */
  private static async dispatchEmail(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    logTag: string
  ): Promise<boolean> {
    const fromAddress = this.getFromAddress();
    const appName = process.env.APP_NAME || 'PesaOption';

    console.log(`[EMAIL SERVICE] Sending "${subject}" to ${recipientEmail} via "${fromAddress}"`);

    try {
      const resend = this.getResendClient();

      if (resend) {
        console.log(`[EMAIL SERVICE PROVIDER REQUEST] Resend payload -> to: ${recipientEmail}, from: ${fromAddress}, subject: "${subject}"`);
        const response = await resend.emails.send({
          from: fromAddress,
          to: [recipientEmail],
          subject,
          html: htmlContent,
        });

        if (response.error) {
          console.error(`[EMAIL SERVICE PROVIDER ERROR] Resend returned error for ${recipientEmail}:`, {
            name: response.error.name,
            message: response.error.message,
            statusCode: (response.error as any)?.statusCode || 'N/A',
            rawError: JSON.stringify(response.error),
          });
          return false;
        }

        console.log(`[EMAIL SERVICE PROVIDER SUCCESS] Email successfully sent to ${recipientEmail} (Resend ID: ${response.data?.id})`);
        return true;
      } else {
        console.warn(`[EMAIL SERVICE WARN] RESEND_API_KEY is not configured. Falling back to logger.`);
        console.log(`\n==================================================`);
        console.log(`[EMAIL PLACEHOLDER - ${logTag}]`);
        console.log(`Recipient: ${recipientEmail}`);
        console.log(`From: ${fromAddress}`);
        console.log(`Subject: ${subject}`);
        console.log(`==================================================\n`);
        return true;
      }
    } catch (error: any) {
      console.error(`[EMAIL SERVICE ERROR] Failed to send email [${logTag}] to ${recipientEmail}:`, {
        message: error?.message || error,
        stack: error?.stack,
        rawError: JSON.stringify(error),
      });
      return false;
    }
  }

  /**
   * Sends a styled Password Reset Email to the user
   */
  public static async sendPasswordResetEmail(
    recipientEmail: string,
    fullName: string,
    resetUrl: string
  ): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const subject = `Reset Your ${appName} Password`;

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

    return this.dispatchEmail(recipientEmail, subject, htmlContent, 'PASSWORD_RESET');
  }

  /**
   * Sends Welcome Email upon registration
   */
  public static async sendWelcomeEmail(
    recipientEmail: string,
    fullName: string
  ): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const subject = `Welcome to ${appName} Trading Platform!`;

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
          .badge { display: inline-block; background-color: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
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
              <span class="badge">Account Provisioned</span>
              <h2 style="color: #F8FAFC; margin-top: 0; font-size: 20px;">Welcome, ${fullName}!</h2>
              <p style="color: #94A3B8; font-size: 14px;">Your account has been successfully setup and provisioned with both Real and Demo balances.</p>
            </div>
            <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-top: 24px;">
              You can now deposit funds using M-Pesa, IntaSend, or Crypto and begin trading options, forex, and digital assets instantly.
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

    return this.dispatchEmail(recipientEmail, subject, htmlContent, 'WELCOME');
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
    const appName = process.env.APP_NAME || 'PesaOption';
    const subject = `[${appName}] Withdrawal Request Received (${referenceId})`;

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

    return this.dispatchEmail(recipientEmail, subject, htmlContent, 'WITHDRAWAL_SUBMITTED');
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
    const appName = process.env.APP_NAME || 'PesaOption';
    const subject = `[${appName}] Withdrawal Approved (${referenceId})`;

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

    return this.dispatchEmail(recipientEmail, subject, htmlContent, 'WITHDRAWAL_APPROVED');
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
    const appName = process.env.APP_NAME || 'PesaOption';
    const subject = `[${appName}] Withdrawal Request Update (${referenceId})`;

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

    return this.dispatchEmail(recipientEmail, subject, htmlContent, 'WITHDRAWAL_REJECTED');
  }

  /**
   * Sends Deposit Receipt Email to user
   */
  public static async sendDepositEmail(
    recipientEmail: string,
    fullName: string,
    amount: string,
    currency: string = 'USD',
    referenceId: string
  ): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const subject = `[${appName}] Deposit Confirmed (${referenceId})`;

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
              <span class="badge">Deposit Credited</span>
              <h2 style="color: #F8FAFC; margin-top: 0; font-size: 20px;">Funds Received!</h2>
              <p style="color: #94A3B8; font-size: 14px;">Hello ${fullName}, your deposit has been confirmed and credited to your trading account.</p>
            </div>

            <div class="amount-box">
              <div class="amount-title">Credited Amount</div>
              <div class="amount-val">${amount} ${currency}</div>
            </div>

            <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-top: 24px;">
              Reference ID: <strong>${referenceId}</strong><br>
              Happy trading on ${appName}!
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

    return this.dispatchEmail(recipientEmail, subject, htmlContent, 'DEPOSIT_CREDITED');
  }

  /**
   * Sends Admin Notification Email when new withdrawal is submitted
   */
  public static async sendAdminWithdrawalAlertEmail(
    adminEmail: string,
    userEmail: string,
    userPhone: string,
    amount: string,
    referenceId: string
  ): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const subject = `[${appName} ADMIN] New Withdrawal Request (${referenceId})`;

    const htmlContent = `
      <div style="font-family: sans-serif; background: #0B0E14; color: #E2E8F0; padding: 24px; border-radius: 8px;">
        <h3 style="color: #FACC15;">New Withdrawal Pending Review</h3>
        <p><strong>Reference ID:</strong> ${referenceId}</p>
        <p><strong>User Email:</strong> ${userEmail}</p>
        <p><strong>User Phone:</strong> ${userPhone}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p>Please log in to the admin dashboard to review and approve/reject this request.</p>
      </div>
    `;

    return this.dispatchEmail(adminEmail, subject, htmlContent, 'ADMIN_WITHDRAWAL_ALERT');
  }
}


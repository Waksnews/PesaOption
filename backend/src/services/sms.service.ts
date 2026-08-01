/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import AfricasTalking from 'africastalking';

export class SMSService {
  private static getClient() {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;

    if (username && apiKey) {
      try {
        const at = AfricasTalking({
          username,
          apiKey,
        });
        return at.SMS;
      } catch (err) {
        console.error('[SMS SERVICE ERROR] Failed to initialize Africa\'s Talking SDK:', err);
        return null;
      }
    }
    return null;
  }

  /**
   * Sends an SMS message to a given recipient.
   * If Africa's Talking credentials are not set up, it logs a clean placeholder without throwing errors.
   */
  public static async sendSMS(phone: string, message: string): Promise<boolean> {
    const smsClient = this.getClient();

    if (smsClient) {
      try {
        const result = await smsClient.send({
          to: [phone],
          message,
        });
        console.log(`[SMS SERVICE] Message successfully dispatched to ${phone}:`, result);
        return true;
      } catch (error: any) {
        console.error(`[SMS SERVICE ERROR] Error sending SMS to ${phone}:`, error?.message || error);
        return false;
      }
    }

    // Placeholder fallback when credentials are not supplied
    console.log(`\n==================================================`);
    console.log(`[SMS PLACEHOLDER]`);
    console.log(`Recipient: ${phone}`);
    console.log(`Message: ${message}`);
    console.log(`==================================================\n`);
    return true;
  }

  /**
   * Sends withdrawal request submitted SMS to user
   */
  public static async sendWithdrawalSubmittedSMS(phone: string, amount: string, reference: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const message = `${appName}: Your withdrawal request of ${amount} (Ref: ${reference}) has been received and is pending admin review. You will be notified once processed.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Sends withdrawal request approved SMS to user
   */
  public static async sendWithdrawalApprovedSMS(phone: string, amount: string, reference: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const message = `${appName}: Great news! Your withdrawal request ${reference} of ${amount} has been approved and processed. Funds are on their way to your account.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Sends withdrawal request rejected SMS to user
   */
  public static async sendWithdrawalRejectedSMS(phone: string, amount: string, reference: string, reason?: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const reasonText = reason ? ` Reason: ${reason}.` : '';
    const message = `${appName}: Your withdrawal request ${reference} of ${amount} was rejected.${reasonText} Your funds have been restored to your wallet.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Sends alert SMS to Admin when new withdrawal request is submitted
   */
  public static async sendAdminWithdrawalAlertSMS(adminPhone: string, userEmail: string, userPhone: string, amount: string, reference: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const message = `[${appName} ADMIN ALERT] New Withdrawal Request ${reference} for ${amount} by ${userEmail} (${userPhone || 'No Phone'}). Please log into Admin Panel to review.`;
    return this.sendSMS(adminPhone, message);
  }

  /**
   * Sends withdrawal confirmation SMS
   */
  public static async sendWithdrawalSMS(phone: string, amount: string, reference: string): Promise<boolean> {
    return this.sendWithdrawalSubmittedSMS(phone, amount, reference);
  }

  /**
   * Sends deposit confirmation SMS
   */
  public static async sendDepositSMS(phone: string, amount: string, reference: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const message = `${appName}: Deposit of ${amount} confirmed (Ref: ${reference}). Your trading balance has been updated. Happy trading!`;
    return this.sendSMS(phone, message);
  }

  /**
   * Sends welcome SMS upon registration
   */
  public static async sendWelcomeSMS(phone: string, fullName: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const message = `Welcome to ${appName}, ${fullName}! Your trading account is now active with both Real and Demo balances ready for binary options, forex & crypto trading.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Sends password reset SMS
   */
  public static async sendPasswordResetSMS(phone: string, resetUrl: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const message = `${appName}: Reset your password using this secure link: ${resetUrl} (Expires in 15 mins). If you did not request this, ignore this message.`;
    return this.sendSMS(phone, message);
  }
}

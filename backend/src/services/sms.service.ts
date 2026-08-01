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
   * Sends withdrawal confirmation SMS
   */
  public static async sendWithdrawalSMS(phone: string, amount: string, reference: string): Promise<boolean> {
    const appName = process.env.APP_NAME || 'PesaOption';
    const message = `${appName}: Your withdrawal of ${amount} (Ref: ${reference}) has been submitted and is being processed. Thank you for trading with us.`;
    return this.sendSMS(phone, message);
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

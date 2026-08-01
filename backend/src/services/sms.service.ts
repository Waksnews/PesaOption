/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import AfricasTalking from 'africastalking';

/**
 * Normalizes a Kenyan phone number to standard international format required by Africa's Talking: 254XXXXXXXXX
 * 
 * Accepted inputs:
 * - 0712345678 -> 254712345678
 * - 0111449572 -> 254111449572
 * - +254712345678 -> 254712345678
 * - 254712345678 -> 254712345678
 * 
 * Always outputs: 254712345678 (or 254111449572)
 * Returns null if the phone number is invalid.
 */
export function normalizeKenyanPhoneNumber(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  // Remove all non-digit characters
  const digits = trimmed.replace(/\D/g, '');

  // 1. Local 10-digit format starting with 07 or 01 (e.g. 0712345678, 0111449572)
  if (/^0[17]\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  // 2. Full 12-digit format starting with 2547 or 2541 (e.g. 254712345678, 254111449572)
  if (/^254[17]\d{8}$/.test(digits)) {
    return digits;
  }

  // 3. 9-digit format starting with 7 or 1 (e.g. 712345678, 111449572)
  if (/^[17]\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  return null;
}

export class SMSService {
  public static normalizeKenyanPhoneNumber = normalizeKenyanPhoneNumber;

  private static getClient(): { client: any; senderId?: string } | null {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const senderId = process.env.AFRICASTALKING_SENDER_ID || process.env.AFRICASTALKING_FROM;

    const maskedKey = apiKey ? `${apiKey.substring(0, 5)}...${apiKey.slice(-4)}` : 'MISSING';
    console.log(`[SMS SERVICE INIT] Username: ${username || 'MISSING'} | API Key: ${maskedKey} | Sender ID: ${senderId || 'None (default)'}`);

    if (username && apiKey) {
      try {
        const at = AfricasTalking({
          username,
          apiKey,
        });
        return { client: at.SMS, senderId };
      } catch (err: any) {
        console.error('[SMS SERVICE ERROR] Failed to initialize Africa\'s Talking SDK:', err?.message || err);
        return null;
      }
    }
    return null;
  }

  /**
   * Sends an SMS message to a given recipient.
   * Validates and normalizes phone number prior to sending.
   */
  public static async sendSMS(phone: string, message: string): Promise<boolean> {
    const normalizedPhone = normalizeKenyanPhoneNumber(phone);

    if (!normalizedPhone) {
      console.warn(`[SMS SERVICE VALIDATION] Invalid phone number provided: "${phone}". Skipped dispatch.`);
      console.log('[SMS] Invalid phone number');
      return false;
    }

    // Africa's Talking API requires international format with leading + (e.g. +254712345678)
    const formattedPhone = `+${normalizedPhone}`;

    console.log(`[SMS] Sending to ${normalizedPhone}`);
    console.log(`[SMS SERVICE] Sending SMS to ${formattedPhone} (Length: ${message.length} chars)`);

    const initResult = this.getClient();

    if (initResult && initResult.client) {
      try {
        const options: any = {
          to: [formattedPhone],
          message,
        };
        if (initResult.senderId) {
          options.from = initResult.senderId;
        }

        console.log(`[SMS SERVICE PROVIDER REQUEST] Dispatching to Africa's Talking SDK:`, {
          to: options.to,
          from: options.from || 'default',
        });

        const result = await initResult.client.send(options);
        console.log(`[SMS SERVICE PROVIDER RESPONSE] Africa's Talking result:`, JSON.stringify(result));

        // Inspect recipient delivery status array in Africa's Talking response
        const recipients = result?.SMSMessageData?.Recipients || [];
        for (const rec of recipients) {
          console.log(`[SMS DELIVERY STATUS] Recipient: ${rec.number} | Status: ${rec.status} | Cost: ${rec.cost} | MessageId: ${rec.messageId}`);
          if (rec.status !== 'Success' && rec.status !== 'Sent') {
            console.warn(`[SMS DELIVERY WARNING] Delivery status for ${rec.number} is "${rec.status}" (Reason: ${rec.status})`);
          }
        }

        return true;
      } catch (error: any) {
        console.error(`[SMS SERVICE ERROR] Error sending SMS to ${formattedPhone}:`, {
          message: error?.message || error,
          stack: error?.stack,
          rawError: JSON.stringify(error),
        });
        return false;
      }
    }

    // Placeholder fallback when credentials are not supplied
    console.warn('[SMS SERVICE WARN] Africa\'s Talking credentials not configured. Falling back to logger.');
    console.log(`\n==================================================`);
    console.log(`[SMS PLACEHOLDER]`);
    console.log(`Recipient: ${formattedPhone}`);
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

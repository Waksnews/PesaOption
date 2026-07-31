/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import crypto from 'crypto';
import { Database } from '../../server/db';
import { MpesaTransaction, MpesaStatus, Transaction, Notification } from '../types';
import { formatPhoneNumber, generateTimestamp, generatePassword } from '../utils/mpesa';
import { sendSMS } from '../../server/services/sms';

export class MpesaService {
  private static getBaseUrl(): string {
    return process.env.MPESA_ENV === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Generates Safaricom OAuth token
   */
  public static async generateOAuthToken(): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';

    if (!consumerKey || !consumerSecret) {
      throw new Error('M-PESA consumer key or secret is not configured in environment variables.');
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
      const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      }
      throw new Error('Failed to retrieve access token from Safaricom response.');
    } catch (error: any) {
      console.error('[MPESA SERVICE] OAuth Token Generation Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to authenticate with Safaricom Daraja API.');
    }
  }

  /**
   * Initiates STK Push
   */
  public static async initiateStkPush(userId: string, rawPhone: string, amount: number): Promise<any> {
    const db = Database.getInstance();
    
    // Find user to verify existence
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const phone = formatPhoneNumber(rawPhone);
    const baseUrl = this.getBaseUrl();
    const token = await this.generateOAuthToken();
    const timestamp = generateTimestamp();
    
    const shortcode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://pesaoption.com/api/mpesa/callback';
    
    const password = generatePassword(shortcode, passkey, timestamp);

    const requestBody = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: `User-${userId.substring(0, 8)}`,
      TransactionDesc: 'PesaOption Demo Wallet Topup',
    };

    try {
      console.log('[MPESA SERVICE] Sending STK Push to Safaricom...', requestBody);
      const response = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data && (response.data.ResponseCode === '0' || response.data.ResponseCode === 0)) {
        // Save request to Local DB (our simulated schema)
        const mpesaTx: MpesaTransaction = {
          id: 'mp_' + Math.random().toString(36).substr(2, 9),
          userId,
          phone,
          amount,
          merchantRequestId: response.data.MerchantRequestID,
          checkoutRequestId: response.data.CheckoutRequestID,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        db.mpesaTransactions.push(mpesaTx);
        db.save();

        console.log(`[MPESA SERVICE] STK Push transaction created and saved: ${mpesaTx.id}`);
        return response.data;
      }

      throw new Error(response.data.ResponseDescription || 'Safaricom STK Push request rejected.');
    } catch (error: any) {
      console.error('[MPESA SERVICE] STK Push Initiation Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Failed to initiate M-PESA STK Push.');
    }
  }

  /**
   * Processes Callback payload from Safaricom
   */
  public static async handleCallback(callbackData: any): Promise<void> {
    const db = Database.getInstance();
    
    if (!callbackData || !callbackData.stkCallback) {
      console.error('[MPESA CALLBACK] Invalid callback payload received.');
      return;
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData.stkCallback;
    console.log(`[MPESA CALLBACK] Received Callback. CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

    // Find the pending transaction in database
    const mpesaTx = db.mpesaTransactions.find(tx => tx.checkoutRequestId === CheckoutRequestID);
    if (!mpesaTx) {
      console.error(`[MPESA CALLBACK] No matching M-PESA Transaction found for CheckoutRequestID: ${CheckoutRequestID}`);
      return;
    }

    // If transaction is already processed, do not repeat to prevent double crediting
    if (mpesaTx.status !== 'PENDING') {
      console.log(`[MPESA CALLBACK] Transaction ${mpesaTx.id} is already processed with status: ${mpesaTx.status}`);
      return;
    }

    mpesaTx.resultCode = ResultCode;
    mpesaTx.resultDesc = ResultDesc;
    mpesaTx.updatedAt = new Date().toISOString();

    if (ResultCode === 0 || ResultCode === '0') {
      mpesaTx.status = 'SUCCESS';

      // Parse Receipt number from Metadata
      let receiptNumber = 'N/A';
      if (CallbackMetadata && CallbackMetadata.Item) {
        const receiptItem = CallbackMetadata.Item.find((item: any) => item.Name === 'MpesaReceiptNumber');
        if (receiptItem && receiptItem.Value) {
          receiptNumber = receiptItem.Value;
        }
      }
      mpesaTx.receiptNumber = receiptNumber;

      // Update User Wallet securely
      const userId = mpesaTx.userId;
      const wallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');
      if (wallet) {
        // Safaricom amount is in KES. Convert to USD equivalent using standard rate (1 USD = 130 KES)
        const USD_TO_KES_RATE = 130;
        const creditedAmount = mpesaTx.amount / USD_TO_KES_RATE;
        
        wallet.balance = (wallet.balance || 0) + creditedAmount;
        wallet.updatedAt = new Date().toISOString();

        // Create platform deposit transaction
        const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
        const platformTx: Transaction = {
          id: txId,
          userId,
          walletId: wallet.id,
          type: 'deposit',
          asset: 'USD',
          amount: creditedAmount,
          status: 'completed',
          txHash: '0x' + crypto.createHash('sha256').update(CheckoutRequestID).digest('hex'),
          description: `M-PESA STK Push Deposit (Receipt: ${receiptNumber}, KES ${mpesaTx.amount})`,
          createdAt: new Date().toISOString(),
        };

        db.transactions.push(platformTx);

        // Add Notification
        const notif: Notification = {
          id: 'not_' + Math.random().toString(36).substr(2, 9),
          userId,
          title: 'Deposit Successful',
          message: `Your M-PESA deposit of KES ${mpesaTx.amount.toLocaleString()} ($${creditedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD) was successful! Receipt: ${receiptNumber}`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        db.notifications.push(notif);

        // Send SMS Notification
        const targetUser = db.users.find(u => u.id === userId);
        const userPhone = mpesaTx.phone || targetUser?.phoneNumber;
        if (userPhone) {
          const ref = receiptNumber !== 'N/A' ? receiptNumber : CheckoutRequestID;
          const smsMsg = `PesaOption\n\nDeposit of KES ${mpesaTx.amount} received successfully.\n\nYour wallet has been credited.\n\nReference: ${ref}`;
          sendSMS(userPhone, smsMsg).catch(err => console.error('[MPESA SMS ERROR]', err));
        }

        console.log(`[MPESA CALLBACK] Successfully updated wallet and credited $${creditedAmount} USD for User: ${userId}`);
      } else {
        console.error(`[MPESA CALLBACK] Wallet not found for User: ${userId}`);
      }
    } else if (ResultCode === 1032) {
      mpesaTx.status = 'CANCELLED';
      console.log(`[MPESA CALLBACK] Transaction cancelled by user.`);
    } else {
      mpesaTx.status = 'FAILED';
      console.log(`[MPESA CALLBACK] Transaction failed with resultCode: ${ResultCode}`);
    }

    db.save();
  }

  /**
   * Checks status of transaction
   */
  public static getTransactionStatus(checkoutRequestId: string): MpesaTransaction | null {
    const db = Database.getInstance();
    const mpesaTx = db.mpesaTransactions.find(tx => tx.checkoutRequestId === checkoutRequestId);
    return mpesaTx || null;
  }
}

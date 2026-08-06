/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import crypto from 'crypto';
import { Database } from '../../server/db';
import { PaymentTransaction, Transaction, Notification } from '../types';
import { formatLipiaPhone, generateDepositReference, mapLipiaResultCode } from '../utils/lipia';
import { SMSService } from './sms.service';
import { EmailService } from './email.service';
import { ExchangeRateService } from './exchangeRate.service';

export class LipiaService {
  private static getBaseUrl(): string {
    return process.env.LIPIA_BASE_URL || 'https://lipia-api.kreativelabske.com/api/v2';
  }

  private static getApiKey(): string {
    return process.env.LIPIA_API_KEY || '';
  }

  /**
   * Initiates STK Push deposit via Lipia Online
   */
  public static async createDeposit(
    userId: string,
    email: string,
    rawPhone: string,
    amount: number,
    currency: string = 'KES',
    paymentMethod: string = 'M-PESA'
  ): Promise<{
    reference: string;
    externalReference: string;
    invoiceId: string;
    customerMessage: string;
    status: string;
  }> {
    const db = Database.getInstance();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const formattedPhone = formatLipiaPhone(rawPhone);
    const userEmail = email || user.email || 'trader@pesaoption.com';
    const wallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');

    const activeRate = ExchangeRateService.getRate('USD', 'KES');
    const inputCurrency = (currency || 'KES').toUpperCase();
    let paymentAmount = Math.round(amount);
    let creditedAmount = 0;

    if (inputCurrency === 'USD') {
      paymentAmount = Math.round(ExchangeRateService.convertUSDtoKES(amount, activeRate));
      creditedAmount = amount;
    } else {
      paymentAmount = Math.round(amount);
      creditedAmount = ExchangeRateService.convertKEStoUSD(amount, activeRate);
    }

    // Always generate a fresh unique reference (PO-DEP-XXXXXX)
    const externalReference = generateDepositReference();

    // Construct callback URL as specified: https://YOUR_DOMAIN/api/payment/lipia/callback
    const domain = process.env.APP_URL || process.env.FRONTEND_URL || 'https://pesaoption.com';
    const callbackUrl = `${domain.replace(/\/$/, '')}/api/payment/lipia/callback`;

    console.log(`[LIPIA] Creating STK Push`);
    console.log(`Reference: ${externalReference}`);

    const metadata = {
      userId,
      depositId: externalReference,
      walletId: wallet?.id || '',
      username: user.fullName || user.email,
      email: userEmail,
    };

    const payload = {
      phone_number: formattedPhone,
      amount: paymentAmount,
      external_reference: externalReference,
      callback_url: callbackUrl,
      metadata,
    };

    let lipiaTransactionReference = '';
    let merchantRequestId = '';
    let checkoutRequestId = '';
    let customerMessage = 'STK Push sent to your phone. Please enter your M-Pesa PIN.';

    if (apiKey) {
      try {
        const response = await axios.post(`${baseUrl}/payments/stk-push`, payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        });

        const data = response.data;
        console.log('[LIPIA] STK Push Response:', data);

        lipiaTransactionReference = data.transaction_reference || data.reference || data.id || data.lipiaTransactionReference || '';
        merchantRequestId = data.MerchantRequestID || data.merchant_request_id || '';
        checkoutRequestId = data.CheckoutRequestID || data.checkout_request_id || '';
        if (data.message || data.customerMessage) {
          customerMessage = data.message || data.customerMessage;
        }
      } catch (error: any) {
        console.error('[LIPIA] STK Push Error:', error.response?.data || error.message);
        throw new Error(
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data?.detail ||
          'Failed to initiate Lipia STK Push payment.'
        );
      }
    } else {
      console.warn('[LIPIA] LIPIA_API_KEY missing in environment variables.');
    }

    // Save pending deposit transaction record to database
    const paymentTx: PaymentTransaction = {
      id: 'pay_' + Math.random().toString(36).substr(2, 9),
      userId,
      invoiceId: externalReference,
      provider: 'lipia',
      paymentMethod,
      phone: formattedPhone,
      amount: paymentAmount,
      currency: 'KES',
      status: 'Pending',
      reference: externalReference,
      externalReference,
      lipiaTransactionReference,
      merchantRequestId,
      checkoutRequestId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentCurrency: 'KES',
      walletCurrency: 'USD',
      exchangeRate: activeRate,
      originalAmount: amount,
      creditedAmount,
      metadata,
    };

    db.paymentTransactions.push(paymentTx);
    db.save();

    return {
      reference: externalReference,
      externalReference,
      invoiceId: externalReference,
      customerMessage,
      status: 'PENDING',
    };
  }

  /**
   * Polls Lipia API status: GET /payments/status?reference=TRANSACTION_REFERENCE
   */
  public static async pollPaymentStatus(reference: string, userId?: string): Promise<PaymentTransaction> {
    const db = Database.getInstance();
    const paymentTx = db.paymentTransactions.find(
      tx => tx.reference === reference || tx.externalReference === reference || tx.invoiceId === reference || tx.id === reference
    );

    if (!paymentTx) {
      throw new Error(`Payment transaction with reference "${reference}" not found.`);
    }

    if (userId && paymentTx.userId !== userId) {
      throw new Error('Unauthorized access to payment status.');
    }

    if (paymentTx.status === 'Pending') {
      const apiKey = this.getApiKey();
      const baseUrl = this.getBaseUrl();

      console.log(`[LIPIA] Polling`);
      console.log(`Status: PENDING`);

      if (apiKey) {
        try {
          const response = await axios.get(
            `${baseUrl}/payments/status?reference=${encodeURIComponent(paymentTx.externalReference || paymentTx.reference || '')}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
              timeout: 10000,
            }
          );

          const data = response.data;
          console.log('[LIPIA] Status Poll Response:', data);

          const rawStatus = (data.status || data.Status || data.state || '').toUpperCase();
          const resultCode = data.result_code ?? data.ResultCode;
          const resultDesc = data.result_description || data.ResultDesc || data.message;

          if (rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED' || rawStatus === 'SUCCESSFUL' || resultCode === 0 || resultCode === '0') {
            console.log(`[LIPIA] Polling`);
            console.log(`Status: SUCCESS`);
            await this.creditWallet(paymentTx, data);
          } else if (rawStatus === 'FAILED' || rawStatus === 'REJECTED' || (resultCode !== undefined && resultCode !== 0 && resultCode !== '0')) {
            console.log(`[LIPIA] Polling`);
            console.log(`Status: FAILED`);
            paymentTx.status = 'Failed';
            paymentTx.resultCode = resultCode;
            paymentTx.resultDescription = resultDesc;
            paymentTx.failedReason = mapLipiaResultCode(resultCode, resultDesc);
            paymentTx.updatedAt = new Date().toISOString();
            db.save();
          }
        } catch (err: any) {
          console.warn('[LIPIA] Status Poll Error:', err.message);
        }
      }
    }

    return paymentTx;
  }

  /**
   * Handles Lipia callback POST /api/payment/lipia/callback
   */
  public static async handleCallback(payload: any): Promise<{ status: string; message: string }> {
    const db = Database.getInstance();

    console.log('[LIPIA] Callback Received');

    const extRef = payload.external_reference || payload.ExternalReference || payload.externalReference || payload.reference || payload.metadata?.depositId || payload.metadata?.deposit_id;
    const rawStatus = String(payload.Status || payload.status || payload.state || '').toUpperCase();
    const resultCode = payload.ResultCode ?? payload.result_code ?? payload.resultCode;
    const resultDesc = payload.ResultDesc || payload.result_description || payload.resultDescription || payload.message;
    const mpesaReceiptNumber = payload.MpesaReceiptNumber || payload.mpesa_receipt_number || payload.receiptNumber || '';
    const merchantRequestId = payload.MerchantRequestID || payload.merchant_request_id || '';
    const checkoutRequestId = payload.CheckoutRequestID || payload.checkout_request_id || '';
    const lipiaRef = payload.LipiaTransactionReference || payload.lipia_transaction_reference || payload.transaction_reference || '';

    const isSuccess = rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED' || rawStatus === 'SUCCESSFUL' || resultCode === 0 || resultCode === '0';
    const isFailed = rawStatus === 'FAILED' || rawStatus === 'REJECTED' || (resultCode !== undefined && resultCode !== 0 && resultCode !== '0');

    console.log(`Status: ${isSuccess ? 'SUCCESS' : isFailed ? 'FAILED' : rawStatus || 'PENDING'}`);

    if (!extRef) {
      console.error('[LIPIA] Callback missing external reference.');
      return { status: 'error', message: 'Missing external_reference' };
    }

    const paymentTx = db.paymentTransactions.find(
      tx => tx.externalReference === extRef || tx.reference === extRef || tx.invoiceId === extRef
    );

    if (!paymentTx) {
      console.error(`[LIPIA] Callback: Transaction record not found for reference ${extRef}`);
      return { status: 'ignored', message: 'Transaction record not found' };
    }

    // Idempotency: If already completed, return HTTP 200 without duplicate credit
    if (paymentTx.status === 'Completed') {
      console.log(`[LIPIA] Callback: Transaction ${extRef} already completed. Idempotent response returned.`);
      return { status: 'ok', message: 'Transaction already completed.' };
    }

    // Update fields from payload
    if (mpesaReceiptNumber) paymentTx.mpesaReceiptNumber = mpesaReceiptNumber;
    if (merchantRequestId) paymentTx.merchantRequestId = merchantRequestId;
    if (checkoutRequestId) paymentTx.checkoutRequestId = checkoutRequestId;
    if (lipiaRef) paymentTx.lipiaTransactionReference = lipiaRef;
    if (payload.metadata) paymentTx.metadata = { ...paymentTx.metadata, ...payload.metadata };

    if (isSuccess) {
      await this.creditWallet(paymentTx, payload);
      return { status: 'ok', message: 'Wallet credited successfully.' };
    } else if (isFailed) {
      paymentTx.status = 'Failed';
      paymentTx.resultCode = resultCode;
      paymentTx.resultDescription = resultDesc;
      paymentTx.failedReason = mapLipiaResultCode(resultCode, resultDesc);
      paymentTx.updatedAt = new Date().toISOString();
      db.save();
      console.log(`[LIPIA] Transaction ${extRef} marked FAILED. Reason: ${paymentTx.failedReason}`);
      return { status: 'ok', message: 'Transaction marked as failed.' };
    }

    return { status: 'ok', message: 'Callback received.' };
  }

  /**
   * Credits user wallet safely upon verified payment
   */
  private static async creditWallet(paymentTx: PaymentTransaction, payload: any): Promise<void> {
    const db = Database.getInstance();

    if (paymentTx.status === 'Completed') {
      return; // Idempotency guard: never credit twice
    }

    const userId = paymentTx.userId;
    const wallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');

    if (!wallet) {
      console.error(`[LIPIA] Wallet not found for user: ${userId}`);
      return;
    }

    const depositAmountKes = paymentTx.amount;
    const lockedRate = paymentTx.exchangeRate || ExchangeRateService.getRate('USD', 'KES');
    const creditedUsd = paymentTx.creditedAmount !== undefined
      ? paymentTx.creditedAmount
      : ExchangeRateService.convertKEStoUSD(depositAmountKes, lockedRate);

    // Store Lipia callback fields
    if (payload?.MpesaReceiptNumber || payload?.mpesa_receipt_number) {
      paymentTx.mpesaReceiptNumber = payload.MpesaReceiptNumber || payload.mpesa_receipt_number;
    }
    if (payload?.MerchantRequestID || payload?.merchant_request_id) {
      paymentTx.merchantRequestId = payload.MerchantRequestID || payload.merchant_request_id;
    }
    if (payload?.CheckoutRequestID || payload?.checkout_request_id) {
      paymentTx.checkoutRequestId = payload.CheckoutRequestID || payload.checkout_request_id;
    }
    if (payload?.ResultCode !== undefined || payload?.result_code !== undefined) {
      paymentTx.resultCode = payload.ResultCode ?? payload.result_code;
    }
    if (payload?.ResultDesc || payload?.result_description) {
      paymentTx.resultDescription = payload.ResultDesc || payload.result_description;
    }

    // 1. Mark transaction Completed
    paymentTx.status = 'Completed';
    paymentTx.updatedAt = new Date().toISOString();

    // 2. Credit user wallet
    wallet.balance = (wallet.balance || 0) + creditedUsd;
    wallet.updatedAt = new Date().toISOString();

    // 3. Add wallet transaction record
    const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
    const platformTx: Transaction = {
      id: txId,
      userId,
      walletId: wallet.id,
      type: 'deposit',
      asset: 'USD',
      amount: creditedUsd,
      status: 'completed',
      txHash: '0x' + crypto.createHash('sha256').update(paymentTx.externalReference || paymentTx.reference || txId).digest('hex'),
      description: `Lipia M-Pesa Deposit (Ref: ${paymentTx.reference}, KES ${depositAmountKes.toLocaleString()})`,
      createdAt: new Date().toISOString(),
    };
    db.transactions.push(platformTx);

    // 4. Audit log
    db.activityLogs.push({
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      userId,
      action: 'Lipia Deposit Credited',
      details: `Credited $${creditedUsd.toFixed(2)} USD via Lipia M-Pesa (Ref: ${paymentTx.reference})`,
      ipAddress: 'Lipia Callback Gateway',
      createdAt: new Date().toISOString(),
    });

    // 5. Notification
    db.notifications.push({
      id: 'not_' + Math.random().toString(36).substr(2, 9),
      userId,
      title: 'Deposit Received',
      message: `Deposit received. KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toFixed(2)} USD) credited to your wallet.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    db.save();

    console.log(`[LIPIA] Wallet Credited`);
    console.log(`User: ${userId}`);
    console.log(`Amount: KES ${depositAmountKes.toLocaleString()}`);

    // Async notifications (Email/SMS)
    setImmediate(() => {
      const targetUser = db.users.find(u => u.id === userId);
      if (targetUser?.email) {
        EmailService.sendDepositEmail(
          targetUser.email,
          targetUser.fullName || targetUser.email.split('@')[0],
          `KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toFixed(2)} USD)`,
          'KES',
          paymentTx.reference || paymentTx.externalReference || ''
        ).catch(err => console.error('[LIPIA] Email error:', err));
      }

      const userPhone = paymentTx.phone || targetUser?.phoneNumber;
      if (userPhone) {
        SMSService.sendDepositSMS(
          userPhone,
          `KES ${depositAmountKes.toLocaleString()}`,
          paymentTx.reference || paymentTx.externalReference || ''
        ).catch(err => console.error('[LIPIA] SMS error:', err));
      }
    });
  }
}

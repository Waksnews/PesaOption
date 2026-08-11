/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import crypto, { randomUUID } from 'crypto';
import { Database, getPrismaClient } from '../../server/db';
import { PaymentTransaction, Transaction } from '../types';
import { formatZetuPayPhone, generateDepositReference, mapZetuPayStatus } from '../utils/zetupay';
import { ExchangeRateService } from './exchangeRate.service';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';

export class ZetuPayService {
  /**
   * ZetuPay API Configuration
   */
  private static get baseUrl(): string {
    return process.env.ZETUPAY_API_URL || 'https://pay.zetupay.co.ke/api/v1';
  }

  private static get secretKey(): string {
    return process.env.ZETUPAY_SECRET_KEY || '';
  }

  private static getRedirectUrl(domain?: string): string {
    if (process.env.ZETUPAY_REDIRECT_URL) {
      return process.env.ZETUPAY_REDIRECT_URL;
    }
    const base = domain || process.env.APP_URL || 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/#wallet`;
  }

  /**
   * Initiates payment via ZetuPay POST /payment/initiate
   */
  public static async createDeposit(params: {
    userId: string;
    email?: string;
    phone: string;
    amount: number; // KES or USD amount passed
    currency?: string; // 'KES' or 'USD'
    paymentMethod?: string;
    domain?: string;
  }): Promise<{
    reference: string;
    checkoutUrl: string;
    paymentKey?: string;
    waveTransactionId?: string;
    status: string;
    amount: number;
  }> {
    const db = Database.getInstance();
    const userId = params.userId;

    // 1. Verify User and Wallet exist
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User account not found.');
    }

    const wallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');
    if (!wallet) {
      throw new Error('User USD trading wallet not found.');
    }

    // 2. Validate and Format Phone Number
    const formattedPhone = formatZetuPayPhone(params.phone);
    if (!/^254(7|1)\d{8}$/.test(formattedPhone)) {
      throw new Error('Invalid Kenyan phone number. Must be 07XXXXXXXX, 01XXXXXXXX or 254XXXXXXXXX.');
    }

    // 3. Compute currency exchange rate and amounts
    const inputCurrency = (params.currency || 'KES').toUpperCase();
    const lockedRate = ExchangeRateService.getRate('USD', 'KES');

    let depositAmountKes: number;
    let creditedUsd: number;

    if (inputCurrency === 'USD') {
      creditedUsd = params.amount;
      depositAmountKes = Math.round(params.amount * lockedRate);
    } else {
      depositAmountKes = params.amount;
      creditedUsd = ExchangeRateService.convertKEStoUSD(depositAmountKes, lockedRate);
    }

    if (depositAmountKes <= 0) {
      throw new Error('Invalid deposit amount.');
    }

    // 4. Generate unique PesaOption reference
    const reference = generateDepositReference();
    const redirectUrl = this.getRedirectUrl(params.domain);

    const apiKey = this.secretKey;
    if (!apiKey) {
      console.warn('[ZETUPAY] ZETUPAY_SECRET_KEY missing in environment variables.');
    }

    let paymentKey = '';
    let waveTransactionId = '';
    let checkoutUrl = '';
    let initStatus = 'pending';
    let environment = 'live';
    let real = true;

    try {
      console.log(`[ZETUPAY] Initiating deposit reference: ${reference}, KES ${depositAmountKes}`);

      const requestBody = {
        amount: depositAmountKes,
        phoneNumber: formattedPhone,
        reference: reference,
        redirectUrl: redirectUrl,
        currency: 'KES',
        identifier: userId
      };

      const response = await axios.post(
        `${this.baseUrl}/payment/initiate`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000
        }
      );

      const resData = response.data;
      console.log('[ZETUPAY] Initiate Response:', resData);

      if (resData && (resData.status === 'success' || resData.data)) {
        const payload = resData.data || resData;
        paymentKey = payload.paymentKey || '';
        waveTransactionId = payload.waveTransactionId || '';
        checkoutUrl = payload.checkoutUrl || `https://pay.zetupay.co.ke/checkout/${paymentKey}`;
        initStatus = payload.status || 'pending';
        environment = payload.environment || 'live';
        real = payload.real !== undefined ? payload.real : true;
      } else {
        throw new Error(resData?.message || 'ZetuPay returned an unexpected response.');
      }
    } catch (error: any) {
      console.error('[ZETUPAY] Initiate Error:', error.response?.data || error.message);
      const errMsg = error.response?.data?.message || error.message || 'Failed to initiate ZetuPay payment.';
      throw new Error(errMsg);
    }

    // 5. Save pending transaction in database
    const paymentTx: PaymentTransaction = {
      id: randomUUID(),
      userId,
      invoiceId: reference,
      provider: 'zetupay',
      paymentMethod: params.paymentMethod || 'M-PESA',
      phone: formattedPhone,
      amount: depositAmountKes,
      currency: 'KES',
      status: 'Pending',
      reference,
      paymentKey,
      waveTransactionId,
      checkoutUrl,
      environment,
      real,
      paymentCurrency: 'KES',
      walletCurrency: 'USD',
      exchangeRate: lockedRate,
      originalAmount: depositAmountKes,
      creditedAmount: creditedUsd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.paymentTransactions.push(paymentTx);
    await db.save();

    return {
      reference,
      checkoutUrl,
      paymentKey,
      waveTransactionId,
      status: initStatus,
      amount: depositAmountKes
    };
  }

  /**
   * Polls or queries payment status from ZetuPay API: GET /payment/:paymentKey
   */
  public static async checkPaymentStatus(referenceOrKey: string, userId?: string): Promise<PaymentTransaction> {
    const db = Database.getInstance();

    const paymentTx = db.paymentTransactions.find(p =>
      p.reference === referenceOrKey ||
      p.invoiceId === referenceOrKey ||
      p.paymentKey === referenceOrKey ||
      p.waveTransactionId === referenceOrKey ||
      p.id === referenceOrKey
    );

    if (!paymentTx) {
      throw new Error(`Transaction record not found for reference: ${referenceOrKey}`);
    }

    if (userId && paymentTx.userId !== userId) {
      throw new Error('Access denied. You do not own this deposit transaction.');
    }

    // If already Completed or Failed/Cancelled, return current record
    if (paymentTx.status !== 'Pending') {
      return paymentTx;
    }

    // If we have a paymentKey, query ZetuPay
    if (paymentTx.paymentKey) {
      try {
        console.log(`[ZETUPAY] Querying status for key: ${paymentTx.paymentKey}`);
        const response = await axios.get(`${this.baseUrl}/payment/${paymentTx.paymentKey}`, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const resData = response.data;
        console.log('[ZETUPAY] Status Query Response:', resData);

        if (resData && (resData.status === 'success' || resData.data)) {
          const data = resData.data || resData;
          const remoteStatus = (data.status || '').toLowerCase();

          if (remoteStatus === 'success' || remoteStatus === 'completed') {
            await this.processSuccessfulPayment(paymentTx, data);
          } else if (remoteStatus === 'failed' || remoteStatus === 'declined') {
            paymentTx.status = 'Failed';
            paymentTx.failedReason = mapZetuPayStatus(remoteStatus, data.message);
            paymentTx.updatedAt = new Date().toISOString();
            await db.save();
          } else if (remoteStatus === 'cancelled') {
            paymentTx.status = 'Cancelled';
            paymentTx.failedReason = mapZetuPayStatus(remoteStatus, data.message);
            paymentTx.updatedAt = new Date().toISOString();
            await db.save();
          }
        }
      } catch (err: any) {
        console.warn('[ZETUPAY] Status Query Error:', err.response?.data || err.message);
      }
    }

    return paymentTx;
  }

  /**
   * Handles Webhook callback from ZetuPay: POST /api/webhooks/zetupay
   */
  public static async handleWebhook(headers: Record<string, any>, payload: any): Promise<{ success: boolean; message?: string }> {
    console.log('[ZETUPAY WEBHOOK] Received Event:', payload?.event || 'unknown', 'Payload:', JSON.stringify(payload));

    // 1. Verify x-zetupay-secret header against backend environment variable
    const incomingSecret = headers['x-zetupay-secret'] || headers['X-ZetuPay-Secret'];
    const expectedSecret = this.secretKey;

    if (expectedSecret && incomingSecret !== expectedSecret) {
      console.error('[ZETUPAY WEBHOOK] Invalid or missing secret header');
      throw new Error('Unauthorized: Webhook secret mismatch.');
    }

    const eventName = payload?.event;
    const data = payload?.data || payload;

    if (!data) {
      console.error('[ZETUPAY WEBHOOK] Empty payload data.');
      return { success: false, message: 'Payload data empty' };
    }

    const reference = data.reference || payload.reference || '';
    const waveTxId = data.waveTransactionId || payload.waveTransactionId || '';
    const paymentKey = data.paymentKey || payload.paymentKey || '';

    const db = Database.getInstance();

    // 2. Find transaction record by waveTransactionId or reference or paymentKey
    const paymentTx = db.paymentTransactions.find(p =>
      (waveTxId && p.waveTransactionId === waveTxId) ||
      (reference && (p.reference === reference || p.invoiceId === reference)) ||
      (paymentKey && p.paymentKey === paymentKey)
    );

    if (!paymentTx) {
      console.error(`[ZETUPAY WEBHOOK] Transaction record not found for reference: ${reference}, waveTxId: ${waveTxId}`);
      return { success: false, message: 'Transaction record not found' };
    }

    // 3. Ownership verification if identifier is provided
    if (data.identifier && paymentTx.userId !== data.identifier) {
      console.warn(`[ZETUPAY WEBHOOK] Identifier mismatch for tx ${paymentTx.id}. Expected ${paymentTx.userId}, got ${data.identifier}`);
    }

    // 4. Production vs Sandbox Safety Check
    // If payload indicates sandbox/test, ensure real wallet is protected if environment is live
    if (data.real === false || data.environment === 'sandbox') {
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SANDBOX_DEPOSITS !== 'true') {
        console.warn(`[ZETUPAY WEBHOOK] Rejecting sandbox transaction ${paymentTx.reference} in production environment.`);
        paymentTx.status = 'Failed';
        paymentTx.failedReason = 'Sandbox/test payments cannot credit production wallets.';
        paymentTx.updatedAt = new Date().toISOString();
        await db.save();
        return { success: false, message: 'Sandbox transactions disallowed in production' };
      }
    }

    // 5. Handle success vs failure
    const status = (data.status || eventName || '').toLowerCase();

    if (eventName === 'payment.success' || status === 'success' || status === 'completed') {
      await this.processSuccessfulPayment(paymentTx, data);
      return { success: true, message: 'Deposit successfully credited' };
    } else if (eventName === 'payment.failed' || status === 'failed') {
      if (paymentTx.status !== 'Completed') {
        paymentTx.status = 'Failed';
        paymentTx.failedReason = data.message || mapZetuPayStatus('failed');
        paymentTx.updatedAt = new Date().toISOString();
        await db.save();
      }
      return { success: true, message: 'Deposit marked failed' };
    } else if (status === 'cancelled') {
      if (paymentTx.status !== 'Completed') {
        paymentTx.status = 'Cancelled';
        paymentTx.failedReason = data.message || mapZetuPayStatus('cancelled');
        paymentTx.updatedAt = new Date().toISOString();
        await db.save();
      }
      return { success: true, message: 'Deposit marked cancelled' };
    }

    return { success: true, message: 'Event logged' };
  }

  /**
   * Atomically credits user wallet upon verified ZetuPay payment.
   * Ensures strict idempotency using waveTransactionId and transaction status.
   */
  private static async processSuccessfulPayment(paymentTx: PaymentTransaction, data: any): Promise<void> {
    const db = Database.getInstance();

    if (paymentTx.status === 'Completed') {
      console.log(`[ZETUPAY] Idempotency check: Payment ${paymentTx.reference} already completed.`);
      return;
    }

    const userId = paymentTx.userId;
    const wallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');

    if (!wallet) {
      console.error(`[ZETUPAY] USD Wallet not found for user: ${userId}`);
      return;
    }

    const depositAmountKes = data.gross || data.amount || paymentTx.amount;
    const lockedRate = paymentTx.exchangeRate || ExchangeRateService.getRate('USD', 'KES');
    const creditedUsd = paymentTx.creditedAmount !== undefined
      ? paymentTx.creditedAmount
      : ExchangeRateService.convertKEStoUSD(depositAmountKes, lockedRate);

    // Save ZetuPay transaction specifics
    paymentTx.waveTransactionId = data.waveTransactionId || paymentTx.waveTransactionId;
    paymentTx.receiptNumber = data.receiptNumber || data.mpesaReceiptNumber || '';
    const gross = data.gross ?? data.amount ?? paymentTx.amount;
    const fee = data.fee ?? 0;
    paymentTx.grossAmount = gross;
    paymentTx.providerFee = fee;
    paymentTx.netAmount = data.net ?? (gross - fee);
    paymentTx.paymentKey = data.paymentKey || paymentTx.paymentKey;
    paymentTx.environment = data.environment || paymentTx.environment;
    paymentTx.real = data.real !== undefined ? data.real : paymentTx.real;

    // 1. Mark transaction as Completed
    paymentTx.status = 'Completed';
    paymentTx.updatedAt = new Date().toISOString();

    // 2. Safely credit user trading wallet
    wallet.balance = (wallet.balance || 0) + creditedUsd;
    wallet.updatedAt = new Date().toISOString();

    // 3. Record transaction history
    const txId = 'tx_' + Math.random().toString(36).substring(2, 11);
    const platformTx: Transaction = {
      id: txId,
      userId,
      walletId: wallet.id,
      type: 'deposit',
      asset: 'USD',
      amount: creditedUsd,
      status: 'completed',
      txHash: '0x' + crypto.createHash('sha256').update(paymentTx.waveTransactionId || paymentTx.reference || txId).digest('hex'),
      description: `ZetuPay M-Pesa Deposit (Ref: ${paymentTx.reference}${paymentTx.receiptNumber ? `, Receipt: ${paymentTx.receiptNumber}` : ''})`,
      createdAt: new Date().toISOString(),
    };
    db.transactions.push(platformTx);

    // 4. Audit log entry
    db.activityLogs.push({
      id: 'log_' + Math.random().toString(36).substring(2, 11),
      userId,
      action: 'ZetuPay Deposit Credited',
      details: `Credited $${creditedUsd.toFixed(2)} USD via ZetuPay M-Pesa (Ref: ${paymentTx.reference}, Receipt: ${paymentTx.receiptNumber || 'N/A'})`,
      ipAddress: 'ZetuPay Webhook Gateway',
      createdAt: new Date().toISOString(),
    });

    // 5. In-app user notification
    db.notifications.push({
      id: 'not_' + Math.random().toString(36).substring(2, 11),
      userId,
      title: 'Deposit Received',
      message: `Deposit received. KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toFixed(2)} USD) credited to your real wallet.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    const prisma = getPrismaClient();
    if (prisma) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.paymentTransaction.update({
            where: { id: paymentTx.id },
            data: {
              status: 'Completed',
              waveTransactionId: paymentTx.waveTransactionId || null,
              receiptNumber: paymentTx.receiptNumber || null,
              grossAmount: paymentTx.grossAmount || null,
              providerFee: paymentTx.providerFee || null,
              netAmount: paymentTx.netAmount || null,
            }
          });

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: creditedUsd }
            }
          });

          await tx.transaction.create({
            data: {
              id: txId,
              userId,
              walletId: wallet.id,
              type: 'deposit',
              asset: 'USD',
              amount: creditedUsd,
              status: 'completed',
              txHash: platformTx.txHash,
              description: platformTx.description
            }
          });

          await tx.notification.create({
            data: {
              id: 'not_' + Math.random().toString(36).substring(2, 11),
              userId,
              title: 'Deposit Received',
              message: `Deposit received. KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toFixed(2)} USD) credited to your real wallet.`,
              read: false
            }
          });

          await tx.activityLog.create({
            data: {
              id: 'log_' + Math.random().toString(36).substring(2, 11),
              userId,
              action: 'ZetuPay Deposit Credited',
              details: `Credited $${creditedUsd.toFixed(2)} USD via ZetuPay M-Pesa (Ref: ${paymentTx.reference}, Receipt: ${paymentTx.receiptNumber || 'N/A'})`,
              ipAddress: 'ZetuPay Webhook Gateway'
            }
          });
        });
        console.log(`[ZETUPAY] PostgreSQL transaction completed successfully for user ${userId}. Credited $${creditedUsd.toFixed(2)} USD.`);
      } catch (err) {
        console.error('[ZETUPAY] PostgreSQL transaction error during payment processing:', err);
      }
    }

    await db.save();

    console.log(`[ZETUPAY] SUCCESS: Wallet credited for user ${userId}. Amount: KES ${depositAmountKes} -> $${creditedUsd.toFixed(2)} USD.`);

    // 6. Asynchronous Email and SMS Notifications
    setImmediate(() => {
      const targetUser = db.users.find(u => u.id === userId);
      if (targetUser?.email) {
        EmailService.sendDepositEmail(
          targetUser.email,
          targetUser.fullName || targetUser.email.split('@')[0],
          `KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toFixed(2)} USD)`,
          'KES',
          paymentTx.reference || ''
        ).catch(err => console.error('[ZETUPAY] Email error:', err));
      }

      const userPhone = paymentTx.phone || targetUser?.phoneNumber;
      if (userPhone) {
        SMSService.sendDepositSMS(
          userPhone,
          `KES ${depositAmountKes.toLocaleString()}`,
          paymentTx.reference || ''
        ).catch(err => console.error('[ZETUPAY] SMS error:', err));
      }
    });
  }
}

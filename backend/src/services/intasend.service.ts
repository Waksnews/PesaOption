/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import crypto from 'crypto';
import { Database } from '../../server/db';
import { PaymentTransaction, PaymentStatus, Transaction, Notification } from '../types';
import { formatIntaSendPhone } from '../utils/intasend';
import { SMSService } from './sms.service';
import { EmailService } from './email.service';
import { ExchangeRateService } from './exchangeRate.service';

export class IntaSendService {
  private static getBaseUrl(): string {
    // IntaSend LIVE API endpoint
    return 'https://payment.intasend.com/api/v1';
  }

  /**
   * Initiates payment via IntaSend LIVE gateway
   */
  public static async createPayment(
    userId: string,
    email: string,
    rawPhone: string,
    amount: number,
    currency: string = 'KES',
    paymentMethod: string = 'M-PESA',
    t0?: number
  ): Promise<{ reference: string; invoiceId: string; url?: string; customerMessage?: string; status: PaymentStatus; dbInsertMs: number; apiMs: number }> {
    const db = Database.getInstance();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const secretKey = process.env.INTASEND_SECRET_KEY || '';
    const publicKey = process.env.INTASEND_PUBLIC_KEY || process.env.INTASEND_PUBLISHABLE_KEY || '';
    const formattedPhone = formatIntaSendPhone(rawPhone);
    const userEmail = email || user.email || 'trader@pesaoption.com';
    
    const activeRate = ExchangeRateService.getRate('USD', 'KES');
    const walletCurrency = 'USD';
    const inputCurrency = (currency || 'KES').toUpperCase();

    let paymentCurrency = inputCurrency;
    let originalAmount = amount;
    let paymentAmount = Math.round(amount);
    let creditedAmount = 0;

    if (paymentMethod === 'M-PESA') {
      paymentCurrency = 'KES';
      if (inputCurrency === 'USD') {
        paymentAmount = Math.round(ExchangeRateService.convertUSDtoKES(amount, activeRate));
        creditedAmount = amount;
      } else {
        paymentAmount = Math.round(amount);
        creditedAmount = ExchangeRateService.convertKEStoUSD(amount, activeRate);
      }
    } else {
      if (inputCurrency === 'USD') {
        paymentCurrency = 'USD';
        paymentAmount = Math.round(amount);
        creditedAmount = amount;
      } else {
        paymentCurrency = 'KES';
        paymentAmount = Math.round(amount);
        creditedAmount = ExchangeRateService.convertKEStoUSD(amount, activeRate);
      }
    }

    console.log('[PAYMENT]');
    console.log(`Payment Currency: ${paymentCurrency}`);
    console.log(`Wallet Currency: ${walletCurrency}`);
    console.log(`Original Amount: ${originalAmount}`);
    console.log(`Exchange Rate: ${activeRate}`);
    console.log(`Credited Amount: ${creditedAmount.toFixed(2)} USD`);

    // Duplicate Protection / Idempotency check:
    const recentCutoff = new Date(Date.now() - 30 * 1000).toISOString();
    const existingTx = db.paymentTransactions.find(tx =>
      tx.userId === userId &&
      tx.phone === formattedPhone &&
      tx.status === 'Pending' &&
      tx.createdAt > recentCutoff &&
      Math.abs(tx.amount - paymentAmount) < 1
    );

    if (existingTx) {
      console.log(`[PAYMENT STAGE] Idempotent deposit request detected. Returning existing payment: Ref ${existingTx.reference}`);
      return {
        reference: existingTx.reference || existingTx.invoiceId || '',
        invoiceId: existingTx.invoiceId,
        url: '',
        customerMessage: 'STK Push already sent to your phone. Check your phone to complete payment.',
        status: 'Pending',
        dbInsertMs: 0,
        apiMs: 0,
      };
    }

    // Format PO-DEP-XXXXXXXX
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const poReference = `PO-DEP-${randomHex}`;
    const baseUrl = this.getBaseUrl();

    let invoiceId = '';
    let checkoutUrl = '';
    let customerMessage = '';

    console.log(`[PAYMENT STAGE] Payment created: Ref ${poReference} | User: ${userId} | Amount: ${paymentCurrency} ${paymentAmount}`);
    console.log(`[PAYMENT STAGE] Checkout initiated: Method ${paymentMethod}, Target Phone: ${formattedPhone}`);

    const tApiStart = Date.now();
    if (t0) {
      console.log(`[PAYMENT TIMER] IntaSend API Request Sent: +${tApiStart - t0} ms`);
    }

    if (paymentMethod === 'M-PESA') {
      if (!secretKey) {
        throw new Error('INTASEND_SECRET_KEY is required in environment variables for Live IntaSend Payments.');
      }

      const payload = {
        phone_number: formattedPhone,
        email: userEmail,
        amount: paymentAmount,
        currency: paymentCurrency,
        api_ref: poReference,
      };

      console.log('[INTASEND SERVICE] Sending STK Push to IntaSend Live API:', payload);

      const makeStkRequest = async () => {
        return await axios.post(`${baseUrl}/payment/mpesa-stk-push/`, payload, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        });
      };

      let response;
      try {
        response = await makeStkRequest();
      } catch (error: any) {
        const isNetworkError = !error.response || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || (error.response?.status >= 500 && error.response?.status < 600);
        if (isNetworkError) {
          console.warn('[INTASEND SERVICE] STK Push encountered temporary error. Retrying once after 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            response = await makeStkRequest();
          } catch (retryError: any) {
            console.error('[INTASEND STK PUSH RETRY ERROR]', retryError.response?.data || retryError.message);
            throw new Error(
              retryError.response?.data?.errors?.[0]?.detail ||
              retryError.response?.data?.message ||
              retryError.response?.data?.detail ||
              'Failed to initiate IntaSend STK Push payment after retry.'
            );
          }
        } else {
          console.error('[INTASEND STK PUSH ERROR]', error.response?.data || error.message);
          throw new Error(
            error.response?.data?.errors?.[0]?.detail ||
            error.response?.data?.message ||
            error.response?.data?.detail ||
            'Failed to initiate IntaSend STK Push payment.'
          );
        }
      }

      const data = response.data;
      console.log('[INTASEND SERVICE] STK Push Response:', data);

      invoiceId = data.invoice?.invoice_id || data.id || data.tracking_id || `INTA-${Date.now()}`;
      customerMessage = data.customer_message || 'Please check your phone and enter your M-Pesa PIN.';
    } else {
      // Visa / Mastercard (Card) Checkout API
      try {
        const payload = {
          public_key: publicKey || secretKey,
          amount: paymentAmount,
          currency: paymentCurrency,
          email: userEmail,
          phone_number: formattedPhone,
          method: 'CARD',
          api_ref: poReference,
          redirect_url: process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : 'https://pesaoption.com/dashboard',
        };

        const response = await axios.post(`${baseUrl}/checkout/`, payload, {
          headers: secretKey ? { Authorization: `Bearer ${secretKey}` } : {},
          timeout: 12000,
        });

        const data = response.data;
        invoiceId = data.id || data.invoice_id || `INTA-CARD-${Date.now()}`;
        checkoutUrl = data.url || data.checkout_url || '';
        customerMessage = 'Card payment checkout created.';
      } catch (error: any) {
        console.error('[INTASEND CARD CHECKOUT ERROR]', error.response?.data || error.message);
        throw new Error(
          error.response?.data?.message ||
          error.response?.data?.detail ||
          'Failed to create IntaSend Card Checkout.'
        );
      }
    }

    const tApiDone = Date.now();
    const apiMs = tApiDone - tApiStart;
    if (t0) {
      console.log(`[PAYMENT TIMER] IntaSend Response Received: +${tApiDone - t0} ms (API time: ${apiMs} ms)`);
    }

    // Save pending payment transaction record to database
    const tDbStart = Date.now();
    const paymentTx: PaymentTransaction = {
      id: 'pay_' + Math.random().toString(36).substr(2, 9),
      userId,
      invoiceId,
      provider: 'intasend',
      paymentMethod,
      phone: formattedPhone,
      amount: paymentAmount,
      currency: paymentCurrency,
      status: 'Pending',
      reference: poReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentCurrency,
      walletCurrency,
      exchangeRate: activeRate,
      originalAmount,
      creditedAmount,
    };

    db.paymentTransactions.push(paymentTx);
    db.save();
    const dbInsertMs = Date.now() - tDbStart;

    if (t0) {
      console.log(`[PAYMENT TIMER] Payment Record Created: ${dbInsertMs} ms`);
    }

    console.log(`[PAYMENT STAGE] Payment pending saved: ID ${paymentTx.id} | Invoice ${invoiceId} | Ref ${poReference}`);

    return {
      reference: poReference,
      invoiceId,
      url: checkoutUrl,
      customerMessage,
      status: 'Pending',
      dbInsertMs,
      apiMs,
    };
  }

  /**
   * Checks the status of a payment by reference OR invoiceId
   */
  public static async getPaymentStatus(identifier: string, userId?: string): Promise<PaymentTransaction> {
    const db = Database.getInstance();
    let paymentTx = db.paymentTransactions.find(
      tx => tx.reference === identifier || tx.invoiceId === identifier || tx.id === identifier
    );

    if (!paymentTx) {
      throw new Error(`Payment transaction with reference/invoice ID "${identifier}" not found.`);
    }

    if (userId && paymentTx.userId !== userId) {
      throw new Error('Unauthorized access to payment status.');
    }

    // If still pending, attempt a live sync query to IntaSend API if keys are available
    if (paymentTx.status === 'Pending') {
      const secretKey = process.env.INTASEND_SECRET_KEY;
      if (secretKey) {
        try {
          const baseUrl = this.getBaseUrl();
          console.log(`[PAYMENT STAGE] Querying IntaSend status endpoint for Ref: ${paymentTx.reference || paymentTx.invoiceId}`);
          
          const response = await axios.post(
            `${baseUrl}/payment/status/`,
            { invoice_id: paymentTx.invoiceId },
            {
              headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          const data = response.data;
          const state = (data.invoice?.state || data.state || '').toUpperCase();
          console.log(`[PAYMENT STAGE] IntaSend status query response state: "${state}" for invoice: ${paymentTx.invoiceId}`);

          if (state === 'COMPLETE' || state === 'COMPLETED' || state === 'SUCCESS') {
            console.log(`[PAYMENT VERIFIED] Payment verified via IntaSend API query for Ref: ${paymentTx.reference || paymentTx.invoiceId}`);
            await this.creditUserWallet(paymentTx, data);
          } else if (state === 'FAILED' || state === 'REJECTED') {
            paymentTx.status = 'Failed';
            paymentTx.updatedAt = new Date().toISOString();
            db.save();
            console.log(`[PAYMENT STAGE] Payment marked as FAILED for Ref: ${paymentTx.reference}`);
          } else if (state === 'CANCELLED') {
            paymentTx.status = 'Cancelled';
            paymentTx.updatedAt = new Date().toISOString();
            db.save();
            console.log(`[PAYMENT STAGE] Payment marked as CANCELLED for Ref: ${paymentTx.reference}`);
          }
        } catch (err: any) {
          console.warn('[INTASEND STATUS POLL SYNC WARN]', err.message);
        }
      }
    }

    return paymentTx;
  }

  /**
   * Processes IntaSend Webhook (Idempotent execution)
   */
  public static async processWebhook(payload: any): Promise<{ status: string; message: string }> {
    const db = Database.getInstance();

    console.log('[PAYMENT STAGE] Webhook received payload:', JSON.stringify(payload));

    const invoiceId = payload.invoice_id || payload.id || payload.tracking_id || payload.api_ref;
    const state = (payload.state || payload.status || '').toUpperCase();
    const rawAmount = parseFloat(payload.value || payload.amount || payload.net_amount || 0);

    if (!invoiceId) {
      console.error('[INTASEND WEBHOOK] Missing invoice_id in webhook payload.');
      return { status: 'error', message: 'Missing invoice_id' };
    }

    // Find transaction record in database by invoiceId, reference, or api_ref
    let paymentTx = db.paymentTransactions.find(
      tx => tx.invoiceId === invoiceId || tx.reference === payload.api_ref || tx.reference === invoiceId
    );

    // If not found, try to locate user from api_ref payload
    if (!paymentTx && payload.api_ref) {
      let targetUser = null;
      if (payload.api_ref.startsWith('PesaOption-')) {
        const parts = payload.api_ref.split('-');
        const userIdPrefix = parts[1];
        targetUser = db.users.find(u => u.id.startsWith(userIdPrefix));
      } else if (payload.api_ref.startsWith('PO-DEP-')) {
        // Look up by email or phone in payload if present
        if (payload.email) {
          targetUser = db.users.find(u => u.email.toLowerCase() === payload.email.toLowerCase());
        }
      }

      if (targetUser) {
        paymentTx = {
          id: 'pay_' + Math.random().toString(36).substr(2, 9),
          userId: targetUser.id,
          invoiceId,
          provider: 'intasend',
          paymentMethod: payload.provider || 'M-PESA',
          phone: payload.account || payload.phone_number || '',
          amount: rawAmount || 0,
          currency: payload.currency || 'KES',
          status: 'Pending',
          reference: payload.api_ref,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.paymentTransactions.push(paymentTx);
        db.save();
      }
    }

    if (!paymentTx) {
      console.error(`[INTASEND WEBHOOK] No transaction record found for invoice_id: ${invoiceId}`);
      return { status: 'ignored', message: 'Transaction record not found' };
    }

    // Idempotency check: prevent duplicate crediting
    if (paymentTx.status === 'Completed') {
      console.log(`[PAYMENT STAGE] Duplicate webhook ignored: Transaction ${paymentTx.reference || invoiceId} already completed.`);
      return { status: 'success', message: 'Transaction already completed' };
    }

    if (state === 'COMPLETE' || state === 'COMPLETED' || state === 'SUCCESS') {
      console.log(`[PAYMENT VERIFIED] Payment verified via IntaSend webhook for Ref: ${paymentTx.reference || invoiceId}`);
      await this.creditUserWallet(paymentTx, payload);
      return { status: 'success', message: 'Wallet credited successfully' };
    } else if (state === 'FAILED' || state === 'REJECTED') {
      paymentTx.status = 'Failed';
      paymentTx.updatedAt = new Date().toISOString();
      db.save();
      console.log(`[PAYMENT STAGE] Payment marked as FAILED via webhook: ${paymentTx.reference}`);
      return { status: 'failed', message: 'Transaction marked as failed' };
    } else if (state === 'CANCELLED') {
      paymentTx.status = 'Cancelled';
      paymentTx.updatedAt = new Date().toISOString();
      db.save();
      console.log(`[PAYMENT STAGE] Payment marked as CANCELLED via webhook: ${paymentTx.reference}`);
      return { status: 'cancelled', message: 'Transaction marked as cancelled' };
    }

    return { status: 'pending', message: 'Transaction state pending' };
  }

  /**
   * Credits user REAL wallet safely using atomic lock / transaction
   */
  private static async creditUserWallet(paymentTx: PaymentTransaction, payload: any): Promise<void> {
    const tCreditStart = Date.now();
    const db = Database.getInstance();

    if (paymentTx.status === 'Completed') {
      console.log(`[PAYMENT STAGE] Duplicate credit prevention: Payment ${paymentTx.reference} is already completed.`);
      return; // Double-guard against concurrent execution
    }

    const userId = paymentTx.userId;
    const wallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');

    if (!wallet) {
      console.error(`[INTASEND CREDIT ERROR] Real wallet not found for user: ${userId}`);
      return;
    }

    const depositAmountKes = paymentTx.amount;
    const walletCurrency = paymentTx.walletCurrency || 'USD';
    const lockedRate = paymentTx.exchangeRate || ExchangeRateService.getRate('USD', 'KES');
    
    // Retrieve credited amount using locked rate from payment creation
    const creditedUsd = paymentTx.creditedAmount !== undefined
      ? paymentTx.creditedAmount
      : (paymentTx.currency === 'USD' ? depositAmountKes : ExchangeRateService.convertKEStoUSD(depositAmountKes, lockedRate));

    console.log('[PAYMENT]');
    console.log(`Payment Currency: ${paymentTx.paymentCurrency || paymentTx.currency || 'KES'}`);
    console.log(`Wallet Currency: ${walletCurrency}`);
    console.log(`Original Amount: ${paymentTx.originalAmount || depositAmountKes}`);
    console.log(`Exchange Rate: ${lockedRate}`);
    console.log(`Credited Amount: ${creditedUsd.toFixed(2)} USD`);

    // 1. Update status to Completed
    paymentTx.status = 'Completed';
    paymentTx.updatedAt = new Date().toISOString();

    // 2. Increase user REAL wallet balance
    wallet.balance = (wallet.balance || 0) + creditedUsd;
    wallet.updatedAt = new Date().toISOString();

    console.log(`[PAYMENT STAGE] Wallet credited: +$${creditedUsd.toFixed(2)} USD added to Real Wallet of user ${userId}`);

    // 3. Insert Deposit History / Wallet Transaction
    const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
    const platformTx: Transaction = {
      id: txId,
      userId,
      walletId: wallet.id,
      type: 'deposit',
      asset: 'USD',
      amount: creditedUsd,
      status: 'completed',
      txHash: '0x' + crypto.createHash('sha256').update(paymentTx.invoiceId || paymentTx.reference || txId).digest('hex'),
      description: `IntaSend ${paymentTx.paymentMethod} Deposit (Ref: ${paymentTx.reference}, KES ${depositAmountKes.toLocaleString()})`,
      createdAt: new Date().toISOString(),
    };

    db.transactions.push(platformTx);

    // 4. Create activity log for audit
    db.activityLogs.push({
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      userId,
      action: 'IntaSend Deposit Credited',
      details: `Credited $${creditedUsd.toFixed(2)} USD via IntaSend ${paymentTx.paymentMethod} (Ref: ${paymentTx.reference})`,
      ipAddress: 'IntaSend Webhook Gateway',
      createdAt: new Date().toISOString(),
    });

    // 5. Create live notification
    const notif: Notification = {
      id: 'not_' + Math.random().toString(36).substr(2, 9),
      userId,
      title: 'Deposit Received',
      message: `Deposit received. KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD) added successfully.`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    db.notifications.push(notif);

    // Commit changes to persistent database immediately
    db.save();
    const tCreditDone = Date.now();
    const creditMs = tCreditDone - tCreditStart;
    console.log(`[PAYMENT TIMER] Wallet Credit: ${creditMs} ms`);
    console.log(`[INTASEND CREDIT SUCCESS] User ${userId} wallet successfully credited +$${creditedUsd.toFixed(2)} USD for Ref: ${paymentTx.reference}`);

    // Non-blocking async Email/SMS after database persistence
    setImmediate(() => {
      const targetUser = db.users.find(u => u.id === userId);
      if (targetUser?.email) {
        EmailService.sendDepositEmail(
          targetUser.email,
          targetUser.fullName || targetUser.email.split('@')[0],
          `KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toFixed(2)} USD)`,
          'KES',
          paymentTx.reference || paymentTx.invoiceId
        )
          .then(() => console.log(`[PAYMENT STAGE] Email sent: Deposit receipt to ${targetUser.email}`))
          .catch(err => console.error('[INTASEND EMAIL ERROR]', err));
      }

      const userPhone = paymentTx.phone || targetUser?.phoneNumber;
      if (userPhone) {
        SMSService.sendDepositSMS(userPhone, `KES ${depositAmountKes.toLocaleString()}`, paymentTx.reference || paymentTx.invoiceId)
          .then(() => console.log(`[PAYMENT STAGE] SMS sent: Deposit notification to ${userPhone}`))
          .catch(err => console.error('[INTASEND SMS ERROR]', err));
      }
    });
  }
}

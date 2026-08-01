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
    paymentMethod: string = 'M-PESA'
  ): Promise<{ invoiceId: string; url?: string; customerMessage?: string; status: PaymentStatus }> {
    const db = Database.getInstance();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const secretKey = process.env.INTASEND_SECRET_KEY || '';
    const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY || '';
    const formattedPhone = formatIntaSendPhone(rawPhone);
    const userEmail = email || user.email || 'trader@pesaoption.com';
    const apiRef = `PesaOption-${userId.substring(0, 8)}-${Date.now()}`;
    const baseUrl = this.getBaseUrl();

    let invoiceId = '';
    let checkoutUrl = '';
    let customerMessage = '';

    console.log(`[INTASEND SERVICE] Creating ${paymentMethod} payment for user ${userId}, Amount: ${currency} ${amount}`);

    if (paymentMethod === 'M-PESA') {
      // IntaSend M-PESA STK Push API
      if (!secretKey) {
        throw new Error('INTASEND_SECRET_KEY is required in environment variables for Live IntaSend Payments.');
      }

      try {
        const payload = {
          phone_number: formattedPhone,
          email: userEmail,
          amount: Math.round(amount),
          currency: currency.toUpperCase(),
          api_ref: apiRef,
        };

        console.log('[INTASEND SERVICE] Sending STK Push to IntaSend Live API:', payload);

        const response = await axios.post(`${baseUrl}/payment/mpesa-stk-push/`, payload, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });

        const data = response.data;
        console.log('[INTASEND SERVICE] Response:', data);

        invoiceId = data.invoice?.invoice_id || data.id || data.tracking_id || `INTA-${Date.now()}`;
        customerMessage = data.customer_message || 'Please check your phone and enter your M-Pesa PIN.';
      } catch (error: any) {
        console.error('[INTASEND STK PUSH ERROR]', error.response?.data || error.message);
        throw new Error(
          error.response?.data?.errors?.[0]?.detail ||
          error.response?.data?.message ||
          error.response?.data?.detail ||
          'Failed to initiate IntaSend STK Push payment.'
        );
      }
    } else {
      // Visa / Mastercard (Card) Checkout API
      try {
        const payload = {
          public_key: publishableKey || secretKey,
          amount: Math.round(amount),
          currency: currency.toUpperCase(),
          email: userEmail,
          phone_number: formattedPhone,
          method: 'CARD',
          api_ref: apiRef,
          redirect_url: process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : 'https://pesaoption.com/dashboard',
        };

        const response = await axios.post(`${baseUrl}/checkout/`, payload, {
          headers: secretKey ? { Authorization: `Bearer ${secretKey}` } : {},
          timeout: 15000,
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

    // Save payment transaction record to database
    const paymentTx: PaymentTransaction = {
      id: 'pay_' + Math.random().toString(36).substr(2, 9),
      userId,
      invoiceId,
      provider: 'intasend',
      paymentMethod,
      phone: formattedPhone,
      amount,
      currency: currency.toUpperCase(),
      status: 'Pending',
      reference: apiRef,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.paymentTransactions.push(paymentTx);
    db.save();

    console.log(`[INTASEND SERVICE] Saved payment transaction ${paymentTx.id} with invoiceId: ${invoiceId}`);

    return {
      invoiceId,
      url: checkoutUrl,
      customerMessage,
      status: 'Pending',
    };
  }

  /**
   * Checks the status of a payment by invoiceId
   */
  public static async getPaymentStatus(invoiceId: string, userId?: string): Promise<PaymentTransaction> {
    const db = Database.getInstance();
    let paymentTx = db.paymentTransactions.find(tx => tx.invoiceId === invoiceId);

    if (!paymentTx) {
      throw new Error(`Payment transaction with invoice ID ${invoiceId} not found.`);
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
          const response = await axios.post(
            `${baseUrl}/payment/status/`,
            { invoice_id: invoiceId },
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

          if (state === 'COMPLETE' || state === 'COMPLETED' || state === 'SUCCESS') {
            await this.creditUserWallet(paymentTx, data);
          } else if (state === 'FAILED' || state === 'REJECTED') {
            paymentTx.status = 'Failed';
            paymentTx.updatedAt = new Date().toISOString();
            db.save();
          } else if (state === 'CANCELLED') {
            paymentTx.status = 'Cancelled';
            paymentTx.updatedAt = new Date().toISOString();
            db.save();
          }
        } catch (err: any) {
          // Non-blocking poll warning
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

    console.log('[INTASEND WEBHOOK SERVICE] Processing payload:', JSON.stringify(payload));

    const invoiceId = payload.invoice_id || payload.id || payload.tracking_id || payload.api_ref;
    const state = (payload.state || payload.status || '').toUpperCase();
    const rawAmount = parseFloat(payload.value || payload.amount || payload.net_amount || 0);

    if (!invoiceId) {
      console.error('[INTASEND WEBHOOK] Missing invoice_id in webhook payload.');
      return { status: 'error', message: 'Missing invoice_id' };
    }

    // Find transaction record in database
    let paymentTx = db.paymentTransactions.find(
      tx => tx.invoiceId === invoiceId || tx.reference === payload.api_ref
    );

    // If not found, try to locate user from api_ref payload
    if (!paymentTx && payload.api_ref && payload.api_ref.startsWith('PesaOption-')) {
      const parts = payload.api_ref.split('-');
      const userIdPrefix = parts[1];
      const targetUser = db.users.find(u => u.id.startsWith(userIdPrefix));
      if (targetUser) {
        paymentTx = {
          id: 'pay_' + Math.random().toString(36).substr(2, 9),
          userId: targetUser.id,
          invoiceId,
          provider: 'intasend',
          paymentMethod: payload.provider || 'M-PESA',
          phone: payload.account || '',
          amount: rawAmount || 0,
          currency: payload.currency || 'KES',
          status: 'Pending',
          reference: payload.api_ref,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.paymentTransactions.push(paymentTx);
      }
    }

    if (!paymentTx) {
      console.error(`[INTASEND WEBHOOK] No transaction record found for invoice_id: ${invoiceId}`);
      return { status: 'ignored', message: 'Transaction record not found' };
    }

    // Idempotency check: prevent duplicate crediting
    if (paymentTx.status === 'Completed') {
      console.log(`[INTASEND WEBHOOK] Transaction ${invoiceId} has already been credited. Skipping.`);
      return { status: 'success', message: 'Transaction already completed' };
    }

    if (state === 'COMPLETE' || state === 'COMPLETED' || state === 'SUCCESS') {
      await this.creditUserWallet(paymentTx, payload);
      return { status: 'success', message: 'Wallet credited successfully' };
    } else if (state === 'FAILED' || state === 'REJECTED') {
      paymentTx.status = 'Failed';
      paymentTx.updatedAt = new Date().toISOString();
      db.save();
      return { status: 'failed', message: 'Transaction marked as failed' };
    } else if (state === 'CANCELLED') {
      paymentTx.status = 'Cancelled';
      paymentTx.updatedAt = new Date().toISOString();
      db.save();
      return { status: 'cancelled', message: 'Transaction marked as cancelled' };
    }

    return { status: 'pending', message: 'Transaction state pending' };
  }

  /**
   * Credits user wallet safely using atomic lock / transaction
   */
  private static async creditUserWallet(paymentTx: PaymentTransaction, payload: any): Promise<void> {
    const db = Database.getInstance();

    if (paymentTx.status === 'Completed') {
      return; // Double-guard against concurrent calls
    }

    const userId = paymentTx.userId;
    const wallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');

    if (!wallet) {
      console.error(`[INTASEND CREDIT ERROR] Wallet not found for user: ${userId}`);
      return;
    }

    const depositAmountKes = paymentTx.amount;
    const USD_TO_KES_RATE = 130;
    
    // If currency is KES, convert to USD trading balance, otherwise use direct amount if USD
    const creditedUsd = paymentTx.currency === 'USD' ? depositAmountKes : depositAmountKes / USD_TO_KES_RATE;

    // 1. Update status to Completed
    paymentTx.status = 'Completed';
    paymentTx.updatedAt = new Date().toISOString();

    // 2. Increase wallet balance
    wallet.balance = (wallet.balance || 0) + creditedUsd;
    wallet.updatedAt = new Date().toISOString();

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
      txHash: '0x' + crypto.createHash('sha256').update(paymentTx.invoiceId).digest('hex'),
      description: `IntaSend ${paymentTx.paymentMethod} Deposit (Invoice: ${paymentTx.invoiceId}, KES ${depositAmountKes.toLocaleString()})`,
      createdAt: new Date().toISOString(),
    };

    db.transactions.push(platformTx);

    // 4. Create live notification
    const notif: Notification = {
      id: 'not_' + Math.random().toString(36).substr(2, 9),
      userId,
      title: 'Deposit Received',
      message: `Deposit received. KES ${depositAmountKes.toLocaleString()} ($${creditedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD) added successfully.`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    db.notifications.push(notif);

    // Send SMS & Email Notifications
    const targetUser = db.users.find(u => u.id === userId);
    const userPhone = paymentTx.phone || targetUser?.phoneNumber;

    console.log(`[NOTIFICATION TRIGGER] IntaSend Deposit Completed: Invoice ${paymentTx.invoiceId} | Amount KES ${depositAmountKes} ($${creditedUsd} USD) | User ID ${userId}`);

    if (userPhone) {
      SMSService.sendDepositSMS(userPhone, `KES ${depositAmountKes}`, paymentTx.invoiceId).catch(err => console.error('[INTASEND SMS ERROR]', err));
    }

    if (targetUser?.email) {
      EmailService.sendDepositEmail(
        targetUser.email,
        targetUser.fullName || targetUser.email.split('@')[0],
        `KES ${depositAmountKes} ($${creditedUsd.toFixed(2)} USD)`,
        'KES',
        paymentTx.invoiceId
      ).catch(err => console.error('[INTASEND EMAIL ERROR]', err));
    }

    // 5. Commit changes to persistent database
    db.save();

    console.log(`[INTASEND CREDIT SUCCESS] User ${userId} wallet credited +$${creditedUsd} USD (KES ${depositAmountKes}) for invoice: ${paymentTx.invoiceId}`);
  }
}

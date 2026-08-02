/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { IntaSendService } from '../services/intasend.service';
import { isValidIntaSendPhone } from '../utils/intasend';
import { Database } from '../../server/db';

const pollCounters = new Map<string, { count: number; startTime: number }>();

export class PaymentController {
  /**
   * POST /api/payments/deposit
   * Complete live deposit endpoint (STK Push or Checkout)
   */
  public static async createDeposit(req: any, res: Response) {
    const t0 = Date.now();
    console.log('[PAYMENT TIMER] Deposit Request Received: +0 ms');

    const tJwtStart = Date.now();
    const userId = req.userId;

    if (!userId) {
      console.warn('[AUTH] Missing or invalid user in deposit request');
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    const tJwtVerified = Date.now();
    const jwtDuration = tJwtVerified - tJwtStart;
    console.log(`[PAYMENT TIMER] JWT Verification: ${jwtDuration} ms`);
    console.log(`[AUTH] Deposit request accepted for user: ${userId}`);

    const { amount, phone, currency, email, paymentMethod } = req.body;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid deposit amount greater than 0.' });
    }

    const validCurrency = (currency || 'KES').toUpperCase();
    if (!['KES', 'USD'].includes(validCurrency)) {
      return res.status(400).json({ success: false, error: 'Unsupported currency. Only KES and USD are allowed.' });
    }

    // Configurable Minimum Deposit Enforcement from Platform Settings in Database
    const db = Database.getInstance();
    const platformSettings = db.getPlatformSettings();

    if (validCurrency === 'KES' && numericAmount < platformSettings.minimumDepositKES) {
      return res.status(400).json({
        success: false,
        error: `Minimum deposit is KES ${platformSettings.minimumDepositKES}.`
      });
    }

    if (validCurrency === 'USD' && numericAmount < platformSettings.minimumDepositUSD) {
      return res.status(400).json({
        success: false,
        error: `Minimum deposit is USD ${platformSettings.minimumDepositUSD}.`
      });
    }

    const selectedMethod = paymentMethod || 'M-PESA';

    if (selectedMethod === 'M-PESA') {
      if (!phone || !isValidIntaSendPhone(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid Safaricom phone number (e.g. 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX).',
        });
      }
    }

    const tValidation = Date.now() - t0;

    try {
      const result = await IntaSendService.createPayment(
        userId,
        email,
        phone || '',
        numericAmount,
        validCurrency,
        selectedMethod,
        t0
      );

      const tFrontendRes = Date.now() - t0;
      console.log(`[PAYMENT TIMER] Frontend Response Returned: +${tFrontendRes} ms`);

      console.log('[PAYMENT TIMER]');
      console.log(`Validation: ${tValidation} ms`);
      console.log(`DB Insert: ${result.dbInsertMs} ms`);
      console.log(`IntaSend API: ${result.apiMs} ms`);
      console.log(`Frontend Response: ${tFrontendRes} ms`);

      return res.status(201).json({
        success: true,
        message: 'Deposit payment initiated successfully.',
        reference: result.reference,
        invoiceId: result.invoiceId,
        checkoutUrl: result.url,
        customerMessage: result.customerMessage,
        status: 'PENDING',
        amount: numericAmount,
        currency: validCurrency,
        phone: phone || '',
      });
    } catch (error: any) {
      console.error('[PAYMENT CONTROLLER] Deposit Initiation Error:', error.message);
      return res.status(500).json({ success: false, error: error.message || 'Failed to initiate deposit.' });
    }
  }

  /**
   * GET /api/payments/:reference
   * Payment polling endpoint returning normalized status
   */
  public static async getDepositByRef(req: any, res: Response) {
    const { reference } = req.params;
    const userId = req.userId;

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required.' });
    }

    try {
      const paymentTx = await IntaSendService.getPaymentStatus(reference, userId);

      // Normalize status string: PENDING, SUCCESS, FAILED, CANCELLED, EXPIRED
      let normalizedStatus = 'PENDING';
      if (paymentTx.status === 'Completed') {
        normalizedStatus = 'SUCCESS';
      } else if (paymentTx.status === 'Failed') {
        normalizedStatus = 'FAILED';
      } else if (paymentTx.status === 'Cancelled') {
        normalizedStatus = 'CANCELLED';
      } else if (paymentTx.status === 'Pending') {
        normalizedStatus = 'PENDING';
      }

      // Backend Polling Log Strategy (Requirement 10)
      let pollInfo = pollCounters.get(reference);
      if (!pollInfo) {
        pollInfo = { count: 1, startTime: Date.now() };
        pollCounters.set(reference, pollInfo);
      } else {
        pollInfo.count += 1;
      }
      const elapsedSec = Math.round((Date.now() - pollInfo.startTime) / 1000);

      console.log(`[POLL #${pollInfo.count}]`);
      console.log(`Status:\n${normalizedStatus === 'PENDING' ? 'PROCESSING' : normalizedStatus}`);
      console.log(`Elapsed:\n${elapsedSec} sec`);

      if (['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(normalizedStatus)) {
        pollCounters.delete(reference);
      }

      return res.json({
        reference: paymentTx.reference || paymentTx.invoiceId,
        invoiceId: paymentTx.invoiceId,
        status: normalizedStatus,
        internalStatus: paymentTx.status,
        amount: paymentTx.amount,
        currency: paymentTx.currency,
        phone: paymentTx.phone,
        paymentMethod: paymentTx.paymentMethod,
        provider: paymentTx.provider,
        failedReason: paymentTx.failedReason || (normalizedStatus === 'FAILED' ? 'Payment was not completed. Please try again.' : undefined),
        failureCode: paymentTx.failureCode,
        createdAt: paymentTx.createdAt,
        updatedAt: paymentTx.updatedAt,
      });
    } catch (error: any) {
      console.error('[PAYMENT CONTROLLER] Polling Error:', error.message);
      return res.status(404).json({ error: error.message || 'Payment transaction not found.' });
    }
  }

  /**
   * POST /api/payments/intasend/create (Legacy Alias)
   */
  public static async createIntaSendPayment(req: any, res: Response) {
    return PaymentController.createDeposit(req, res);
  }

  /**
   * GET /api/payments/intasend/status/:invoiceId (Legacy Alias)
   */
  public static async getIntaSendStatus(req: any, res: Response) {
    const { invoiceId } = req.params;
    req.params.reference = invoiceId;
    return PaymentController.getDepositByRef(req, res);
  }

  /**
   * POST /api/webhooks/intasend
   * Handles IntaSend payment notifications
   */
  public static async handleWebhook(req: Request, res: Response) {
    try {
      console.log('[PAYMENT CONTROLLER] Verified IntaSend Webhook Received:', JSON.stringify(req.body));
      const result = await IntaSendService.processWebhook(req.body);

      // Always return HTTP 200 to acknowledge webhook receipt safely
      return res.status(200).json({
        status: 'success',
        detail: result.message,
      });
    } catch (error: any) {
      console.error('[PAYMENT CONTROLLER] Webhook Handling Error:', error.message);
      return res.status(500).json({ error: 'Internal webhook processing error' });
    }
  }
}

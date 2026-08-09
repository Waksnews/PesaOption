/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { ZetuPayService } from '../services/zetupay.service';
import { isValidZetuPayPhone } from '../utils/zetupay';
import { Database } from '../../server/db';

const pollCounters = new Map<string, { count: number; startTime: number }>();

export class PaymentController {
  /**
   * POST /api/payments/deposit
   * Initiates payment via ZetuPay
   */
  public static async createDeposit(req: any, res: Response) {
    const userId = req.userId;

    if (!userId) {
      console.warn('[AUTH] Missing or invalid user in deposit request');
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

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

    if (!phone || !isValidZetuPayPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid Kenyan Safaricom phone number (e.g. 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX).',
      });
    }

    const domain = req.protocol + '://' + req.get('host');

    try {
      const result = await ZetuPayService.createDeposit({
        userId,
        email,
        phone,
        amount: numericAmount,
        currency: validCurrency,
        paymentMethod: selectedMethod,
        domain
      });

      return res.status(201).json({
        success: true,
        message: 'ZetuPay deposit payment initiated successfully.',
        reference: result.reference,
        checkoutUrl: result.checkoutUrl,
        paymentKey: result.paymentKey,
        waveTransactionId: result.waveTransactionId,
        status: result.status?.toUpperCase() || 'PENDING',
        amount: result.amount,
        currency: validCurrency,
        phone: phone || '',
      });
    } catch (error: any) {
      console.error('[ZETUPAY CONTROLLER] Deposit Initiation Error:', error.message);
      return res.status(500).json({ success: false, error: error.message || 'Failed to initiate ZetuPay deposit.' });
    }
  }

  /**
   * GET /api/payments/:reference or GET /api/payments/:reference/status
   * Payment polling/status endpoint returning normalized status
   */
  public static async getDepositByRef(req: any, res: Response) {
    const { reference } = req.params;
    const userId = req.userId;

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required.' });
    }

    try {
      const paymentTx = await ZetuPayService.checkPaymentStatus(reference, userId);

      // Normalize status string: PENDING, SUCCESS, FAILED, CANCELLED
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

      let pollInfo = pollCounters.get(reference);
      if (!pollInfo) {
        pollInfo = { count: 1, startTime: Date.now() };
        pollCounters.set(reference, pollInfo);
      } else {
        pollInfo.count += 1;
      }
      const elapsedSec = Math.round((Date.now() - pollInfo.startTime) / 1000);

      console.log(`[POLL #${pollInfo.count}] Reference: ${reference} Status: ${normalizedStatus} Elapsed: ${elapsedSec}s`);

      if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(normalizedStatus)) {
        pollCounters.delete(reference);
      }

      return res.json({
        reference: paymentTx.reference || paymentTx.invoiceId,
        invoiceId: paymentTx.invoiceId,
        paymentKey: paymentTx.paymentKey,
        waveTransactionId: paymentTx.waveTransactionId,
        checkoutUrl: paymentTx.checkoutUrl,
        receiptNumber: paymentTx.receiptNumber,
        status: normalizedStatus,
        internalStatus: paymentTx.status,
        amount: paymentTx.amount,
        currency: paymentTx.currency,
        phone: paymentTx.phone,
        paymentMethod: paymentTx.paymentMethod,
        provider: paymentTx.provider,
        failedReason: paymentTx.failedReason || (normalizedStatus === 'FAILED' ? 'Payment was not completed. Please try again.' : undefined),
        createdAt: paymentTx.createdAt,
        updatedAt: paymentTx.updatedAt,
      });
    } catch (error: any) {
      console.error('[ZETUPAY CONTROLLER] Polling Error:', error.message);
      return res.status(404).json({ error: error.message || 'Payment transaction not found.' });
    }
  }

  /**
   * POST /api/webhooks/zetupay
   * Handles ZetuPay webhook callback
   */
  public static async handleWebhook(req: Request, res: Response) {
    try {
      console.log('[ZETUPAY CONTROLLER] Webhook Received:', JSON.stringify(req.body));
      const result = await ZetuPayService.handleWebhook(req.headers, req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[ZETUPAY CONTROLLER] Webhook Error:', error.message);
      if (error.message && error.message.includes('Unauthorized')) {
        return res.status(401).json({ success: false, error: error.message });
      }
      return res.status(200).json({ success: false, error: error.message });
    }
  }

  /**
   * Alias for webhook callback handler
   */
  public static async handleCallback(req: Request, res: Response) {
    return PaymentController.handleWebhook(req, res);
  }
}

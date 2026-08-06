/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { LipiaService } from '../services/lipia.service';
import { isValidLipiaPhone } from '../utils/lipia';
import { Database } from '../../server/db';

const pollCounters = new Map<string, { count: number; startTime: number }>();

export class PaymentController {
  /**
   * POST /api/payments/deposit
   * Initiates STK push deposit via Lipia Online
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

    if (!phone || !isValidLipiaPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid Safaricom phone number (e.g. 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX).',
      });
    }

    try {
      const result = await LipiaService.createDeposit(
        userId,
        email,
        phone,
        numericAmount,
        validCurrency,
        selectedMethod
      );

      return res.status(201).json({
        success: true,
        message: 'Lipia deposit payment initiated successfully.',
        reference: result.reference,
        externalReference: result.externalReference,
        invoiceId: result.invoiceId,
        customerMessage: result.customerMessage,
        status: 'PENDING',
        amount: numericAmount,
        currency: validCurrency,
        phone: phone || '',
      });
    } catch (error: any) {
      console.error('[LIPIA CONTROLLER] Deposit Initiation Error:', error.message);
      return res.status(500).json({ success: false, error: error.message || 'Failed to initiate Lipia deposit.' });
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
      const paymentTx = await LipiaService.pollPaymentStatus(reference, userId);

      // Normalize status string: PENDING, SUCCESS, FAILED
      let normalizedStatus = 'PENDING';
      if (paymentTx.status === 'Completed') {
        normalizedStatus = 'SUCCESS';
      } else if (paymentTx.status === 'Failed') {
        normalizedStatus = 'FAILED';
      } else if (paymentTx.status === 'Cancelled') {
        normalizedStatus = 'FAILED';
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

      console.log(`[POLL #${pollInfo.count}]`);
      console.log(`Status:\n${normalizedStatus}`);
      console.log(`Elapsed:\n${elapsedSec} sec`);

      if (['SUCCESS', 'FAILED'].includes(normalizedStatus)) {
        pollCounters.delete(reference);
      }

      return res.json({
        reference: paymentTx.reference || paymentTx.externalReference || paymentTx.invoiceId,
        externalReference: paymentTx.externalReference || paymentTx.reference,
        invoiceId: paymentTx.invoiceId,
        status: normalizedStatus,
        internalStatus: paymentTx.status,
        amount: paymentTx.amount,
        currency: paymentTx.currency,
        phone: paymentTx.phone,
        paymentMethod: paymentTx.paymentMethod,
        provider: paymentTx.provider,
        failedReason: paymentTx.failedReason || (normalizedStatus === 'FAILED' ? 'Payment was not completed. Please try again.' : undefined),
        resultCode: paymentTx.resultCode,
        resultDescription: paymentTx.resultDescription,
        mpesaReceiptNumber: paymentTx.mpesaReceiptNumber,
        merchantRequestId: paymentTx.merchantRequestId,
        checkoutRequestId: paymentTx.checkoutRequestId,
        createdAt: paymentTx.createdAt,
        updatedAt: paymentTx.updatedAt,
      });
    } catch (error: any) {
      console.error('[LIPIA CONTROLLER] Polling Error:', error.message);
      return res.status(404).json({ error: error.message || 'Payment transaction not found.' });
    }
  }

  /**
   * POST /api/payment/lipia/callback or POST /api/webhooks/lipia
   * Handles Lipia payment callback
   */
  public static async handleCallback(req: Request, res: Response) {
    try {
      console.log('[LIPIA CONTROLLER] Callback Received:', JSON.stringify(req.body));
      await LipiaService.handleCallback(req.body);

      // Always return HTTP 200 ok
      return res.status(200).send('ok');
    } catch (error: any) {
      console.error('[LIPIA CONTROLLER] Callback Error:', error.message);
      return res.status(200).send('ok');
    }
  }
}

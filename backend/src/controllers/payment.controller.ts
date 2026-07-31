/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { IntaSendService } from '../services/intasend.service';
import { isValidIntaSendPhone } from '../utils/intasend';

export class PaymentController {
  /**
   * POST /api/payments/intasend/create
   * Creates IntaSend payment request (STK Push or Card Checkout)
   */
  public static async createIntaSendPayment(req: any, res: Response) {
    const { amount, phone, currency, email, paymentMethod } = req.body;
    const userId = req.userId; // Authenticated user ID

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    // Server-side amount validation
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid deposit amount greater than 0.' });
    }

    const selectedMethod = paymentMethod || 'M-PESA';

    // Phone validation for M-PESA
    if (selectedMethod === 'M-PESA') {
      if (!phone || !isValidIntaSendPhone(phone)) {
        return res.status(400).json({
          error: 'Please enter a valid Safaricom phone number (e.g. 07XXXXXXXX, 01XXXXXXXX, or 2547XXXXXXXX).',
        });
      }
    }

    try {
      const result = await IntaSendService.createPayment(
        userId,
        email,
        phone || '',
        numericAmount,
        currency || 'KES',
        selectedMethod
      );

      return res.json({
        message: 'IntaSend payment initiated successfully.',
        invoiceId: result.invoiceId,
        url: result.url,
        customerMessage: result.customerMessage,
        status: result.status,
      });
    } catch (error: any) {
      console.error('[PAYMENT CONTROLLER] Create IntaSend Error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to process IntaSend payment.' });
    }
  }

  /**
   * GET /api/payments/intasend/status/:invoiceId
   * Checks status of an ongoing IntaSend payment
   */
  public static async getIntaSendStatus(req: any, res: Response) {
    const { invoiceId } = req.params;
    const userId = req.userId;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required.' });
    }

    try {
      const paymentTx = await IntaSendService.getPaymentStatus(invoiceId, userId);

      return res.json({
        status: paymentTx.status,
        invoiceId: paymentTx.invoiceId,
        amount: paymentTx.amount,
        currency: paymentTx.currency,
        phone: paymentTx.phone,
        paymentMethod: paymentTx.paymentMethod,
        reference: paymentTx.reference,
        createdAt: paymentTx.createdAt,
        updatedAt: paymentTx.updatedAt,
      });
    } catch (error: any) {
      console.error('[PAYMENT CONTROLLER] Status Error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to check payment status.' });
    }
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

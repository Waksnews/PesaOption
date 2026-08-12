/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { MpesaService } from '../services/mpesa.service';
import { isValidPhoneNumber } from '../utils/mpesa';

export class MpesaController {
  /**
   * POST /api/mpesa/stkpush
   * Initiates STK Push request to Safaricom
   */
  public static async stkPush(req: any, res: Response) {
    const { phoneNumber, amount } = req.body;
    const userId = req.userId; // Provided by auth middleware

    if (!phoneNumber || !amount) {
      return res.status(400).json({ error: 'Phone number and amount are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid deposit amount.' });
    }

    const { Database } = require('../../server/db');
    const db = Database.getInstance();
    const platformSettings = db.getPlatformSettings();

    if (numericAmount < platformSettings.minimumDepositKES) {
      return res.status(400).json({
        error: `Minimum deposit is KES ${platformSettings.minimumDepositKES}.`
      });
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Please enter a valid Safaricom phone number (e.g., 07xxxxxxxx or 01xxxxxxxx).' });
    }

    try {
      const response = await MpesaService.initiateStkPush(userId, phoneNumber, numericAmount);
      return res.json({
        message: 'STK Push initiated successfully.',
        checkoutRequestId: response.CheckoutRequestID,
        merchantRequestId: response.MerchantRequestID,
        customerMessage: response.CustomerMessage,
      });
    } catch (error: any) {
      console.error('[MPESA CONTROLLER] STK Push Error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to initiate STK Push.' });
    }
  }

  /**
   * POST /api/mpesa/callback
   * Handles Safaricom callback after payment validation
   */
  public static async callback(req: Request, res: Response) {
    try {
      console.log('[MPESA CONTROLLER] Callback received from Safaricom:', JSON.stringify(req.body));
      
      // Safaricom wraps callback under "Body"
      const callbackData = req.body.Body || req.body;
      
      await MpesaService.handleCallback(callbackData);
      
      // Safaricom expects a standard JSON response with ResultCode 0 for successful callback acceptance
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Callback received and processed successfully',
      });
    } catch (error: any) {
      console.error('[MPESA CONTROLLER] Callback Processing Error:', error.message);
      // Still return 200/Ok or error so Safaricom doesn't retry endlessly if we had a parsing glitch
      return res.status(500).json({ error: 'Failed to process callback' });
    }
  }

  /**
   * GET /api/mpesa/status/:checkoutRequestId
   * Polls the status of an ongoing STK Push transaction
   */
  public static async status(req: any, res: Response) {
    const { checkoutRequestId } = req.params;
    const userId = req.userId;

    if (!checkoutRequestId) {
      return res.status(400).json({ error: 'CheckoutRequestId is required.' });
    }

    try {
      const transaction = MpesaService.getTransactionStatus(checkoutRequestId);
      
      if (!transaction) {
        return res.status(404).json({ error: 'M-PESA transaction not found.' });
      }

      // Check if user is authorized to view this transaction
      if (transaction.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this transaction.' });
      }

      return res.json({
        status: transaction.status,
        checkoutRequestId: transaction.checkoutRequestId,
        amount: transaction.amount,
        phone: transaction.phone,
        receiptNumber: transaction.receiptNumber,
        resultDesc: transaction.resultDesc,
        resultCode: transaction.resultCode,
      });
    } catch (error: any) {
      console.error('[MPESA CONTROLLER] Status Check Error:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve transaction status.' });
    }
  }
}

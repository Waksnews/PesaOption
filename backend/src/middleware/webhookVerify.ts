/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { verifyIntaSendSignature } from '../utils/intasend';

export function webhookVerify(req: Request, res: Response, next: NextFunction) {
  const webhookSecret = process.env.INTASEND_WEBHOOK_SECRET || process.env.INTASEND_SECRET_KEY || '';

  // Validate webhook request format
  if (!req.body || typeof req.body !== 'object') {
    console.error('[INTASEND WEBHOOK VERIFY] Invalid webhook payload body.');
    return res.status(400).json({ error: 'Invalid payload body.' });
  }

  // Verify signature
  const isValid = verifyIntaSendSignature(req, webhookSecret);

  if (!isValid) {
    console.error('[INTASEND WEBHOOK VERIFY] Rejected unauthorized webhook request. Signature mismatch.');
    return res.status(401).json({ error: 'Unauthorized webhook signature verification failed.' });
  }

  console.log('[INTASEND WEBHOOK VERIFY] Webhook signature verified successfully.');
  next();
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { verifyIntaSendSignature } from '../utils/intasend';

export function webhookVerify(req: Request, res: Response, next: NextFunction) {
  console.log('[WEBHOOK RECEIVED] Payload:', JSON.stringify(req.body));
  const webhookSecret = process.env.INTASEND_WEBHOOK_SECRET || process.env.INTASEND_SECRET_KEY || '';

  // Validate webhook request body presence
  if (!req.body || typeof req.body !== 'object') {
    console.error('[SIGNATURE FAILED] Invalid or empty request payload body received.');
    return res.status(400).json({ error: 'Invalid webhook payload body.' });
  }

  // Verify signature / challenge using IntaSend official logic
  const isValid = verifyIntaSendSignature(req, webhookSecret);

  if (!isValid) {
    console.error('[SIGNATURE FAILED] Rejecting unauthorized IntaSend webhook request with HTTP 401.');
    return res.status(401).json({ error: 'Unauthorized webhook signature or challenge verification failed.' });
  }

  console.log('[SIGNATURE VERIFIED] Webhook authenticated successfully.');
  next();
}

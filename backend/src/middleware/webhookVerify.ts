/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

export function webhookVerify(req: Request, res: Response, next: NextFunction) {
  console.log('[WEBHOOK RECEIVED] Payload:', JSON.stringify(req.body));

  if (!req.body || typeof req.body !== 'object') {
    console.error('[WEBHOOK FAILED] Invalid or empty request payload body received.');
    return res.status(400).json({ error: 'Invalid webhook payload body.' });
  }

  next();
}

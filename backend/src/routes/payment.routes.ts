/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import crypto from 'crypto';
import { PaymentController } from '../controllers/payment.controller';

const router = express.Router();

const SESSION_SECRET = 'cryptonichub_secret_session_key_2026';

function verifySessionToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role, expiresStr, signature] = decoded.split(':');
    const expires = parseInt(expiresStr, 10);
    
    if (Date.now() > expires) {
      return null;
    }

    const payload = `${userId}:${role}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    
    if (signature === expectedSignature) {
      return { userId, role };
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Token missing.' });
  }

  const token = authHeader.split(' ')[1];
  const session = verifySessionToken(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }

  req.userId = session.userId;
  req.userRole = session.role;
  next();
}

// Payment endpoints
router.post('/intasend/create', authenticate, PaymentController.createIntaSendPayment);
router.get('/intasend/status/:invoiceId', authenticate, PaymentController.getIntaSendStatus);

export default router;

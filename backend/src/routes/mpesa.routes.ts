/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import crypto from 'crypto';
import { MpesaController } from '../controllers/mpesa.controller';

const router = express.Router();

// Session secret matching server.ts exactly for validation
const SESSION_SECRET = 'cryptonichub_secret_session_key_2026';

function verifySessionToken(token: string): { userId: string; role: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role, expiresStr, signature] = decoded.split(':');
    const expires = parseInt(expiresStr, 10);
    
    if (Date.now() > expires) {
      return null; // Expired
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

// Route authentication middleware
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. No session token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const session = verifySessionToken(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }

  req.userId = session.userId;
  req.userRole = session.role;
  next();
}

// Endpoints configuration
router.post('/stkpush', authenticate, MpesaController.stkPush);
router.post('/callback', MpesaController.callback); // Public for Safaricom calls
router.get('/status/:checkoutRequestId', authenticate, MpesaController.status);

export default router;

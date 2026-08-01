/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

/**
 * Validates and formats Kenyan phone numbers to the IntaSend / M-PESA format (254XXXXXXXXX)
 * Supports formats: 07xxxxxxxx, 01xxxxxxxx, 2547xxxxxxxx, 2541xxxxxxxx, +2547xxxxxxxx
 */
export function formatIntaSendPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  if ((cleaned.startsWith('2547') || cleaned.startsWith('2541')) && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }

  if (cleaned.length === 9) {
    return '254' + cleaned;
  }

  return cleaned;
}

/**
 * Validates whether the phone number is a valid Kenyan M-PESA number
 */
export function isValidIntaSendPhone(phone: string): boolean {
  const formatted = formatIntaSendPhone(phone);
  return /^254(7|1)\d{8}$/.test(formatted);
}

/**
 * Verifies IntaSend Webhook Signature
 */
export function verifyIntaSendSignature(req: any, webhookSecret: string): boolean {
  const secret = webhookSecret || process.env.INTASEND_WEBHOOK_SECRET || process.env.INTASEND_SECRET_KEY || '';

  if (!secret) {
    console.warn('[INTASEND WEBHOOK] INTASEND_WEBHOOK_SECRET is not set in environment. Allowing webhook with fallback log.');
    return true;
  }

  try {
    const signatureHeader = req.headers['x-intasend-signature'] || req.headers['signature'] || req.headers['x-signature'];
    const bodyChallenge = req.body?.challenge || req.body?.signature;

    // 1. Check header HMAC signature
    if (signatureHeader) {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (signatureHeader === expectedSignature) {
        console.log('[PAYMENT STAGE] Signature verified: Valid header HMAC match');
        return true;
      }
    }

    // 2. Check challenge parameter or direct secret key match
    if (bodyChallenge && (bodyChallenge === secret || bodyChallenge === process.env.INTASEND_SECRET_KEY)) {
      console.log('[PAYMENT STAGE] Signature verified: Valid challenge match');
      return true;
    }

    // 3. Check secret token header if provided
    const tokenHeader = req.headers['x-intasend-secret'] || req.headers['x-api-key'];
    if (tokenHeader && (tokenHeader === secret || tokenHeader === process.env.INTASEND_SECRET_KEY)) {
      console.log('[PAYMENT STAGE] Signature verified: Valid token header match');
      return true;
    }

    // 4. Fallback payload verification (invoice_id:state)
    if (req.body?.invoice_id && req.body?.state) {
      const payloadString = `${req.body.invoice_id}:${req.body.state}`;
      const calculated = crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
      if (signatureHeader === calculated) {
        console.log('[PAYMENT STAGE] Signature verified: Valid payload string HMAC match');
        return true;
      }
    }

    console.warn('[PAYMENT STAGE] Signature verification failed: No matching signature criteria found');
    return false;
  } catch (error) {
    console.error('[INTASEND VERIFY SIGNATURE ERROR]', error);
    return false;
  }
}

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
  if (!webhookSecret) {
    // If webhook secret is not configured in env, allow in dev or fallback gracefully with warning
    console.warn('[INTASEND WEBHOOK] INTASEND_WEBHOOK_SECRET is not set. Skipping signature verification check.');
    return true;
  }

  try {
    const signatureHeader = req.headers['x-intasend-signature'] || req.headers['signature'] || req.headers['x-signature'];
    const bodyChallenge = req.body?.challenge || req.body?.signature;

    // Check header signature first if provided
    if (signatureHeader) {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signatureHeader === expectedSignature) {
        return true;
      }
    }

    // Check challenge parameter or direct secret matching
    if (bodyChallenge && (bodyChallenge === webhookSecret || bodyChallenge === process.env.INTASEND_SECRET_KEY)) {
      return true;
    }

    // Check token header / auth header if IntaSend sends secret key in header
    const tokenHeader = req.headers['x-intasend-secret'] || req.headers['x-api-key'];
    if (tokenHeader && tokenHeader === webhookSecret) {
      return true;
    }

    // Fallback signature check on invoice_id + state
    if (req.body?.invoice_id && req.body?.state) {
      const payloadString = `${req.body.invoice_id}:${req.body.state}`;
      const calculated = crypto.createHmac('sha256', webhookSecret).update(payloadString).digest('hex');
      if (signatureHeader === calculated) {
        return true;
      }
    }

    // If signature header matches expected HMAC digest
    return false;
  } catch (error) {
    console.error('[INTASEND VERIFY SIGNATURE ERROR]', error);
    return false;
  }
}

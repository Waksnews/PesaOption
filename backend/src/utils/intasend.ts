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
 * Verifies IntaSend Webhook Signature / Challenge according to official IntaSend LIVE specifications.
 * 
 * IntaSend Webhook Verification Protocol:
 * 1. Challenge Verification: IntaSend sends the merchant's configured Challenge token inside `req.body.challenge`.
 * 2. Signature Verification: IntaSend sends an `x-intasend-signature` header containing the HMAC-SHA256
 *    signature of the request payload keyed with INTASEND_WEBHOOK_SECRET.
 */
export function verifyIntaSendSignature(req: any, webhookSecret: string): boolean {
  const secret = webhookSecret || process.env.INTASEND_WEBHOOK_SECRET || process.env.INTASEND_SECRET_KEY || '';

  if (!secret) {
    console.warn('[SIGNATURE FAILED] INTASEND_WEBHOOK_SECRET or INTASEND_SECRET_KEY is missing in environment variables.');
    return false;
  }

  try {
    const signatureHeader = req.headers['x-intasend-signature'];
    const bodyChallenge = req.body?.challenge;

    // 1. Verify HMAC-SHA256 signature header if provided by IntaSend
    if (signatureHeader && typeof signatureHeader === 'string') {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const computedHmac = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (signatureHeader.trim().toLowerCase() === computedHmac.trim().toLowerCase()) {
        console.log('[SIGNATURE VERIFIED] Valid x-intasend-signature HMAC SHA-256 match.');
        return true;
      }
    }

    // 2. Verify Challenge Secret parameter in request body as specified by IntaSend
    if (bodyChallenge && typeof bodyChallenge === 'string' && bodyChallenge === secret) {
      console.log('[SIGNATURE VERIFIED] Valid IntaSend challenge secret match in payload body.');
      return true;
    }

    console.warn('[SIGNATURE FAILED] Webhook verification failed. Invalid challenge secret or signature header.');
    return false;
  } catch (error) {
    console.error('[SIGNATURE FAILED] Error during IntaSend webhook verification:', error);
    return false;
  }
}

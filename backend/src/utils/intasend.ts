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

/**
 * Maps IntaSend / Safaricom failure codes and status messages to human-readable user messages.
 */
export function mapIntaSendFailureReason(codeOrReason?: string | number): string {
  if (!codeOrReason) return 'Payment was not completed. Please try again.';
  const str = String(codeOrReason).trim();

  if (str === '1037' || str.includes('1037') || str.toLowerCase().includes('no response from user')) {
    return 'The M-PESA request expired because no PIN was entered.';
  }
  if (str === '1032' || str.includes('1032') || str.toLowerCase().includes('cancelled by customer')) {
    return 'Transaction cancelled by customer.';
  }
  if (str === '1025' || str.includes('1025') || str.toLowerCase().includes('insufficient')) {
    return 'Insufficient M-PESA balance.';
  }
  if (str.toLowerCase().includes('invalid pin') || str.toLowerCase().includes('wrong pin') || str === '2001') {
    return 'Incorrect M-PESA PIN entered.';
  }

  return str || 'Payment was not completed. Please try again.';
}

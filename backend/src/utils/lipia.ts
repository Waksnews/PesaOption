/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

/**
 * Validates and formats Kenyan phone numbers to the Lipia / M-PESA format (254XXXXXXXXX)
 * Supports formats: 07xxxxxxxx, 01xxxxxxxx, 2547xxxxxxxx, 2541xxxxxxxx, +2547xxxxxxxx
 */
export function formatLipiaPhone(phone: string): string {
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
export function isValidLipiaPhone(phone: string): boolean {
  const formatted = formatLipiaPhone(phone);
  return /^254(7|1)\d{8}$/.test(formatted);
}

/**
 * Generates a unique deposit reference in the format PO-DEP-XXXXXX (e.g. PO-DEP-4AF91C)
 */
export function generateDepositReference(): string {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PO-DEP-${randomHex}`;
}

/**
 * Maps Lipia / Safaricom result codes and descriptions to human-readable user messages.
 */
export function mapLipiaResultCode(code?: number | string, desc?: string): string {
  if (desc && desc.trim().length > 0 && !desc.toLowerCase().includes('resultcode')) {
    return desc;
  }
  if (code === undefined || code === null) {
    return 'Payment was not completed. Please try again.';
  }

  const strCode = String(code).trim();

  switch (strCode) {
    case '0':
      return 'Payment completed successfully.';
    case '1032':
    case 'CANCELLED':
      return 'Transaction cancelled by user.';
    case '1037':
    case 'TIMEOUT':
      return 'The M-PESA request timed out. No PIN was entered.';
    case '1025':
      return 'Insufficient M-PESA balance.';
    case '2001':
      return 'Incorrect M-PESA PIN entered.';
    default:
      return desc || `Payment failed with code ${strCode}. Please try again.`;
  }
}

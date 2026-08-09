/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

/**
 * Validates and formats Kenyan phone numbers to standard 254XXXXXXXXX format
 * Supports formats: 07xxxxxxxx, 01xxxxxxxx, 2547xxxxxxxx, 2541xxxxxxxx, +2547xxxxxxxx
 */
export function formatZetuPayPhone(phone: string): string {
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
export function isValidZetuPayPhone(phone: string): boolean {
  const formatted = formatZetuPayPhone(phone);
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
 * Maps ZetuPay status and failure codes to user-friendly messages
 */
export function mapZetuPayStatus(status?: string, message?: string): string {
  if (message && message.trim().length > 0) {
    return message;
  }
  if (!status) {
    return 'Payment transaction was not completed.';
  }

  const s = status.toLowerCase();
  if (s === 'success' || s === 'completed') {
    return 'Payment completed successfully.';
  }
  if (s === 'pending') {
    return 'Payment request is waiting for authorization or PIN entry.';
  }
  if (s === 'failed') {
    return 'Payment failed or was declined by user or M-Pesa.';
  }
  if (s === 'cancelled') {
    return 'Payment request was cancelled by user.';
  }
  return `Payment status: ${status}`;
}

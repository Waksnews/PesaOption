/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Validates and formats Kenyan phone numbers to the Safaricom format (254XXXXXXXXX)
 * Supports formats: 07xxxxxxxx, 01xxxxxxxx, +2547xxxxxxxx, 2547xxxxxxxx
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Handle +254 or 254 prefix
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }

  // Handle local formats starting with 07 or 01
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }

  // Fallback / standard formatting
  if (cleaned.length === 9) {
    return '254' + cleaned;
  }

  return cleaned;
}

/**
 * Validates whether the formatted phone number is valid for Safaricom
 */
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Safaricom format should be 12 digits starting with 2541 or 2547
  return /^254(7|1)\d{8}$/.test(formatted);
}

/**
 * Generates Safaricom STK Push timestamp in format: YYYYMMDDHHMMSS
 */
export function generateTimestamp(): string {
  const date = new Date();
  
  // Convert to East Africa Time (GMT+3) if possible, or just use UTC/Local formatted carefully
  // The Safaricom Daraja API expects the local server timestamp matching the timezone of the request
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generates password for STK Push: Base64(Shortcode + Passkey + Timestamp)
 */
export function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const rawString = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(rawString).toString('base64');
}

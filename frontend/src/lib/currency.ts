/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const USD_TO_KES_RATE = 130;

export function formatCurrency(amountUsd: number, currency: string, options?: Intl.NumberFormatOptions): string {
  const isKes = currency === 'KES';
  const displayAmount = isKes ? amountUsd * USD_TO_KES_RATE : amountUsd;
  
  const formatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: isKes ? 'KES' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
  
  return formatter.format(displayAmount);
}

export function convertToUsd(amountInActive: number, currency: string): number {
  if (currency === 'KES') {
    return amountInActive / USD_TO_KES_RATE;
  }
  return amountInActive;
}

export function convertToActive(amountInUsd: number, currency: string): number {
  if (currency === 'KES') {
    return amountInUsd * USD_TO_KES_RATE;
  }
  return amountInUsd;
}

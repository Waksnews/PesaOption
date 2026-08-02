/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let currentUsdKesRate = 130.0;

export function getUsdKesRate(): number {
  return currentUsdKesRate;
}

export function setUsdKesRate(rate: number): void {
  if (rate && rate > 0) {
    currentUsdKesRate = rate;
  }
}

export function formatCurrency(
  amountUsd: number,
  currency: string,
  options?: Intl.NumberFormatOptions,
  overrideRate?: number
): string {
  const isKes = currency === 'KES';
  const rate = overrideRate || currentUsdKesRate;
  const displayAmount = isKes ? amountUsd * rate : amountUsd;
  
  const formatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: isKes ? 'KES' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
  
  return formatter.format(displayAmount);
}

export function convertToUsd(amountInActive: number, currency: string, overrideRate?: number): number {
  if (currency === 'KES') {
    const rate = overrideRate || currentUsdKesRate;
    return amountInActive / rate;
  }
  return amountInActive;
}

export function convertToActive(amountInUsd: number, currency: string, overrideRate?: number): number {
  if (currency === 'KES') {
    const rate = overrideRate || currentUsdKesRate;
    return amountInUsd * rate;
  }
  return amountInUsd;
}

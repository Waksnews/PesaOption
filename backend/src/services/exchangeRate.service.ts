/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Database } from '../../server/db';

export interface ExchangeRateRecord {
  pair: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: string;
}

export class ExchangeRateService {
  private static DEFAULT_USD_KES_RATE = 130.0;

  /**
   * Get current exchange rate for a given currency pair (e.g. USD -> KES)
   */
  public static getRate(fromCurrency: string = 'USD', toCurrency: string = 'KES'): number {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return 1.0;
    }

    const pairKey = `${from}_${to}`;
    const reversePairKey = `${to}_${from}`;

    const db = Database.getInstance();
    const storedRates = db.getExchangeRates();

    if (storedRates[pairKey] && storedRates[pairKey] > 0) {
      return storedRates[pairKey];
    }

    if (storedRates[reversePairKey] && storedRates[reversePairKey] > 0) {
      return 1 / storedRates[reversePairKey];
    }

    // Default USD to KES rate if not set in DB
    if (pairKey === 'USD_KES') {
      return this.DEFAULT_USD_KES_RATE;
    }
    if (pairKey === 'KES_USD') {
      return 1 / this.DEFAULT_USD_KES_RATE;
    }

    return 1.0;
  }

  /**
   * Set and persist exchange rate for a given currency pair (e.g., USD -> KES)
   */
  public static setRate(rate: number, fromCurrency: string = 'USD', toCurrency: string = 'KES'): number {
    if (isNaN(rate) || rate <= 0) {
      throw new Error('Exchange rate must be a positive number.');
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const pairKey = `${from}_${to}`;

    const db = Database.getInstance();
    db.setExchangeRate(from, to, rate);

    console.log(`[EXCHANGE RATE SERVICE] Updated exchange rate for ${pairKey}: 1 ${from} = ${rate} ${to}`);
    return rate;
  }

  /**
   * Convert KES amount to USD using given rate or active system rate
   */
  public static convertKEStoUSD(amountKES: number, customRate?: number): number {
    const rate = customRate && customRate > 0 ? customRate : this.getRate('USD', 'KES');
    if (rate <= 0) return amountKES;
    return amountKES / rate;
  }

  /**
   * Convert USD amount to KES using given rate or active system rate
   */
  public static convertUSDtoKES(amountUSD: number, customRate?: number): number {
    const rate = customRate && customRate > 0 ? customRate : this.getRate('USD', 'KES');
    return amountUSD * rate;
  }

  /**
   * General conversion helper between any two currencies
   */
  public static convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    customRate?: number
  ): { result: number; rateUsed: number } {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return { result: amount, rateUsed: 1.0 };
    }

    const rate = customRate && customRate > 0 ? customRate : this.getRate(from, to);
    const result = from === 'USD' && to === 'KES'
      ? amount * rate
      : from === 'KES' && to === 'USD'
        ? amount / rate
        : amount * rate;

    return { result, rateUsed: rate };
  }

  /**
   * Get all registered exchange rates
   */
  public static getAllRates(): ExchangeRateRecord[] {
    const db = Database.getInstance();
    const storedRates = db.getExchangeRates();
    const updatedAt = new Date().toISOString();

    const pairs = Object.keys(storedRates);
    if (pairs.length === 0) {
      return [
        {
          pair: 'USD/KES',
          fromCurrency: 'USD',
          toCurrency: 'KES',
          rate: this.DEFAULT_USD_KES_RATE,
          updatedAt,
        },
      ];
    }

    return pairs.map(pair => {
      const [fromCurrency, toCurrency] = pair.split('_');
      return {
        pair: `${fromCurrency}/${toCurrency}`,
        fromCurrency,
        toCurrency,
        rate: storedRates[pair],
        updatedAt,
      };
    });
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MarketPrice, CandleData, VolumeData } from '../types';
import { useMarketStore } from '../stores/marketStore';
import { useTradeStore } from '../stores/tradeStore';

export type TickListener = (prices: MarketPrice[], updatedSymbol: string, price: number) => void;

export class MarketSimulationService {
  private static instance: MarketSimulationService;
  private timer: any = null;
  private isRunning: boolean = false;
  private listeners: Set<TickListener> = new Set();
  private tickIntervalMs: number = 1200; // Tick every 1.2 seconds for energetic feel

  // Primary markets definition
  private markets: MarketPrice[] = [
    { symbol: 'VOL_100_1S', name: 'Vol 100 (1s)', price: 12451.27, change24h: -5.62, category: 'vol_index', sparkline: [] },
    { symbol: 'VOL_100', name: 'Volatility 100 Index', price: 12451.27, change24h: -5.62, category: 'vol_index', sparkline: [] },
    { symbol: 'VOL_75', name: 'Volatility 75 Index', price: 8245.10, change24h: -0.65, category: 'vol_index', sparkline: [] },
    { symbol: 'VOL_50', name: 'Volatility 50 Index', price: 3150.15, change24h: -2.15, category: 'vol_index', sparkline: [] },
    { symbol: 'VOL_25', name: 'Volatility 25 Index', price: 1648.50, change24h: 0.85, category: 'vol_index', sparkline: [] },
    { symbol: 'VOL_10', name: 'Volatility 10 Index', price: 421.50, change24h: 1.20, category: 'vol_index', sparkline: [] },
    { symbol: 'BTC_USD', name: 'Bitcoin / USD', price: 65420.50, change24h: 2.45, category: 'crypto', sparkline: [] },
    { symbol: 'ETH_USD', name: 'Ethereum / USD', price: 3450.25, change24h: 1.80, category: 'crypto', sparkline: [] },
    { symbol: 'EUR_USD', name: 'EUR / USD', price: 1.0850, change24h: 0.12, category: 'forex', sparkline: [] },
    { symbol: 'GBP_USD', name: 'GBP / USD', price: 1.2920, change24h: -0.28, category: 'forex', sparkline: [] },
    { symbol: 'USD_JPY', name: 'USD / JPY', price: 155.40, change24h: 0.45, category: 'forex', sparkline: [] },
    { symbol: 'NASDAQ', name: 'NASDAQ 100', price: 19542.10, change24h: -1.12, category: 'indices', sparkline: [] },
    { symbol: 'S&P500', name: 'S&P 500 Index', price: 5552.45, change24h: -0.42, category: 'indices', sparkline: [] },
    { symbol: 'Gold', name: 'Gold Spot', price: 2412.50, change24h: 0.65, category: 'commodities', sparkline: [] },
    { symbol: 'Oil', name: 'Crude Oil WTI', price: 81.30, change24h: -0.35, category: 'commodities', sparkline: [] }
  ];

  // Map storing candle arrays per symbol
  private candleStore: Record<string, CandleData[]> = {};
  private volumeStore: Record<string, VolumeData[]> = {};

  private constructor() {
    this.initializeHistory();
  }

  public static getInstance(): MarketSimulationService {
    if (!MarketSimulationService.instance) {
      MarketSimulationService.instance = new MarketSimulationService();
    }
    return MarketSimulationService.instance;
  }

  /**
   * Pre-generates 60 historical OHLC candles and volume points for each market
   */
  private initializeHistory() {
    const now = Math.floor(Date.now() / 1000);
    const intervalSec = 5; // 5-second candle timeframe

    this.markets.forEach((m) => {
      const decimals = m.category === 'forex' ? 4 : 2;
      const candles: CandleData[] = [];
      const volumes: VolumeData[] = [];
      let currentPrice = m.price * 0.995; // start slightly offset
      const sparkline: number[] = [];

      for (let i = 60; i >= 1; i--) {
        const time = now - i * intervalSec;
        const volatility = m.category === 'forex' ? 0.0002 : m.category === 'crypto' ? 0.0006 : 0.0004;
        
        const deltaOpen = (Math.random() - 0.495) * m.price * volatility;
        const open = Number(currentPrice.toFixed(decimals));
        const close = Number((open + deltaOpen).toFixed(decimals));
        const high = Number((Math.max(open, close) + Math.abs(deltaOpen) * (Math.random() * 0.5)).toFixed(decimals));
        const low = Number((Math.min(open, close) - Math.abs(deltaOpen) * (Math.random() * 0.5)).toFixed(decimals));
        const volume = Math.floor(Math.random() * 80 + 20);

        candles.push({ time, open, high, low, close, volume });
        volumes.push({
          time,
          value: volume,
          color: close >= open ? '#10b981' : '#f43f5e'
        });

        sparkline.push(close);
        currentPrice = close;
      }

      // Sync updated base price and sparkline
      m.price = candles[candles.length - 1].close;
      m.sparkline = sparkline.slice(-10);

      this.candleStore[m.symbol] = candles;
      this.volumeStore[m.symbol] = volumes;
    });

    // Populate Zustand initial state
    useMarketStore.getState().setPrices(this.markets);
    Object.keys(this.candleStore).forEach((symbol) => {
      useMarketStore.getState().setCandlesBySymbol(symbol, this.candleStore[symbol]);
      useMarketStore.getState().setVolumesBySymbol(symbol, this.volumeStore[symbol]);
    });
  }

  /**
   * Start live ticking interval
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(() => {
      this.performTick();
    }, this.tickIntervalMs);
  }

  /**
   * Stop ticking interval
   */
  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Subscribe to live tick events
   */
  public subscribe(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Performs realistic micro-fluctuation across all assets on every tick interval
   */
  private performTick() {
    const nowSec = Math.floor(Date.now() / 1000);
    const intervalSec = 5;
    const currentBucketTime = Math.floor(nowSec / intervalSec) * intervalSec;
    const selectedSymbol = useMarketStore.getState().selectedSymbol;

    this.markets.forEach((m) => {
      const decimals = m.category === 'forex' ? 4 : 2;
      
      // Calculate realistic micro delta
      // Volatility scaling: small, smooth movements
      const baseVol = m.category === 'forex' 
        ? 0.00015 
        : m.category === 'crypto' 
        ? 0.0004 
        : m.category === 'vol_index' 
        ? 0.00025 
        : 0.0002;

      // Random walk step
      const stepPct = (Math.random() - 0.492) * 2 * baseVol;
      const prevPrice = m.price;
      let newPrice = Number((prevPrice * (1 + stepPct)).toFixed(decimals));

      // Guard against non-moving roundings
      if (newPrice === prevPrice) {
        const minStep = m.category === 'forex' ? 0.0001 : 0.01;
        const dir = Math.random() > 0.5 ? 1 : -1;
        newPrice = Number((prevPrice + dir * minStep).toFixed(decimals));
      }

      // Update price and 24h change
      m.price = newPrice;
      m.change24h = Number((m.change24h + stepPct * 10).toFixed(2));
      m.sparkline.push(newPrice);
      if (m.sparkline.length > 10) m.sparkline.shift();

      // Update Candles (OHLC) & Volume
      const symbolCandles = this.candleStore[m.symbol] || [];
      const symbolVolumes = this.volumeStore[m.symbol] || [];
      const lastCandle = symbolCandles[symbolCandles.length - 1];

      if (lastCandle && lastCandle.time === currentBucketTime) {
        // Update active candle
        lastCandle.high = Number(Math.max(lastCandle.high, newPrice).toFixed(decimals));
        lastCandle.low = Number(Math.min(lastCandle.low, newPrice).toFixed(decimals));
        lastCandle.close = newPrice;
        lastCandle.volume += Math.floor(Math.random() * 10 + 2);

        if (symbolVolumes.length > 0) {
          const lastVol = symbolVolumes[symbolVolumes.length - 1];
          lastVol.value = lastCandle.volume;
          lastVol.color = lastCandle.close >= lastCandle.open ? '#10b981' : '#f43f5e';
        }
      } else {
        // Create new candle
        const newVol = Math.floor(Math.random() * 25 + 5);
        const newCandle: CandleData = {
          time: currentBucketTime,
          open: newPrice,
          high: newPrice,
          low: newPrice,
          close: newPrice,
          volume: newVol
        };
        const newVolumePoint: VolumeData = {
          time: currentBucketTime,
          value: newVol,
          color: '#10b981'
        };

        symbolCandles.push(newCandle);
        symbolVolumes.push(newVolumePoint);

        // Limit memory history to 200 candles max
        if (symbolCandles.length > 200) symbolCandles.shift();
        if (symbolVolumes.length > 200) symbolVolumes.shift();

        this.candleStore[m.symbol] = symbolCandles;
        this.volumeStore[m.symbol] = symbolVolumes;
      }

      // Update Zustand stores for active selected asset
      useMarketStore.getState().setCandlesBySymbol(m.symbol, [...symbolCandles]);
      useMarketStore.getState().setVolumesBySymbol(m.symbol, [...symbolVolumes]);

      // If this is the currently selected symbol, feed the new last digit into trade store
      if (m.symbol === selectedSymbol) {
        const priceStr = newPrice.toFixed(decimals);
        const lastDigit = parseInt(priceStr[priceStr.length - 1], 10) || 0;
        useTradeStore.getState().addDigit(lastDigit);
      }

      // Notify listeners
      this.listeners.forEach((listener) => listener(this.markets, m.symbol, newPrice));
    });

    // Sync updated prices to Zustand store
    useMarketStore.getState().setPrices([...this.markets]);
  }

  /**
   * Helper to merge external incoming prices (from SSE or WebSocket)
   */
  public updateFromExternalFeed(externalPrices: MarketPrice[]) {
    if (!externalPrices || externalPrices.length === 0) return;

    externalPrices.forEach((ext) => {
      const existing = this.markets.find((m) => m.symbol === ext.symbol);
      if (existing) {
        existing.price = ext.price;
        existing.change24h = ext.change24h;
      } else {
        this.markets.push(ext);
      }
    });

    useMarketStore.getState().setPrices([...this.markets]);
  }
}

export const marketSimulationService = MarketSimulationService.getInstance();

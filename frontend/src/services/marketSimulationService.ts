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
  private subscribersCount: number = 0;
  private listeners: Set<TickListener> = new Set();
  private tickIntervalMs: number = 350; // Smooth ~350ms continuous market stream
  private tickCounter: number = 0;

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
   * Pre-generates historical OHLC candles and volume points for each market
   */
  private initializeHistory() {
    const now = Math.floor(Date.now() / 1000);
    const intervalSec = 2; // 2-second candle resolution for fine chart smoothness

    this.markets.forEach((m) => {
      const decimals = m.category === 'forex' ? 4 : 2;
      const candles: CandleData[] = [];
      const volumes: VolumeData[] = [];
      let currentPrice = m.price * 0.998;
      const sparkline: number[] = [];

      for (let i = 80; i >= 1; i--) {
        const time = now - i * intervalSec;
        const volatility = m.category === 'forex' ? 0.00015 : m.category === 'crypto' ? 0.0004 : 0.0003;
        
        const deltaOpen = (Math.random() - 0.495) * m.price * volatility;
        const open = Number(currentPrice.toFixed(decimals));
        const close = Number((open + deltaOpen).toFixed(decimals));
        const high = Number((Math.max(open, close) + Math.abs(deltaOpen) * (Math.random() * 0.4)).toFixed(decimals));
        const low = Number((Math.min(open, close) - Math.abs(deltaOpen) * (Math.random() * 0.4)).toFixed(decimals));
        const volume = Math.floor(Math.random() * 60 + 20);

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
      m.sparkline = sparkline.slice(-12);

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
   * Start live ticking interval with subscriber reference tracking
   */
  public start() {
    this.subscribersCount++;
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(() => {
      this.performTick();
    }, this.tickIntervalMs);
  }

  /**
   * Stop ticking interval with reference decrementing
   */
  public stop() {
    this.subscribersCount = Math.max(0, this.subscribersCount - 1);
    if (this.subscribersCount === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.isRunning = false;
    }
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
   * Performs realistic micro-fluctuation across active asset and background markets
   */
  private performTick() {
    this.tickCounter++;
    const nowSec = Math.floor(Date.now() / 1000);
    const intervalSec = 2;
    const currentBucketTime = Math.floor(nowSec / intervalSec) * intervalSec;
    const selectedSymbol = useMarketStore.getState().selectedSymbol || 'VOL_100_1S';

    // The selected symbol ticks every cycle (350ms) for high-frequency continuous action
    // Background symbols update in round-robin batches to keep CPU and memory lightweight
    const marketsToTick = this.markets.filter((m) => {
      if (m.symbol === selectedSymbol) return true;
      // Background symbols update every 3rd cycle
      return (this.tickCounter % 3) === (this.markets.indexOf(m) % 3);
    });

    marketsToTick.forEach((m) => {
      const decimals = m.category === 'forex' ? 4 : 2;
      
      // Micro-volatility scaling: smooth, believable brownian movement
      const baseVol = m.category === 'forex' 
        ? 0.00008 
        : m.category === 'crypto' 
        ? 0.00025 
        : m.category === 'vol_index' 
        ? 0.00018 
        : 0.00012;

      // Realistic random step
      const stepPct = (Math.random() - 0.495) * 2 * baseVol;
      const prevPrice = m.price;
      let newPrice = Number((prevPrice * (1 + stepPct)).toFixed(decimals));

      // Guard against non-moving roundings
      if (newPrice === prevPrice) {
        const minStep = m.category === 'forex' ? 0.0001 : 0.01;
        const dir = Math.random() > 0.48 ? 1 : -1;
        newPrice = Number((prevPrice + dir * minStep).toFixed(decimals));
      }

      // Update price and 24h change
      m.price = newPrice;
      m.change24h = Number((m.change24h + stepPct * 5).toFixed(2));
      m.sparkline.push(newPrice);
      if (m.sparkline.length > 12) m.sparkline.shift();

      // Update Candles (OHLC) & Volume
      const symbolCandles = this.candleStore[m.symbol] || [];
      const symbolVolumes = this.volumeStore[m.symbol] || [];
      const lastCandle = symbolCandles[symbolCandles.length - 1];

      if (lastCandle && lastCandle.time === currentBucketTime) {
        // Update active candle in-place
        lastCandle.high = Number(Math.max(lastCandle.high, newPrice).toFixed(decimals));
        lastCandle.low = Number(Math.min(lastCandle.low, newPrice).toFixed(decimals));
        lastCandle.close = newPrice;
        lastCandle.volume += Math.floor(Math.random() * 4 + 1);

        if (symbolVolumes.length > 0) {
          const lastVol = symbolVolumes[symbolVolumes.length - 1];
          lastVol.value = lastCandle.volume;
          lastVol.color = lastCandle.close >= lastCandle.open ? '#10b981' : '#f43f5e';
        }
      } else {
        // Create new candle
        const newVol = Math.floor(Math.random() * 15 + 5);
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

        // Limit memory history to 150 candles max
        if (symbolCandles.length > 150) symbolCandles.shift();
        if (symbolVolumes.length > 150) symbolVolumes.shift();

        this.candleStore[m.symbol] = symbolCandles;
        this.volumeStore[m.symbol] = symbolVolumes;
      }

      // Update Zustand stores for active selected asset
      if (m.symbol === selectedSymbol) {
        useMarketStore.getState().setCandlesBySymbol(m.symbol, [...symbolCandles]);
        useMarketStore.getState().setVolumesBySymbol(m.symbol, [...symbolVolumes]);

        // Feed new last digit into trade store
        const priceStr = newPrice.toFixed(decimals);
        const lastDigit = parseInt(priceStr[priceStr.length - 1], 10) || 0;
        useTradeStore.getState().addDigit(lastDigit);
      }

      // Notify listeners for high-frequency chart updates
      this.listeners.forEach((listener) => listener(this.markets, m.symbol, newPrice));
    });

    // Update global prices list in Zustand periodically or on tick
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

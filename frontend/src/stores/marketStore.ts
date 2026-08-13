/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { MarketPrice, CandleData, VolumeData } from '../types';

export interface MarketState {
  prices: MarketPrice[];
  selectedSymbol: string;
  assetDropdownOpen: boolean;
  chartType: 'area' | 'candlestick';
  candleTimeframe: '1s' | '5s' | '1m';
  candlesBySymbol: Record<string, CandleData[]>;
  volumesBySymbol: Record<string, VolumeData[]>;
  
  setPrices: (prices: MarketPrice[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setAssetDropdownOpen: (open: boolean) => void;
  setChartType: (type: 'area' | 'candlestick') => void;
  setCandleTimeframe: (tf: '1s' | '5s' | '1m') => void;
  setCandlesBySymbol: (symbol: string, candles: CandleData[]) => void;
  setVolumesBySymbol: (symbol: string, volumes: VolumeData[]) => void;
  getMarketBySymbol: (symbol: string) => MarketPrice | undefined;
  getCandles: (symbol: string) => CandleData[];
  getVolumes: (symbol: string) => VolumeData[];
}

export const useMarketStore = create<MarketState>((set, get) => ({
  prices: [],
  selectedSymbol: 'VOL_100',
  assetDropdownOpen: false,
  chartType: 'area',
  candleTimeframe: '5s',
  candlesBySymbol: {},
  volumesBySymbol: {},

  setPrices: (prices) => set({ prices }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
  setAssetDropdownOpen: (assetDropdownOpen) => set({ assetDropdownOpen }),
  setChartType: (chartType) => set({ chartType }),
  setCandleTimeframe: (candleTimeframe) => set({ candleTimeframe }),
  setCandlesBySymbol: (symbol, candles) =>
    set((state) => ({
      candlesBySymbol: { ...state.candlesBySymbol, [symbol]: candles },
    })),
  setVolumesBySymbol: (symbol, volumes) =>
    set((state) => ({
      volumesBySymbol: { ...state.volumesBySymbol, [symbol]: volumes },
    })),
  getMarketBySymbol: (symbol) => {
    return get().prices.find((p) => p.symbol === symbol);
  },
  getCandles: (symbol) => {
    return get().candlesBySymbol[symbol] || [];
  },
  getVolumes: (symbol) => {
    return get().volumesBySymbol[symbol] || [];
  },
}));

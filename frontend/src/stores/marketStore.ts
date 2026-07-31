/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { MarketPrice } from '../types';

export interface MarketState {
  prices: MarketPrice[];
  selectedSymbol: string;
  assetDropdownOpen: boolean;
  setPrices: (prices: MarketPrice[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setAssetDropdownOpen: (open: boolean) => void;
  getMarketBySymbol: (symbol: string) => MarketPrice | undefined;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  prices: [],
  selectedSymbol: 'VOL_100',
  assetDropdownOpen: false,
  setPrices: (prices) => set({ prices }),
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
  setAssetDropdownOpen: (assetDropdownOpen) => set({ assetDropdownOpen }),
  getMarketBySymbol: (symbol) => {
    return get().prices.find(p => p.symbol === symbol);
  }
}));

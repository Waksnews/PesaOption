/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Trade } from '../types';
import { callApi } from '../lib/api';
import { useNotificationStore } from './notificationStore';
import { useWalletStore } from './walletStore';

export interface TradeState {
  openPositions: Trade[];
  closedTrades: Trade[];
  tradingBotActive: boolean;
  botLogs: string[];
  botStats: { profit: number; winRate: number; tradesCount: number };
  digitHistory: number[]; // last 100 ticks' last decimal digits
  tradeQty: string;
  tradeLeverage: number;
  contractMode: 'spot' | 'option';
  activeContractType: 'rise_fall' | 'even_odd' | 'over_under' | 'matches_differ';
  selectedPrediction: string;
  optionDuration: number;
  predictionDigit: number;
  tradeMsg: { text: string; type: 'success' | 'error' } | null;
  winLossNotificationQueue: { id: string; pnl: number; symbol: string; won: boolean; quantity: number }[];
  
  setOpenPositions: (positions: Trade[]) => void;
  setClosedTrades: (trades: Trade[]) => void;
  setTradingBotActive: (active: boolean) => void;
  setBotLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  setBotStats: (stats: any) => void;
  addDigit: (digit: number) => void;
  setTradeQty: (qty: string) => void;
  setTradeLeverage: (lev: number) => void;
  setContractMode: (mode: 'spot' | 'option') => void;
  setActiveContractType: (type: any) => void;
  setSelectedPrediction: (pred: string) => void;
  setOptionDuration: (dur: number) => void;
  setPredictionDigit: (digit: number) => void;
  setTradeMsg: (msg: any) => void;
  clearWinLossQueue: (id: string) => void;

  // Trading Actions
  placeOrder: (symbol: string, type: 'buy' | 'sell') => Promise<boolean>;
  closePositionEarly: (tradeId: string) => Promise<boolean>;
  getDigitStats: () => { digit: number; count: number; percentage: number }[];
}

export const useTradeStore = create<TradeState>((set, get) => ({
  openPositions: [],
  closedTrades: [],
  tradingBotActive: false,
  botLogs: [],
  botStats: { profit: 0, winRate: 75, tradesCount: 0 },
  digitHistory: Array.from({ length: 50 }, () => Math.floor(Math.random() * 10)),
  tradeQty: '10',
  tradeLeverage: 10,
  contractMode: 'option', // default to Option Mode for Binary Options focus
  activeContractType: 'rise_fall',
  selectedPrediction: 'rise',
  optionDuration: 15,
  predictionDigit: 5,
  tradeMsg: null,
  winLossNotificationQueue: [],

  setOpenPositions: (openPositions) => {
    const prevOpen = get().openPositions;
    set({ openPositions });

    // Detect resolved positions by comparing lists
    // Wait, let's see if we can detect which positions disappeared
    if (prevOpen.length > 0 && openPositions.length < prevOpen.length) {
      // Something was resolved
    }
  },
  setClosedTrades: (closedTrades) => {
    const prevClosed = get().closedTrades;
    set({ closedTrades });

    // Compare to trigger win/loss overlays
    if (prevClosed.length > 0 && closedTrades.length > prevClosed.length) {
      // Find new closed trades
      const newClosed = closedTrades.filter(
        (ct) => !prevClosed.some((pt) => pt.id === ct.id)
      );

      newClosed.forEach((trade) => {
        const won = trade.pnl > 0;
        
        // Add to toast notifications immediately!
        useNotificationStore.getState().addToast(
          won ? '🚀 Trade Won!' : '📉 Trade Settled',
          `Contract for ${trade.symbol} ended. Result: ${won ? 'WIN (+$' + trade.pnl.toFixed(2) + ')' : 'LOSS (-$' + Math.abs(trade.pnl).toFixed(2) + ')'}`,
          won ? 'success' : 'error'
        );

        // Add to visual overlay queue for full-screen celebration/ripple!
        set((state) => ({
          winLossNotificationQueue: [
            ...state.winLossNotificationQueue,
            { id: trade.id, pnl: trade.pnl, symbol: trade.symbol, won, quantity: trade.quantity }
          ]
        }));
      });
    }
  },
  setTradingBotActive: (tradingBotActive) => set({ tradingBotActive }),
  setBotLogs: (logs) => {
    if (typeof logs === 'function') {
      set((state) => ({ botLogs: logs(state.botLogs) }));
    } else {
      set({ botLogs: logs });
    }
  },
  setBotStats: (botStats) => set({ botStats }),
  addDigit: (digit) => set((state) => {
    const nextHistory = [...state.digitHistory.slice(1), digit];
    return { digitHistory: nextHistory };
  }),
  setTradeQty: (tradeQty) => set({ tradeQty }),
  setTradeLeverage: (tradeLeverage) => set({ tradeLeverage }),
  setContractMode: (contractMode) => set({ contractMode }),
  setActiveContractType: (activeContractType) => set({ activeContractType }),
  setSelectedPrediction: (selectedPrediction) => set({ selectedPrediction }),
  setOptionDuration: (optionDuration) => set({ optionDuration }),
  setPredictionDigit: (predictionDigit) => set({ predictionDigit }),
  setTradeMsg: (tradeMsg) => set({ tradeMsg }),
  clearWinLossQueue: (id) => set((state) => ({
    winLossNotificationQueue: state.winLossNotificationQueue.filter(x => x.id !== id)
  })),

  placeOrder: async (symbol, type) => {
    const { 
      contractMode, activeContractType, selectedPrediction, optionDuration, 
      predictionDigit, tradeQty, tradeLeverage 
    } = get();

    const isDemo = useWalletStore.getState().isDemo;
    const qty = parseFloat(tradeQty);

    if (isNaN(qty) || qty <= 0) {
      set({ tradeMsg: { text: 'Invalid order stake amount.', type: 'error' } });
      return false;
    }

    // Verify wallet balance limit
    const { balance, demoBalance } = useWalletStore.getState().getUsdBalance();
    const available = isDemo ? demoBalance : balance;
    if (qty > available) {
      set({ tradeMsg: { text: 'Insufficient wallet balance.', type: 'error' } });
      useNotificationStore.getState().addToast(
        'Order Rejected',
        'Your current balance is insufficient to support this stake size.',
        'error'
      );
      return false;
    }

    try {
      set({ tradeMsg: null });
      
      // Binary Option Mode
      let predictionValue = selectedPrediction;
      if (activeContractType === 'over_under') {
        predictionValue = `${selectedPrediction}:${predictionDigit}`;
      } else if (activeContractType === 'matches_differ') {
        predictionValue = `${selectedPrediction}:${predictionDigit}`;
      }

      await callApi('/api/trade/open', {
        method: 'POST',
        body: JSON.stringify({
          symbol,
          type,
          quantity: qty,
          isDemo,
          contractType: contractMode === 'option' ? activeContractType : 'spot',
          prediction: contractMode === 'option' ? predictionValue : undefined,
          durationSeconds: contractMode === 'option' ? optionDuration : undefined
        })
      });

      // Clear msg, trigger sound
      useNotificationStore.getState().addToast(
        'Contract Purchased',
        `Placed $${qty} ${type.toUpperCase()} contract on ${symbol}. Expiry: ${optionDuration}s.`,
        'info'
      );

      return true;
    } catch (err: any) {
      set({ tradeMsg: { text: err.message || 'Ledger rejected order fill.', type: 'error' } });
      return false;
    }
  },

  closePositionEarly: async (tradeId) => {
    try {
      await callApi('/api/trade/close', {
        method: 'POST',
        body: JSON.stringify({ tradeId })
      });
      useNotificationStore.getState().addToast(
        'Position Closed',
        'Option position settled early at current market rate.',
        'success'
      );
      return true;
    } catch (err: any) {
      useNotificationStore.getState().addToast(
        'Settlement Error',
        err.message || 'Unable to execute early settlement.',
        'error'
      );
      return false;
    }
  },

  getDigitStats: () => {
    const { digitHistory } = get();
    const statsMap: Record<number, number> = {};
    for (let i = 0; i < 10; i++) statsMap[i] = 0;
    
    digitHistory.forEach(d => {
      if (statsMap[d] !== undefined) statsMap[d]++;
    });

    const total = digitHistory.length || 1;
    return Object.keys(statsMap).map(k => {
      const digit = parseInt(k, 10);
      const count = statsMap[digit];
      return {
        digit,
        count,
        percentage: Math.round((count / total) * 100)
      };
    });
  }
}));

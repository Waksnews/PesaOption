/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Trade } from '../types';
import { callApi } from '../lib/api';
import { playSound } from '../lib/sound';
import { useNotificationStore } from './notificationStore';
import { useWalletStore } from './walletStore';
import { useMarketStore } from './marketStore';

const knownClosedIds = new Set<string>();

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
  placeOrder: (symbol: string, type: 'buy' | 'sell', overrides?: {
    prediction?: string;
    quantity?: number;
    contractType?: 'rise_fall' | 'even_odd' | 'over_under' | 'matches_differ' | 'spot';
    durationSeconds?: number;
    predictionDigit?: number;
  }) => Promise<boolean>;
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
    // Keep strictly open positions and filter out any that are already known closed
    const validOpen = openPositions.filter((p) => p.status === 'open' && !knownClosedIds.has(p.id));
    set({ openPositions: validOpen });
  },
  setClosedTrades: (closedTrades) => {
    const prevClosed = get().closedTrades;
    set({ closedTrades });

    // Initialize knownClosedIds on first load
    if (knownClosedIds.size === 0 && prevClosed.length === 0) {
      closedTrades.forEach(t => knownClosedIds.add(t.id));
      return;
    }

    // Find newly resolved closed trades
    const newClosed = closedTrades.filter((ct) => !knownClosedIds.has(ct.id));

    newClosed.forEach((trade) => {
      knownClosedIds.add(trade.id);
      const won = trade.pnl > 0;
      
      // Play instant audio feedback
      playSound(won ? 'win' : 'loss');

      // Add to toast notifications immediately!
      useNotificationStore.getState().addToast(
        won ? '🚀 Trade Won!' : '📉 Trade Settled',
        `Contract for ${trade.symbol} ended. Result: ${won ? 'WIN (+$' + trade.pnl.toFixed(2) + ')' : 'LOSS (-$' + Math.abs(trade.pnl).toFixed(2) + ')'}`,
        won ? 'success' : 'error'
      );

      // Add to visual overlay queue for full-screen celebration/settlement ripple!
      set((state) => ({
        winLossNotificationQueue: [
          ...state.winLossNotificationQueue,
          { id: trade.id, pnl: trade.pnl, symbol: trade.symbol, won, quantity: trade.quantity }
        ],
        openPositions: state.openPositions.filter((p) => p.id !== trade.id)
      }));
    });
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

  placeOrder: async (symbol, type, overrides) => {
    const state = get();
    const isDemo = useWalletStore.getState().isDemo;

    const effContractType = overrides?.contractType || (state.contractMode === 'option' ? state.activeContractType : 'spot');
    const effDuration = overrides?.durationSeconds ?? state.optionDuration;
    const effPredDigit = overrides?.predictionDigit ?? state.predictionDigit;
    const rawPred = overrides?.prediction ?? state.selectedPrediction;
    const qty = overrides?.quantity ?? parseFloat(state.tradeQty);

    if (isNaN(qty) || qty <= 0) {
      set({ tradeMsg: { text: 'Invalid order stake amount.', type: 'error' } });
      return false;
    }

    // Verify wallet balance limit
    const { balance, demoBalance } = useWalletStore.getState().getUsdBalance();
    const available = isDemo ? demoBalance : balance;
    if (qty > available) {
      set({ tradeMsg: { text: 'Insufficient wallet balance. Please make a deposit.', type: 'error' } });
      useNotificationStore.getState().addToast(
        'Insufficient Balance',
        'Your current balance is insufficient to place this trade. Opening Deposit...',
        'error'
      );
      useWalletStore.getState().setDepositModalOpen(true);
      window.location.hash = '#/deposit';
      return false;
    }

    // Binary Option Mode prediction formatting
    let predictionValue = rawPred;
    if (effContractType === 'over_under' || effContractType === 'matches_differ') {
      if (!predictionValue.includes(':')) {
        predictionValue = `${predictionValue}:${effPredDigit}`;
      }
    }

    // Instant Audio Feedback
    playSound('trade');

    // Instant Optimistic Trade Placement (0ms user-perceived latency)
    const tempTradeId = 'tr_opt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const currentMarket = useMarketStore.getState().getMarketBySymbol(symbol);
    const entryPrice = currentMarket?.price || 100;
    const expiryTime = new Date(Date.now() + effDuration * 1000).toISOString();

    const optimisticTrade: Trade = {
      id: tempTradeId,
      userId: '',
      type: effContractType === 'spot' ? type : 'buy',
      symbol,
      quantity: qty,
      entryPrice,
      status: 'open',
      pnl: 0,
      isDemo,
      createdAt: new Date().toISOString(),
      contractType: effContractType,
      prediction: predictionValue,
      durationSeconds: effDuration,
      expiryTime,
      barrier: entryPrice,
      payoutRate: 0.95
    };

    // 1. Immediately inject optimistic trade into open positions
    set((s) => ({
      openPositions: [optimisticTrade, ...s.openPositions]
    }));

    // 2. Immediately deduct stake from wallet for instant balance feedback
    const prevWallets = useWalletStore.getState().wallets;
    const optimisticWallets = prevWallets.map(w => {
      if (w.asset === 'USD') {
        return {
          ...w,
          balance: !isDemo ? Math.max(0, Number((w.balance - qty).toFixed(2))) : w.balance,
          demoBalance: isDemo ? Math.max(0, Number((w.demoBalance - qty).toFixed(2))) : w.demoBalance
        };
      }
      return w;
    });
    useWalletStore.getState().setWallets(optimisticWallets);

    try {
      set({ tradeMsg: null });

      const res = await callApi<{ message: string; trade: Trade; wallets: any }>('/api/trade/open', {
        method: 'POST',
        body: JSON.stringify({
          symbol,
          type,
          quantity: qty,
          isDemo,
          contractType: effContractType,
          prediction: effContractType !== 'spot' ? predictionValue : undefined,
          durationSeconds: effContractType !== 'spot' ? effDuration : undefined
        })
      });

      if (res && res.trade) {
        set((s) => ({
          openPositions: [res.trade, ...s.openPositions.filter((p) => p.id !== tempTradeId && p.id !== res.trade.id)]
        }));
      }

      if (res && res.wallets) {
        useWalletStore.getState().setWallets(res.wallets);
      }

      return true;
    } catch (err: any) {
      // Rollback optimistic state on error
      set((s) => ({
        openPositions: s.openPositions.filter((p) => p.id !== tempTradeId)
      }));
      useWalletStore.getState().setWallets(prevWallets);

      const errMsg = err.message || 'Could not place trade.';
      set({ tradeMsg: { text: errMsg, type: 'error' } });
      useNotificationStore.getState().addToast('Order Failed', errMsg, 'error');
      if (typeof errMsg === 'string' && (errMsg.toLowerCase().includes('insufficient') || errMsg.toLowerCase().includes('balance'))) {
        useWalletStore.getState().setDepositModalOpen(true);
        window.location.hash = '#/deposit';
      }
      return false;
    }
  },

  closePositionEarly: async (tradeId) => {
    try {
      const res = await callApi<{ message: string; trade?: Trade; wallets?: any }>('/api/trade/close', {
        method: 'POST',
        body: JSON.stringify({ tradeId })
      });

      set((state) => ({
        openPositions: state.openPositions.filter((p) => p.id !== tradeId)
      }));

      if (res && res.wallets) {
        useWalletStore.getState().setWallets(res.wallets);
      }

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

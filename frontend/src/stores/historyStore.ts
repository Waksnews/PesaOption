/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Transaction, Trade } from '../types';
import { callApi } from '../lib/api';

export interface HistoryState {
  transactions: Transaction[];
  closedTrades: Trade[];
  activeFilter: 'all' | 'deposits' | 'withdrawals' | 'trades' | 'bonuses';
  dateRange: 'all' | 'today' | 'week' | 'month';
  statusFilter: 'all' | 'completed' | 'pending' | 'rejected' | 'won' | 'lost';
  searchQuery: string;
  setTransactions: (txs: Transaction[]) => void;
  setClosedTrades: (trades: Trade[]) => void;
  setActiveFilter: (filter: 'all' | 'deposits' | 'withdrawals' | 'trades' | 'bonuses') => void;
  setDateRange: (range: 'all' | 'today' | 'week' | 'month') => void;
  setStatusFilter: (status: 'all' | 'completed' | 'pending' | 'rejected' | 'won' | 'lost') => void;
  setSearchQuery: (query: string) => void;
  exportCsv: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  transactions: [],
  closedTrades: [],
  activeFilter: 'all',
  dateRange: 'all',
  statusFilter: 'all',
  searchQuery: '',
  setTransactions: (transactions) => set({ transactions }),
  setClosedTrades: (closedTrades) => set({ closedTrades }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setDateRange: (dateRange) => set({ dateRange }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  exportCsv: () => {
    const { transactions, closedTrades, activeFilter } = get();
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeFilter === 'trades') {
      csvContent += "ID,Asset,Prediction,Stake,Entry Price,Close Price,P&L,Status,Date\n";
      closedTrades.forEach(t => {
        const row = [
          t.id,
          t.symbol,
          t.prediction || t.type,
          t.quantity,
          t.entryPrice,
          t.exitPrice || 0,
          t.pnl,
          t.pnl > 0 ? 'WIN' : 'LOSS',
          new Date(t.createdAt).toLocaleDateString()
        ].join(",");
        csvContent += row + "\n";
      });
    } else {
      csvContent += "ID,Type,Asset,Amount,Status,Description,Date\n";
      transactions.forEach(tx => {
        const row = [
          tx.id,
          tx.type,
          tx.asset,
          tx.amount,
          tx.status,
          tx.description,
          new Date(tx.createdAt).toLocaleDateString()
        ].join(",");
        csvContent += row + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trading_ledger_${activeFilter}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}));

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { useWalletStore } from '../../stores/walletStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency } from '../../lib/currency';
import { 
  ArrowUpRight, ArrowDownLeft, Search, Filter, Download, 
  TrendingUp, TrendingDown, Clock, ChevronLeft, ChevronRight, CheckCircle2 
} from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { 
    transactions, closedTrades, activeFilter, setActiveFilter,
    dateRange, setDateRange, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, exportCsv 
  } = useHistoryStore();

  const { isDemo } = useWalletStore();
  const { currency } = useSettingsStore();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Combine deposits and withdrawals or closed option trades based on active tab
  const getFilteredItems = () => {
    if (activeFilter === 'trades') {
      return closedTrades.filter(t => {
        // demo/real matches
        if (t.isDemo !== isDemo) return false;
        
        // search matching symbol or prediction
        if (searchQuery && !t.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        // status filtering
        if (statusFilter === 'won' && t.pnl <= 0) return false;
        if (statusFilter === 'lost' && t.pnl >= 0) return false;

        return true;
      });
    } else {
      return transactions.filter(tx => {
        // filter deposits or withdrawals specifically
        if (activeFilter === 'deposits' && tx.type !== 'deposit' && tx.type !== 'admin_credit') return false;
        if (activeFilter === 'withdrawals' && tx.type !== 'withdrawal' && tx.type !== 'admin_debit') return false;
        if (activeFilter === 'bonuses' && tx.type !== 'referral_bonus') return false;

        // search matches asset, description, reference hash, or status
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match = 
            tx.asset.toLowerCase().includes(q) ||
            (tx.description && tx.description.toLowerCase().includes(q)) ||
            (tx.txHash && tx.txHash.toLowerCase().includes(q)) ||
            (tx.id && tx.id.toLowerCase().includes(q)) ||
            tx.type.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

        return true;
      });
    }
  };

  const filteredItems = getFilteredItems();
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Safe bounds for page
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const handleTabChange = (tabId: any) => {
    setActiveFilter(tabId);
    setStatusFilter('all');
    setCurrentPage(1); // reset page
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Tab Selectors & Search bar */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Main ledger categorizer */}
          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 border border-slate-850 rounded-xl">
            {[
              { id: 'all', label: 'Unified Ledger' },
              { id: 'trades', label: 'Derivative Trades' },
              { id: 'deposits', label: 'Deposits' },
              { id: 'withdrawals', label: 'Withdrawals' },
              { id: 'bonuses', label: 'Referral Bonuses' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer select-none ${
                  activeFilter === tab.id 
                    ? 'bg-slate-900 text-teal-400 border border-slate-850 font-black' 
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export CSV action button */}
          <button 
            onClick={exportCsv}
            className="px-4 py-2 bg-[#0D1527] hover:bg-[#131E38] text-slate-350 hover:text-slate-200 font-bold border border-slate-850 rounded-xl flex items-center space-x-1.5 transition cursor-pointer select-none"
            title="Download CSV file representation of current ledger tab"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters and Query inputs */}
        <div className="grid md:grid-cols-3 gap-4 pt-2 border-t border-slate-850">
          
          {/* Search bar */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search symbol (e.g. BTC)..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-[11px] text-slate-300 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          </div>

          {/* Status filter select */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold whitespace-nowrap">Status:</span>
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-850 text-slate-400 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/40 text-xs"
            >
              <option value="all">Show All Statuses</option>
              {activeFilter === 'trades' ? (
                <>
                  <option value="won">Settled Wins Only</option>
                  <option value="lost">Settled Losses Only</option>
                </>
              ) : (
                <>
                  <option value="completed">Completed Logs Only</option>
                  <option value="pending">Pending Validation Only</option>
                  <option value="rejected">Rejected Only</option>
                </>
              )}
            </select>
          </div>

          {/* Date range selection */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-550 uppercase font-mono font-bold whitespace-nowrap">Range:</span>
            <select 
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-850 text-slate-400 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/40 text-xs"
            >
              <option value="all">All Available Ledger Dates</option>
              <option value="today">Today (Last 24 Hours)</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

        </div>

      </div>

      {/* History table lists */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl space-y-4">
        
        {paginatedItems.length === 0 ? (
          <div className="py-24 text-center text-slate-500 font-sans space-y-2">
            <p className="text-sm">No ledger logs match your search filters.</p>
            <p className="text-[10px] text-slate-600">Double check your filters or try changing the search symbol query.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                    <th className="py-3">Transaction ID / Hash</th>
                    <th>Type</th>
                    <th>Asset / Symbol</th>
                    <th>Stake / Amount</th>
                    <th>Yield / P&L</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {activeFilter === 'trades' ? (
                    paginatedItems.map((trade: any) => {
                      const won = trade.pnl > 0;
                      return (
                        <tr key={trade.id} className="hover:bg-slate-900/10 transition text-xs">
                          <td className="py-3.5 font-mono text-slate-500">{trade.id}</td>
                          <td className="capitalize font-semibold text-slate-200">
                            {trade.contractType ? trade.contractType.replace('_', ' ') : 'Spot Order'}
                          </td>
                          <td className="font-mono text-slate-400 font-bold">{trade.symbol}</td>
                          <td className="font-mono">{formatCurrency(trade.quantity, currency)}</td>
                          <td className={`font-mono font-bold ${won ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {won ? '+' : '-'}{formatCurrency(Math.abs(trade.pnl), currency)}
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono ${
                              won ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {won ? 'WON' : 'LOSS'}
                            </span>
                          </td>
                          <td className="text-slate-500 font-mono text-[10px]">{new Date(trade.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    paginatedItems.map((tx: any) => {
                      const isCredit = tx.type === 'admin_credit' || tx.type === 'deposit';
                      const isDebit = tx.type === 'admin_debit' || tx.type === 'withdrawal';
                      const formattedType = 
                        tx.type === 'admin_credit' ? 'Admin Credit' : 
                        tx.type === 'admin_debit' ? 'Admin Debit' : 
                        tx.type.replace('_', ' ');

                      return (
                        <tr key={tx.id} className="hover:bg-slate-900/10 transition text-xs">
                          <td className="py-3.5 font-mono text-slate-400 truncate max-w-[140px]" title={tx.txHash || tx.id}>
                            {tx.txHash || tx.id}
                          </td>
                          <td className="capitalize font-semibold text-slate-200">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                              tx.type === 'admin_credit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              tx.type === 'admin_debit' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'text-slate-300'
                            }`}>
                              {formattedType}
                            </span>
                          </td>
                          <td className="font-mono text-slate-400 font-bold">{tx.asset}</td>
                          <td className={`font-mono font-bold ${isCredit ? 'text-emerald-400' : isDebit ? 'text-rose-400' : ''}`}>
                            {isCredit ? '+' : isDebit ? '-' : ''}{formatCurrency(tx.amount, currency)}
                          </td>
                          <td className="text-slate-400 text-[11px] truncate max-w-[180px]" title={tx.description}>
                            {tx.description || '-'}
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono ${
                              tx.status === 'completed' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : tx.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-orange-500/10 text-orange-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="text-slate-500 font-mono text-[10px]">{new Date(tx.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                <span className="text-[10px] font-mono text-slate-500">
                  Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} logs
                </span>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={safePage === 1}
                    className={`p-1.5 rounded-lg border transition ${
                      safePage === 1 
                        ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed' 
                        : 'bg-[#0D1527] border-slate-850 text-slate-300 hover:bg-[#131E38] cursor-pointer'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    Page {safePage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={safePage === totalPages}
                    className={`p-1.5 rounded-lg border transition ${
                      safePage === totalPages 
                        ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed' 
                        : 'bg-[#0D1527] border-slate-850 text-slate-300 hover:bg-[#131E38] cursor-pointer'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

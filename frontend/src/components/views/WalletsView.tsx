/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, convertToActive } from '../../lib/currency';
import { 
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Shield, 
  Clock, Plus, Minus, BarChart3, TrendingUp, Sparkles, Award, History
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const ALLOCATION_COLORS = ['#14B8A6', '#2563EB', '#F59E0B'];

export const WalletsView: React.FC = () => {
  const { isDemo, getUsdBalance, setDepositModalOpen, setWithdrawModalOpen } = useWalletStore();
  const { transactions, closedTrades } = useHistoryStore();
  const { currency } = useSettingsStore();
  
  const [activeListTab, setActiveListTab] = useState<'deposits' | 'withdrawals' | 'trades'>('deposits');

  const { balance, demoBalance } = getUsdBalance();
  const activeUsdBalance = isDemo ? demoBalance : balance;

  // 1. Dynamic Calculations
  const tradingBalanceUsd = activeUsdBalance * 0.8;
  const bonusBalanceUsd = isDemo ? 500 : 50; // simulated promo reward
  
  // Real-time Profit Today computation from closed trades
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const closedToday = closedTrades.filter(t => new Date(t.createdAt) >= todayStart);
  const realProfitTodayUsd = closedToday.reduce((sum, t) => sum + (t.pnl > 0 ? t.pnl : 0), 0);
  // Fallback to a stable premium starting simulated value if no trades have run yet
  const profitTodayUsd = realProfitTodayUsd > 0 ? realProfitTodayUsd : (isDemo ? 1240.50 : 124.50);

  // Lists filtered
  const depositsList = transactions.filter(tx => tx.type === 'deposit');
  const withdrawalsList = transactions.filter(tx => tx.type === 'withdrawal');

  // Chart data
  const allocationData = [
    { name: 'Core Derivative Ledger', value: activeUsdBalance * 0.8 },
    { name: 'Synthetic Hedged Cover', value: activeUsdBalance * 0.15 },
    { name: 'Algorithmic Reserve Pool', value: activeUsdBalance * 0.05 },
  ];

  // simulated performance points
  const equityPerformanceData = [
    { time: '09:00', Equity: convertToActive(activeUsdBalance * 0.92, currency) },
    { time: '11:00', Equity: convertToActive(activeUsdBalance * 0.95, currency) },
    { time: '13:00', Equity: convertToActive(activeUsdBalance * 0.94, currency) },
    { time: '15:00', Equity: convertToActive(activeUsdBalance * 0.98, currency) },
    { time: '17:00', Equity: convertToActive(activeUsdBalance * 1.01, currency) },
    { time: 'Live', Equity: convertToActive(activeUsdBalance, currency) },
  ];

  return (
    <div className="space-y-6">
      
      {/* 4 Cards Grid: Main Balance, Trading Balance, Bonus, Profit Today */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Main Balance */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Main Portfolio Balance</span>
            <WalletIcon className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-mono font-black text-slate-100">
              {formatCurrency(activeUsdBalance, currency)}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono mt-1">
              {isDemo ? 'Practice Demo Balance' : 'Real Account Wallet Balance'}
            </p>
          </div>
        </div>

        {/* Card 2: Trading Balance */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Trading Desk Cap</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-mono font-black text-slate-100">
              {formatCurrency(tradingBalanceUsd, currency)}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono mt-1">80% Margin Allocation</p>
          </div>
        </div>

        {/* Card 3: Bonus Balance */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Promotion Bonus Reward</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-mono font-black text-slate-100">
              {formatCurrency(bonusBalanceUsd, currency)}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono mt-1">Simulated Promo Credit</p>
          </div>
        </div>

        {/* Card 4: Profit Today */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Simulated Net Profit Today</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-mono font-black text-emerald-400">
              +{formatCurrency(profitTodayUsd, currency)}
            </h3>
            <p className="text-[9px] text-slate-500 font-mono mt-1">Live Settlements Feed</p>
          </div>
        </div>

      </div>

      {/* Quick Deposit / Withdraw Actions Bar */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center">
            <WalletIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">Reconcile Core Ledger Account</h4>
            <p className="text-[10px] text-slate-500 font-mono">Bypassing standard merchant delays instantly via simulated STK hooks</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={() => setDepositModalOpen(true)}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deposit KES/USD</span>
          </button>
          <button 
            onClick={() => setWithdrawModalOpen(true)}
            className="px-5 py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Minus className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Visual Charts: Allocations & Performance */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Performance LineChart */}
        <div className="lg:col-span-2 bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <BarChart3 className="w-4.5 h-4.5 text-teal-400" />
              <span>Simulated Balance Performance Index</span>
            </h3>
            <span className="text-[9px] font-mono font-bold bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded uppercase">Live Growth</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityPerformanceData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090D1A', borderColor: '#1E293B', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Equity" 
                  stroke="#14B8A6" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, stroke: '#14B8A6', strokeWidth: 1, fill: '#090D1A' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocations PieChart */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-3 mb-4 flex items-center space-x-2">
            <Award className="w-4.5 h-4.5 text-blue-500" />
            <span>Asset Allocations</span>
          </h3>

          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090D1A', borderColor: '#1E293B', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#E2E8F0' }}
                  formatter={(val: any) => [formatCurrency(Number(val || 0), currency), 'Capital']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5 text-[10px] pt-1.5">
            {allocationData.map((data, index) => (
              <div key={data.name} className="flex justify-between items-center text-slate-450 font-mono">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }} />
                  <span>{data.name}</span>
                </div>
                <span className="font-bold text-slate-200">
                  {formatCurrency(data.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Tabs & Transactions/Trades Lists */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
        
        {/* List Header & Tab toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-850 pb-3.5 mb-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4.5 h-4.5 text-teal-400" />
            <span>Simulated Ledger Activity History</span>
          </h3>

          <div className="flex overflow-x-auto gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase scrollbar-none max-w-full">
            <button
              onClick={() => setActiveListTab('deposits')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeListTab === 'deposits' ? 'bg-slate-900 text-teal-400 border border-slate-800' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Deposits ({depositsList.length})
            </button>
            <button
              onClick={() => setActiveListTab('withdrawals')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeListTab === 'withdrawals' ? 'bg-slate-900 text-teal-400 border border-slate-800' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Withdrawals ({withdrawalsList.length})
            </button>
            <button
              onClick={() => setActiveListTab('trades')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeListTab === 'trades' ? 'bg-slate-900 text-teal-400 border border-slate-800' : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Recent Trades ({closedToday.length})
            </button>
          </div>
        </div>

        {/* Tab-Specific Render lists */}
        <div className="overflow-y-auto max-h-72 space-y-3.5 pr-1 scrollbar-thin">
          
          {activeListTab === 'deposits' && (
            depositsList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No simulated deposits found on this ledger yet.</p>
            ) : (
              [...depositsList].reverse().map(tx => (
                <div key={tx.id} className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3.5 rounded-xl hover:border-slate-800 transition">
                  <div className="flex items-center space-x-3.5 text-xs">
                    <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">Reconciled Deposit</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-mono">{tx.description} ({tx.id})</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-mono font-bold text-emerald-400">+{formatCurrency(tx.amount, currency)}</p>
                    <p className="text-[9px] uppercase font-mono text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )
          )}

          {activeListTab === 'withdrawals' && (
            withdrawalsList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No simulated withdrawals found on this ledger yet.</p>
            ) : (
              [...withdrawalsList].reverse().map(tx => (
                <div key={tx.id} className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3.5 rounded-xl hover:border-slate-800 transition">
                  <div className="flex items-center space-x-3.5 text-xs">
                    <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">Reconciled Withdrawal</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-mono">{tx.description} ({tx.id})</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-mono font-bold text-rose-400">-{formatCurrency(tx.amount, currency)}</p>
                    <p className="text-[9px] uppercase font-mono text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )
          )}

          {activeListTab === 'trades' && (
            closedToday.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No contract settlements recorded today yet.</p>
            ) : (
              [...closedToday].reverse().map(trade => {
                const won = trade.pnl > 0;
                return (
                  <div key={trade.id} className="flex justify-between items-center bg-slate-950 border border-slate-850 p-3.5 rounded-xl hover:border-slate-800 transition">
                    <div className="flex items-center space-x-3.5 text-xs">
                      <div className={`p-1.5 rounded-lg border ${
                        won ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{trade.symbol} Contract Settlement</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                          Prediction: {trade.prediction || trade.type} | Stake: {formatCurrency(trade.quantity, currency)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className={`font-mono font-bold ${won ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {won ? '+' : '-'}{formatCurrency(Math.abs(trade.pnl), currency)}
                      </p>
                      <p className="text-[9px] uppercase font-mono text-slate-550">
                        {won ? 'WIN' : 'LOSS'}
                      </p>
                    </div>
                  </div>
                );
              })
            )
          )}

        </div>

      </div>

    </div>
  );
};

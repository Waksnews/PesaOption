/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useTradeStore } from '../stores/tradeStore';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

export const TradeSettleOverlay: React.FC = () => {
  const { winLossNotificationQueue, clearWinLossQueue } = useTradeStore();

  const active = winLossNotificationQueue[0];

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        clearWinLossQueue(active.id);
      }, 3000); // Auto close after 3 seconds as requested
      return () => clearTimeout(timer);
    }
  }, [active, clearWinLossQueue]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -30 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`border rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden flex flex-col items-center space-y-6 ${
            active.won 
              ? 'bg-gradient-to-b from-[#0A2F1D] to-[#04120C] border-emerald-500/40 text-slate-100 shadow-emerald-500/10' 
              : 'bg-gradient-to-b from-[#340E14] to-[#120406] border-rose-500/40 text-slate-100 shadow-rose-500/10'
          }`}
        >
          {/* Glowing backdrop circular ring */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            active.won ? 'bg-emerald-500/20' : 'bg-rose-500/20'
          }`} />

          {/* Header Title */}
          <div className="space-y-2 z-10">
            <h3 className={`text-2xl font-black font-sans flex items-center justify-center space-x-2 ${
              active.won ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <span>{active.won ? '✅ Trade Won' : '❌ Trade Lost'}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Binary option contract on <span className="font-bold text-slate-200">{active.symbol}</span> has expired.
            </p>
          </div>

          {/* Details Grid */}
          <div className="w-full space-y-2.5 z-10 font-mono text-xs">
            {/* Stake Row */}
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-slate-400">Stake</span>
              <span className="text-slate-200 font-bold">${active.quantity.toFixed(2)}</span>
            </div>

            {/* Profit or Loss Row */}
            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
              <span className="text-slate-400">{active.won ? 'Profit' : 'Loss'}</span>
              <span className={`font-bold ${active.won ? 'text-emerald-400' : 'text-rose-400'}`}>
                {active.won ? `+$${active.pnl.toFixed(2)}` : `-$${active.quantity.toFixed(2)}`}
              </span>
            </div>

            {/* Payout or Status Row */}
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">{active.won ? 'Payout' : 'Status'}</span>
              <span className={`font-bold ${active.won ? 'text-emerald-400' : 'text-slate-350'}`}>
                {active.won ? `$${(active.quantity + active.pnl).toFixed(2)}` : 'Balance Updated'}
              </span>
            </div>
          </div>

          {/* Collect button */}
          <button 
            onClick={() => clearWinLossQueue(active.id)}
            className={`w-full py-3 text-xs uppercase tracking-widest font-bold font-sans rounded-xl transition cursor-pointer select-none active:scale-95 z-10 ${
              active.won 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10' 
                : 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/10'
            }`}
          >
            Acknowledge Settle
          </button>

        </motion.div>
      </AnimatePresence>
    </div>
  );
};

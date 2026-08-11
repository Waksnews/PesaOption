/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, ShieldAlert, Wallet, X, ArrowRight } from 'lucide-react';

interface RealAccountConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  realBalanceDisplay: string;
}

export const RealAccountConfirmModal: React.FC<RealAccountConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  realBalanceDisplay
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-[#090D1A] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-5 relative animate-scale-up text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 p-1 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                🟠 REAL MODE
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 font-sans tracking-tight">
              Switch to REAL ACCOUNT?
            </h3>
          </div>
        </div>

        {/* Description message */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          You are switching to trade with <strong className="text-amber-400">real deposited funds</strong>. Market orders executed in Real Mode will deduct from your actual money balance.
        </p>

        {/* Balance Preview Card */}
        <div className="bg-slate-950 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Available Real Balance</span>
              <span className="text-base font-mono font-black text-amber-400">{realBalanceDisplay}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
            LIVE FUNDS
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-2xl transition cursor-pointer text-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

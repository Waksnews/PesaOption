/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Gamepad2, Wallet, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { RealAccountConfirmModal } from './modals/RealAccountConfirmModal';

interface AccountToggleProps {
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;
  demoBalanceDisplay: string;
  realBalanceDisplay: string;
  size?: 'normal' | 'compact';
  showCard?: boolean;
}

export const AccountToggle: React.FC<AccountToggleProps> = ({
  isDemo,
  setIsDemo,
  demoBalanceDisplay,
  realBalanceDisplay,
  size = 'normal',
  showCard = true,
}) => {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const handleSelectDemo = () => {
    if (!isDemo) {
      setIsDemo(true);
    }
  };

  const handleSelectReal = () => {
    if (isDemo) {
      // Prompt confirmation modal before enabling real account
      setConfirmModalOpen(true);
    }
  };

  const handleConfirmReal = () => {
    setIsDemo(false);
  };

  return (
    <div className="w-full space-y-3">
      {/* Real Account Confirmation Modal */}
      <RealAccountConfirmModal 
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmReal}
        realBalanceDisplay={realBalanceDisplay}
      />

      {/* 1. Segmented Control Switcher (Minimum 48px height, touch-friendly, high contrast) */}
      <div className="bg-slate-950 p-1.5 border border-slate-800 rounded-2xl grid grid-cols-2 gap-1.5 min-h-[50px] shadow-inner select-none">
        
        {/* DEMO BUTTON */}
        <button
          type="button"
          onClick={handleSelectDemo}
          className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-black uppercase font-mono tracking-wide flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isDemo
              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border-2 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-500/20 scale-[1.01]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <div className={`p-1 rounded-lg ${isDemo ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'}`}>
            <Gamepad2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DEMO</span>
          </div>
        </button>

        {/* REAL BUTTON */}
        <button
          type="button"
          onClick={handleSelectReal}
          className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-black uppercase font-mono tracking-wide flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            !isDemo
              ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 border-2 border-amber-500/60 text-amber-300 shadow-lg shadow-amber-500/20 scale-[1.01]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <div className={`p-1 rounded-lg ${!isDemo ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500'}`}>
            <Wallet className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>REAL</span>
          </div>
        </button>
      </div>

      {/* 2. Active State Account Card / Banner */}
      {showCard && (
        <div className={`rounded-2xl p-3.5 border transition-all ${
          isDemo 
            ? 'bg-gradient-to-r from-emerald-950/50 via-teal-950/30 to-slate-950 border-emerald-500/35 shadow-md shadow-emerald-500/5' 
            : 'bg-gradient-to-r from-amber-950/50 via-orange-950/30 to-slate-950 border-amber-500/40 shadow-md shadow-amber-500/10'
        }`}>
          <div className="flex items-center justify-between">
            
            {/* Left: Mode Badge & Icon */}
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl ${
                isDemo ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {isDemo ? <Gamepad2 className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              </div>
              
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    isDemo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {isDemo ? '🟢 DEMO ACTIVE' : '🟠 REAL ACTIVE'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {isDemo ? 'Virtual Practice Balance' : 'Live Deposited Funds'}
                </span>
              </div>
            </div>

            {/* Right: Active Balance */}
            <div className="text-right">
              <span className={`text-base sm:text-lg font-mono font-black tracking-tight block ${
                isDemo ? 'text-emerald-300' : 'text-amber-300'
              }`}>
                {isDemo ? demoBalanceDisplay : realBalanceDisplay}
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                {isDemo ? 'Risk-Free Funds' : 'Real Money at Risk'}
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

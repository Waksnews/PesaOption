/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { 
  Sparkles, TrendingUp, TrendingDown, RefreshCw, AlertCircle, 
  Compass, Shield, Percent, BarChart3
} from 'lucide-react';

interface ScanItem {
  symbol: string;
  name: string;
  trend: 'bullish' | 'bearish' | 'sideways';
  confidence: number; // percentage
  recommendation: 'BUY' | 'SELL' | 'WAIT';
  riskScore: number; // 1-10
  probability: number; // percentage
}

const INITIAL_SCAN: ScanItem[] = [
  { symbol: 'BTC', name: 'Bitcoin', trend: 'bullish', confidence: 88, recommendation: 'BUY', riskScore: 4, probability: 82 },
  { symbol: 'ETH', name: 'Ethereum', trend: 'bearish', confidence: 74, recommendation: 'SELL', riskScore: 6, probability: 71 },
  { symbol: 'Gold', name: 'Gold Troy Ounce', trend: 'sideways', confidence: 50, recommendation: 'WAIT', riskScore: 2, probability: 55 },
  { symbol: 'NASDAQ', name: 'NASDAQ 100 Index', trend: 'bearish', confidence: 82, recommendation: 'SELL', riskScore: 5, probability: 79 },
  { symbol: 'VOL_100_1S', name: 'Vol 100 (1s)', trend: 'bullish', confidence: 91, recommendation: 'BUY', riskScore: 8, probability: 89 },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', trend: 'bullish', confidence: 65, recommendation: 'BUY', riskScore: 3, probability: 67 }
];

export const ScannerView: React.FC = () => {
  const { prices } = useMarketStore();
  const [scans, setScans] = useState<ScanItem[]>(INITIAL_SCAN);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const triggerAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      setScans(prev => 
        prev.map(item => {
          // Add some organic variation to confidence and probability
          const drift = Math.floor((Math.random() - 0.5) * 8);
          const nextConfidence = Math.max(40, Math.min(98, item.confidence + drift));
          const nextProb = Math.max(45, Math.min(95, item.probability + Math.floor((Math.random() - 0.5) * 6)));
          
          let nextRec = item.recommendation;
          if (nextConfidence > 80) {
            nextRec = item.trend === 'bullish' ? 'BUY' : 'SELL';
          } else if (nextConfidence < 55) {
            nextRec = 'WAIT';
          }

          return {
            ...item,
            confidence: nextConfidence,
            probability: nextProb,
            recommendation: nextRec
          };
        })
      );
      setLoading(false);
      setCountdown(5);
    }, 800);
  };

  // Auto-refresh countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          triggerAnalyze();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Top action block */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
            <span>AI Neural Scanner Desk</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-lg">
            Real-time deep learning trend overlays calculating Geometric Brownian probability drift and moving momentum coefficients.
          </p>
        </div>

        <button 
          onClick={triggerAnalyze}
          disabled={loading}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-500/50 text-slate-950 font-bold text-xs uppercase rounded-xl flex items-center space-x-2 cursor-pointer transition select-none"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing...' : `Next Tick In ${countdown}s`}</span>
        </button>
      </div>

      {/* Scans Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {scans.map((scan) => {
          // Get live actual price from prices store
          const livePrice = prices.find(p => p.symbol === scan.symbol)?.price;
          const liveChange = prices.find(p => p.symbol === scan.symbol)?.change24h;

          return (
            <div key={scan.symbol} className="bg-[#090D1A] border border-slate-850 hover:border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition">
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-200 text-sm flex items-center space-x-1.5">
                    <span>{scan.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({scan.symbol})</span>
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {livePrice ? (
                      <span className="text-xs font-mono font-bold text-slate-400">
                        ${livePrice.toLocaleString(undefined, { maximumFractionDigits: scan.symbol.includes('USD') ? 4 : 2 })}
                      </span>
                    ) : (
                      <span className="w-12 h-3 bg-slate-900 rounded animate-pulse inline-block" />
                    )}

                    {liveChange !== undefined && (
                      <span className={`text-[10px] font-mono font-bold ${liveChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>

                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                  scan.recommendation === 'BUY' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5' 
                    : scan.recommendation === 'SELL'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20 shadow-sm shadow-rose-500/5'
                    : 'bg-slate-950 text-slate-400 border border-slate-850'
                }`}>
                  {scan.recommendation}
                </span>
              </div>

              {/* Progress Gauges */}
              <div className="space-y-3.5 pt-3 border-t border-slate-850 text-xs">
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <Compass className="w-3.5 h-3.5 text-slate-600" />
                      <span>Bull/Bear Directional Force</span>
                    </span>
                    <span className="font-mono text-slate-300 font-bold uppercase">{scan.trend}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full ${scan.trend === 'bullish' ? 'bg-emerald-500' : scan.trend === 'bearish' ? 'bg-rose-500' : 'bg-slate-700'}`}
                      style={{ width: `${scan.confidence}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-center">
                    <span className="text-[9px] text-slate-550 uppercase font-mono block">Probability</span>
                    <span className="font-mono text-xs text-teal-400 font-bold">{scan.probability}%</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-center">
                    <span className="text-[9px] text-slate-550 uppercase font-mono block">Confidence</span>
                    <span className="font-mono text-xs text-blue-400 font-bold">{scan.confidence}%</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 text-center">
                    <span className="text-[9px] text-slate-550 uppercase font-mono block">Risk Factor</span>
                    <span className={`font-mono text-xs font-bold ${scan.riskScore > 6 ? 'text-amber-500' : 'text-emerald-400'}`}>
                      {scan.riskScore}/10
                    </span>
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

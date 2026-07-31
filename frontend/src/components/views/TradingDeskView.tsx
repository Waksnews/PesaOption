/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { useTradeStore } from '../../stores/tradeStore';
import { useWalletStore } from '../../stores/walletStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, convertToActive, USD_TO_KES_RATE } from '../../lib/currency';
import { TradingChart } from '../TradingChart';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Sparkles, 
  RefreshCw, Play, Circle, ChevronDown, Check, HelpCircle, Lock, Search, Filter
} from 'lucide-react';

const getPayoutRate = (category: string): number => {
  switch (category) {
    case 'vol_index': return 0.98; // 98% for synthetics
    case 'crypto': return 0.90; // 90% for crypto
    case 'forex': return 0.95; // 95% for forex
    case 'indices': return 0.88; // 88% for indices
    case 'commodities': return 0.85; // 85% for commodities
    default: return 0.95;
  }
};

export const TradingDeskView: React.FC = () => {
  const { prices, selectedSymbol, setSelectedSymbol, getMarketBySymbol } = useMarketStore();
  const { 
    openPositions, closedTrades, placeOrder, closePositionEarly,
    tradeQty, setTradeQty, contractMode, setContractMode, 
    activeContractType, setActiveContractType, selectedPrediction, setSelectedPrediction, 
    optionDuration, setOptionDuration, predictionDigit, setPredictionDigit,
    tradeMsg, getDigitStats, tradingBotActive, setTradingBotActive, botLogs, setBotLogs, botStats, setBotStats
  } = useTradeStore();
  const { isDemo } = useWalletStore();
  const { addToast } = useNotificationStore();
  const { currency } = useSettingsStore();

  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [leftTab, setLeftTab] = useState<'open' | 'closed' | 'ledger'>('open');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'crypto' | 'forex' | 'vol_index' | 'indices' | 'commodities'>('all');

  const currentMarket = getMarketBySymbol(selectedSymbol) || prices[0] || {
    symbol: 'VOL_100_1S', name: 'Vol 100 (1s)', price: 12451.27, change24h: -5.62, category: 'vol_index', sparkline: []
  };

  const formattedPrice = currentMarket.price.toLocaleString(undefined, {
    minimumFractionDigits: currentMarket.category === 'forex' ? 4 : 2,
    maximumFractionDigits: currentMarket.category === 'forex' ? 4 : 2,
  });

  // Calculate current last digit
  const priceStr = currentMarket.price.toFixed(currentMarket.category === 'forex' ? 4 : 2);
  const lastDigit = parseInt(priceStr[priceStr.length - 1], 10) || 0;

  const digitStats = getDigitStats();

  const handleOpenTrade = async (prediction: string, type: 'buy' | 'sell') => {
    setSelectedPrediction(prediction);
    const success = await placeOrder(selectedSymbol, type);
    if (success) {
      addToast('Order Dispatched', `Derivative contract submitted with stake of $${tradeQty}`, 'info');
    }
  };

  // Bot interval simulation
  useEffect(() => {
    if (!tradingBotActive) return;

    const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString();
      setBotLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 20)]);
    };

    addLog(`Active Bot targeting ${selectedSymbol}...`);

    const interval = setInterval(() => {
      const sides = ['rise', 'fall'] as const;
      const side = sides[Math.floor(Math.random() * sides.length)];
      const amt = 10;
      addLog(`Indicator crossover. Purchasing ${side.toUpperCase()} contract...`);
      
      placeOrder(selectedSymbol, side === 'rise' ? 'buy' : 'sell');
    }, 8000);

    return () => clearInterval(interval);
  }, [tradingBotActive, selectedSymbol, placeOrder]);

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      
      {/* Column 1: Left Compact List Pane (Open, Closed, Ledger) */}
      <div className="lg:col-span-1">
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-4 flex flex-col h-[560px] shadow-xl">
          
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl mb-4">
            <button 
              onClick={() => setLeftTab('open')} 
              className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                leftTab === 'open' 
                  ? 'bg-slate-900 text-blue-400 border border-slate-800' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Open ({openPositions.length})
            </button>
            <button 
              onClick={() => setLeftTab('closed')} 
              className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                leftTab === 'closed' 
                  ? 'bg-slate-900 text-blue-400 border border-slate-800' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Closed ({closedTrades.length})
            </button>
            <button 
              onClick={() => setLeftTab('ledger')} 
              className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                leftTab === 'ledger' 
                  ? 'bg-slate-900 text-blue-400 border border-slate-800' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Ledger
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {leftTab === 'open' && (
              openPositions.length === 0 ? (
                <div className="py-24 text-center text-slate-650 text-xs">
                  No active contracts. Use the console on the right to start trading.
                </div>
              ) : (
                openPositions.map(pos => {
                  const secondsRemaining = pos.expiryTime 
                    ? Math.max(0, Math.ceil((new Date(pos.expiryTime).getTime() - Date.now()) / 1000))
                    : 0;

                  return (
                    <div key={pos.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{pos.symbol}</span>
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                          pos.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {pos.contractType ? pos.contractType.replace('_', ' ') : pos.type}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-550">Stake:</span>
                        <span className="font-mono text-slate-300 font-bold">${pos.quantity}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-550">Entry:</span>
                        <span className="font-mono text-slate-400">${pos.entryPrice}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-550">Expires In:</span>
                        <span className="font-mono text-blue-400 font-bold animate-pulse">{secondsRemaining}s</span>
                      </div>
                      <button 
                        onClick={() => closePositionEarly(pos.id)}
                        className="w-full mt-1.5 py-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 rounded-lg font-bold uppercase transition"
                      >
                        Settle Early
                      </button>
                    </div>
                  );
                })
              )
            )}

            {leftTab === 'closed' && (
              closedTrades.length === 0 ? (
                <div className="py-24 text-center text-slate-650 text-xs">
                  No completed contracts yet.
                </div>
              ) : (
                [...closedTrades].reverse().slice(0, 15).map(pos => {
                  const won = pos.pnl > 0;
                  return (
                    <div key={pos.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-mono font-bold text-slate-300">{pos.symbol}</span>
                        <span className={`font-mono text-[9px] px-1 py-0.2 rounded ${
                          won ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {won ? 'WIN' : 'LOSS'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Stake: ${pos.quantity}</span>
                        <span className={`font-mono font-bold ${won ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {won ? `+$${pos.pnl.toFixed(2)}` : `-$${Math.abs(pos.pnl).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            )}

            {leftTab === 'ledger' && (
              <div className="space-y-2">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Simulation Log</div>
                <div className="space-y-2 text-[10px] font-mono">
                  {closedTrades.slice(0, 5).map(t => (
                    <div key={t.id} className="border-l border-teal-500/20 pl-2 py-0.5 text-slate-400">
                      [{new Date(t.createdAt).toLocaleTimeString()}] Option order closed. P&L: 
                      <span className={t.pnl > 0 ? 'text-emerald-400 ml-1' : 'text-rose-500 ml-1'}>
                        ${t.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {openPositions.map(t => (
                    <div key={t.id} className="border-l border-blue-500/20 pl-2 py-0.5 text-blue-400">
                      [{new Date(t.createdAt).toLocaleTimeString()}] Option filled. Entry: {t.entryPrice}
                    </div>
                  ))}
                  <div className="text-slate-600 text-center py-6">End of ledger history.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column 2 & 3: Center Trading Chart & Digit Selector */}
      <div className="lg:col-span-2 flex flex-col space-y-6">
        
        {/* Chart Header Ticker */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-4 flex flex-wrap items-center justify-between shadow-xl gap-4 relative">
          <div className="flex items-center space-x-3.5">
            <button 
              onClick={() => setAssetSearchOpen(!assetSearchOpen)}
              className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 transition cursor-pointer"
            >
              <span>{currentMarket.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <div>
              <p className="text-lg font-mono font-bold text-slate-100">{formattedPrice}</p>
              <span className={`text-[10px] font-mono font-bold flex items-center space-x-0.5 ${
                currentMarket.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {currentMarket.change24h >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownLeft className="w-3 h-3 inline" />}
                <span>{currentMarket.change24h >= 0 ? '+' : ''}{currentMarket.change24h.toFixed(2)}%</span>
              </span>
            </div>
          </div>

          {/* Asset search dropdown popup */}
          {assetSearchOpen && (
            <div className="absolute left-4 top-16 w-96 max-w-[90vw] bg-[#090D1A] border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-fade-in">
              
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl text-[9px] font-bold uppercase overflow-x-auto scrollbar-none">
                {(['all', 'crypto', 'forex', 'vol_index', 'indices', 'commodities'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2 py-1.5 rounded-lg transition cursor-pointer flex-shrink-0 ${
                      activeCategoryFilter === cat 
                        ? 'bg-slate-900 text-teal-400 border border-slate-850 font-black' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {cat === 'vol_index' ? 'Synthetic' : cat === 'indices' ? 'Stocks' : cat}
                  </button>
                ))}
              </div>

              {/* Search input field */}
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-slate-550">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search symbol or market..." 
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 font-mono"
                />
              </div>

              {/* Asset symbols list */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {prices
                  .filter(p => {
                    const matchesSearch = p.name.toLowerCase().includes(assetSearch.toLowerCase()) || p.symbol.toLowerCase().includes(assetSearch.toLowerCase());
                    const matchesCat = activeCategoryFilter === 'all' || p.category === activeCategoryFilter;
                    return matchesSearch && matchesCat;
                  })
                  .map(p => {
                    const isSelected = p.symbol === selectedSymbol;
                    const changeUp = p.change24h >= 0;
                    return (
                      <div 
                        key={p.symbol}
                        onClick={() => { setSelectedSymbol(p.symbol); setAssetSearchOpen(false); }}
                        className={`p-2.5 hover:bg-slate-950/60 border border-transparent hover:border-slate-850 rounded-xl text-xs flex justify-between items-center cursor-pointer transition ${
                          isSelected ? 'bg-teal-500/5 border-teal-500/20 text-teal-400 font-bold' : 'text-slate-350'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[11px] text-slate-200 leading-tight">{p.name}</p>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono bg-slate-950/40 px-1.5 py-0.2 rounded border border-slate-850">
                            {p.symbol}
                          </span>
                        </div>
                        <div className="text-right space-y-0.5">
                          <p className="font-mono font-bold text-slate-100 font-bold">
                            {formatCurrency(p.price, currency)}
                          </p>
                          <span className={`text-[9px] font-mono font-bold flex items-center justify-end space-x-0.5 ${
                            changeUp ? 'text-emerald-400' : 'text-rose-500'
                          }`}>
                            <span>{changeUp ? '+' : ''}{p.change24h.toFixed(2)}%</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="flex space-x-4 text-right">
            <div className="hidden sm:block">
              <span className="text-[9px] text-slate-550 block font-mono">Last Decimal</span>
              <span className="text-xs font-mono font-bold text-teal-400">{lastDigit}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-550 block font-mono">Yield Rate</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {(getPayoutRate(currentMarket.category) * 100).toFixed(0)}% Yield
              </span>
            </div>
          </div>
        </div>

        {/* Lightweight trading chart component */}
        <TradingChart symbol={selectedSymbol} currentPrice={currentMarket.price} />

        {/* Digit stats selection pane */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-300">Live Digit Stats (Last 50 ticks)</span>
            <div className="flex items-center space-x-1.5 text-[10px] text-teal-400 font-mono animate-pulse">
              <Circle className="w-1.5 h-1.5 fill-teal-400 text-teal-400" />
              <span>Matching Feed</span>
            </div>
          </div>

          <div className="grid grid-cols-10 gap-1.5">
            {digitStats.map(({ digit, percentage }) => {
              const isActive = lastDigit === digit;
              return (
                <div 
                  key={digit} 
                  className={`flex flex-col items-center justify-between p-2 rounded-xl border transition ${
                    isActive 
                      ? 'bg-teal-500/10 border-teal-500 text-teal-400 scale-105 shadow-md shadow-teal-500/10' 
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-mono font-bold">{digit}</span>
                  <div className="w-full bg-slate-900 h-1 rounded overflow-hidden my-1">
                    <div 
                      className={`h-full ${isActive ? 'bg-teal-400' : 'bg-slate-650'}`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Column 4: Right Trade Configuration Panel */}
      <div className="lg:col-span-1">
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl h-[560px] flex flex-col justify-between">
          <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
            
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <span className="text-xs font-bold text-slate-200">Execution Console</span>
              <span className="text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded">
                {isDemo ? 'DEMO PAPER' : 'REAL SIM'}
              </span>
            </div>

            {/* Contract Mode Toggles */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl">
              {(['rise_fall', 'even_odd', 'over_under', 'matches_differ'] as const).map(type => (
                <button 
                  key={type}
                  onClick={() => {
                    setActiveContractType(type);
                    if (type === 'rise_fall') setSelectedPrediction('rise');
                    else if (type === 'even_odd') setSelectedPrediction('even');
                    else if (type === 'over_under') setSelectedPrediction('over');
                    else if (type === 'matches_differ') setSelectedPrediction('match');
                  }}
                  className={`py-2 rounded-lg text-[9px] font-semibold text-center transition uppercase cursor-pointer ${
                    activeContractType === type 
                      ? 'bg-slate-900 text-teal-400 border border-slate-800 font-bold' 
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {type.replace('_', '\n')}
                </button>
              ))}
            </div>

            {/* Amount Stake */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] uppercase font-mono text-slate-550 block font-bold">Stake Size (USD)</label>
                {currency === 'KES' && (
                  <span className="text-[9px] font-mono font-bold text-teal-400 animate-pulse">
                    ≈ KES {(parseFloat(tradeQty) * USD_TO_KES_RATE || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  value={tradeQty}
                  onChange={(e) => setTradeQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-teal-500/50 focus:outline-none rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-200"
                />
                <span className="absolute right-4 top-2 text-xs font-mono font-bold text-slate-600">USD</span>
              </div>
            </div>

            {/* Expiry Duration */}
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Expiry Clock</label>
              <div className="grid grid-cols-4 gap-1">
                {[10, 15, 30, 60].map(sec => (
                  <button 
                    key={sec}
                    onClick={() => setOptionDuration(sec)}
                    className={`py-1.5 bg-slate-950 border rounded-lg font-mono text-xs cursor-pointer transition ${
                      optionDuration === sec 
                        ? 'border-teal-500/50 text-teal-400 bg-teal-500/5 font-bold' 
                        : 'border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Contract Options Panel */}
            {activeContractType === 'over_under' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Barrier Digit</label>
                <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl">
                  {[0, 2, 4, 5, 8].map(d => (
                    <button 
                      key={d}
                      onClick={() => setPredictionDigit(d)}
                      className={`py-1 text-xs font-mono rounded ${
                        predictionDigit === d ? 'bg-slate-900 text-teal-400 border border-slate-800 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeContractType === 'matches_differ' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Prediction Target</label>
                <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-xl">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                    <button 
                      key={d}
                      onClick={() => setPredictionDigit(d)}
                      className={`py-1 text-xs font-mono rounded ${
                        predictionDigit === d ? 'bg-slate-900 text-teal-400 border border-slate-800 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error messaging */}
            {tradeMsg && (
              <div className={`p-2.5 rounded-xl border text-[10px] ${
                tradeMsg.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {tradeMsg.text}
              </div>
            )}
          </div>

          {/* Large Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-slate-850">
            {activeContractType === 'rise_fall' && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleOpenTrade('rise', 'buy')}
                  className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-95"
                >
                  <TrendingUp className="w-5 h-5 mb-0.5" />
                  <span>Rise</span>
                </button>
                <button 
                  onClick={() => handleOpenTrade('fall', 'sell')}
                  className="py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer shadow-lg shadow-rose-500/10 active:scale-95"
                >
                  <TrendingDown className="w-5 h-5 mb-0.5" />
                  <span>Fall</span>
                </button>
              </div>
            )}

            {activeContractType === 'even_odd' && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleOpenTrade('even', 'buy')}
                  className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-emerald-400 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer active:scale-95"
                >
                  <span>Even</span>
                </button>
                <button 
                  onClick={() => handleOpenTrade('odd', 'sell')}
                  className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-rose-400 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer active:scale-95"
                >
                  <span>Odd</span>
                </button>
              </div>
            )}

            {activeContractType === 'over_under' && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleOpenTrade('over', 'buy')}
                  className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-emerald-400 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer active:scale-95"
                >
                  <span>Over</span>
                </button>
                <button 
                  onClick={() => handleOpenTrade('under', 'sell')}
                  className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-rose-400 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer active:scale-95"
                >
                  <span>Under</span>
                </button>
              </div>
            )}

            {activeContractType === 'matches_differ' && (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleOpenTrade('match', 'buy')}
                  className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-emerald-400 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer active:scale-95"
                >
                  <span>Matches</span>
                </button>
                <button 
                  onClick={() => handleOpenTrade('differ', 'sell')}
                  className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-rose-400 text-xs font-bold rounded-xl uppercase transition flex flex-col items-center cursor-pointer active:scale-95"
                >
                  <span>Differ</span>
                </button>
              </div>
            )}

            <button 
              onClick={() => setTradingBotActive(!tradingBotActive)}
              className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                tradingBotActive 
                  ? 'bg-teal-500 text-slate-950 hover:bg-teal-400 animate-pulse' 
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tradingBotActive ? 'Bot Engaged' : 'Engage Smart Bot'}</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

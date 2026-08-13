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
import { formatCurrency, getUsdKesRate } from '../../lib/currency';
import { TradingChart } from '../TradingChart';
import { RealAccountConfirmModal } from '../modals/RealAccountConfirmModal';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Sparkles, 
  RefreshCw, Circle, ChevronDown, ChevronUp, Check, Search, 
  Clock, DollarSign, Activity, Layers, Sliders, X, ShieldAlert,
  Wallet, AlertTriangle
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
    tradeMsg, getDigitStats, tradingBotActive, setTradingBotActive, setBotLogs
  } = useTradeStore();

  const { isDemo, setIsDemo, getUsdBalance } = useWalletStore();
  const { addToast } = useNotificationStore();
  const { currency: globalCurrency } = useSettingsStore();

  // Local state for trading display currency (KES vs USD) inside the trading desk
  const [tradeCurrency, setTradeCurrency] = useState<'KES' | 'USD'>('KES');
  
  // Local input state for stake in selected tradeCurrency
  const [inputStake, setInputStake] = useState<string>('1000');

  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [leftTab, setLeftTab] = useState<'open' | 'closed' | 'ledger'>('open');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'crypto' | 'forex' | 'vol_index' | 'indices' | 'commodities'>('all');
  
  // Mobile tab state for secondary sections
  const [mobileTab, setMobileTab] = useState<'orders' | 'positions' | 'stats'>('orders');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const rate = getUsdKesRate() || 130;

  // Active wallet balances
  const { balance: realUsd, demoBalance: demoUsd } = getUsdBalance();
  const activeUsdBalance = isDemo ? demoUsd : realUsd;
  const activeDisplayBalance = tradeCurrency === 'KES' ? activeUsdBalance * rate : activeUsdBalance;

  // Formatted balance strings
  const realDisplayVal = tradeCurrency === 'KES' ? realUsd * rate : realUsd;
  const realBalanceDisplay = tradeCurrency === 'KES'
    ? `KSh ${realDisplayVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${realUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Market details
  const currentMarket = getMarketBySymbol(selectedSymbol) || prices[0] || {
    symbol: 'VOL_100_1S', name: 'Vol 100 (1s)', price: 12451.27, change24h: -5.62, category: 'vol_index', sparkline: []
  };

  const formattedPrice = currentMarket.price.toLocaleString(undefined, {
    minimumFractionDigits: currentMarket.category === 'forex' ? 4 : 2,
    maximumFractionDigits: currentMarket.category === 'forex' ? 4 : 2,
  });

  // Last digit calculation
  const priceStr = currentMarket.price.toFixed(currentMarket.category === 'forex' ? 4 : 2);
  const lastDigit = parseInt(priceStr[priceStr.length - 1], 10) || 0;
  const isLastDigitEven = lastDigit % 2 === 0;

  const yieldRate = getPayoutRate(currentMarket.category);
  const digitStats = getDigitStats();

  // Sync stake input when toggling tradeCurrency
  const handleCurrencyToggle = (newCurrency: 'KES' | 'USD') => {
    if (newCurrency === tradeCurrency) return;
    const currentVal = parseFloat(inputStake) || 0;
    if (newCurrency === 'KES') {
      setInputStake(Math.round(currentVal * rate).toString());
    } else {
      setInputStake((currentVal / rate).toFixed(2));
    }
    setTradeCurrency(newCurrency);
  };

  // Convert input stake to USD for API call
  const calculateStakeUsd = (): number => {
    const val = parseFloat(inputStake) || 0;
    return tradeCurrency === 'KES' ? val / rate : val;
  };

  const handleOpenTrade = async (prediction: string, type: 'buy' | 'sell') => {
    setSelectedPrediction(prediction);
    
    const stakeUsd = calculateStakeUsd();
    if (stakeUsd <= 0 || isNaN(stakeUsd)) {
      addToast('Invalid Stake', 'Please enter a valid stake amount.', 'error');
      return;
    }

    if (stakeUsd > activeUsdBalance) {
      addToast('Insufficient Balance', 'Stake exceeds your available account balance.', 'error');
      return;
    }

    // Update tradeQty in store to match converted USD stake
    setTradeQty(stakeUsd.toFixed(2));

    const success = await placeOrder(selectedSymbol, type);
    if (success) {
      const displayStake = tradeCurrency === 'KES' 
        ? `KES ${(stakeUsd * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
        : `$${stakeUsd.toFixed(2)} USD`;
      
      addToast('Contract Executed', `Purchased ${prediction.toUpperCase()} contract with stake of ${displayStake}`, 'success');
    }
  };

  // Quick preset adder
  const handleAddPreset = (amountToAdd: number) => {
    const current = parseFloat(inputStake) || 0;
    setInputStake((current + amountToAdd).toString());
  };

  // Automated bot execution
  useEffect(() => {
    if (!tradingBotActive) return;

    const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString();
      setBotLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 20)]);
    };

    addLog(`Trading bot scanning ${selectedSymbol}...`);

    const interval = setInterval(() => {
      const sides = ['rise', 'fall'] as const;
      const side = sides[Math.floor(Math.random() * sides.length)];
      addLog(`Algorithm trigger. Placing ${side.toUpperCase()} contract...`);
      
      const stakeUsd = calculateStakeUsd();
      setTradeQty(stakeUsd > 0 ? stakeUsd.toFixed(2) : '10');
      placeOrder(selectedSymbol, side === 'rise' ? 'buy' : 'sell');
    }, 8000);

    return () => clearInterval(interval);
  }, [tradingBotActive, selectedSymbol, placeOrder, inputStake]);

  // Payout calculation preview
  const currentStakeNum = parseFloat(inputStake) || 0;
  const potentialProfitNum = currentStakeNum * yieldRate;
  const potentialPayoutNum = currentStakeNum + potentialProfitNum;

  return (
    <div className="flex flex-col h-full space-y-2 lg:h-[calc(100vh-4.8rem)] lg:min-h-0 lg:overflow-hidden pb-20 lg:pb-0">
      
      {/* Top Header Ticker Bar & Compact Asset Info */}
      <div className="bg-[#090D1A] border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg relative z-20 flex-shrink-0">
        
        {/* Left: Asset Selector & Live Price */}
        <div className="flex items-center space-x-2.5">
          <button 
            onClick={() => setAssetSearchOpen(!assetSearchOpen)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
          >
            <span className="font-mono">{currentMarket.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="flex items-baseline space-x-2">
            <span className="text-sm sm:text-base font-mono font-black text-slate-100 tracking-tight">
              {formattedPrice}
            </span>
            <span className={`text-[10px] font-mono font-bold flex items-center ${
              currentMarket.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {currentMarket.change24h >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownLeft className="w-3 h-3 inline" />}
              <span>{currentMarket.change24h >= 0 ? '+' : ''}{currentMarket.change24h.toFixed(2)}%</span>
            </span>
          </div>
        </div>

        {/* Center/Right: Badges + Balance Summary */}
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <div className="bg-slate-950 border border-slate-850 px-2 py-1 rounded-lg flex items-center space-x-1">
            <span className="text-slate-500 text-[9px] uppercase font-bold">Last Digit:</span>
            <span className={`font-black text-xs px-1.5 py-0.2 rounded ${
              isLastDigitEven ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {lastDigit}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-850 px-2 py-1 rounded-lg flex items-center space-x-1">
            <span className="text-slate-500 text-[9px] uppercase font-bold">Return:</span>
            <span className="font-black text-xs text-emerald-400">
              +{(yieldRate * 100).toFixed(0)}%
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-lg text-[11px]">
            <span className="text-slate-500 font-bold">{isDemo ? 'DEMO' : 'REAL'}:</span>
            <span className="font-bold text-slate-200">
              {tradeCurrency === 'KES' ? `KES ${activeDisplayBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${activeDisplayBalance.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Asset Search Dropdown Popover */}
        {assetSearchOpen && (
          <div className="absolute left-2 top-12 w-80 max-w-[92vw] bg-[#090D1A] border border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-2 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
              <span className="text-xs font-bold text-slate-300">Select Market Asset</span>
              <button onClick={() => setAssetSearchOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg text-[9px] font-bold uppercase">
              {(['all', 'vol_index', 'crypto', 'forex', 'indices', 'commodities'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-1.5 py-1 rounded transition cursor-pointer ${
                    activeCategoryFilter === cat 
                      ? 'bg-slate-900 text-teal-400 border border-slate-800 font-black' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {cat === 'vol_index' ? 'Synthetics' : cat === 'indices' ? 'Stocks' : cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search symbol..." 
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 font-mono"
              />
            </div>

            {/* Asset List */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
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
                      className={`p-2 hover:bg-slate-950 border border-transparent hover:border-slate-800 rounded-lg text-xs flex justify-between items-center cursor-pointer transition ${
                        isSelected ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 font-bold' : 'text-slate-350'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-200">{p.name}</p>
                        <span className="text-[9px] text-slate-500 uppercase font-mono">{p.symbol}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-slate-100">${p.price.toFixed(2)}</p>
                        <span className={`text-[9px] font-mono font-bold ${changeUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {changeUp ? '+' : ''}{p.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}
      </div>

      {/* Main Desktop Grid & Mobile Viewport Layout */}
      <div className="grid lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
        
        {/* LEFT / CENTER WORKSPACE (8 Columns on Desktop): Compact Chart + Adjacent Compact Panels */}
        <div className="lg:col-span-8 flex flex-col min-h-0 space-y-2.5">
          
          {/* 1. COMPACT CHART PANEL */}
          <div className="flex-1 min-h-[220px] max-h-[380px] lg:max-h-[360px] flex flex-col min-h-0 bg-[#090D1A] border border-slate-800 rounded-xl overflow-hidden p-1.5 shadow-lg">
            <TradingChart symbol={selectedSymbol} currentPrice={currentMarket.price} />
          </div>

          {/* 2. ADJACENT COMPACT PANELS: Order Book / Digit Stats + Open Positions / History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 h-auto md:h-[190px] lg:h-[210px] min-h-0">
            
            {/* Panel A: Digit Statistics & Order Book Depth */}
            <div className="bg-[#090D1A] border border-slate-800 rounded-xl p-2.5 flex flex-col min-h-0 shadow-lg space-y-2">
              <div className="flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs font-bold text-slate-200">Digit Frequency Stats</span>
                </div>
                <span className="text-[10px] font-mono text-teal-400 flex items-center space-x-1 animate-pulse">
                  <Circle className="w-1.5 h-1.5 fill-teal-400" />
                  <span>50 Ticks</span>
                </span>
              </div>

              {/* 10 Digit Stats Row */}
              <div className="grid grid-cols-10 gap-1 flex-1 min-h-0 items-center">
                {digitStats.map(({ digit, percentage }) => {
                  const isActive = lastDigit === digit;
                  return (
                    <div 
                      key={digit} 
                      className={`flex flex-col items-center justify-center p-1 rounded-lg border h-full transition ${
                        isActive 
                          ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-bold scale-105 shadow-md shadow-teal-500/20' 
                          : 'bg-slate-950 border-slate-850 text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-mono font-black">{digit}</span>
                      <div className="w-full bg-slate-900 h-1 rounded overflow-hidden my-1">
                        <div 
                          className={`h-full ${isActive ? 'bg-teal-400' : 'bg-slate-600'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-mono">{percentage}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Compact Market Depth Tick Bar */}
              <div className="flex justify-between items-center bg-slate-950 px-2 py-1 border border-slate-850 rounded-lg text-[10px] font-mono text-slate-400 flex-shrink-0">
                <span>Distribution:</span>
                <span className="text-emerald-400 font-bold">Even {digitStats.filter(s => s.digit % 2 === 0).reduce((acc, s) => acc + s.percentage, 0)}%</span>
                <span className="text-rose-400 font-bold">Odd {digitStats.filter(s => s.digit % 2 !== 0).reduce((acc, s) => acc + s.percentage, 0)}%</span>
              </div>
            </div>

            {/* Panel B: Open Positions & Order History */}
            <div className="bg-[#090D1A] border border-slate-800 rounded-xl p-2.5 flex flex-col min-h-0 shadow-lg space-y-2">
              
              {/* Header Tab Buttons */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg flex-shrink-0">
                <button 
                  onClick={() => setLeftTab('open')} 
                  className={`py-1 rounded text-[10px] font-bold uppercase transition ${
                    leftTab === 'open' 
                      ? 'bg-slate-900 text-teal-400 border border-slate-800 font-black' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Active ({openPositions.length})
                </button>
                <button 
                  onClick={() => setLeftTab('closed')} 
                  className={`py-1 rounded text-[10px] font-bold uppercase transition ${
                    leftTab === 'closed' 
                      ? 'bg-slate-900 text-teal-400 border border-slate-800 font-black' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  History ({closedTrades.length})
                </button>
                <button 
                  onClick={() => setLeftTab('ledger')} 
                  className={`py-1 rounded text-[10px] font-bold uppercase transition ${
                    leftTab === 'ledger' 
                      ? 'bg-slate-900 text-teal-400 border border-slate-800 font-black' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Audit
                </button>
              </div>

              {/* Scrollable Content List */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 scrollbar-thin">
                {leftTab === 'open' && (
                  openPositions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[11px] space-y-1 py-4">
                      <Clock className="w-5 h-5 text-slate-600" />
                      <span>No active contracts.</span>
                    </div>
                  ) : (
                    openPositions.map(pos => {
                      const secondsRemaining = pos.expiryTime 
                        ? Math.max(0, Math.ceil((new Date(pos.expiryTime).getTime() - Date.now()) / 1000))
                        : 0;

                      const displayStakeStr = tradeCurrency === 'KES'
                        ? `KES ${(pos.quantity * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : `$${pos.quantity.toFixed(2)}`;

                      return (
                        <div key={pos.id} className="bg-slate-950 border border-slate-850 rounded-lg p-2 space-y-1.5 hover:border-slate-700 transition">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-mono font-bold text-slate-300">{pos.symbol}</span>
                            <span className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-bold ${
                              pos.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {pos.contractType ? pos.contractType.replace('_', ' ') : pos.type}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-400">Stake: <strong className="text-slate-200">{displayStakeStr}</strong></span>
                            <span className="text-teal-400 font-bold animate-pulse">{secondsRemaining}s remaining</span>
                          </div>

                          <button 
                            onClick={() => closePositionEarly(pos.id)}
                            className="w-full py-1 text-[9px] bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white rounded font-bold uppercase transition cursor-pointer"
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
                    <div className="h-full flex items-center justify-center text-slate-600 text-[11px] py-4">
                      No contract settlement history.
                    </div>
                  ) : (
                    [...closedTrades].reverse().slice(0, 15).map(pos => {
                      const won = pos.pnl > 0;
                      const pnlDisplay = tradeCurrency === 'KES' 
                        ? `KES ${(pos.pnl * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
                        : `$${pos.pnl.toFixed(2)}`;

                      return (
                        <div key={pos.id} className="bg-slate-950 border border-slate-850 rounded-lg p-2 flex justify-between items-center text-[10px] font-mono">
                          <div>
                            <span className="font-bold text-slate-300 mr-2">{pos.symbol}</span>
                            <span className="text-slate-500">${pos.quantity}</span>
                          </div>
                          <span className={`font-bold px-1.5 py-0.2 rounded ${
                            won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {won ? `+${pnlDisplay}` : pnlDisplay}
                          </span>
                        </div>
                      );
                    })
                  )
                )}

                {leftTab === 'ledger' && (
                  <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
                    {closedTrades.slice(0, 6).map(t => (
                      <div key={t.id} className="border-l-2 border-teal-500/30 pl-2 py-0.5 bg-slate-950/60 rounded-r">
                        <span>[{new Date(t.createdAt).toLocaleTimeString()}] Settled: </span>
                        <span className={t.pnl > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {t.pnl > 0 ? 'WIN' : 'LOSS'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT ORDER EXECUTION PANEL (4 Columns on Desktop): All Controls Visible in Viewport */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="bg-[#090D1A] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between h-full min-h-0 overflow-y-auto space-y-2.5">
            
            {/* 1. Derivative Type Selection Tabs */}
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1 font-bold">
                Contract Type
              </label>
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg text-[10px]">
                {(['rise_fall', 'even_odd', 'over_under', 'matches_differ'] as const).map(type => (
                  <button 
                    key={type}
                    type="button"
                    onClick={() => {
                      setActiveContractType(type);
                      if (type === 'rise_fall') setSelectedPrediction('rise');
                      else if (type === 'even_odd') setSelectedPrediction('even');
                      else if (type === 'over_under') setSelectedPrediction('over');
                      else if (type === 'matches_differ') setSelectedPrediction('match');
                    }}
                    className={`py-1.5 rounded text-center transition uppercase cursor-pointer ${
                      activeContractType === type 
                        ? 'bg-slate-900 text-teal-400 border border-slate-800 font-black' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {type === 'rise_fall' ? 'Rise/Fall' : type === 'even_odd' ? 'Even/Odd' : type === 'over_under' ? 'Over/Under' : 'Matches'}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Stake Input + Currency Switcher + Quick Presets */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400 font-bold">Stake ({tradeCurrency}):</span>
                <button 
                  type="button"
                  onClick={() => handleCurrencyToggle(tradeCurrency === 'KES' ? 'USD' : 'KES')}
                  className="text-teal-400 hover:underline font-bold uppercase cursor-pointer"
                >
                  Switch to {tradeCurrency === 'KES' ? 'USD' : 'KES'}
                </button>
              </div>

              <div className="relative">
                <input 
                  type="number" 
                  step="any"
                  value={inputStake}
                  onChange={(e) => setInputStake(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500/50 focus:outline-none rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-100"
                />
                <span className="absolute right-3 top-2 text-xs font-mono font-bold text-slate-500">
                  {tradeCurrency}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {tradeCurrency === 'KES' ? (
                  [100, 500, 1000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleAddPreset(amt)}
                      className="py-1 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-300 rounded text-[9px] font-mono font-bold cursor-pointer transition"
                    >
                      +{amt}
                    </button>
                  ))
                ) : (
                  [5, 10, 25, 50].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleAddPreset(amt)}
                      className="py-1 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-300 rounded text-[9px] font-mono font-bold cursor-pointer transition"
                    >
                      +${amt}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 3. Duration Selector */}
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1 font-bold">
                Expiry Duration
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[5, 10, 15, 30, 60].map(sec => (
                  <button 
                    key={sec}
                    type="button"
                    onClick={() => setOptionDuration(sec)}
                    className={`py-1.5 bg-slate-950 border rounded font-mono text-xs cursor-pointer transition ${
                      optionDuration === sec 
                        ? 'border-teal-500/50 text-teal-400 bg-teal-500/10 font-bold' 
                        : 'border-slate-850 text-slate-400 hover:border-slate-750'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* Target Digit Selector (Over/Under or Matches) */}
            {(activeContractType === 'over_under' || activeContractType === 'matches_differ') && (
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1 font-bold">
                  Target Digit
                </label>
                <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg">
                  {[0, 2, 4, 6, 8].map(d => (
                    <button 
                      key={d}
                      type="button"
                      onClick={() => setPredictionDigit(d)}
                      className={`py-1 text-xs font-mono rounded transition ${
                        predictionDigit === d ? 'bg-slate-900 text-teal-400 border border-slate-750 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Potential Payout Return Card */}
            <div className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Return Rate:</span>
                <span className="font-bold text-emerald-400">+{(yieldRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Profit:</span>
                <span className="font-bold text-teal-400">
                  {tradeCurrency === 'KES' ? `KES ${potentialProfitNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${potentialProfitNum.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-200 border-t border-slate-850 pt-1 font-bold">
                <span>Total Payout:</span>
                <span className="text-emerald-400">
                  {tradeCurrency === 'KES' ? `KES ${potentialPayoutNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${potentialPayoutNum.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* 5. Order Action Buttons */}
            <div className="space-y-2 pt-1 border-t border-slate-850">
              {activeContractType === 'rise_fall' && (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('rise', 'buy')}
                    className="py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl uppercase transition flex flex-col items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    <TrendingUp className="w-5 h-5 mb-0.5" />
                    <span>RISE</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('fall', 'sell')}
                    className="py-3 bg-rose-500 hover:bg-rose-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl uppercase transition flex flex-col items-center justify-center cursor-pointer shadow-lg shadow-rose-500/10"
                  >
                    <TrendingDown className="w-5 h-5 mb-0.5" />
                    <span>FALL</span>
                  </button>
                </div>
              )}

              {activeContractType === 'even_odd' && (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('even', 'buy')}
                    className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center cursor-pointer"
                  >
                    <span>EVEN</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('odd', 'sell')}
                    className="py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center cursor-pointer"
                  >
                    <span>ODD</span>
                  </button>
                </div>
              )}

              {activeContractType === 'over_under' && (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('over', 'buy')}
                    className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center cursor-pointer"
                  >
                    <span>OVER</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('under', 'sell')}
                    className="py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center cursor-pointer"
                  >
                    <span>UNDER</span>
                  </button>
                </div>
              )}

              {activeContractType === 'matches_differ' && (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('match', 'buy')}
                    className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center cursor-pointer"
                  >
                    <span>MATCHES</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleOpenTrade('differ', 'sell')}
                    className="py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center cursor-pointer"
                  >
                    <span>DIFFER</span>
                  </button>
                </div>
              )}

              {/* Bot Toggle Button */}
              <button 
                type="button"
                onClick={() => setTradingBotActive(!tradingBotActive)}
                className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                  tradingBotActive 
                    ? 'bg-teal-500 text-slate-950 hover:bg-teal-400 animate-pulse font-black' 
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{tradingBotActive ? 'AI Bot Running' : 'Engage Smart Bot'}</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* MOBILE STICKY BOTTOM TRADING BAR (Instant 1-Thumb Order Execution) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#070B16]/95 backdrop-blur-xl border-t border-slate-800 p-2 shadow-2xl">
        <div className="max-w-md mx-auto space-y-1.5">
          
          <div className="flex items-center justify-between gap-1.5 text-xs font-mono">
            <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold mr-1">{tradeCurrency}:</span>
              <input 
                type="number" 
                value={inputStake}
                onChange={(e) => setInputStake(e.target.value)}
                className="w-full bg-transparent text-slate-100 font-bold focus:outline-none text-xs"
              />
            </div>

            <select
              value={optionDuration}
              onChange={(e) => setOptionDuration(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-teal-400 font-bold text-xs rounded-lg px-2 py-1 focus:outline-none"
            >
              {[5, 10, 15, 30, 60].map(s => (
                <option key={s} value={s} className="bg-slate-900 text-slate-200">{s}s</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleCurrencyToggle(tradeCurrency === 'KES' ? 'USD' : 'KES')}
              className="bg-slate-900 border border-slate-800 text-slate-300 font-bold text-[10px] rounded-lg px-2 py-1 uppercase"
            >
              {tradeCurrency}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button"
              onClick={() => handleOpenTrade('rise', 'buy')}
              className="py-2.5 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center space-x-1 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>RISE (+{(yieldRate * 100).toFixed(0)}%)</span>
            </button>

            <button 
              type="button"
              onClick={() => handleOpenTrade('fall', 'sell')}
              className="py-2.5 bg-rose-500 text-slate-950 font-black text-xs rounded-xl uppercase transition flex items-center justify-center space-x-1 shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer"
            >
              <TrendingDown className="w-4 h-4" />
              <span>FALL (+{(yieldRate * 100).toFixed(0)}%)</span>
            </button>
          </div>

        </div>
      </div>

      {/* Real Account Switch Confirmation Modal */}
      <RealAccountConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => setIsDemo(false)}
        realBalanceDisplay={realBalanceDisplay}
      />

    </div>
  );
};

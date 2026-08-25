/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '../../stores/marketStore';
import { useTradeStore } from '../../stores/tradeStore';
import { useWalletStore } from '../../stores/walletStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChatStore } from '../../stores/chatStore';
import { useMarketSimulation } from '../../hooks/useMarketSimulation';
import { getUsdKesRate, formatCurrency } from '../../lib/currency';
import { playSound } from '../../lib/sound';
import { TradingChart } from '../TradingChart';
import { RealAccountConfirmModal } from '../modals/RealAccountConfirmModal';
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Sparkles, 
  Circle, ChevronDown, Check, Search, Clock, DollarSign, Activity, 
  Layers, X, Wallet, ShieldAlert, Sliders, Play, Square, AlertCircle,
  BarChart2, Zap, ArrowRightLeft, Shield, MessageSquare, RefreshCw, Flame, Snowflake, Target
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
  const navigate = useNavigate();
  // Initialize continuous high-frequency market simulation
  useMarketSimulation();

  const { prices, selectedSymbol, setSelectedSymbol, getMarketBySymbol } = useMarketStore();
  const { 
    openPositions, closedTrades, placeOrder, closePositionEarly,
    activeContractType, setActiveContractType, 
    selectedPrediction, setSelectedPrediction, 
    optionDuration, setOptionDuration, predictionDigit, setPredictionDigit,
    getDigitStats, digitHistory, tradingBotActive, setTradingBotActive, setBotLogs
  } = useTradeStore();

  const { isDemo, setIsDemo, getUsdBalance, setDepositModalOpen } = useWalletStore();
  const { addToast } = useNotificationStore();
  const { setChatOpen } = useChatStore();

  // Mode: Auto vs Manual (matching reference)
  const [executionMode, setExecutionMode] = useState<'auto' | 'manual'>('auto');

  // Local trading currency display state (KES vs USD)
  const [tradeCurrency, setTradeCurrency] = useState<'KES' | 'USD'>('USD');
  const [stakeValue, setStakeValue] = useState<number>(10);
  
  // Advanced controls: target profit, stop loss, multiplier
  const [targetProfit, setTargetProfit] = useState<number>(200);
  const [stopLoss, setStopLoss] = useState<number>(999);
  const [multiplier, setMultiplier] = useState<number>(2);

  // Bot session & risk tracking state
  const [botSessionStats, setBotSessionStats] = useState<{
    sessionProfit: number;
    tradesCount: number;
    wins: number;
    losses: number;
    status: 'idle' | 'running' | 'paused' | 'target_reached' | 'stop_loss_reached';
    lastAction: string;
    countdown: number;
  }>({
    sessionProfit: 0,
    tradesCount: 0,
    wins: 0,
    losses: 0,
    status: 'idle',
    lastAction: 'Bot ready. Press START AUTO BOT to begin algorithmic execution.',
    countdown: 3,
  });

  const [botSessionStartTime, setBotSessionStartTime] = useState<number>(Date.now());

  // Modals & Bottom Sheets
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'crypto' | 'forex' | 'vol_index' | 'indices' | 'commodities'>('all');
  
  const [positionsSheetOpen, setPositionsSheetOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [centerTab, setCenterTab] = useState<'active' | 'history' | 'audit'>('active');

  // Real-time ticking clock for smooth instant contract countdowns and cleanup
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 150);
    return () => clearInterval(timer);
  }, []);

  const rate = getUsdKesRate() || 130;

  // Active wallet balances
  const { balance: realUsd, demoBalance: demoUsd } = getUsdBalance();
  const activeUsdBalance = isDemo ? demoUsd : realUsd;
  const activeDisplayBalance = tradeCurrency === 'KES' ? activeUsdBalance * rate : activeUsdBalance;

  // Filter open positions that are actively alive (immediately drop expired/closed items)
  const activeContracts = useMemo(() => {
    return openPositions.filter((pos) => {
      if (pos.status !== 'open') return false;
      if (pos.expiryTime) {
        const exp = new Date(pos.expiryTime).getTime();
        // If expired by over 800ms, consider it settling and drop from live view
        if (currentTime > exp + 800) return false;
      }
      return true;
    });
  }, [openPositions, currentTime]);

  // Current selected market
  const currentMarket = getMarketBySymbol(selectedSymbol) || prices[0] || {
    symbol: 'VOL_10_1S', name: 'Volatility 10 (1s) Index', price: 9450.34, change24h: -0.01, category: 'vol_index', sparkline: []
  };

  const formattedPrice = currentMarket.price.toLocaleString(undefined, {
    minimumFractionDigits: currentMarket.category === 'forex' ? 4 : 2,
    maximumFractionDigits: currentMarket.category === 'forex' ? 4 : 2,
  });

  // Calculate last digit
  const priceStr = currentMarket.price.toFixed(currentMarket.category === 'forex' ? 4 : 2);
  const lastDigit = parseInt(priceStr[priceStr.length - 1], 10) || 0;

  const yieldRate = getPayoutRate(currentMarket.category);
  const digitStats = getDigitStats();

  // Find Hot and Cold digits
  const { hotDigit, coldDigit } = useMemo(() => {
    if (!digitStats || digitStats.length === 0) {
      return { hotDigit: { digit: 4, count: 13, percentage: 18 }, coldDigit: { digit: 9, count: 6, percentage: 8 } };
    }
    const sorted = [...digitStats].sort((a, b) => b.count - a.count);
    return {
      hotDigit: sorted[0] || { digit: 4, count: 13, percentage: 18 },
      coldDigit: sorted[sorted.length - 1] || { digit: 9, count: 6, percentage: 8 }
    };
  }, [digitStats]);

  // Even / Odd percentages
  const evenPercentage = useMemo(() => {
    return digitStats.filter(s => s.digit % 2 === 0).reduce((acc, s) => acc + s.percentage, 0);
  }, [digitStats]);

  const oddPercentage = useMemo(() => {
    return digitStats.filter(s => s.digit % 2 !== 0).reduce((acc, s) => acc + s.percentage, 0);
  }, [digitStats]);

  // Stake quick presets
  const quickPresets = tradeCurrency === 'USD' 
    ? [1, 5, 10, 25, 50, 100] 
    : [100, 500, 1000, 2500, 5000, 10000];

  // Adjust stake with stepper
  const handleStakeStep = (delta: number) => {
    playSound('click');
    const step = tradeCurrency === 'USD' ? 1 : 100;
    const nextVal = Math.max(step, stakeValue + delta * step);
    setStakeValue(nextVal);
  };

  // Convert current stake to USD
  const getStakeInUsd = (): number => {
    return tradeCurrency === 'KES' ? stakeValue / rate : stakeValue;
  };

  // Payout calculation
  const stakeUsd = getStakeInUsd();
  const estimatedPayoutUsd = stakeUsd * (1 + yieldRate);
  const estimatedPayoutDisplay = tradeCurrency === 'KES' 
    ? `KSh ${(estimatedPayoutUsd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${estimatedPayoutUsd.toFixed(2)}`;

  // Matches/Differs multiplier calculation
  const matchesPayoutUsd = stakeUsd * 9.5;
  const matchesPayoutDisplay = tradeCurrency === 'KES' 
    ? `KSh ${(matchesPayoutUsd * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${matchesPayoutUsd.toFixed(2)}`;

  // Refs for Bot Engine to prevent interval thrashing and race conditions
  const isExecutingTradeRef = useRef<boolean>(false);
  const tradingBotActiveRef = useRef<boolean>(tradingBotActive);
  tradingBotActiveRef.current = tradingBotActive;

  const currentMarketRef = useRef(currentMarket);
  currentMarketRef.current = currentMarket;

  const activeContractTypeRef = useRef(activeContractType);
  activeContractTypeRef.current = activeContractType;

  const optionDurationRef = useRef(optionDuration);
  optionDurationRef.current = optionDuration;

  const predictionDigitRef = useRef(predictionDigit);
  predictionDigitRef.current = predictionDigit;

  const stakeUsdRef = useRef(stakeUsd);
  stakeUsdRef.current = stakeUsd;

  const openPositionsRef = useRef(openPositions);
  openPositionsRef.current = openPositions;

  const digitHistoryRef = useRef(digitHistory);
  digitHistoryRef.current = digitHistory;

  // Execute trade order (for manual desk)
  const handleTrade = async (prediction: string, type: 'buy' | 'sell') => {
    playSound('trade');
    setSelectedPrediction(prediction);
    useTradeStore.getState().setTradeQty(stakeUsd.toString());

    if (stakeUsd <= 0 || isNaN(stakeUsd)) {
      addToast('Invalid Stake', 'Please specify a valid stake amount.', 'error');
      return;
    }

    if (stakeUsd > activeUsdBalance) {
      addToast('Insufficient Balance', 'Stake amount exceeds your available wallet balance.', 'error');
      return;
    }

    await placeOrder(currentMarket.symbol, type, {
      prediction,
      quantity: stakeUsd,
      contractType: activeContractType,
      durationSeconds: optionDuration,
      predictionDigit: predictionDigit
    });
  };

  // Start or resume Bot
  const handleStartBot = () => {
    playSound('click');
    setExecutionMode('auto');
    setTradingBotActive(true);
    if (botSessionStats.status === 'target_reached' || botSessionStats.status === 'stop_loss_reached') {
      // Reset session if previously finished
      setBotSessionStartTime(Date.now());
      setBotSessionStats({
        sessionProfit: 0,
        tradesCount: 0,
        wins: 0,
        losses: 0,
        status: 'running',
        lastAction: 'Session started. Analyzing tick patterns & volatility...',
        countdown: 2,
      });
    } else {
      setBotSessionStats(prev => ({
        ...prev,
        status: 'running',
        lastAction: 'Bot active. Analyzing tick patterns & volatility...',
        countdown: 2
      }));
    }
    addToast('Auto Bot Activated', `Bot running with Target: $${targetProfit} | SL: $${stopLoss}`, 'info');
  };

  // Stop Bot manually anytime
  const handleStopBot = () => {
    playSound('click');
    setTradingBotActive(false);
    setBotSessionStats(prev => ({
      ...prev,
      status: 'paused',
      lastAction: 'Bot halted by user.'
    }));
    addToast('Auto Bot Paused', 'Automated trading has been stopped.', 'info');
  };

  // Reset Bot Session
  const handleResetBotSession = () => {
    playSound('click');
    setBotSessionStartTime(Date.now());
    setBotSessionStats({
      sessionProfit: 0,
      tradesCount: 0,
      wins: 0,
      losses: 0,
      status: 'idle',
      lastAction: 'Session reset. Ready to launch.',
      countdown: 2,
    });
    addToast('Session Reset', 'Bot statistics and session profit reset.', 'info');
  };

  // Monitor Closed Trades for TP / SL Reached
  useEffect(() => {
    const sessionTrades = closedTrades.filter(t => {
      const tTime = new Date(t.closedAt || t.createdAt).getTime();
      return tTime >= botSessionStartTime;
    });

    if (sessionTrades.length > 0) {
      const netPnl = sessionTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winsCount = sessionTrades.filter(t => (t.pnl || 0) > 0).length;
      const lossesCount = sessionTrades.filter(t => (t.pnl || 0) <= 0).length;

      // Check Target Profit
      if (netPnl >= targetProfit && tradingBotActive) {
        setTradingBotActive(false);
        setBotSessionStats(prev => ({
          ...prev,
          sessionProfit: netPnl,
          tradesCount: sessionTrades.length,
          wins: winsCount,
          losses: lossesCount,
          status: 'target_reached',
          lastAction: `🎯 TARGET PROFIT REACHED (+$${netPnl.toFixed(2)})! Bot halted automatically to secure gains.`
        }));
        playSound('trade');
        addToast('🎯 Target Profit Reached!', `Bot hit your target of $${targetProfit} with +$${netPnl.toFixed(2)} profit!`, 'success');
        return;
      }

      // Check Stop Loss
      if (netPnl <= -Math.abs(stopLoss) && tradingBotActive) {
        setTradingBotActive(false);
        setBotSessionStats(prev => ({
          ...prev,
          sessionProfit: netPnl,
          tradesCount: sessionTrades.length,
          wins: winsCount,
          losses: lossesCount,
          status: 'stop_loss_reached',
          lastAction: `⚠️ STOP LOSS REACHED (-$${Math.abs(netPnl).toFixed(2)})! Bot halted automatically to protect capital.`
        }));
        playSound('trade');
        addToast('⚠️ Stop Loss Reached!', `Bot stopped at -$${Math.abs(netPnl).toFixed(2)} to protect your balance.`, 'error');
        return;
      }

      // Update normal stats
      setBotSessionStats(prev => ({
        ...prev,
        sessionProfit: netPnl,
        tradesCount: sessionTrades.length,
        wins: winsCount,
        losses: lossesCount,
      }));
    }
  }, [closedTrades, botSessionStartTime, targetProfit, stopLoss, tradingBotActive]);

  // Bot Tick & Trade Execution Engine (Continuous Non-Thrashing Loop)
  useEffect(() => {
    if (!tradingBotActive) return;

    const timer = setInterval(async () => {
      // If there is currently an open position, wait for it to settle
      if (openPositionsRef.current.length > 0) {
        setBotSessionStats(prev => ({
          ...prev,
          lastAction: `Trade active in market (${openPositionsRef.current[0].symbol}). Awaiting settlement...`,
          countdown: optionDurationRef.current
        }));
        return;
      }

      if (isExecutingTradeRef.current) {
        return;
      }

      setBotSessionStats(prev => {
        const nextCountdown = prev.countdown > 1 ? prev.countdown - 1 : 0;
        return {
          ...prev,
          countdown: nextCountdown,
          lastAction: nextCountdown > 0 
            ? `Analyzing algorithmic signals (${nextCountdown}s)...`
            : prev.lastAction
        };
      });

      // When countdown reaches 0 and ready, fire order
      setBotSessionStats(prev => {
        if (prev.countdown <= 1 && !isExecutingTradeRef.current && openPositionsRef.current.length === 0) {
          isExecutingTradeRef.current = true;

          const contractType = activeContractTypeRef.current;
          const symbol = currentMarketRef.current.symbol;
          const stake = stakeUsdRef.current;
          const duration = optionDurationRef.current;
          const predDigit = predictionDigitRef.current;

          let chosenPred = 'rise';
          let chosenType: 'buy' | 'sell' = 'buy';

          if (contractType === 'even_odd') {
            const history = digitHistoryRef.current;
            const evenCount = history.filter(d => d % 2 === 0).length;
            const oddCount = history.filter(d => d % 2 !== 0).length;
            chosenPred = evenCount >= oddCount ? 'even' : 'odd';
            chosenType = chosenPred === 'even' ? 'buy' : 'sell';
          } else if (contractType === 'matches_differ') {
            chosenPred = 'differs';
            chosenType = 'sell';
          } else if (contractType === 'over_under') {
            const history = digitHistoryRef.current;
            const lastDigit = history[history.length - 1] ?? 5;
            chosenPred = lastDigit < 5 ? 'over' : 'under';
            chosenType = chosenPred === 'over' ? 'buy' : 'sell';
          } else {
            // Rise / Fall - determine from recent price movement
            const history = digitHistoryRef.current;
            const last = history[history.length - 1] ?? 5;
            const prevDigit = history[history.length - 2] ?? 5;
            chosenPred = last >= prevDigit ? 'rise' : 'fall';
            chosenType = chosenPred === 'rise' ? 'buy' : 'sell';
          }

          // Execute order asynchronously
          playSound('trade');
          placeOrder(symbol, chosenType, {
            prediction: chosenPred,
            quantity: stake,
            contractType: contractType,
            durationSeconds: duration,
            predictionDigit: predDigit
          }).finally(() => {
            isExecutingTradeRef.current = false;
          });

          return {
            ...prev,
            countdown: duration + 1,
            tradesCount: prev.tradesCount + 1,
            lastAction: `⚡ Bot executed ${chosenPred.toUpperCase()} on ${symbol} ($${stake.toFixed(2)})`
          };
        }
        return prev;
      });

    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [tradingBotActive, placeOrder]);

  // Filtered asset list
  const filteredMarkets = useMemo(() => {
    return prices.filter(p => {
      const matchCat = activeCategoryFilter === 'all' || p.category === activeCategoryFilter;
      const matchSearch = p.name.toLowerCase().includes(assetSearch.toLowerCase()) || 
                          p.symbol.toLowerCase().includes(assetSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [prices, activeCategoryFilter, assetSearch]);

  // Global ESC key listener to clear/close any open modal or bottom sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAssetSearchOpen(false);
        setPositionsSheetOpen(false);
        setSettingsModalOpen(false);
        setDurationModalOpen(false);
        setConfirmModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden select-none">
      
      {/* 1. TOP MARKET CATEGORY NAVIGATION (Matches/Differs, Even/Odd, Over/Under, Rise/Fall) */}
      <div className="w-full mb-1 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pb-0.5 flex-shrink-0">
        <div className="flex items-center space-x-1 sm:space-x-1.5 w-full">
          {[
            { id: 'even_odd', label: 'Even / Odd' },
            { id: 'matches_differ', label: 'Matches / Differs' },
            { id: 'over_under', label: 'Over / Under' },
            { id: 'rise_fall', label: 'Rise / Fall' },
          ].map(tab => {
            const isActive = activeContractType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playSound('click');
                  setActiveContractType(tab.id as any);
                }}
                className={`flex-1 py-1 sm:py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold text-center transition cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-slate-900 border-teal-500 text-teal-300 shadow-md shadow-teal-500/10'
                    : 'bg-[#090D1A] border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN BODY WORKSPACE (Responsive Single-Screen Grid) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-1.5 sm:gap-2">
        
        {/* LEFT / CENTER: Chart & Digit Statistics Stack (Desktop 8 Cols, Mobile Full) */}
        <div className="lg:col-span-8 flex flex-col justify-between h-full min-h-0 space-y-1.5">
          
          {/* CONTINUOUS LIVE CHART CARD (With Integrated Floating Instrument Dropdown, 1T Pill, Return %, Price Callout) */}
          <div className="flex-1 min-h-[160px] sm:min-h-[220px] max-h-[280px] lg:max-h-none">
            <TradingChart 
              symbol={currentMarket.symbol}
              currentPrice={currentMarket.price}
              change24h={currentMarket.change24h}
              marketName={currentMarket.name}
              payoutRate={yieldRate}
              onOpenAssetSelector={() => setAssetSearchOpen(true)}
            />
          </div>

          {/* 2. DIGIT STATISTICS PANEL (Crystal-Clear Active Cursor & Digit Distribution) */}
          <div className="bg-[#070B16] border border-slate-850 rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between flex-shrink-0 shadow-md">
            
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-850 text-[10px] sm:text-[11px] font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-slate-300 tracking-wider uppercase">
                  {activeContractType === 'even_odd' ? 'EVEN / ODD' : activeContractType === 'over_under' ? 'OVER / UNDER' : 'DIGIT STATS'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-[9px]">Last 50 Ticks</span>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-3 text-[10px] font-bold">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <Flame className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                  <span>HOT {hotDigit.digit}</span>
                </span>
                <span className="flex items-center space-x-1 text-rose-400">
                  <Snowflake className="w-3 h-3 text-rose-400" />
                  <span>COLD {coldDigit.digit}</span>
                </span>
                <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 shadow-sm">
                  <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold">TICK</span>
                  <span className="px-1.5 py-0.2 bg-cyan-400 text-slate-950 font-black rounded-full text-[10px] animate-pulse">
                    {lastDigit}
                  </span>
                </div>
              </div>
            </div>

            {/* Frequency Counts & Active Pointer Row */}
            <div className="grid grid-cols-10 gap-1 text-center font-mono text-[9px] sm:text-[10px] mb-0.5">
              {digitStats.map((item) => {
                const isLast = item.digit === lastDigit;
                return (
                  <div key={`cnt-${item.digit}`} className="flex flex-col items-center justify-end h-6">
                    {isLast ? (
                      <div className="flex flex-col items-center">
                        <span className="text-cyan-400 text-xs font-black leading-none animate-bounce">▼</span>
                      </div>
                    ) : (
                      <span className={`font-semibold ${item.digit === hotDigit.digit ? 'text-emerald-400 font-bold' : item.digit === coldDigit.digit ? 'text-rose-400' : 'text-slate-400'}`}>
                        {item.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vertical Histogram Bars (10 Digits: 0 to 9) */}
            <div className="grid grid-cols-10 gap-1 h-12 sm:h-14 items-end mb-1 px-0.5">
              {digitStats.map((item) => {
                const isHot = item.digit === hotDigit.digit;
                const isCold = item.digit === coldDigit.digit;
                const isLast = item.digit === lastDigit;
                const isTarget = item.digit === predictionDigit && (activeContractType === 'matches_differ' || activeContractType === 'over_under');
                const heightPercent = Math.max(16, Math.min(100, item.percentage * 4));

                return (
                  <div 
                    key={`bar-${item.digit}`} 
                    className="flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    onClick={() => {
                      playSound('click');
                      setPredictionDigit(item.digit);
                    }}
                  >
                    <div 
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-md transition-all duration-200 flex flex-col items-center justify-between py-0.5 relative ${
                        isLast
                          ? 'bg-gradient-to-t from-cyan-600 via-cyan-500 to-cyan-300 text-slate-950 font-black border-2 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.9)] z-10 scale-[1.04]'
                          : isTarget
                          ? 'bg-slate-800 border-2 border-amber-400 ring-2 ring-amber-400/30 text-amber-300'
                          : isHot
                          ? 'bg-slate-800/90 border-t-2 border-t-emerald-400 border-slate-700/60 text-slate-300'
                          : isCold
                          ? 'bg-slate-800/90 border-t-2 border-t-rose-400/80 border-slate-700/60 text-slate-400'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400'
                      }`}
                    >
                      {/* Top Indicator badge */}
                      <div className="text-[7px] leading-none">
                        {isLast ? (
                          <span className="font-black text-slate-950">●</span>
                        ) : isHot ? (
                          <span className="text-emerald-400 font-bold">🔥</span>
                        ) : isCold ? (
                          <span className="text-rose-400 font-bold">❄️</span>
                        ) : isTarget ? (
                          <span className="text-amber-400 font-bold">🎯</span>
                        ) : null}
                      </div>

                      {/* Percentage inside bar */}
                      <span className={`text-[8px] font-mono font-bold leading-none ${isLast ? 'text-slate-950 font-black' : 'text-slate-400'}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Digit Labels (0 1 2 3 4 5 6 7 8 9) */}
            <div className="grid grid-cols-10 gap-1 text-center font-mono text-[10px] sm:text-xs font-bold mb-1.5">
              {digitStats.map((item) => {
                const isLast = item.digit === lastDigit;
                const isTarget = item.digit === predictionDigit && (activeContractType === 'matches_differ' || activeContractType === 'over_under');
                return (
                  <span 
                    key={`lbl-${item.digit}`}
                    className={`py-0.5 rounded cursor-pointer transition-all ${
                      isLast 
                        ? 'bg-cyan-400 text-slate-950 font-black scale-110 shadow-md shadow-cyan-400/60' 
                        : isTarget
                        ? 'border border-amber-400 text-amber-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    onClick={() => {
                      playSound('click');
                      setPredictionDigit(item.digit);
                    }}
                  >
                    {item.digit}
                  </span>
                );
              })}
            </div>

            {/* Bottom Dual Distribution Progress Bar (EVEN 52% [====|====] ODD 48%) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-bold">
                <span className="text-teal-400">EVEN {evenPercentage}%</span>
                <span className="text-cyan-400">ODD {oddPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${evenPercentage}%` }} 
                  className="h-full bg-teal-500 transition-all duration-300"
                />
                <div 
                  style={{ width: `${oddPercentage}%` }} 
                  className="h-full bg-cyan-500 transition-all duration-300"
                />
              </div>
            </div>

          </div>

          {/* Active Positions & Live Contracts Panel */}
          <div className="bg-[#070B16] border border-slate-850 rounded-2xl p-2.5 flex-1 min-h-[95px] flex flex-col justify-between shadow-md">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-1.5 border-b border-slate-850">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-bold text-slate-200 uppercase">Live Contracts ({activeContracts.length})</span>
                {activeContracts.length > 0 && (
                  <span className="flex items-center space-x-1 px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>ACTIVE</span>
                  </span>
                )}
              </div>
              <button 
                onClick={() => navigate('/history')}
                className="text-[10px] text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
              >
                Full History →
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[95px] scrollbar-thin py-1 space-y-1.5">
              {activeContracts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono py-2.5 text-center">
                  No active contracts. Place an order or start the Auto Bot.
                </div>
              ) : (
                activeContracts.map((pos) => {
                  const remainingSec = pos.expiryTime 
                    ? Math.max(0, (new Date(pos.expiryTime).getTime() - currentTime) / 1000).toFixed(1)
                    : null;
                  const totalSec = pos.durationSeconds || 15;
                  const progressPct = remainingSec !== null ? Math.max(0, Math.min(100, (parseFloat(remainingSec) / totalSec) * 100)) : 100;

                  return (
                    <div key={pos.id} className="p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono transition-all">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-200 text-xs">{pos.symbol}</span>
                          <span className="px-1.5 py-0.2 rounded bg-teal-500/20 border border-teal-500/30 text-teal-300 font-bold uppercase text-[9px]">
                            {pos.prediction || pos.type}
                          </span>
                          <span className="text-slate-300 text-xs">${pos.quantity}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {remainingSec !== null && (
                            <span className="text-cyan-400 font-bold text-[10px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                              ⏱ {remainingSec}s
                            </span>
                          )}
                          <button 
                            onClick={() => closePositionEarly(pos.id)}
                            className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] hover:bg-rose-500/30 transition cursor-pointer"
                          >
                            Cash Out
                          </button>
                        </div>
                      </div>

                      {/* Animated Progress Bar */}
                      {remainingSec !== null && (
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-1.5">
                          <div 
                            style={{ width: `${progressPct}%` }}
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-150"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT: Trading Execution Console (Desktop 4 Cols, Mobile Full Width) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-1.5 sm:space-y-2">
          
          {/* 3. AUTO / MANUAL SEGMENTED CONTROL */}
          <div className="w-full bg-slate-950 border border-slate-800 p-0.5 rounded-xl flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setExecutionMode('auto');
                setTradingBotActive(true);
                addToast('Auto Bot Activated', 'Automated algorithmic trading strategy engaged.', 'info');
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                executionMode === 'auto'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>AUTO</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setExecutionMode('manual');
                setTradingBotActive(false);
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                executionMode === 'manual'
                  ? 'bg-slate-800 text-teal-300 border border-teal-500/40 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>MANUAL</span>
            </button>
          </div>

          {/* 4. STAKE CONTROL ([-] STAKE [+], Large Center Value & Quick Amounts) */}
          <div className="bg-[#070B16] border border-slate-850 rounded-2xl p-2.5 sm:p-3 space-y-2 shadow-md">
            
            {/* Top Stepper Row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleStakeStep(-1)}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-95 border border-slate-800 text-slate-200 hover:text-teal-300 flex items-center justify-center text-lg font-black transition cursor-pointer"
              >
                -
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                  STAKE ({tradeCurrency})
                </span>
                <div className="flex items-center justify-center space-x-0.5">
                  <span className="text-sm font-mono font-bold text-slate-400">
                    {tradeCurrency === 'USD' ? '$' : 'KSh'}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step={tradeCurrency === 'USD' ? '1' : '100'}
                    value={stakeValue || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setStakeValue(isNaN(val) ? 0 : val);
                    }}
                    onBlur={() => {
                      if (!stakeValue || stakeValue < 1) setStakeValue(tradeCurrency === 'USD' ? 1 : 100);
                    }}
                    className="w-24 sm:w-28 text-center text-xl sm:text-2xl font-mono font-black text-slate-100 bg-transparent focus:outline-none focus:bg-slate-900/50 rounded-lg py-0.5"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleStakeStep(1)}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-95 border border-slate-800 text-slate-200 hover:text-teal-300 flex items-center justify-center text-lg font-black transition cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Quick Stake Preset Buttons (6 Pills) */}
            <div className="grid grid-cols-6 gap-1">
              {quickPresets.map((preset) => {
                const isSelected = stakeValue === preset;
                return (
                  <button
                    key={`preset-${preset}`}
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setStakeValue(preset);
                    }}
                    className={`py-1 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    {tradeCurrency === 'USD' ? `$${preset}` : preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                );
              })}
            </div>

          </div>

          {/* 5. ADVANCED TRADE RISK PARAMETERS (3 Equal Editable Cards in 1 Row) */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            
            {/* Target Profit (Directly Editable) */}
            <div className="bg-[#070B16] border border-slate-850 hover:border-teal-500/40 p-1.5 sm:p-2 rounded-xl transition flex flex-col justify-between">
              <div className="flex items-center justify-center space-x-1 text-[9px] font-mono text-slate-400 uppercase font-bold mb-0.5">
                <span>🎯</span>
                <span>TARGET ($)</span>
              </div>
              <div className="flex items-center justify-center space-x-0.5 my-0.5">
                <span className="text-xs font-mono font-bold text-teal-400/80">$</span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={targetProfit || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTargetProfit(isNaN(val) ? 0 : val);
                  }}
                  onBlur={() => {
                    if (!targetProfit || targetProfit < 1) setTargetProfit(10);
                  }}
                  className="w-full text-center text-xs sm:text-sm font-mono font-bold text-teal-400 bg-slate-950/70 border border-slate-800 focus:border-teal-500 rounded py-0.5 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-center space-x-1 pt-0.5">
                <button 
                  type="button" 
                  onClick={() => { playSound('click'); setTargetProfit(Math.max(10, targetProfit - 25)); }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded text-[9px] font-mono"
                  title="Decrease Target Profit by $25"
                >
                  -25
                </button>
                <button 
                  type="button" 
                  onClick={() => { playSound('click'); setTargetProfit(targetProfit + 25); }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded text-[9px] font-mono"
                  title="Increase Target Profit by $25"
                >
                  +25
                </button>
              </div>
            </div>

            {/* Stop Loss (Directly Editable) */}
            <div className="bg-[#070B16] border border-slate-850 hover:border-rose-500/40 p-1.5 sm:p-2 rounded-xl transition flex flex-col justify-between">
              <div className="flex items-center justify-center space-x-1 text-[9px] font-mono text-slate-400 uppercase font-bold mb-0.5">
                <span>⚠️</span>
                <span>STOP LOSS ($)</span>
              </div>
              <div className="flex items-center justify-center space-x-0.5 my-0.5">
                <span className="text-xs font-mono font-bold text-rose-400/80">$</span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={stopLoss || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setStopLoss(isNaN(val) ? 0 : val);
                  }}
                  onBlur={() => {
                    if (!stopLoss || stopLoss < 1) setStopLoss(10);
                  }}
                  className="w-full text-center text-xs sm:text-sm font-mono font-bold text-rose-400 bg-slate-950/70 border border-slate-800 focus:border-rose-500 rounded py-0.5 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-center space-x-1 pt-0.5">
                <button 
                  type="button" 
                  onClick={() => { playSound('click'); setStopLoss(Math.max(10, stopLoss - 25)); }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded text-[9px] font-mono"
                  title="Decrease Stop Loss by $25"
                >
                  -25
                </button>
                <button 
                  type="button" 
                  onClick={() => { playSound('click'); setStopLoss(stopLoss + 25); }}
                  className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded text-[9px] font-mono"
                  title="Increase Stop Loss by $25"
                >
                  +25
                </button>
              </div>
            </div>

            {/* Multiplier / Duration (Interactive with Modal) */}
            <div 
              onClick={() => {
                playSound('click');
                setDurationModalOpen(true);
              }}
              className="bg-[#070B16] border border-slate-850 hover:border-cyan-500/50 p-1.5 sm:p-2 rounded-xl transition flex flex-col justify-between cursor-pointer group"
              title="Click to customize duration and multiplier"
            >
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase font-bold mb-0.5 px-0.5">
                <span className="flex items-center space-x-1">
                  <span>⚡</span>
                  <span>MULT / DUR</span>
                </span>
                <span className="text-[8px] text-cyan-400 underline font-semibold">EDIT</span>
              </div>
              <div className="my-0.5 py-0.5 bg-slate-950/70 border border-slate-800 rounded flex items-center justify-center group-hover:border-cyan-500/50 transition">
                <p className="text-xs sm:text-sm font-mono font-bold text-cyan-300">
                  x{multiplier} / {optionDuration}s
                </p>
              </div>
              <div className="flex items-center justify-center space-x-1 pt-0.5">
                <span className="text-[9px] font-mono text-slate-500 group-hover:text-cyan-300 transition">
                  Tap to edit
                </span>
              </div>
            </div>

          </div>

          {/* Conditional Target Digit Selector (for Over/Under and Matches/Differs) */}
          {(activeContractType === 'over_under' || activeContractType === 'matches_differ') && (
            <div className="bg-[#070B16] border border-slate-850 rounded-xl p-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1 px-1">
                <span>Select Target Digit:</span>
                <span className="font-bold text-teal-400">Selected: {predictionDigit}</span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <button
                    key={`targ-${d}`}
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setPredictionDigit(d);
                    }}
                    className={`py-1 rounded font-mono text-xs font-bold transition cursor-pointer ${
                      predictionDigit === d
                        ? 'bg-teal-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6. MAIN TRADE ACTIONS: DEDICATED AUTO BOT ENGINE VS MANUAL TRADING DESK */}
          {executionMode === 'auto' ? (
            /* AUTO TRADING ENGINE CONSOLE */
            <div className="bg-[#070B16] border border-slate-850 rounded-2xl p-3 space-y-2.5 shadow-xl">
              
              {/* Bot Status Header & Live Pulse */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="relative flex items-center justify-center">
                    {tradingBotActive ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                      </>
                    ) : (
                      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-600"></span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                        {tradingBotActive ? 'AI Bot Running' : botSessionStats.status === 'target_reached' ? 'Target Profit Reached' : botSessionStats.status === 'stop_loss_reached' ? 'Stop Loss Reached' : 'Bot Idle / Paused'}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {activeContractType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] font-sans text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                      {botSessionStats.lastAction}
                    </p>
                  </div>
                </div>

                {/* Reset Session Button */}
                <button
                  type="button"
                  onClick={handleResetBotSession}
                  title="Reset Bot Session Stats"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer flex items-center space-x-1 text-[10px] font-bold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>

              {/* TARGET PROFIT & STOP LOSS LIVE TRACKER */}
              <div className="grid grid-cols-2 gap-2">
                {/* Target Profit Card */}
                <div className="bg-slate-950/80 border border-teal-500/30 rounded-xl p-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 uppercase font-bold">Target Profit</span>
                    <span className="font-extrabold text-teal-400">${targetProfit}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs sm:text-sm font-mono font-black text-slate-100">
                      {botSessionStats.sessionProfit >= 0 ? `+$${botSessionStats.sessionProfit.toFixed(2)}` : `-$${Math.abs(botSessionStats.sessionProfit).toFixed(2)}`}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-teal-400">
                      {Math.min(100, Math.max(0, (botSessionStats.sessionProfit / targetProfit) * 100)).toFixed(0)}%
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, (botSessionStats.sessionProfit / targetProfit) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Stop Loss Card */}
                <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 uppercase font-bold">Stop Loss</span>
                    <span className="font-extrabold text-rose-400">-${stopLoss}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs sm:text-sm font-mono font-black text-slate-100">
                      {botSessionStats.sessionProfit < 0 ? `-$${Math.abs(botSessionStats.sessionProfit).toFixed(2)}` : '$0.00'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {Math.max(0, 100 - ((-Math.min(0, botSessionStats.sessionProfit) / stopLoss) * 100)).toFixed(0)}% Safe
                    </span>
                  </div>
                  {/* Risk Bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, (-Math.min(0, botSessionStats.sessionProfit) / stopLoss) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status Alert Banners */}
              {botSessionStats.status === 'target_reached' && (
                <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-xl p-2 flex items-center justify-between text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-bold font-sans">
                      Target Profit Reached (+${botSessionStats.sessionProfit.toFixed(2)})! Bot halted to secure profits.
                    </span>
                  </div>
                </div>
              )}

              {botSessionStats.status === 'stop_loss_reached' && (
                <div className="bg-rose-950/40 border border-rose-500/60 rounded-xl p-2 flex items-center justify-between text-rose-300">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="text-xs font-bold font-sans">
                      Stop Loss Limit Reached (-${Math.abs(botSessionStats.sessionProfit).toFixed(2)})! Bot halted to protect balance.
                    </span>
                  </div>
                </div>
              )}

              {/* ONE-CLICK INSTANT START / STOP CONTROL BUTTON */}
              {tradingBotActive ? (
                <button
                  type="button"
                  onClick={handleStopBot}
                  className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.99] text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-rose-600/30 transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 border border-rose-400/40"
                >
                  <div className="flex items-center space-x-2">
                    <Square className="w-4 h-4 fill-white text-white animate-pulse" />
                    <span>STOP AUTO BOT</span>
                  </div>
                  <span className="text-[10px] font-sans font-medium text-rose-100/90 lowercase">
                    tap anytime to halt automated trading immediately
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartBot}
                  className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-400 active:scale-[0.99] text-slate-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-teal-500/30 transition cursor-pointer flex flex-col items-center justify-center space-y-0.5 border border-teal-300/40"
                >
                  <div className="flex items-center space-x-2">
                    <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>{botSessionStats.status === 'target_reached' || botSessionStats.status === 'stop_loss_reached' ? 'RESTART AUTO BOT' : 'START AUTO BOT'}</span>
                  </div>
                  <span className="text-[10px] font-sans font-extrabold text-slate-950/80 lowercase">
                    runs automated trades • target: ${targetProfit} • sl: ${stopLoss}
                  </span>
                </button>
              )}

              {/* Bot Session Performance Metrics Grid */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-1.5 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Trades</span>
                  <span className="text-xs font-mono font-extrabold text-slate-200">{botSessionStats.tradesCount}</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-1.5 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">W / L</span>
                  <span className="text-xs font-mono font-extrabold text-slate-200">
                    <span className="text-teal-400">{botSessionStats.wins}</span>/<span className="text-rose-400">{botSessionStats.losses}</span>
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-1.5 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Win Rate</span>
                  <span className="text-xs font-mono font-extrabold text-teal-300">
                    {botSessionStats.tradesCount > 0 
                      ? `${((botSessionStats.wins / botSessionStats.tradesCount) * 100).toFixed(0)}%` 
                      : '0%'}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-1.5 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Next Trade</span>
                  <span className="text-xs font-mono font-extrabold text-cyan-300">
                    {tradingBotActive ? `${botSessionStats.countdown}s` : 'Paused'}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            /* MANUAL TRADING DESK (User Trades Manually) */
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              
              {/* Case A: Even / Odd Mode */}
              {activeContractType === 'even_odd' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTrade('even', 'buy')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 active:scale-[0.98] text-slate-950 transition cursor-pointer shadow-lg shadow-teal-500/20 flex flex-col items-center justify-center space-y-0.5 border border-teal-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Even</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-950/90">
                      {estimatedPayoutDisplay} Payout
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded-full text-slate-950">
                      +{(yieldRate * 100).toFixed(1)}% Return
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrade('odd', 'sell')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 active:scale-[0.98] text-slate-950 transition cursor-pointer shadow-lg shadow-cyan-500/20 flex flex-col items-center justify-center space-y-0.5 border border-cyan-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Odd</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-950/90">
                      {estimatedPayoutDisplay} Payout
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded-full text-slate-950">
                      +{(yieldRate * 100).toFixed(1)}% Return
                    </span>
                  </button>
                </>
              )}

              {/* Case B: Matches / Differs Mode */}
              {activeContractType === 'matches_differ' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTrade('matches', 'buy')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 active:scale-[0.98] text-white transition cursor-pointer shadow-lg shadow-purple-500/20 flex flex-col items-center justify-center space-y-0.5 border border-purple-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Matches {predictionDigit}</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-white/95">
                      {matchesPayoutDisplay} (9.5x)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-black/20 px-2 py-0.5 rounded-full text-purple-200">
                      +850% Jackpot
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrade('differs', 'sell')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 active:scale-[0.98] text-slate-950 transition cursor-pointer shadow-lg shadow-teal-500/20 flex flex-col items-center justify-center space-y-0.5 border border-teal-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Differs ≠ {predictionDigit}</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-950/90">
                      {estimatedPayoutDisplay} Payout
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded-full text-slate-950">
                      +{(yieldRate * 100).toFixed(1)}% Return
                    </span>
                  </button>
                </>
              )}

              {/* Case C: Over / Under Mode */}
              {activeContractType === 'over_under' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTrade('over', 'buy')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] text-slate-950 transition cursor-pointer shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center space-y-0.5 border border-emerald-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Over &gt; {predictionDigit}</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-950/90">
                      {estimatedPayoutDisplay} Payout
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded-full text-slate-950">
                      +{(yieldRate * 100).toFixed(1)}% Return
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrade('under', 'sell')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 active:scale-[0.98] text-slate-950 transition cursor-pointer shadow-lg shadow-cyan-500/20 flex flex-col items-center justify-center space-y-0.5 border border-cyan-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Under &lt; {predictionDigit}</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-950/90">
                      {estimatedPayoutDisplay} Payout
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded-full text-slate-950">
                      +{(yieldRate * 100).toFixed(1)}% Return
                    </span>
                  </button>
                </>
              )}

              {/* Case D: Rise / Fall Mode */}
              {activeContractType === 'rise_fall' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTrade('rise', 'buy')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] text-slate-950 transition cursor-pointer shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center space-y-0.5 border border-emerald-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Rise ▲</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-slate-950/90">
                      {estimatedPayoutDisplay} Payout
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded-full text-slate-950">
                      +{(yieldRate * 100).toFixed(1)}% Return
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTrade('fall', 'sell')}
                    className="p-3 sm:p-4 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 active:scale-[0.98] text-white transition cursor-pointer shadow-lg shadow-rose-500/20 flex flex-col items-center justify-center space-y-0.5 border border-rose-400/40"
                  >
                    <span className="text-base sm:text-lg font-black tracking-tight">Fall ▼</span>
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-white/95">
                      {estimatedPayoutDisplay} Payout
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-black/20 px-2 py-0.5 rounded-full text-rose-200">
                      +{(yieldRate * 100).toFixed(1)}% Return
                    </span>
                  </button>
                </>
              )}

            </div>
          )}

        </div>

      </div>

      {/* 7. FIXED MOBILE BOTTOM NAVIGATION (Live Chat, AI Scanner, Active Positions Sheet Trigger) */}
      <div className="lg:hidden w-full h-12 bg-[#090D1A] border-t border-slate-850 px-3 flex items-center justify-between z-40 flex-shrink-0 mt-1">
        
        {/* Live Chat Trigger */}
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setChatOpen(true);
          }}
          className="flex-1 flex flex-col items-center justify-center text-slate-400 hover:text-teal-300 py-1 transition cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-bold font-sans mt-0.5">Live Chat</span>
        </button>

        {/* Center Prominent Glowing AI Scanner Button */}
        <button
          type="button"
          onClick={() => {
            playSound('click');
            navigate('/scanner');
          }}
          className="flex flex-col items-center justify-center -mt-4 group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/30 group-active:scale-95 transition">
            <div className="w-full h-full bg-[#070B16] rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
          </div>
          <span className="text-[9px] font-black text-teal-300 uppercase tracking-wider mt-0.5">AI</span>
        </button>

        {/* Positions Drawer Trigger */}
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setPositionsSheetOpen(true);
          }}
          className="flex-1 flex flex-col items-center justify-center text-slate-400 hover:text-teal-300 py-1 transition cursor-pointer relative"
        >
          <div className="relative">
            <Clock className="w-4 h-4 text-teal-400" />
            {openPositions.length > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-teal-400 text-slate-950 font-mono font-black text-[8px] rounded-full">
                {openPositions.length}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold font-sans mt-0.5">Positions</span>
        </button>

      </div>

      {/* ASSET SELECTOR MODAL */}
      {assetSearchOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]" 
            onClick={() => setAssetSearchOpen(false)} 
          />
          <div className="fixed inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-16 sm:top-20 w-full sm:w-[480px] bg-[#090D1A] border border-slate-800 rounded-3xl p-4 shadow-2xl z-[210] max-h-[80vh] flex flex-col animate-fade-in">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-teal-400" />
                <span className="font-bold text-slate-100 text-sm">Select Instrument</span>
              </div>
              <button 
                onClick={() => setAssetSearchOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-3">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search index, currency, crypto..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                autoFocus
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex space-x-1 pb-2 overflow-x-auto scrollbar-none text-[10px] font-mono">
              {[
                { id: 'all', label: 'All' },
                { id: 'vol_index', label: 'Synthetics' },
                { id: 'crypto', label: 'Crypto' },
                { id: 'forex', label: 'Forex' },
                { id: 'indices', label: 'Indices' },
                { id: 'commodities', label: 'Commodities' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
                    activeCategoryFilter === cat.id
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Assets List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin max-h-[340px]">
              {filteredMarkets.map((market) => {
                const isSelected = market.symbol === selectedSymbol;
                const isPos = market.change24h >= 0;
                return (
                  <div
                    key={market.symbol}
                    onClick={() => {
                      playSound('click');
                      setSelectedSymbol(market.symbol);
                      setAssetSearchOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/50 text-slate-100'
                        : 'bg-slate-950/60 border-slate-900 hover:bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-slate-100">{market.name}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-850 text-slate-400">
                          {market.category}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">{market.symbol}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-xs text-slate-100">
                        ${market.price.toFixed(market.category === 'forex' ? 4 : 2)}
                      </p>
                      <p className={`font-mono text-[10px] font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? '+' : ''}{market.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </>
      )}

      {/* MOBILE POSITIONS & AUDIT BOTTOM SHEET */}
      {positionsSheetOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]" 
            onClick={() => setPositionsSheetOpen(false)} 
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-[#090D1A] border-t border-slate-800 rounded-t-3xl p-4 shadow-2xl z-[210] flex flex-col animate-slide-up">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-teal-400" />
                <span className="font-bold text-slate-100 text-sm">Trading History & Live Contracts</span>
              </div>
              <button 
                onClick={() => setPositionsSheetOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Tabs */}
            <div className="flex space-x-2 my-3">
              <button
                onClick={() => setCenterTab('active')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  centerTab === 'active' 
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                Active ({openPositions.length})
              </button>
              <button
                onClick={() => setCenterTab('history')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  centerTab === 'history' 
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                Closed ({closedTrades.length})
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh] scrollbar-thin">
              {centerTab === 'active' && (
                openPositions.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8 font-mono">No active running contracts.</p>
                ) : (
                  openPositions.map(pos => (
                    <div key={pos.id} className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center text-xs font-mono">
                      <div>
                        <p className="font-bold text-slate-100">{pos.symbol}</p>
                        <p className="text-[10px] text-teal-400 uppercase font-bold">{pos.prediction || pos.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-200">${pos.quantity}</p>
                        <button 
                          onClick={() => closePositionEarly(pos.id)}
                          className="mt-1 px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] hover:bg-rose-500/30"
                        >
                          Early Settle
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}

              {centerTab === 'history' && (
                closedTrades.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8 font-mono">No settled trades in session history.</p>
                ) : (
                  closedTrades.slice(0, 15).map(trade => {
                    const isWin = trade.pnl > 0;
                    return (
                      <div key={trade.id} className="p-3 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center text-xs font-mono">
                        <div>
                          <p className="font-bold text-slate-100">{trade.symbol}</p>
                          <p className="text-[10px] text-slate-400">{new Date(trade.createdAt || Date.now()).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
                          </p>
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded ${isWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {isWin ? 'WON' : 'LOST'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>

          </div>
        </>
      )}

      {/* DURATION & MULTIPLIER CONFIGURATION MODAL */}
      {durationModalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]" 
            onClick={() => setDurationModalOpen(false)} 
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-[#090D1A] border border-slate-800 rounded-3xl p-5 shadow-2xl z-[210] flex flex-col space-y-4 animate-scale-up">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-slate-100 text-sm">Contract Duration & Multiplier</span>
              </div>
              <button 
                onClick={() => setDurationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Duration Section */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex justify-between">
                <span>Duration (Ticks / Seconds)</span>
                <span className="text-cyan-400 font-bold">{optionDuration}s</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '1s (1T)', val: 1 },
                  { label: '2s', val: 2 },
                  { label: '5s', val: 5 },
                  { label: '10s', val: 10 },
                  { label: '15s', val: 15 },
                  { label: '30s', val: 30 },
                  { label: '45s', val: 45 },
                  { label: '60s', val: 60 },
                ].map(d => (
                  <button
                    key={`dur-${d.val}`}
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setOptionDuration(d.val);
                    }}
                    className={`py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer border ${
                      optionDuration === d.val
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[11px] font-mono text-slate-400">Custom (sec):</span>
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={optionDuration || ''}
                  onChange={(e) => setOptionDuration(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-1 text-xs font-mono font-bold text-cyan-300 focus:outline-none text-center"
                />
              </div>
            </div>

            {/* Multiplier Section */}
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex justify-between">
                <span>Multiplier Tier</span>
                <span className="text-teal-400 font-bold">x{multiplier}</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 5, 10].map(m => (
                  <button
                    key={`mult-${m}`}
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setMultiplier(m);
                    }}
                    className={`py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer border ${
                      multiplier === m
                        ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    x{m}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[11px] font-mono text-slate-400">Custom Mult:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={multiplier || ''}
                  onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-400 rounded-xl px-3 py-1 text-xs font-mono font-bold text-teal-300 focus:outline-none text-center"
                />
              </div>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={() => {
                playSound('click');
                setDurationModalOpen(false);
                addToast('Settings Saved', `Duration: ${optionDuration}s | Multiplier: x${multiplier}`, 'success');
              }}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              APPLY SETTINGS
            </button>

          </div>
        </>
      )}

    </div>
  );
};

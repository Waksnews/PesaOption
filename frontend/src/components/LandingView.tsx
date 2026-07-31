/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Shield, Zap, Globe, MessageSquare, BarChart2, 
  ArrowRight, Check, HelpCircle, Star, Sparkles, Mail, UserPlus, LogIn,
  Wallet, Cpu, Smartphone, RefreshCw, ChevronDown, Award, Clock, Activity,
  Lock, BookOpen, Facebook, Instagram, Linkedin, Twitter, Send, CheckCircle2,
  TrendingDown, Info, DollarSign
} from 'lucide-react';
import { useMarketStore } from '../stores/marketStore';
import { useApp } from '../context/AppContext';
import { TradingChart } from './TradingChart';

export const LandingView: React.FC<{ onEnterApp: (view: 'login' | 'register') => void }> = ({ onEnterApp }) => {
  const { user } = useApp();
  const { prices, selectedSymbol, setSelectedSymbol } = useMarketStore();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Live Trading Preview Simulator State
  const [simStake, setSimStake] = useState('100');
  const [simDuration, setSimDuration] = useState(10);
  const [simPrediction, setSimPrediction] = useState<number>(5);
  const [simActiveTrade, setSimActiveTrade] = useState<{
    type: 'CALL' | 'PUT';
    stake: number;
    barrier: number;
    timeLeft: number;
    symbol: string;
  } | null>(null);
  const [simTradeResult, setSimTradeResult] = useState<{
    won: boolean;
    profit: number;
    barrier: number;
    settlePrice: number;
  } | null>(null);

  // Hero Live Ticker Simulation
  const [heroMockProfit, setHeroMockProfit] = useState<string | null>(null);

  // Dynamic values for AI scanner
  const [aiConfidence, setAiConfidence] = useState(92);
  const [aiVolatility, setAiVolatility] = useState('Medium');
  const [aiMomentum, setAiMomentum] = useState('Strong');

  const currentMarket = prices.find(p => p.symbol === selectedSymbol) || prices[0] || {
    symbol: 'VOL_100',
    name: 'Volatility Index 100',
    price: 12450.25,
    change24h: 1.45,
    category: 'vol_index'
  };

  // SEO & Head tag injections
  useEffect(() => {
    document.title = "PesaOption | Smart Trading Simulation Platform";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "PesaOption is a modern trading simulation platform where users practice market prediction using realistic price movements, AI-powered insights, and interactive charts.");
    }
  }, []);

  // AI Scanner oscillation simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setAiConfidence(prev => {
        const diff = Math.floor(Math.random() * 5) - 2;
        return Math.min(Math.max(prev + diff, 85), 98);
      });
      const vols = ['Low', 'Medium', 'High', 'Extreme'];
      const moms = ['Strong', 'Moderate', 'Surging', 'Stabilizing'];
      if (Math.random() > 0.7) setAiVolatility(vols[Math.floor(Math.random() * vols.length)]);
      if (Math.random() > 0.7) setAiMomentum(moms[Math.floor(Math.random() * moms.length)]);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Testimonial auto-slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Hero section floating profit alert simulator
  useEffect(() => {
    const alerts = [
      "User @kamau_j settled +$196.00 profit on BTC/USD Option",
      "User @sarah_m settled +$95.00 profit on Vol Index 100",
      "User @omondi_o settled +$240.00 profit on EUR/USD contract",
      "User @alice_w settled +$185.00 profit on Crude Oil contract"
    ];
    const triggerAlert = () => {
      setHeroMockProfit(alerts[Math.floor(Math.random() * alerts.length)]);
      setTimeout(() => setHeroMockProfit(null), 3000);
    };
    const timer = setInterval(triggerAlert, 7000);
    return () => clearInterval(timer);
  }, []);

  // Live Trading simulator countdown
  useEffect(() => {
    if (!simActiveTrade) return;
    if (simActiveTrade.timeLeft <= 0) {
      // Settle the trade
      const settlePrice = currentMarket.price;
      const barrier = simActiveTrade.barrier;
      const isCall = simActiveTrade.type === 'CALL';
      const won = isCall ? settlePrice > barrier : settlePrice < barrier;
      const payoutRate = 0.95; 
      const profit = won ? simActiveTrade.stake * payoutRate : -simActiveTrade.stake;

      setSimTradeResult({
        won,
        profit,
        barrier,
        settlePrice
      });
      setSimActiveTrade(null);
    } else {
      const timer = setTimeout(() => {
        setSimActiveTrade(prev => prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simActiveTrade, currentMarket.price]);

  const handlePlaceSimTrade = (type: 'CALL' | 'PUT') => {
    if (simActiveTrade) return;
    setSimTradeResult(null);
    setSimActiveTrade({
      type,
      stake: parseFloat(simStake) || 100,
      barrier: currentMarket.price,
      timeLeft: simDuration,
      symbol: currentMarket.symbol
    });
  };

  const stats = [
    { value: '250,000+', label: 'Registered Users', icon: <Globe className="w-5 h-5 text-blue-500" /> },
    { value: '15M+', label: 'Simulated Trades', icon: <TrendingUp className="w-5 h-5 text-emerald-500" /> },
    { value: '120+', label: 'Available Markets', icon: <Activity className="w-5 h-5 text-amber-500" /> },
    { value: '99.9%', label: 'Platform Uptime', icon: <Shield className="w-5 h-5 text-blue-500" /> }
  ];

  const marketCategories = [
    { name: 'Cryptocurrency', desc: 'Trade major coin pairs with premium real-time pricing.', key: 'crypto', icon: '₿' },
    { name: 'Foreign Exchange', desc: 'Predict major and minor currency currency pairs.', key: 'forex', icon: '¥' },
    { name: 'Synthetic Indices', desc: 'Constant volatility indexes simulated with high-speed ticks.', key: 'vol_index', icon: '⚡' },
    { name: 'Commodities', desc: 'Crude Oil, Gold, Silver, and metal spot indicators.', key: 'commodities', icon: '⚱' },
    { name: 'Stock Indices', desc: 'US Wall Street 30, NASDAQ, and world indices.', key: 'indices', icon: '📈' }
  ];

  const featuresList = [
    { title: 'Real-Time Charts', desc: 'Lightweight professional candlestick charting engine.', icon: <BarChart2 className="w-5 h-5 text-blue-400" /> },
    { title: 'Instant Execution', desc: 'Latency-free paper option orders settled in seconds.', icon: <Zap className="w-5 h-5 text-emerald-400" /> },
    { title: '95% Simulated Payout', desc: 'High yielding simulated returns across various asset indices.', icon: <Award className="w-5 h-5 text-amber-400" /> },
    { title: 'AI Market Scanner', desc: 'Deep artificial intelligence trend detection on live asset symbols.', icon: <Cpu className="w-5 h-5 text-blue-400" /> },
    { title: 'Trading Statistics', desc: 'Historical analytics panel to visualize streaks and win rates.', icon: <Activity className="w-5 h-5 text-emerald-400" /> },
    { title: 'Secure Wallet', desc: 'Store multiple balances, track transaction history securely.', icon: <Wallet className="w-5 h-5 text-amber-400" /> },
    { title: 'M-PESA Integration', desc: 'Simulated instant STK push payments directly via Safaricom.', icon: <Smartphone className="w-5 h-5 text-emerald-400" /> },
    { title: 'Fast Withdrawals', desc: 'Mock payment gateway supporting rapid payouts to M-PESA & cards.', icon: <RefreshCw className="w-5 h-5 text-blue-400" /> },
    { title: 'Referral Rewards', desc: 'Affiliate system to earn customized paper trading bonuses.', icon: <Globe className="w-5 h-5 text-amber-400" /> },
    { title: 'Premium Dark Mode', desc: 'Elegant custom dark environment to safeguard your eyes during hours.', icon: <Clock className="w-5 h-5 text-purple-400" /> }
  ];

  const steps = [
    { step: '01', title: 'Create Account', desc: 'Register in seconds using email and standard security parameters.' },
    { step: '02', title: 'Fund Demo Wallet', desc: 'Unlock a starting balance of $5,000 Demo USD instantly.' },
    { step: '03', title: 'Choose Market', desc: 'Select from 120+ indicators across crypto, forex, synthetics, and commodities.' },
    { step: '04', title: 'Predict Direction', desc: 'Analyse charts and place higher (Call) or lower (Put) contract options.' },
    { step: '05', title: 'Earn Simulated Profit', desc: 'Settle option trades in as fast as 10s and compound virtual returns.' }
  ];

  const testimonials = [
    {
      quote: "The interface is outstanding. I use PesaOption to practice trading commodities during live hours. The lightweight charts load instantly and the M-PESA simulation is perfectly styled.",
      author: "Douglas Kiprop",
      country: "Nairobi, Kenya",
      role: "Commodities Educator",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
    },
    {
      quote: "PesaOption is hands-down the cleanest binary option sandbox. I teach custom derivative hedging structures using their demo currency wallets. High precision and extremely fast execution.",
      author: "Marcus Thorne",
      country: "London, UK",
      role: "Quantitative Analyst",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120"
    },
    {
      quote: "The live SSE price feed is a game-changer. Testing prediction strategies without putting actual capital at risk builds amazing market intuition.",
      author: "Sarah Jenkins",
      country: "Cape Town, SA",
      role: "Retail Investor",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120"
    }
  ];

  const faqs = [
    {
      q: "How does PesaOption work?",
      a: "PesaOption is a premier binary option simulator. Users predict whether an asset's price will rise (Call) or fall (Put) over a specific time horizon (ranging from 10 seconds to several minutes). If the prediction is accurate, they secure a simulated payout rate of up to 98% of their stake."
    },
    {
      q: "How do I deposit?",
      a: "Since this is a simulated paper-trading platform, deposits do not involve real financial capital. You can simulate instant deposits using M-PESA STK Push, PayPal Sandboxes, or bank transfers. Your demo wallet is instantly credited with simulated USD or KES equivalent."
    },
    {
      q: "Can I withdraw via M-PESA?",
      a: "PesaOption features a highly realistic mockup of mobile financial systems. You can submit simulated withdrawals to your registered Safaricom mobile numbers. The system instantly processes and approves the payout, updating your demo wallets and creating simulated transaction records."
    },
    {
      q: "Is this a real trading platform?",
      a: "No. PesaOption is a 100% simulated, risk-free educational environment. All balances, profits, bonuses, and withdrawals are completely virtual. This platform is constructed solely for educational and market strategy backtesting purposes."
    },
    {
      q: "What assets can I trade?",
      a: "We support real-time price feeds for a broad selection of assets including Cryptocurrencies (BTC, ETH), Forex Majors (EUR/USD, GBP/USD), Stock Indices (NASDAQ, Dow Jones), Commodities (Gold, WTI Crude Oil), and continuously simulated Synthetic Volatility Indices."
    }
  ];

  return (
    <div className="bg-[#020617] text-[#F1F5F9] min-h-screen relative font-sans">
      {/* Background radial glow */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-900/10 via-transparent to-transparent pointer-events-none z-0" />

      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-[#020617]/85 backdrop-blur-md border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-[#2563EB] to-[#10B981] rounded-xl flex items-center justify-center shadow-lg shadow-[#2563EB]/25">
              <TrendingUp className="w-5.5 h-5.5 text-slate-950 font-black" />
            </div>
            <span className="font-display font-black text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-[#cbd5e1] to-[#2563EB]">
              PesaOption
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex space-x-8 text-sm font-medium text-slate-400">
            <a href="#home" className="hover:text-[#2563EB] transition duration-200">Home</a>
            <a href="#markets" className="hover:text-[#2563EB] transition duration-200">Markets</a>
            <a href="#how-it-works" className="hover:text-[#2563EB] transition duration-200">How It Works</a>
            <a href="#features" className="hover:text-[#2563EB] transition duration-200">Features</a>
            <a href="#testimonials" className="hover:text-[#2563EB] transition duration-200">About</a>
            <a href="#faq" className="hover:text-[#2563EB] transition duration-200">FAQ</a>
            <a href="#contact" className="hover:text-[#2563EB] transition duration-200">Contact</a>
          </nav>

          {/* Nav Buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            {user ? (
              <button 
                onClick={() => onEnterApp('login')}
                className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold text-slate-950 bg-gradient-to-r from-[#2563EB] to-[#10B981] rounded-xl shadow-lg shadow-[#2563EB]/20 hover:scale-[1.03] active:scale-[0.97] transition duration-300 flex items-center space-x-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => onEnterApp('login')}
                  className="flex items-center space-x-1 px-4 py-2.5 text-xs uppercase tracking-wider font-bold text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
                <button 
                  onClick={() => onEnterApp('register')}
                  className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold text-slate-950 bg-gradient-to-r from-[#2563EB] to-[#10B981] rounded-xl shadow-lg shadow-[#2563EB]/20 hover:scale-[1.03] active:scale-[0.97] transition duration-300 flex items-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Icon */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2 text-slate-300 hover:text-white"
          >
            <div className="space-y-1.5 w-6">
              <span className={`block h-0.5 w-full bg-current transform transition duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-full bg-current transition duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-full bg-current transform transition duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden mt-4 py-4 border-t border-slate-800/80 flex flex-col space-y-4"
            >
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#2563EB] py-1 text-sm">Home</a>
              <a href="#markets" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#2563EB] py-1 text-sm">Markets</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#2563EB] py-1 text-sm">How It Works</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#2563EB] py-1 text-sm">Features</a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#2563EB] py-1 text-sm">About</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#2563EB] py-1 text-sm">FAQ</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#2563EB] py-1 text-sm">Contact</a>
              
              <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/60">
                {user ? (
                  <button 
                    onClick={() => { onEnterApp('login'); setMobileMenuOpen(false); }}
                    className="w-full py-3 bg-[#2563EB] text-white font-bold rounded-xl text-center text-sm"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { onEnterApp('login'); setMobileMenuOpen(false); }}
                      className="w-full py-3 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-center text-sm"
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => { onEnterApp('register'); setMobileMenuOpen(false); }}
                      className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl text-center text-sm shadow-lg shadow-blue-600/20"
                    >
                      Create Free Account
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative pt-16 pb-28 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2563EB]/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-[#10B981]/5 rounded-full blur-[110px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Text content */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-[#0F172A] border border-slate-800 rounded-full text-xs font-medium text-[#10B981] shadow-inner">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#F59E0B]" />
              <span className="font-mono uppercase tracking-wider text-[10px]">Real-Time Market Simulator Active</span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-6xl text-white tracking-tight leading-[1.08]">
              Trade Smarter.<br />
              Learn Faster.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#38bdf8] to-[#10B981]">
                Grow with Confidence.
              </span>
            </h1>

            <p className="text-slate-400 text-lg sm:text-xl max-w-2xl leading-relaxed">
              Practice market prediction using realistic trading simulations for crypto, forex, synthetic indices and commodities. Backtest options instantly with zero financial risk.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button 
                onClick={() => onEnterApp('register')}
                className="px-8 py-4 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2.5 shadow-xl shadow-[#2563EB]/20 hover:scale-[1.02] active:scale-[0.98] transition duration-300 cursor-pointer text-sm"
              >
                <span>Start Trading</span>
                <ArrowRight className="w-5 h-5 text-[#10B981]" />
              </button>
              <button 
                onClick={() => onEnterApp('register')}
                className="px-8 py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white rounded-xl font-bold transition text-sm cursor-pointer"
              >
                Create Account
              </button>
              <a 
                href="#demo-preview"
                className="px-8 py-4 bg-slate-950 hover:bg-slate-900 border border-slate-850/80 text-slate-350 hover:text-white rounded-xl font-semibold transition text-sm flex items-center justify-center space-x-2"
              >
                <span>Watch Demo</span>
              </a>
            </div>
          </div>

          {/* Right Live Preview Cards (Not Static) */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0 flex justify-center">
            
            {/* Live Profit Banner Simulator Popup */}
            <AnimatePresence>
              {heroMockProfit && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  className="absolute -top-6 z-20 px-4 py-2.5 bg-slate-950 border border-[#10B981]/50 rounded-2xl flex items-center space-x-2.5 shadow-2xl shadow-[#10B981]/10 text-xs font-mono"
                >
                  <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                  <span className="text-[#10B981] font-bold">🎉 {heroMockProfit}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Glowing background circles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Simulated Desktop Preview Wrapper */}
            <div className="w-full max-w-sm bg-[#0F172A] border border-slate-800/80 rounded-3xl p-6 shadow-2xl shadow-[#2563EB]/5 space-y-5 relative">
              
              {/* Header inside mockup */}
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                </div>
                <div className="px-2 py-0.5 bg-slate-950 rounded text-[9px] font-mono text-slate-500">
                  PESAOPTION WORKSPACE
                </div>
              </div>

              {/* Balance widget inside mockup */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#2563EB]/10 to-transparent rounded-full blur-xl pointer-events-none" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Demo Balance</span>
                  <div className="text-xl font-bold text-white mt-1 font-mono">$5,000.00 <span className="text-[#10B981] text-xs">USD</span></div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#2563EB]/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#2563EB]" />
                </div>
              </div>

              {/* Tickers row mockup */}
              <div className="space-y-2.5">
                <span className="text-[9px] text-slate-500 font-mono uppercase block tracking-wider">Simulated Tickers</span>
                
                {/* Active index */}
                <div className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-850 rounded-xl hover:border-blue-500/20 transition">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-sm">⚡</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 font-mono">VOL_100</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Synthetic Vol Index</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#10B981] font-mono">12,450.25</span>
                    <span className="text-[9px] text-[#10B981] font-mono block">+2.45%</span>
                  </div>
                </div>

                {/* Crypto mock */}
                <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-sm">₿</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 font-mono">BTCUSD</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Bitcoin Spot</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#ef4444] font-mono">64,210.50</span>
                    <span className="text-[9px] text-[#ef4444] font-mono block">-0.85%</span>
                  </div>
                </div>
              </div>

              {/* Quick static preview graph line */}
              <div className="h-16 flex items-end justify-between px-1 border-t border-slate-800/30 pt-4 font-mono">
                <span className="text-[8px] text-slate-600">Dynamic Ticks:</span>
                <div className="flex items-end space-x-1 h-full">
                  <div className="w-1.5 bg-blue-500/10 h-1/4 rounded-t" />
                  <div className="w-1.5 bg-[#10B981] h-2/5 rounded-t animate-pulse" />
                  <div className="w-1.5 bg-blue-500/20 h-1/2 rounded-t" />
                  <div className="w-1.5 bg-[#10B981] h-3/5 rounded-t" />
                  <div className="w-1.5 bg-blue-500/30 h-2/3 rounded-t" />
                  <div className="w-1.5 bg-blue-500/40 h-4/5 rounded-t" />
                  <div className="w-1.5 bg-[#10B981] h-full rounded-t animate-bounce" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Statistics Section with Smooth Count Indicators */}
      <section className="py-14 px-6 border-t border-slate-800/50 bg-[#0F172A]/40">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center text-center p-6 bg-slate-950/20 rounded-2xl border border-slate-900/50 hover:border-[#2563EB]/10 transition">
              <div className="w-10 h-10 rounded-xl bg-[#020617] border border-slate-850 flex items-center justify-center mb-3">
                {stat.icon}
              </div>
              <span className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
                {stat.value}
              </span>
              <span className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Markets Section with LIVE Prices from Market Store */}
      <section id="markets" className="py-24 px-6 border-t border-slate-800/40 relative">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-[#10B981]/3 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
              Explore Dynamic Simulator Markets
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              We sync and simulate premium asset categories with high tick accuracy. Predict swings on your favorite index pairs risk-free.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {marketCategories.map((cat, idx) => {
              // Find first asset matching category
              const matchedAsset = prices.find(p => p.category === cat.key) || {
                price: 125.40,
                change24h: 1.25,
                symbol: cat.key.toUpperCase()
              };

              const priceFormatted = matchedAsset.price.toLocaleString(undefined, {
                minimumFractionDigits: cat.key === 'forex' ? 4 : 2,
                maximumFractionDigits: cat.key === 'forex' ? 4 : 2
              });

              return (
                <div 
                  key={idx}
                  onClick={() => {
                    if (matchedAsset) {
                      setSelectedSymbol(matchedAsset.symbol);
                      document.getElementById('demo-preview')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="bg-[#0F172A]/70 border border-slate-800 hover:border-[#2563EB]/40 p-6 rounded-2xl transition duration-300 hover:-translate-y-1 flex flex-col justify-between group cursor-pointer shadow-lg shadow-black/20"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center text-xl font-bold font-mono text-[#2563EB] group-hover:bg-[#2563EB]/10 group-hover:text-white transition duration-300">
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-100">{cat.name}</h3>
                      <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{cat.desc}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/60 pt-4 mt-6">
                    <span className="text-[10px] text-slate-500 block font-mono">Live Price Index ({matchedAsset.symbol})</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-sm font-bold font-mono text-white">${priceFormatted}</span>
                      <span className={`text-[10px] font-mono font-bold ${matchedAsset.change24h >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                        {matchedAsset.change24h >= 0 ? '+' : ''}{matchedAsset.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Embedded Live Dashboard Preview Section (Not static, actual charts, placing mock trades!) */}
      <section id="demo-preview" className="py-24 px-6 border-t border-slate-800/40 bg-gradient-to-b from-slate-950 to-[#020617]">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-[#2563EB] rounded-full text-xs font-mono font-semibold uppercase">
              Interactive Trading Sandbox
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
              Try It Out Right Now
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Place a simulated 10-second contract trade directly on this marketing page. This is a live chart syncing live volatility ticks.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Real Chart Container */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 shadow-xl relative">
                
                {/* Active asset details top bar */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-800/50 mb-4 font-mono">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold text-white uppercase tracking-wider">
                      {currentMarket.symbol}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{currentMarket.name}</h4>
                      <p className="text-[10px] text-slate-550 uppercase">Category: {currentMarket.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white">${currentMarket.price.toLocaleString(undefined, {
                      minimumFractionDigits: currentMarket.category === 'forex' ? 4 : 2,
                      maximumFractionDigits: currentMarket.category === 'forex' ? 4 : 2
                    })}</span>
                    <span className={`text-[10px] block font-bold ${currentMarket.change24h >= 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                      {currentMarket.change24h >= 0 ? '+' : ''}{currentMarket.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Lightweight Area Chart rendering actual prices */}
                <TradingChart symbol={selectedSymbol} currentPrice={currentMarket.price} />
              </div>
            </div>

            {/* Quick Interactive Trade Placement Panel */}
            <div className="lg:col-span-4 bg-[#0F172A] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
                <span className="text-xs font-bold font-mono text-white uppercase tracking-wider">Place Test Option</span>
                <span className="px-2.5 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                  95% Yield
                </span>
              </div>

              {/* Stake input */}
              <div className="space-y-1.5 font-mono">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Mock Stake Amount (USD)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={simStake}
                    onChange={(e) => setSimStake(e.target.value)}
                    disabled={!!simActiveTrade}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-xs text-white font-bold"
                  />
                  <span className="absolute right-4 top-3 text-[10px] text-slate-600 font-bold">USD</span>
                </div>
              </div>

              {/* Option Duration setting */}
              <div className="space-y-1.5 font-mono">
                <label className="text-[10px] uppercase font-bold text-slate-500 block">Contract Horizon</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setSimDuration(10)}
                    disabled={!!simActiveTrade}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      simDuration === 10 ? 'bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB]' : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    10 Seconds
                  </button>
                  <button 
                    onClick={() => setSimDuration(30)}
                    disabled={!!simActiveTrade}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      simDuration === 30 ? 'bg-[#2563EB]/10 border-[#2563EB] text-[#2563EB]' : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    30 Seconds
                  </button>
                </div>
              </div>

              {/* Prediction triggers */}
              {!simActiveTrade ? (
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handlePlaceSimTrade('CALL')}
                    className="py-3.5 bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer select-none active:scale-95 flex flex-col items-center justify-center space-y-1"
                  >
                    <TrendingUp className="w-4.5 h-4.5" />
                    <span>Call (Higher)</span>
                  </button>
                  <button
                    onClick={() => handlePlaceSimTrade('PUT')}
                    className="py-3.5 bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer select-none active:scale-95 flex flex-col items-center justify-center space-y-1"
                  >
                    <TrendingDown className="w-4.5 h-4.5" />
                    <span>Put (Lower)</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-center font-mono space-y-3">
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Option Active - Settling Live</span>
                  <div className="text-xl font-bold text-[#2563EB] tracking-widest animate-pulse">
                    00:{simActiveTrade.timeLeft < 10 ? '0' : ''}{simActiveTrade.timeLeft}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Barrier price set at: <strong className="text-white">${simActiveTrade.barrier.toFixed(2)}</strong>
                  </div>
                  <div className="text-[10px] px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md inline-block">
                    Direction: {simActiveTrade.type}
                  </div>
                </div>
              )}

              {/* Settle results */}
              {simTradeResult && (
                <div className={`p-4 rounded-xl border text-center font-mono space-y-2 animate-fade-in ${
                  simTradeResult.won ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]' : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  <h4 className="text-sm font-bold flex items-center justify-center space-x-1">
                    <span>{simTradeResult.won ? '✅ Settle WON!' : '❌ Settle LOST'}</span>
                  </h4>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Barrier: ${simTradeResult.barrier.toFixed(2)} | Settle: ${simTradeResult.settlePrice.toFixed(2)}
                  </p>
                  <div className="text-base font-black pt-1">
                    {simTradeResult.won ? `+$${simTradeResult.profit.toFixed(2)} Simulated Profit` : `-$${Math.abs(simTradeResult.profit).toFixed(2)} Simulated Loss`}
                  </div>
                  <span className="text-[9px] block text-slate-500">Sign up now to lock in these features with full state storage.</span>
                </div>
              )}

              {/* Simple Digit Distribution Widget (Recent 10 Digit occurrences) */}
              <div className="border-t border-slate-800/60 pt-4 font-mono">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-wider">
                  <span>Digit Distribution</span>
                  <span className="text-slate-600">Last 100 ticks</span>
                </div>
                <div className="grid grid-cols-10 gap-1 text-[10px] text-center">
                  {[12, 10, 8, 14, 9, 11, 13, 7, 10, 6].map((freq, digit) => (
                    <div key={digit} className="space-y-1">
                      <div className="bg-slate-950 h-10 w-full rounded flex items-end justify-center relative overflow-hidden">
                        <div 
                          className="bg-[#2563EB]/40 w-full transition-all duration-500 rounded-t"
                          style={{ height: `${freq * 7}%` }}
                        />
                      </div>
                      <span className="text-[8px] text-slate-500 block">{digit}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* AI Scanner Section */}
      <section className="py-24 px-6 border-t border-slate-800/40 bg-[#0F172A]/20 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#2563EB]/3 rounded-full blur-[130px] pointer-events-none" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-full text-xs font-semibold text-[#2563EB] uppercase tracking-wider font-mono">
              <Cpu className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
              <span>AI Market Analytics</span>
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
              Smarter Signals via Live Machine Scans
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Unlock our integrated Machine Learning scanner that constantly tracks asset trends, momentum vectors, and volatility. Get updated confidence ratios dynamically.
            </p>
            <div className="space-y-3.5">
              <div className="flex items-center space-x-3 text-slate-300 text-xs sm:text-sm font-medium">
                <Check className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                <span>Brownian random walk noise filtration patterns</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300 text-xs sm:text-sm font-medium">
                <Check className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                <span>Saves hours of charting using automatic support & resistance detection</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300 text-xs sm:text-sm font-medium">
                <Check className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                <span>Provides clear signals (BUY / SELL) to guide your simulator executions</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            
            {/* Dynamic AI Card */}
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden font-mono text-xs text-slate-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#10B981]/10 to-transparent rounded-full blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Dynamic AI Analysis</span>
                <span className="px-2.5 py-0.5 bg-[#10B981]/15 text-[#10B981] rounded-full text-[9px] font-bold animate-pulse">
                  SYSTEM READY
                </span>
              </div>

              <div className="space-y-4">
                {/* Symbol Analyzed */}
                <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                  <span className="text-slate-500 text-[10px] uppercase">Symbol</span>
                  <span className="font-bold text-white text-sm">{currentMarket.symbol}</span>
                </div>

                {/* Trend Recommendation */}
                <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                  <span className="text-slate-500 text-[10px] uppercase">Scanner Signal</span>
                  <span className="px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] font-bold text-xs uppercase rounded-lg">
                    BUY RECOMMENDATION
                  </span>
                </div>

                {/* Confidence */}
                <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                  <span className="text-slate-500 text-[10px] uppercase">Confidence</span>
                  <span className="font-black text-white text-base">{aiConfidence}%</span>
                </div>

                {/* Volatility */}
                <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                  <span className="text-slate-500 text-[10px] uppercase">Volatility Score</span>
                  <span className="font-bold text-amber-400">{aiVolatility}</span>
                </div>

                {/* Momentum */}
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-slate-500 text-[10px] uppercase">Momentum Vector</span>
                  <span className="font-bold text-[#2563EB]">{aiMomentum}</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 text-[10px] text-slate-500 mt-4 leading-relaxed">
                ℹ️ Scanned tick speeds. Recommendations update dynamically based on live pricing trends on the trading console.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Features Grid Section (10 cards) */}
      <section id="features" className="py-24 px-6 border-t border-slate-800/40 bg-[#020617] relative">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
              Features Packed with High Fidelity
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              PesaOption mimics premium trading networks, delivering features crafted with precision, and absolutely zero live risks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {featuresList.map((feat, idx) => (
              <div 
                key={idx}
                className="bg-[#0F172A]/40 border border-slate-850 hover:border-[#2563EB]/30 p-6 rounded-2xl transition duration-300 hover:-translate-y-1 group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#2563EB] to-[#10B981] opacity-0 group-hover:opacity-100 transition duration-300" />
                <div className="w-10 h-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300">
                  {feat.icon}
                </div>
                <h3 className="font-display font-semibold text-sm text-white mb-2">{feat.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* How It Works Timeline */}
      <section id="how-it-works" className="py-24 px-6 border-t border-slate-800/40 bg-gradient-to-b from-[#020617] to-[#0F172A]/20">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
              How It Works
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Initiate your derivative learning journey in five simple, structured steps.
            </p>
          </div>

          {/* Timeline Node Chain */}
          <div className="grid md:grid-cols-5 gap-8 relative">
            
            {/* Horizontal line connector */}
            <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-[#2563EB] via-[#10B981] to-[#2563EB] z-0 opacity-20" />

            {steps.map((st, idx) => (
              <div key={idx} className="flex flex-col items-center text-center space-y-4 relative z-10 group">
                {/* Node bubble */}
                <div className="w-14 h-14 bg-slate-950 border-2 border-slate-800 group-hover:border-[#2563EB] rounded-full flex items-center justify-center font-mono font-bold text-sm text-[#2563EB] group-hover:text-white transition duration-300 shadow-xl group-hover:shadow-[#2563EB]/10">
                  {st.step}
                </div>
                
                <div className="space-y-1 px-4">
                  <h4 className="font-display font-bold text-sm text-slate-100 group-hover:text-[#2563EB] transition duration-200">{st.title}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Secure Payment Gateway Mock Section */}
      <section className="py-20 px-6 border-t border-slate-800/40 bg-[#0F172A]/40">
        <div className="max-w-4xl mx-auto grid md:grid-cols-12 gap-8 items-center text-left">
          
          <div className="md:col-span-5 space-y-3">
            <h3 className="font-display font-bold text-2xl text-white">Supported Gateways</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Practice simulation funding. We support mocked integrations with popular local and international gateways.
            </p>
            <div className="space-y-1.5 pt-2 text-[11px] font-mono text-slate-500">
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Secure SSL Mock Billings</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Instant Wallet Credit sync</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
                <span>No actual liabilities</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* M-PESA card */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-lg">🟢</span>
              <h4 className="text-xs font-bold text-white font-mono">Safaricom M-PESA</h4>
              <p className="text-[9px] text-slate-500 uppercase font-mono">Instant STK Push</p>
            </div>

            {/* PayPal */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-lg">🔵</span>
              <h4 className="text-xs font-bold text-white font-mono">PayPal</h4>
              <p className="text-[9px] text-slate-500 uppercase font-mono">International</p>
            </div>

            {/* Visa / Master */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-lg">💳</span>
              <h4 className="text-xs font-bold text-white font-mono">Visa / Mastercard</h4>
              <p className="text-[9px] text-slate-500 uppercase font-mono">Credit & Debit</p>
            </div>

            {/* Bank Transfer */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 sm:col-span-3">
              <span className="text-lg">🏛️</span>
              <h4 className="text-xs font-bold text-white font-mono">Local Bank Transfer</h4>
              <p className="text-[9px] text-slate-500 uppercase font-mono">EFT & RTGS Simulation</p>
            </div>
          </div>

        </div>
      </section>

      {/* Testimonials Auto Slider Section */}
      <section id="testimonials" className="py-24 px-6 border-t border-slate-800/40 relative">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          
          <div className="space-y-4">
            <h2 className="font-display font-bold text-3xl text-white">
              Trusted by Derivative Learners
            </h2>
            <p className="text-slate-500 text-sm">
              Read how retail clients leverage PesaOption to master market dynamics.
            </p>
          </div>

          {/* Testimonial Active Slider Box */}
          <div className="bg-[#0F172A]/55 border border-slate-850 rounded-3xl p-8 sm:p-10 shadow-2xl relative min-h-[220px] flex flex-col justify-between">
            <div className="absolute top-4 right-6 text-5xl font-serif text-blue-500/10 pointer-events-none">
              “
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <p className="text-slate-300 italic text-sm sm:text-base leading-relaxed text-left sm:text-center">
                  "{testimonials[currentTestimonial].quote}"
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <img 
                    src={testimonials[currentTestimonial].avatar} 
                    alt={testimonials[currentTestimonial].author} 
                    className="w-11 h-11 rounded-full border border-slate-800"
                  />
                  <div className="text-center sm:text-left">
                    <h4 className="font-display font-bold text-xs text-white">{testimonials[currentTestimonial].author}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{testimonials[currentTestimonial].role} &bull; {testimonials[currentTestimonial].country}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider Dots */}
            <div className="flex justify-center space-x-1.5 mt-6 pt-4 border-t border-slate-900/40">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={`w-2.5 h-1.5 rounded-full transition-all duration-300 ${
                    currentTestimonial === i ? 'bg-[#2563EB] w-5' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-24 px-6 border-t border-slate-800/40">
        <div className="max-w-4xl mx-auto space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <HelpCircle className="w-10 h-10 text-[#2563EB] mx-auto animate-pulse" />
            <h2 className="font-display font-bold text-3xl text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 text-sm">
              Find answers to the most common inquiries about the simulator.
            </p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-[#0F172A]/40 border border-slate-850 rounded-2xl overflow-hidden transition duration-200"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-5 flex justify-between items-center hover:bg-slate-900/30 transition cursor-pointer font-mono text-xs font-bold text-slate-200"
                >
                  <span className="font-display font-medium text-sm text-slate-100">{faq.q}</span>
                  <span className={`text-lg text-slate-500 transition-transform ${activeFaq === idx ? 'rotate-45 text-[#2563EB]' : ''}`}>
                    +
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-6 pt-2 text-slate-400 text-xs leading-relaxed border-t border-slate-900/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 border-t border-slate-800/40 bg-slate-950/20 relative">
        <div className="max-w-xl mx-auto space-y-12">
          
          <div className="text-center space-y-4">
            <Mail className="w-10 h-10 text-[#10B981] mx-auto animate-pulse" />
            <h2 className="font-display font-bold text-3xl text-white">
              Contact Our Team
            </h2>
            <p className="text-slate-500 text-sm">
              Reach out for queries, customized solutions, or engineering deployment support.
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setContactSuccess(true);
              setTimeout(() => setContactSuccess(false), 5000);
            }} 
            className="space-y-5 bg-[#0F172A] border border-slate-800/80 p-8 rounded-3xl shadow-xl font-mono text-xs text-slate-300"
          >
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2">Full Name</label>
              <input 
                required 
                type="text" 
                placeholder="Douglas Kiprop"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white text-xs font-bold" 
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2">Email Address</label>
              <input 
                required 
                type="email" 
                placeholder="douglas@pesaoption.com"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white text-xs font-bold" 
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2">Inquiry Details</label>
              <textarea 
                required 
                rows={4} 
                placeholder="Describe your simulation goals..."
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-white text-xs font-bold resize-none" 
              />
            </div>

            {contactSuccess && (
              <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] font-bold rounded-xl text-center animate-pulse">
                Inquiry received successfully! We will get back to you within 24 hours.
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-3.5 bg-gradient-to-r from-[#2563EB] to-[#10B981] text-slate-950 font-bold uppercase rounded-xl shadow-lg shadow-blue-600/10 cursor-pointer hover:scale-[1.01] transition duration-200"
            >
              Submit Inquiry
            </button>
          </form>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-16 px-6 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-slate-900 pb-12">
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-[#2563EB] to-[#10B981] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4.5 h-4.5 text-slate-950 font-black" />
              </div>
              <span className="font-display font-black text-white text-lg tracking-tight">
                PesaOption
              </span>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-6 text-slate-400">
              <a href="#home" className="hover:text-white transition">Home</a>
              <a href="#markets" className="hover:text-white transition">Markets</a>
              <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#contact" className="hover:text-white transition">Support</a>
              <span className="text-slate-700">|</span>
              <span className="cursor-pointer hover:text-white transition">Terms of Service</span>
              <span className="cursor-pointer hover:text-white transition">Privacy Policy</span>
            </div>

            {/* Socials */}
            <div className="flex items-center space-x-4">
              <span className="text-slate-600 font-mono text-[10px]">CONNECT:</span>
              <div className="flex space-x-2">
                <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 hover:bg-[#2563EB]/10 hover:text-white flex items-center justify-center transition cursor-pointer">
                  <Facebook className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 hover:bg-[#2563EB]/10 hover:text-white flex items-center justify-center transition cursor-pointer">
                  <Instagram className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 hover:bg-[#2563EB]/10 hover:text-white flex items-center justify-center transition cursor-pointer">
                  <Linkedin className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 hover:bg-[#2563EB]/10 hover:text-white flex items-center justify-center transition cursor-pointer">
                  <Twitter className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-850 hover:bg-[#2563EB]/10 hover:text-white flex items-center justify-center transition cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Copyright + disclosure */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] leading-relaxed">
            <div className="text-center md:text-left space-y-1">
              <p>&copy; {new Date().getFullYear()} PesaOption. All rights reserved.</p>
              <p className="text-[#cbd5e1]/40">Support Email: <span className="text-white font-mono font-bold">support@pesaoption.com</span></p>
            </div>
            
            <p className="text-center md:text-right max-w-md text-[10px] text-slate-600 leading-relaxed">
              Risk Disclosure: All trading instruments simulated on this platform involve high volatility. PesaOption represents a permanent, 100% risk-free virtual paper environment. All wallets, deposit simulations, and balances carry absolute zero cash equivalent and cannot be redeemed for real currencies.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
};

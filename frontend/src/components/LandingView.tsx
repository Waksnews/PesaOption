/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Shield, Zap, Globe, BarChart2, 
  ArrowRight, Star, Sparkles, UserPlus, LogIn,
  Wallet, Cpu, Smartphone, RefreshCw, ChevronDown, ChevronUp, Award, Clock,
  Lock, Facebook, Instagram, Linkedin, Twitter, Send, CheckCircle2,
  TrendingDown, DollarSign, ShieldCheck, Headphones,
  Scale, FileText
} from 'lucide-react';
import { useMarketStore } from '../stores/marketStore';
import { useApp } from '../context/AppContext';

import { SEO } from './SEO';

export const LandingView: React.FC<{ 
  onEnterApp: (view: 'login' | 'register') => void;
  onNavigate?: (page: string) => void;
}> = ({ onEnterApp, onNavigate }) => {
  const { user } = useApp();
  const { prices, selectedSymbol, setSelectedSymbol } = useMarketStore();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Floating Ticker Notification
  const [heroMockProfit, setHeroMockProfit] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Dynamic SEO Injection & Schema.org JSON-LD
  // --------------------------------------------------------------------------
  useEffect(() => {
    document.title = "PesaOption | Trade Binary Options, Forex & Crypto Platform | M-Pesa Deposits";

    const setMetaTag = (name: string, content: string, propertyAttr = false) => {
      const attrName = propertyAttr ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attrName}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrName, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMetaTag("description", "PesaOption is Africa's premier binary options, forex & crypto trading platform. Trade global markets with instant M-Pesa STK push deposits, <10ms execution, and fast withdrawals.");
    setMetaTag("keywords", "Binary Options, Binary Trading, Forex Trading, Crypto Trading, Online Trading, Trading Platform, Digital Options, Trade Bitcoin, Trade Forex, Trade Gold, Trade Indices, M-Pesa Trading, M-Pesa Deposit, Fast Withdrawals, Secure Trading, Online Investment, Binary Options Kenya, Forex Kenya, Crypto Kenya, Binary Options Africa");
    setMetaTag("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    setMetaTag("og:title", "PesaOption | Real Binary Options & Digital Options Trading Platform", true);
    setMetaTag("og:description", "Trade forex, cryptocurrencies, indices and commodities on a secure online trading platform with M-Pesa deposits.", true);
    setMetaTag("og:type", "website", true);
    setMetaTag("og:url", "https://www.pesaoption.site/", true);
    setMetaTag("og:site_name", "PesaOption", true);

    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", "PesaOption | Trade Binary Options, Forex & Crypto");
    setMetaTag("twitter:description", "Execute binary options with instant M-Pesa deposits and fast automated withdrawals on PesaOption.");

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://www.pesaoption.site/');

    const schemaData = [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "PesaOption",
        "url": "https://www.pesaoption.site",
        "logo": "https://www.pesaoption.site/favicon.svg",
        "description": "Real online binary options, forex, and cryptocurrency trading platform with instant M-Pesa deposits.",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+254-700-000000",
          "contactType": "customer service",
          "areaServed": ["KE", "NG", "ZA", "GH", "AE", "WW"],
          "availableLanguage": ["English", "Swahili"]
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "PesaOption Trading Platform",
        "url": "https://www.pesaoption.site",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.pesaoption.site/#markets?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FinancialService",
        "name": "PesaOption Digital & Binary Trading",
        "priceRange": "$1 - $10,000",
        "currenciesAccepted": "USD, KES, BTC, ETH",
        "paymentAccepted": "M-Pesa, Visa, Mastercard, Bank Wire, Cryptocurrency"
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "PesaOption Web Trading App",
        "operatingSystem": "Web, iOS, Android",
        "applicationCategory": "FinanceApplication",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "18450"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.a
          }
        }))
      }
    ];

    let scriptTag = document.getElementById('pesaoption-seo-schema') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'pesaoption-seo-schema';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schemaData);
  }, []);

  // Floating profit notification interval
  useEffect(() => {
    const alerts = [
      "User @kamau_j withdrew KES 34,500 via M-Pesa (+95% profit on BTC)",
      "User @sarah_m settled +$245.00 profit on EUR/USD Binary Option",
      "User @omondi_o deposited KES 10,000 via M-Pesa STK Push",
      "User @alice_w settled +$180.00 profit on Gold (XAU/USD)",
      "User @david_k withdrew $450.00 to Crypto Wallet instantly"
    ];
    const timer = setInterval(() => {
      setHeroMockProfit(alerts[Math.floor(Math.random() * alerts.length)]);
      setTimeout(() => setHeroMockProfit(null), 4000);
    }, 9000);
    return () => clearInterval(timer);
  }, []);



  return (
    <div className="bg-[#020617] text-[#F8FAFC] min-h-screen relative font-sans selection:bg-[#2563EB] selection:text-white max-w-full overflow-x-hidden">
      {/* Background Soft Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-full h-[600px] bg-gradient-to-b from-[#2563EB]/15 via-[#10B981]/5 to-transparent pointer-events-none z-0 blur-[120px] overflow-hidden" />

      {/* ==================================================================== */}
      {/* HEADER / NAVIGATION */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-tr from-[#2563EB] via-[#38BDF8] to-[#10B981] rounded-xl flex items-center justify-center shadow-lg shadow-[#2563EB]/20">
              <TrendingUp className="w-6 h-6 text-slate-950 font-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl tracking-tight text-white leading-none">
                Pesa<span className="text-[#10B981]">Option</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-semibold">
                Trading Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs uppercase tracking-wider font-semibold text-slate-300">
            <span onClick={() => onNavigate && onNavigate('about')} className="hover:text-[#38BDF8] transition cursor-pointer">About Us</span>
            <span onClick={() => onNavigate && onNavigate('how-to-deposit')} className="hover:text-[#38BDF8] transition cursor-pointer">Deposit Guide</span>
            <span onClick={() => onNavigate && onNavigate('how-to-withdraw')} className="hover:text-[#38BDF8] transition cursor-pointer">Withdrawal Guide</span>
            <a href="#why-us" className="hover:text-[#38BDF8] transition">Why Us</a>
            <a href="#platform" className="hover:text-[#38BDF8] transition">Platform</a>
            <a href="#how-it-works" className="hover:text-[#38BDF8] transition">How It Works</a>
            <span onClick={() => onNavigate && onNavigate('faq')} className="hover:text-[#38BDF8] transition cursor-pointer">FAQ</span>
          </nav>

          {/* User Auth Action CTAs */}
          <div className="hidden sm:flex items-center space-x-3">
            {user ? (
              <button 
                onClick={() => onEnterApp('login')}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-[#10B981] to-[#38BDF8] rounded-xl shadow-lg shadow-[#10B981]/20 hover:scale-[1.02] active:scale-[0.98] transition flex items-center space-x-2 cursor-pointer"
              >
                <span>Live Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => onEnterApp('login')}
                  className="flex items-center space-x-1.5 px-4 py-2.5 text-xs uppercase tracking-wider font-bold text-slate-300 hover:text-white hover:bg-slate-900 rounded-xl transition"
                >
                  <LogIn className="w-4 h-4 text-[#38BDF8]" />
                  <span>Log In</span>
                </button>
                <button 
                  onClick={() => onEnterApp('register')}
                  className="px-5 py-2.5 text-xs uppercase tracking-wider font-bold text-slate-950 bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#10B981] rounded-xl shadow-lg shadow-[#2563EB]/25 hover:scale-[1.02] active:scale-[0.98] transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Start Trading</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2 text-slate-300 hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            <div className="space-y-1.5 w-6">
              <span className={`block h-0.5 w-full bg-current transform transition duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-full bg-current transition duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-full bg-current transform transition duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile Dropdown Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mt-3 py-4 border-t border-slate-800 flex flex-col space-y-3.5 px-2"
            >
              <span onClick={() => { if (onNavigate) onNavigate('about'); setMobileMenuOpen(false); }} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold cursor-pointer">About Us</span>
              <span onClick={() => { if (onNavigate) onNavigate('how-to-deposit'); setMobileMenuOpen(false); }} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold cursor-pointer">How to Deposit (M-Pesa)</span>
              <span onClick={() => { if (onNavigate) onNavigate('how-to-withdraw'); setMobileMenuOpen(false); }} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold cursor-pointer">How to Withdraw</span>
              <a href="#why-us" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold">Why Us</a>
              <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold">Platform</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold">How It Works</a>
              <span onClick={() => { if (onNavigate) onNavigate('faq'); setMobileMenuOpen(false); }} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold cursor-pointer">FAQ</span>
              <span onClick={() => { if (onNavigate) onNavigate('contact'); setMobileMenuOpen(false); }} className="text-slate-300 hover:text-[#38BDF8] text-sm font-semibold cursor-pointer">Contact Support</span>

              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
                {user ? (
                  <button 
                    onClick={() => { onEnterApp('login'); setMobileMenuOpen(false); }}
                    className="w-full py-3 bg-[#10B981] text-slate-950 font-bold rounded-xl text-center text-sm"
                  >
                    Go to Live Dashboard
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { onEnterApp('login'); setMobileMenuOpen(false); }}
                      className="w-full py-3 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-center text-sm font-semibold"
                    >
                      Log In
                    </button>
                    <button 
                      onClick={() => { onEnterApp('register'); setMobileMenuOpen(false); }}
                      className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#10B981] text-slate-950 font-bold rounded-xl text-center text-sm shadow-lg"
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

      {/* ==================================================================== */}
      {/* 1. HERO SECTION */}
      {/* ==================================================================== */}
      <section className="relative pt-10 pb-16 md:pt-20 md:pb-24 px-4 sm:px-8 max-w-5xl mx-auto z-10 text-center">
        <div className="flex flex-col items-center space-y-6 max-w-3xl mx-auto">
          
          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-full text-xs font-semibold text-slate-300 shadow-inner max-w-full">
            <span className="text-[#10B981] flex items-center space-x-1.5"><Zap className="w-3.5 h-3.5" /> <span>Fast Execution</span></span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-[#38BDF8] flex items-center space-x-1.5"><ShieldCheck className="w-3.5 h-3.5" /> <span>Secure Payments</span></span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-[#10B981] flex items-center space-x-1.5"><BarChart2 className="w-3.5 h-3.5" /> <span>Real-Time Charts</span></span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-[#38BDF8] flex items-center space-x-1.5"><Clock className="w-3.5 h-3.5" /> <span>24/7 Trading</span></span>
          </div>

          {/* SEO H1 Headline */}
          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.15] break-words">
            Trade Binary Options with Confidence
          </h1>

          {/* Subheadline */}
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
            Trade forex, cryptocurrencies, stocks, indices and commodities on one secure platform with fast execution, competitive payouts and instant M-Pesa deposits.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full sm:w-auto pt-2">
            <button 
              onClick={() => onEnterApp('register')}
              className="px-8 py-4 bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#10B981] hover:brightness-110 text-slate-950 font-black rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-[#2563EB]/25 hover:scale-[1.02] active:scale-[0.98] transition text-base cursor-pointer w-full sm:w-auto"
            >
              <span>Open Account</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button 
              onClick={() => onEnterApp('login')}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-xl font-bold transition text-base flex items-center justify-center space-x-2 cursor-pointer w-full sm:w-auto"
            >
              <LogIn className="w-5 h-5 text-[#38BDF8]" />
              <span>Log In</span>
            </button>
          </div>

          {/* Floating Live Ticker Notification */}
          <AnimatePresence>
            {heroMockProfit && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="pt-1"
              >
                <div className="inline-flex items-center space-x-2.5 px-4 py-2 bg-slate-900/90 border border-[#10B981]/40 rounded-xl text-xs text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                  <span className="font-mono text-[#10B981] font-bold">{heroMockProfit}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. STATS BAR */}
      {/* ==================================================================== */}
      <section className="bg-slate-900/80 border-y border-slate-800 py-6 px-4 sm:px-8 z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-6 text-center">
          
          <div className="p-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-white">100+</div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mt-1">Markets</div>
          </div>

          <div className="p-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-[#10B981]">95%</div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mt-1">Maximum Payout</div>
          </div>

          <div className="p-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-[#38BDF8]">KES 100</div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mt-1">Minimum Deposit</div>
          </div>

          <div className="p-3">
            <div className="font-display font-black text-2xl sm:text-3xl text-white">24/7</div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mt-1">Support</div>
          </div>

          <div className="p-3 col-span-2 md:col-span-1">
            <div className="font-display font-black text-2xl sm:text-3xl text-[#10B981]">&lt;10ms</div>
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mt-1">Fast Execution</div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. WHY CHOOSE PESAOPTION (6 FEATURE CARDS) */}
      {/* ==================================================================== */}
      <section id="why-us" className="py-16 md:py-24 px-4 sm:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-[#38BDF8]">
            <Award className="w-4 h-4 text-[#38BDF8]" />
            <span className="font-mono text-[10px] uppercase tracking-wider">High Precision Platform</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight">
            Why Choose PesaOption
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Built for traders who demand institutional execution, local payment power, and absolute platform security.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-[#0B132B]/80 border border-slate-800 hover:border-[#2563EB]/50 p-6 rounded-2xl transition duration-300 space-y-3 group">
            <div className="w-11 h-11 bg-[#2563EB]/15 text-[#2563EB] rounded-xl flex items-center justify-center group-hover:scale-105 transition duration-300">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">Lightning Fast Execution</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Sub-10 millisecond trade processing with zero slippage for reliable order entry and exit.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0B132B]/80 border border-slate-800 hover:border-[#10B981]/50 p-6 rounded-2xl transition duration-300 space-y-3 group">
            <div className="w-11 h-11 bg-[#10B981]/15 text-[#10B981] rounded-xl flex items-center justify-center group-hover:scale-105 transition duration-300">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">Real-Time Market Data</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Institutional tick-by-tick market pricing across major forex, crypto, and commodity pairs.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0B132B]/80 border border-slate-800 hover:border-[#38BDF8]/50 p-6 rounded-2xl transition duration-300 space-y-3 group">
            <div className="w-11 h-11 bg-[#38BDF8]/15 text-[#38BDF8] rounded-xl flex items-center justify-center group-hover:scale-105 transition duration-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">M-Pesa Deposits & Withdrawals</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Seamless mobile deposits via M-Pesa STK push and direct mobile money payouts in minutes.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#0B132B]/80 border border-slate-800 hover:border-[#F59E0B]/50 p-6 rounded-2xl transition duration-300 space-y-3 group">
            <div className="w-11 h-11 bg-[#F59E0B]/15 text-[#F59E0B] rounded-xl flex items-center justify-center group-hover:scale-105 transition duration-300">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">Secure Wallet</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Multi-currency balance management protected with cold storage isolation and instant ledger updates.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-[#0B132B]/80 border border-slate-800 hover:border-[#2563EB]/50 p-6 rounded-2xl transition duration-300 space-y-3 group">
            <div className="w-11 h-11 bg-[#2563EB]/15 text-[#2563EB] rounded-xl flex items-center justify-center group-hover:scale-105 transition duration-300">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">Trade Multiple Assets</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Access forex majors, top cryptocurrencies, global indices, and spot commodities from one unified dashboard.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-[#0B132B]/80 border border-slate-800 hover:border-[#10B981]/50 p-6 rounded-2xl transition duration-300 space-y-3 group">
            <div className="w-11 h-11 bg-[#10B981]/15 text-[#10B981] rounded-xl flex items-center justify-center group-hover:scale-105 transition duration-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-white">Bank-Level Security</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Encrypted data transmission, segregated client funds, and robust two-factor authentication safeguards.
            </p>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. PLATFORM SHOWCASE */}
      {/* ==================================================================== */}
      <section id="platform" className="py-16 md:py-24 px-4 sm:px-8 bg-slate-900/60 border-y border-slate-800 z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Feature Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-xs font-semibold text-[#10B981]">
              <Cpu className="w-4 h-4 text-[#10B981]" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Trading Architecture</span>
            </div>

            <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight">
              Everything You Need to Trade
            </h2>

            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <span>Real-time candlestick & line charts</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <span>Professional technical indicators (RSI, Moving Averages, MACD)</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <span>Multiple asset classes in a single window</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <span>Sub-10ms fast order execution engine</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <span>Secure wallet management with multi-currency balance</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <span>Responsive Web platform optimized for mobile & desktop</span>
              </li>
            </ul>

            <button 
              onClick={() => onEnterApp('register')}
              className="mt-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer flex items-center space-x-2"
            >
              <span>Explore Trading Engine</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Feature Cards Grid */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            <div className="p-6 bg-[#0B132B] border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Sub-10ms Order Latency</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Direct market connectivity ensures instant order routing with maximum precision and zero slippage.
              </p>
            </div>

            <div className="p-6 bg-[#0B132B] border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">256-Bit SSL Security</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Bank-grade encryption protecting every transaction, balance update, and personal data point.
              </p>
            </div>

            <div className="p-6 bg-[#0B132B] border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 text-[#2563EB] flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Instant M-Pesa Payouts</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Deposit and withdraw directly from your mobile wallet with automated STK push speed.
              </p>
            </div>

            <div className="p-6 bg-[#0B132B] border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Up to 95% Payout Rates</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                High precision payout structure on winning options across forex, crypto, and commodities.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. HOW IT WORKS (4 STEPS) */}
      {/* ==================================================================== */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 sm:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-[#10B981]">
            <Clock className="w-4 h-4 text-[#10B981]" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Simple Process</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight">
            How It Works
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Start trading global digital options in 4 easy steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Create Account', desc: 'Sign up in seconds with your email address and basic details.', icon: <UserPlus className="w-5 h-5 text-[#2563EB]" /> },
            { step: '02', title: 'Verify Identity', desc: 'Fast identity protection to keep your trading wallet safe.', icon: <Lock className="w-5 h-5 text-[#38BDF8]" /> },
            { step: '03', title: 'Deposit Funds', desc: 'Instant STK push deposit using M-Pesa, card, or crypto.', icon: <Smartphone className="w-5 h-5 text-[#10B981]" /> },
            { step: '04', title: 'Trade & Withdraw', desc: 'Execute binary options and withdraw profits directly to M-Pesa.', icon: <RefreshCw className="w-5 h-5 text-[#F59E0B]" /> }
          ].map(s => (
            <div key={s.step} className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-3 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xl font-black text-[#2563EB]">{s.step}</span>
                <div className="p-2 bg-slate-900 rounded-xl">{s.icon}</div>
              </div>
              <h3 className="font-bold text-base text-white">{s.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. TESTIMONIALS (6 CARDS) */}
      {/* ==================================================================== */}
      <section id="testimonials" className="py-16 md:py-24 px-4 sm:px-8 bg-slate-900/60 border-y border-slate-800 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-xs font-semibold text-[#38BDF8]">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Trader Testimonials</span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight">
              Trusted by Traders Worldwide
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              See what active binary and forex traders say about PesaOption.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-1 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed italic">"{t.quote}"</p>
                </div>

                <div className="flex items-center space-x-3 pt-3 border-t border-slate-800/80">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs text-[#38BDF8]">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t.author}</div>
                    <div className="text-[10px] text-slate-400">{t.role} • {t.country}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. FAQ (5-6 QUESTIONS WITH SCHEMA) */}
      {/* ==================================================================== */}
      <section id="faq" className="py-16 md:py-24 px-4 sm:px-8 max-w-4xl mx-auto z-10">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-[#10B981]">
            <FileText className="w-4 h-4 text-[#10B981]" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Frequently Asked Questions</span>
          </div>
          <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight">
            Got Questions? We Have Answers.
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden transition">
                <button 
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-white focus:outline-none cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#38BDF8]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 8. FINAL CTA */}
      {/* ==================================================================== */}
      <section className="py-16 md:py-20 px-4 sm:px-8 max-w-7xl mx-auto z-10">
        <div className="bg-gradient-to-r from-[#0B132B] via-[#0F172A] to-[#0B132B] border border-[#2563EB]/40 p-8 sm:p-12 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
              Ready to Start Trading?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Join thousands of traders executing binary options with instant M-Pesa deposits and fast withdrawals today.
            </p>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => onEnterApp('register')}
              className="px-8 py-4 bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#10B981] hover:brightness-110 text-slate-950 font-black rounded-xl text-base shadow-xl shadow-[#2563EB]/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              Create Free Account
            </button>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 9. FOOTER */}
      {/* ==================================================================== */}
      <footer className="bg-slate-950 border-t border-slate-800/80 pt-12 pb-8 px-4 sm:px-8 text-xs text-slate-400 z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 mb-10">
          
          <div className="col-span-1 sm:col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white">PesaOption</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Real online binary options, forex, and digital trading platform with instant M-Pesa STK push integration and fast payouts.
            </p>
            <div className="flex items-center space-x-3 pt-2 text-slate-400">
              <Facebook className="w-4 h-4 hover:text-white cursor-pointer" />
              <Twitter className="w-4 h-4 hover:text-white cursor-pointer" />
              <Instagram className="w-4 h-4 hover:text-white cursor-pointer" />
              <Linkedin className="w-4 h-4 hover:text-white cursor-pointer" />
              <Send className="w-4 h-4 hover:text-white cursor-pointer" />
            </div>
          </div>

          <div>
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">Markets</div>
            <ul className="space-y-2">
              <li className="hover:text-white cursor-pointer">Forex Majors</li>
              <li className="hover:text-white cursor-pointer">Cryptocurrency</li>
              <li className="hover:text-white cursor-pointer">Commodities</li>
              <li className="hover:text-white cursor-pointer">Stock Indices</li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">Trading</div>
            <ul className="space-y-2">
              <li className="hover:text-white cursor-pointer" onClick={() => onEnterApp('register')}>Binary Options</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onEnterApp('register')}>Demo Account</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate ? onNavigate('how-to-deposit') : onEnterApp('login')}>M-Pesa Deposits</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate ? onNavigate('how-to-withdraw') : onEnterApp('login')}>Withdrawals</li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-3">Support & Legal</div>
            <ul className="space-y-2">
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('about')}>About Us</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('contact')}>Contact Support</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('faq')}>FAQ</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('privacy')}>Privacy Policy</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('terms')}>Terms of Service</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('risk')}>Risk Disclosure</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('aml')}>AML Policy</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('kyc')}>KYC Policy</li>
              <li className="hover:text-white cursor-pointer" onClick={() => onNavigate && onNavigate('cookie')}>Cookie Policy</li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} PesaOption. All rights reserved.
          </div>
          <div className="text-center md:text-right max-w-xl">
            Risk Warning: Financial option trading involves substantial risk of loss and is not suitable for all investors. Trade responsibly.
          </div>
        </div>
      </footer>

    </div>
  );
};

const testimonials = [
  {
    quote: "M-Pesa STK push deposits take less than 5 seconds to reflect. When I close my trades, I withdraw directly to M-Pesa within minutes.",
    author: "James Kamau",
    role: "Verified Trader",
    country: "Nairobi, Kenya"
  },
  {
    quote: "Sub-10ms execution on EUR/USD and BTC Options is top-notch. PesaOption outshines alternatives with zero slippage.",
    author: "Sarah Jenkins",
    role: "Options Trader",
    country: "London, UK"
  },
  {
    quote: "Up to 95% payout rate gives a real statistical edge. Responsive 24/7 support makes trading completely stress-free.",
    author: "David Ochieng",
    role: "Crypto Option Specialist",
    country: "Mombasa, Kenya"
  },
  {
    quote: "Super clean UI and intuitive chart interface. I appreciate how fast payouts process back into my mobile wallet.",
    author: "Amina Yusuf",
    role: "Forex Trader",
    country: "Dar es Salaam, Tanzania"
  },
  {
    quote: "Trading binary options on Gold and Nasdaq with fast execution has been smooth. The platform is rock solid.",
    author: "Michael Van Der Merwe",
    role: "Commodities Trader",
    country: "Cape Town, South Africa"
  },
  {
    quote: "Low $10 minimum deposit meant I could start small and build up my portfolio safely.",
    author: "Emmanuel Mensah",
    role: "Retail Trader",
    country: "Accra, Ghana"
  }
];

const faqs = [
  {
    q: "How do I deposit using M-Pesa?",
    a: "Select Deposit in your account wallet, enter your M-Pesa phone number and amount in KES, click Deposit, and enter your M-Pesa PIN on the automated STK push prompt on your phone. Funds reflect instantly."
  },
  {
    q: "How fast are withdrawals?",
    a: "Withdrawals to M-Pesa and automated gateways are processed in under 5 minutes once approved. Bank wires and crypto payouts typically settle within 15 to 30 minutes."
  },
  {
    q: "What assets can I trade?",
    a: "You can trade major Forex currency pairs (EUR/USD, GBP/USD, USD/JPY), Cryptocurrencies (BTC, ETH, SOL), Commodities (Gold, Silver, Crude Oil), and Global Stock Indices."
  },
  {
    q: "Is PesaOption secure?",
    a: "Yes. PesaOption utilizes 256-bit SSL encryption, cold wallet isolation, segregated client accounts, and compulsory two-factor authentication (2FA)."
  },
  {
    q: "What is Binary Options Trading?",
    a: "Binary options trading allows you to predict whether the price of an asset (like EUR/USD or Bitcoin) will be Higher (Call) or Lower (Put) than the target barrier price at expiration."
  }
];

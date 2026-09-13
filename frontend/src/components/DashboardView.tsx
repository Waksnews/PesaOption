/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useApp, logAuth } from '../context/AppContext';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from '../stores/walletStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useChatStore } from '../stores/chatStore';
import { useSSE } from '../hooks/useSSE';
import { formatCurrency } from '../lib/currency';

// Primary View - eagerly loaded for immediate trading desk availability
import { TradingDeskView } from './views/TradingDeskView';

// Secondary Subviews - code-split / lazy loaded for fast initial app startup
const ScannerView = lazy(() => import('./views/ScannerView').then(m => ({ default: m.ScannerView })));
const WalletsView = lazy(() => import('./views/WalletsView').then(m => ({ default: m.WalletsView })));
const ReferralView = lazy(() => import('./views/ReferralView').then(m => ({ default: m.ReferralView })));
const SupportView = lazy(() => import('./views/SupportView').then(m => ({ default: m.SupportView })));
const SecurityView = lazy(() => import('./views/SecurityView').then(m => ({ default: m.SecurityView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const HistoryView = lazy(() => import('./views/HistoryView').then(m => ({ default: m.HistoryView })));
const AdminView = lazy(() => import('./views/AdminView').then(m => ({ default: m.AdminView })));
const DepositCallbackView = lazy(() => import('./views/DepositCallbackView').then(m => ({ default: m.DepositCallbackView })));

// Import modals and utilities
import { NavigationDrawer } from './NavigationDrawer';
import { DepositModal } from './modals/DepositModal';
import { WithdrawModal } from './modals/WithdrawModal';
import { SupportChat } from './SupportChat';
import { ToastContainer } from './ToastContainer';
import { TradeSettleOverlay } from './TradeSettleOverlay';
import { RealAccountConfirmModal } from './modals/RealAccountConfirmModal';

import { 
  TrendingUp, Wallet as WalletIcon, Gift, MessageSquare, Settings as SettingsIcon, ShieldCheck, 
  Menu, X, Bell, User as UserIcon, LogOut, ArrowUpRight, ArrowDownLeft, Shield, Check,
  RefreshCw, Sparkles, HelpCircle, Volume2, VolumeX, ChevronDown
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user, logout, announcements, notifications, markNotificationsRead, refreshUserData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const { isDemo, setIsDemo, getUsdBalance, setDepositModalOpen, setWithdrawModalOpen } = useWalletStore();
  const { currency, setCurrency } = useSettingsStore();
  const { chatOpen, setChatOpen } = useChatStore();
  const { addToast } = useNotificationStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Close menus/dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountDropdownOpen(false);
        setDrawerOpen(false);
        setBellOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Activate SSE connection for live prices and settlement logic
  useSSE();

  // Log navigation completion on dashboard mount and sync deposit callback path if needed
  useEffect(() => {
    logAuth('Navigation complete');

    const winPath = window.location.pathname.toLowerCase();
    const winHash = window.location.hash.toLowerCase();
    const winSearch = window.location.search;
    const isDismissed = sessionStorage.getItem('deposit_callback_dismissed') === 'true';

    const isCallbackUrl = !isDismissed && (
      winPath.includes('/deposit/callback') || 
      winHash.includes('/deposit/callback') || 
      ((winSearch.includes('reference=') || winSearch.includes('ref=')) && (location.pathname === '/' || location.pathname === '/dashboard'))
    );

    if (isCallbackUrl && !location.pathname.includes('/deposit/callback')) {
      navigate(`/deposit/callback${winSearch}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  // Refresh user data periodically & handle deposit route
  useEffect(() => {
    refreshUserData();
    if (location.pathname === '/deposit') {
      setDepositModalOpen(true);
    }
  }, [location.pathname]);

  const { balance, demoBalance } = getUsdBalance();
  const activeUsdBalance = isDemo ? demoBalance : balance;

  const handleLogout = () => {
    logout();
    addToast('Session Closed', 'You have been disconnected from the secure derivative core.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans antialiased text-slate-200">
      
      {/* Slide-out Navigation Drawer */}
      <NavigationDrawer 
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        currency={currency}
        isDemo={isDemo}
        activeBalance={activeUsdBalance}
        handleLogout={handleLogout}
      />

      {/* Main Container Frame */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Header Navbar (Clean, High-Contrast PesaOption Trading Terminal Header) */}
        <header className="h-12 sm:h-13 bg-[#0a0d14] border-b border-slate-850 px-2 sm:px-3.5 flex items-center justify-between relative z-[100] flex-shrink-0">
          
          {/* Top Left: Menu Trigger & PesaOption Brand */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            <button 
              id="top-nav-menu-btn"
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-850 active:scale-95 rounded-lg transition flex items-center justify-center cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-slate-300" />
            </button>

            <div 
              onClick={() => navigate('/')}
              className="flex items-center cursor-pointer select-none"
            >
              <span className="font-sans font-black text-sm sm:text-base tracking-tight text-white">
                PesaOption
              </span>
            </div>
          </div>

          {/* Top Right: Account Switcher Pill, Sound Icon, Deposit Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            
            {/* Account Mode & Balance Dropdown Pill - Exact match to reference */}
            <div className="relative shrink-0">
              <button 
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="flex items-center space-x-2 px-2 sm:px-2.5 py-1 bg-[#181d28] hover:bg-[#202736] border border-slate-800 hover:border-slate-700 rounded-full transition cursor-pointer select-none shadow-sm"
                title="Click to switch between Real and Demo accounts"
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-slate-950 shrink-0 ${
                  isDemo ? 'bg-[#00c594] shadow-sm shadow-[#00c594]/40' : 'bg-[#ff5b29] shadow-sm shadow-[#ff5b29]/40'
                }`}>
                  {isDemo ? 'D' : 'R'}
                </span>
                <span className="font-mono font-bold text-xs text-white whitespace-nowrap">
                  {formatCurrency(activeUsdBalance, currency)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {accountDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[110]" 
                    onClick={() => setAccountDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-[#090D1A] border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-black/90 z-[120] space-y-2.5 animate-fade-in">
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
                      <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-bold">Select Account Mode</span>
                      <button 
                        onClick={() => setAccountDropdownOpen(false)} 
                        className="flex items-center space-x-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-[10px] font-bold uppercase transition cursor-pointer"
                        title="Close Dropdown (Esc)"
                      >
                        <X className="w-3 h-3" />
                        <span>Close</span>
                      </button>
                    </div>

                    {/* Demo Account Box */}
                    <div 
                      onClick={() => { setIsDemo(true); setAccountDropdownOpen(false); }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                        isDemo 
                          ? 'bg-teal-500/15 border-teal-500/50 text-teal-300' 
                          : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-[#00c594] inline-block" />
                          <span>DEMO ACCOUNT</span>
                        </p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-slate-100 mt-0.5">
                          {formatCurrency(demoBalance, currency)}
                        </p>
                      </div>
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                        isDemo ? 'bg-[#00c594]/20 text-[#00c594] border border-[#00c594]/40' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isDemo ? 'Active' : 'Select'}
                      </span>
                    </div>

                    {/* Real Account Box */}
                    <div 
                      onClick={() => { 
                        setAccountDropdownOpen(false); 
                        if (isDemo) {
                          setConfirmModalOpen(true);
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                        !isDemo 
                          ? 'bg-[#ff5b29]/15 border-[#ff5b29]/50 text-[#ff7a50]' 
                          : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-[#ff5b29] inline-block" />
                          <span>REAL ACCOUNT</span>
                        </p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-slate-100 mt-0.5">
                          {formatCurrency(balance, currency)}
                        </p>
                      </div>
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                        !isDemo ? 'bg-[#ff5b29]/20 text-[#ff7a50] border border-[#ff5b29]/40' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {!isDemo ? 'Active' : 'Select'}
                      </span>
                    </div>

                    {/* Reload funds */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-850">
                      <span className="text-[9px] text-slate-500 font-mono">Practice Account</span>
                      <button 
                        onClick={async () => {
                          const amountNeeded = Math.max(0, 10000 - demoBalance);
                          if (amountNeeded > 0) {
                            await useWalletStore.getState().deposit(amountNeeded, 'USD');
                            addToast('Demo Balance Restored', 'Practice funds topped up to $10,000.', 'success');
                          } else {
                            addToast('Balance Cap Reached', 'Demo balance is already at or above $10,000.', 'info');
                          }
                          setAccountDropdownOpen(false);
                        }}
                        className="text-[10px] text-teal-400 hover:text-teal-300 font-mono flex items-center space-x-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-teal-400" />
                        <span>Top-Up Demo</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sound Toggle (Clean Speaker Icon as in reference) */}
            <button
              onClick={() => {
                useSettingsStore.getState().toggleSound();
                addToast('Audio Settings', `Audio effects ${useSettingsStore.getState().soundEnabled ? 'enabled' : 'muted'}.`, 'info');
              }}
              className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
              title={useSettingsStore.getState().soundEnabled ? 'Mute Trading Audio' : 'Enable Trading Audio'}
            >
              {useSettingsStore.getState().soundEnabled ? (
                <Volume2 className="w-4.5 h-4.5 text-slate-300 hover:text-white" />
              ) : (
                <VolumeX className="w-4.5 h-4.5 text-slate-600" />
              )}
            </button>

            {/* Header Deposit Button (Solid Vibrant Rounded Button as in reference) */}
            <button
              onClick={() => setDepositModalOpen(true)}
              className="px-3 sm:px-4 py-1.5 bg-[#ff5b29] hover:bg-[#ff6e40] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-[#ff5b29]/25 transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
            >
              <span>Deposit</span>
            </button>

          </div>
        </header>

        {/* Outer Workspace with active Router Views */}
        <div className={`flex-1 min-h-0 flex flex-col ${(location.pathname === '/' || location.pathname === '/dashboard') ? 'p-1.5 sm:p-2.5 lg:p-3 overflow-y-auto lg:overflow-hidden' : 'p-2 sm:p-4 md:p-5 overflow-y-auto'}`}>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
              <p className="font-mono text-xs uppercase tracking-widest">Loading Module...</p>
            </div>
          }>
            <Routes>
              <Route path="/" element={<TradingDeskView />} />
              <Route path="/dashboard" element={<TradingDeskView />} />
              <Route path="/scanner" element={<ScannerView />} />
              <Route path="/wallet" element={<WalletsView />} />
              <Route path="/deposit" element={<WalletsView />} />
              <Route path="/deposit/callback" element={<DepositCallbackView />} />
              <Route path="/referral" element={<ReferralView />} />
              <Route path="/support" element={<SupportView />} />
              <Route path="/security" element={<SecurityView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/history" element={<HistoryView />} />
              <Route path="/admin" element={(user?.role === 'admin' || user?.role === 'owner') ? <AdminView /> : <Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>

      </div>

      {/* Floating Overlays & Modals */}
      <DepositModal />
      <WithdrawModal />
      <SupportChat />
      <ToastContainer />
      <TradeSettleOverlay />
      <RealAccountConfirmModal 
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => setIsDemo(false)}
        realBalanceDisplay={formatCurrency(balance, currency)}
      />

    </div>
  );
};

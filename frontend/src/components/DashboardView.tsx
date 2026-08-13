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
  RefreshCw, Sparkles, HelpCircle
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

  // Refresh user data periodically
  useEffect(() => {
    refreshUserData();
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
        
        {/* Top Header Navbar */}
        <header className="h-16 bg-[#090D1A] border-b border-slate-850 px-3 sm:px-6 flex items-center justify-between relative z-[100]">
          
          {/* Top Left Menu Trigger */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setDrawerOpen(true)}
              className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-100 transition cursor-pointer"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div 
              onClick={() => setDrawerOpen(true)}
              className="flex items-center space-x-3 cursor-pointer select-none"
            >
              <div className="w-8 h-8 bg-gradient-to-tr from-[#2563EB] to-[#10B981] rounded-xl flex items-center justify-center shadow-lg shadow-[#2563EB]/10">
                <TrendingUp className="w-4.5 h-4.5 text-slate-950 font-black" />
              </div>
              <span className="font-sans font-black text-xs uppercase tracking-widest text-slate-100 hidden sm:inline-block">PesaOption</span>
            </div>
          </div>

          {/* Quick Access Top Bar Buttons (Desktop Only) */}
          <div className="hidden lg:flex items-center space-x-3.5">
            <button 
              onClick={() => setDepositModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1527] border border-slate-850 hover:bg-[#131E38] text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer select-none"
            >
              <div className="w-5 h-5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
              </div>
              <span>Deposit</span>
            </button>

            <button 
              onClick={() => setWithdrawModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1527] border border-slate-850 hover:bg-[#131E38] text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer select-none"
            >
              <div className="w-5 h-5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-3 h-3 text-amber-400" />
              </div>
              <span>Withdraw</span>
            </button>

            <button 
              onClick={() => navigate('/history')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1527] border border-slate-850 hover:bg-[#131E38] text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer select-none"
            >
              <div className="w-5 h-5 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center">
                <RefreshCw className="w-3 h-3 text-purple-400" />
              </div>
              <span>History</span>
            </button>

            <button 
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1527] border border-slate-850 hover:bg-[#131E38] text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer select-none"
            >
              <div className="w-5 h-5 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center">
                <MessageSquare className="w-3 h-3 text-cyan-400" />
              </div>
              <span>Chat Desk</span>
            </button>

            <button 
              onClick={() => navigate('/scanner')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1527] border border-slate-850 hover:bg-[#131E38] text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer select-none"
            >
              <div className="w-5 h-5 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-blue-400" />
              </div>
              <span>AI Scan</span>
            </button>
          </div>

          {/* Right Accessories (Currency Switcher, Wallet Selector, Notifications) */}
          <div className="flex items-center space-x-3.5">
            
            {/* Currency Switcher (KES / USD) */}
            <button
              onClick={() => {
                const nextCurr = currency === 'USD' ? 'KES' : 'USD';
                setCurrency(nextCurr);
                addToast('Currency Base Updated', `Visual pricing updated to ${nextCurr}.`, 'info');
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0D1527] hover:bg-[#131E38] border border-slate-850 rounded-xl text-[10px] font-bold font-mono text-slate-300 transition cursor-pointer select-none"
              title="Toggle active currency representation (KES/USD)"
            >
              <span className={currency === 'KES' ? 'text-teal-400' : 'text-slate-550'}>KES</span>
              <span className="text-slate-755">/</span>
              <span className={currency === 'USD' ? 'text-teal-400' : 'text-slate-550'}>USD</span>
            </button>

            {/* Wallet Dropdown Switcher */}
            <div className="relative">
              <button 
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className={`flex items-center space-x-2 border px-3.5 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer select-none ${
                  isDemo 
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50' 
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-300 hover:bg-amber-950/50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isDemo ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                <span className="font-black">
                  {isDemo ? '🟢 DEMO ' : '🟠 REAL '}
                  {formatCurrency(activeUsdBalance, currency)}
                </span>
                <span className="text-slate-500 text-[8px]">▼</span>
              </button>

              {accountDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[110]" 
                    onClick={() => setAccountDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-[#090D1A] border border-slate-800 rounded-2xl p-4 shadow-2xl shadow-black/90 z-[120] space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Switch Account Mode</span>
                      <button onClick={() => setAccountDropdownOpen(false)} className="text-[10px] text-slate-400 hover:text-slate-200 font-bold uppercase">
                        Close
                      </button>
                    </div>

                    {/* Demo Account Box */}
                    <div 
                      onClick={() => { setIsDemo(true); setAccountDropdownOpen(false); }}
                      className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                        isDemo 
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' 
                          : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide flex items-center space-x-1">
                          <span>🟢 DEMO ACCOUNT</span>
                        </p>
                        <p className="text-sm font-mono font-bold text-slate-100 mt-1">
                          {formatCurrency(demoBalance, currency)}
                        </p>
                      </div>
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                        isDemo ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
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
                      className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                        !isDemo 
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' 
                          : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide flex items-center space-x-1">
                          <span>🟠 REAL ACCOUNT</span>
                        </p>
                        <p className="text-sm font-mono font-bold text-slate-100 mt-1">
                          {formatCurrency(balance, currency)}
                        </p>
                      </div>
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                        !isDemo ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-500'
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
                        className="text-[10px] text-orange-400 hover:text-orange-300 font-mono flex items-center space-x-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-orange-400" />
                        <span>Top-Up Demo</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setBellOpen(!bellOpen); markNotificationsRead(); }}
                className="relative p-2 text-slate-450 hover:text-slate-200 hover:bg-slate-850 rounded-xl transition cursor-pointer"
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping" />
                )}
              </button>

              {bellOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[110]" 
                    onClick={() => setBellOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-[#090D1A] border border-slate-800 rounded-2xl p-4 shadow-2xl shadow-black/90 z-[120] space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                      <span className="font-display font-semibold text-xs text-slate-350 uppercase tracking-wider">Alerts Feed</span>
                      <button onClick={() => setBellOpen(false)} className="text-[10px] text-slate-550 hover:text-slate-350 uppercase">Close</button>
                    </div>
                    <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <p className="text-[10px] text-slate-500 text-center py-4">No active system notifications.</p>
                      ) : (
                        notifications.slice(0, 8).map(n => (
                          <div key={n.id} className="text-xs space-y-1">
                            <p className={`font-semibold ${n.read ? 'text-slate-400' : 'text-teal-400'}`}>{n.title}</p>
                            <p className="text-[11px] text-slate-450 leading-relaxed">{n.message}</p>
                            <p className="text-[9px] text-slate-600 font-mono">{new Date(n.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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

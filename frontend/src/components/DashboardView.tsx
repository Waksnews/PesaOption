/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from '../stores/walletStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useChatStore } from '../stores/chatStore';
import { useSSE } from '../hooks/useSSE';
import { formatCurrency } from '../lib/currency';

// Import modular subviews
import { TradingDeskView } from './views/TradingDeskView';
import { ScannerView } from './views/ScannerView';
import { WalletsView } from './views/WalletsView';
import { ReferralView } from './views/ReferralView';
import { SupportView } from './views/SupportView';
import { SecurityView } from './views/SecurityView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { HistoryView } from './views/HistoryView';
import { AdminView } from './views/AdminView';

// Import modals and utilities
import { NavigationDrawer } from './NavigationDrawer';
import { DepositModal } from './modals/DepositModal';
import { WithdrawModal } from './modals/WithdrawModal';
import { SupportChat } from './SupportChat';
import { ToastContainer } from './ToastContainer';
import { TradeSettleOverlay } from './TradeSettleOverlay';

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

  // Activate SSE connection for live prices and settlement logic
  useSSE();

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
        <header className="h-16 bg-[#090D1A] border-b border-slate-850 px-3 sm:px-6 flex items-center justify-between relative z-30">
          
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
                className="flex items-center space-x-2 bg-[#0D1527] hover:bg-[#131E38] border border-slate-850 px-4 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer select-none"
              >
                <div className={`w-2 h-2 rounded-full ${isDemo ? 'bg-orange-500' : 'bg-teal-500'} animate-pulse`} />
                <span className="font-bold text-slate-100">
                  {isDemo ? 'D ' : 'R '}
                  {formatCurrency(activeUsdBalance, currency)}
                </span>
                <span className="text-slate-500 text-[8px]">▼</span>
              </button>

              {accountDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-72 bg-[#090D1A] border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Switch Account</span>
                    <button onClick={() => setAccountDropdownOpen(false)} className="text-[10px] text-slate-400 hover:text-slate-200 font-bold uppercase">
                      Close
                    </button>
                  </div>

                  {/* Real Account Box */}
                  <div 
                    onClick={() => { setIsDemo(false); setAccountDropdownOpen(false); }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                      !isDemo 
                        ? 'bg-blue-600/10 border-blue-500/40 text-slate-100' 
                        : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide">Real Account</p>
                      <p className="text-sm font-mono font-bold text-slate-100 mt-1">
                        R {formatCurrency(balance, currency)}
                      </p>
                    </div>
                    <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${
                      !isDemo ? 'bg-blue-500/20 text-blue-400 border border-blue-500/35' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {!isDemo ? 'Active' : 'Select'}
                    </span>
                  </div>

                  {/* Demo Account Box */}
                  <div 
                    onClick={() => { setIsDemo(true); setAccountDropdownOpen(false); }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                      isDemo 
                        ? 'bg-orange-600/10 border-orange-500/40 text-slate-100' 
                        : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide">Demo Account</p>
                      <p className="text-sm font-mono font-bold text-slate-100 mt-1">
                        D {formatCurrency(demoBalance, currency)}
                      </p>
                    </div>
                    <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${
                      isDemo ? 'bg-orange-500/20 text-orange-400 border border-orange-500/35' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isDemo ? 'Active' : 'Select'}
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
                <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50">
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
              )}
            </div>

          </div>
        </header>

        {/* Outer Workspace with active Router Views */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {announcements.length > 0 && (
            <div className="bg-slate-900 border border-teal-500/20 p-4 rounded-xl flex items-start space-x-3 shadow-md shadow-teal-500/5">
              <div className="p-1.5 bg-teal-500/10 rounded border border-teal-500/20 text-teal-400">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-sans font-bold text-slate-200">System Bulletin: {announcements[0].title}</p>
                <p className="text-slate-450 leading-relaxed">{announcements[0].content}</p>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<TradingDeskView />} />
            <Route path="/scanner" element={<ScannerView />} />
            <Route path="/wallet" element={<WalletsView />} />
            <Route path="/referral" element={<ReferralView />} />
            <Route path="/support" element={<SupportView />} />
            <Route path="/security" element={<SecurityView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/history" element={<HistoryView />} />
            <Route path="/admin" element={(user?.role === 'admin' || user?.role === 'owner') ? <AdminView /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

      </div>

      {/* Floating Overlays & Modals */}
      <DepositModal />
      <WithdrawModal />
      <SupportChat />
      <ToastContainer />
      <TradeSettleOverlay />

    </div>
  );
};

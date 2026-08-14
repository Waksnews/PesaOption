/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useWalletStore } from '../stores/walletStore';
import { useHistoryStore } from '../stores/historyStore';
import { formatCurrency } from '../lib/currency';
import { 
  TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, History, 
  ArrowLeftRight, Sparkles, MessageSquare, User, Settings, LogOut, X, Shield 
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currency: string;
  isDemo: boolean;
  activeBalance: number;
  handleLogout: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  user,
  currency,
  isDemo,
  activeBalance,
  handleLogout
}) => {
  const navigate = useNavigate();
  const { setDepositModalOpen, setWithdrawModalOpen } = useWalletStore();
  const { setActiveFilter } = useHistoryStore();

  const handleNav = (path: string, filter?: 'all' | 'deposits' | 'withdrawals' | 'trades' | 'bonuses') => {
    if (filter) {
      setActiveFilter(filter);
    }
    navigate(path);
    onClose();
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const drawerItems = [
    { 
      name: 'Trading Desk', 
      icon: TrendingUp, 
      action: () => handleNav('/') 
    },
    { 
      name: 'Wallet', 
      icon: Wallet, 
      action: () => handleNav('/wallet') 
    },
    { 
      name: 'Deposit', 
      icon: ArrowDownLeft, 
      action: () => handleAction(() => setDepositModalOpen(true)),
      color: 'text-emerald-400'
    },
    { 
      name: 'Withdraw', 
      icon: ArrowUpRight, 
      action: () => handleAction(() => setWithdrawModalOpen(true)),
      color: 'text-rose-400'
    },
    { 
      name: 'History', 
      icon: History, 
      action: () => handleNav('/history', 'all') 
    },
    { 
      name: 'Transactions', 
      icon: ArrowLeftRight, 
      action: () => handleNav('/history', 'deposits') 
    },
    { 
      name: 'Trade History', 
      icon: History, 
      action: () => handleNav('/history', 'trades') 
    },
    { 
      name: 'AI Scanner', 
      icon: Sparkles, 
      action: () => handleNav('/scanner'),
      badge: 'Neural'
    },
    ...((user?.role === 'admin' || user?.role === 'owner') ? [{
      name: 'Admin Panel',
      icon: Shield,
      action: () => handleNav('/admin'),
      color: user?.role === 'owner' ? 'text-amber-400 font-bold' : 'text-teal-400 font-bold',
      badge: user?.role === 'owner' ? 'OWNER' : 'ADMIN'
    }] : []),
    { 
      name: 'Support', 
      icon: MessageSquare, 
      action: () => handleNav('/support') 
    },
    { 
      name: 'Profile', 
      icon: User, 
      action: () => handleNav('/profile') 
    },
    { 
      name: 'Settings', 
      icon: Settings, 
      action: () => handleNav('/settings') 
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark Glass Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Slide-out Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900/95 border-r border-slate-850 backdrop-blur-lg shadow-2xl z-50 flex flex-col justify-between"
          >
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-850 flex justify-between items-center bg-slate-950/20">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-tr from-[#2563EB] to-[#10B981] rounded-xl flex items-center justify-center shadow-lg shadow-[#2563EB]/10">
                    <TrendingUp className="w-4.5 h-4.5 text-slate-950 font-black" />
                  </div>
                  <span className="font-sans font-black text-xs uppercase tracking-widest text-slate-100">PesaOption</span>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-350 transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* User Identity Banner */}
              <div className="p-6 bg-slate-950/20 border-b border-slate-850 flex items-center space-x-3.5">
                <img 
                  src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                  alt={user?.fullName} 
                  className="w-11 h-11 rounded-full border border-slate-800 object-cover flex-shrink-0"
                />
                <div className="overflow-hidden space-y-1">
                  <p className="text-xs font-bold text-slate-100 truncate leading-none">{user?.fullName}</p>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-[8px] uppercase font-bold tracking-wider text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/15">
                      {isDemo ? 'DEMO ACCOUNT' : 'REAL ACCOUNT'}
                    </span>
                    <span className="font-mono text-[9px] text-slate-500 font-bold">
                      {formatCurrency(activeBalance, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Links List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin">
                {drawerItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={item.action}
                      className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold rounded-xl text-slate-300 hover:bg-slate-850/60 hover:text-slate-100 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center space-x-3.5">
                        <Icon className={`w-4 h-4 ${item.color || 'text-slate-450'}`} />
                        <span className={item.color || ''}>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[8px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Logout Footer Row */}
            <div className="p-4 border-t border-slate-850 bg-slate-950/20">
              <button 
                onClick={() => handleAction(handleLogout)}
                className="w-full py-3 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 text-xs font-bold uppercase rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

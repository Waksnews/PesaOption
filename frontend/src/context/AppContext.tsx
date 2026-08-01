/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, Wallet, Transaction, Trade, SupportTicket, 
  Announcement, Notification, MarketPrice, UserRole, ActivityLog,
  OwnerStats, SystemHealth, OwnerConfig, WithdrawalRequest
} from '../types';
import { useMarketStore } from '../stores/marketStore';
import { useTradeStore } from '../stores/tradeStore';
import { useWalletStore } from '../stores/walletStore';
import { useHistoryStore } from '../stores/historyStore';
import { useNotificationStore } from '../stores/notificationStore';

interface AppContextType {
  user: User | null;
  token: string | null;
  prices: MarketPrice[];
  wallets: Wallet[];
  transactions: Transaction[];
  openPositions: Trade[];
  closedTrades: Trade[];
  supportTickets: SupportTicket[];
  notifications: Notification[];
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  adminData: {
    users: (User & { wallets: Wallet[] })[];
    trades: (Trade & { userEmail: string; userFullName: string })[];
    transactions: (Transaction & { userEmail: string; userFullName: string })[];
    tickets: SupportTicket[];
    withdrawalRequests: WithdrawalRequest[];
    stats: {
      totalUsers: number;
      totalTrades: number;
      totalSupportTickets: number;
      openSupportTickets: number;
      totalAssetVolume: number;
      totalTraderPnl: number;
      assetDistribution: { name: string; value: number }[];
    } | null;
    logs: ActivityLog[];
  };
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string, referralCode?: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (fullName: string, avatarUrl?: string) => Promise<boolean>;
  changePassword: (current: string, newPass: string) => Promise<boolean>;
  depositFunds: (amount: number, asset: string, isDemo: boolean) => Promise<boolean>;
  withdrawFunds: (amount: number, asset: string, isDemo: boolean, address?: string) => Promise<boolean>;
  openTrade: (
    symbol: string, 
    type: 'buy' | 'sell', 
    quantity: number, 
    isDemo: boolean, 
    contractType?: string, 
    prediction?: string, 
    durationSeconds?: number
  ) => Promise<boolean>;
  closeTrade: (tradeId: string) => Promise<boolean>;
  createTicket: (title: string, description: string) => Promise<boolean>;
  replyTicket: (ticketId: string, message: string) => Promise<boolean>;
  refreshUserData: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  
  // Admin Methods
  fetchAdminData: () => Promise<void>;
  adminCloseTrade: (tradeId: string) => Promise<boolean>;
  adminUpdateTx: (txId: string, status: 'completed' | 'rejected') => Promise<boolean>;
  adminCreateAnnouncement: (title: string, content: string, type: 'info' | 'warning' | 'success') => Promise<boolean>;
  adminDeleteAnnouncement: (id: string) => Promise<boolean>;
  adminChangeRole: (userId: string, role: UserRole) => Promise<boolean>;
  adminAdjustWallet: (payload: {
    targetUserId: string;
    actionType: 'credit' | 'debit' | 'reset';
    amount?: number;
    reason: string;
    asset?: string;
  }) => Promise<{ success: boolean; refId?: string; error?: string }>;
  adminApproveWithdrawal: (id: string) => Promise<boolean>;
  adminRejectWithdrawal: (id: string, remarks?: string) => Promise<boolean>;

  // Owner Suite
  ownerStats: OwnerStats | null;
  systemHealth: SystemHealth | null;
  ownerConfig: OwnerConfig | null;
  ownerLogs: (ActivityLog & { userEmail: string; userRole: string })[];
  fetchOwnerData: () => Promise<void>;
  updateOwnerConfig: (config: Partial<OwnerConfig>) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cth_token'));
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openPositions, setOpenPositions] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [adminData, setAdminData] = useState<AppContextType['adminData']>({
    users: [],
    trades: [],
    transactions: [],
    tickets: [],
    withdrawalRequests: [],
    stats: null,
    logs: []
  });

  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [ownerConfig, setOwnerConfig] = useState<OwnerConfig | null>(null);
  const [ownerLogs, setOwnerLogs] = useState<(ActivityLog & { userEmail: string; userRole: string })[]>([]);

  // Base API caller
  const callApi = useCallback(async (path: string, options: RequestInit = {}) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const fullPath = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {})
    };

    const res = await fetch(fullPath, { ...options, headers });
    let data: any;

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText || 'Server Error'}`);
      }
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Unexpected non-JSON response from ${path}`);
      }
    }

    if (!res.ok) {
      throw new Error(data?.error || `Request failed with status ${res.status}`);
    }
    return data;
  }, [token]);

  // Fetch general announcements (no auth required)
  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await callApi('/api/announcements');
      setAnnouncements(data);
    } catch (e) {
      console.error('Failed to fetch announcements:', e);
    }
  }, [callApi]);

  // Refresh current user portfolio assets, trades, and tickets
  const refreshUserData = useCallback(async () => {
    if (!token) return;
    try {
      const [balances, txs, openP, history, tickets, notifs] = await Promise.all([
        callApi('/api/wallet/balances'),
        callApi('/api/wallet/transactions'),
        callApi('/api/trade/positions'),
        callApi('/api/trade/history'),
        callApi('/api/support/tickets'),
        callApi('/api/notifications')
      ]);

      setWallets(balances);
      setTransactions(txs);
      setOpenPositions(openP);
      setClosedTrades(history);
      setSupportTickets(tickets);
      setNotifications(notifs);
    } catch (e) {
      console.error('Error syncing portfolio:', e);
    }
  }, [token, callApi]);

  // Fetch admin suite data
  const fetchAdminData = useCallback(async () => {
    if (!token || (user?.role !== 'admin' && user?.role !== 'owner')) return;
    try {
      const [allUsers, allTrades, allTxs, allTickets, allWreqs, stats, logs] = await Promise.all([
        callApi('/api/admin/users'),
        callApi('/api/admin/trades'),
        callApi('/api/admin/transactions'),
        callApi('/api/admin/tickets'),
        callApi('/api/admin/withdrawals'),
        callApi('/api/admin/stats'),
        callApi('/api/admin/logs')
      ]);

      setAdminData({
        users: allUsers,
        trades: allTrades,
        transactions: allTxs,
        tickets: allTickets,
        withdrawalRequests: allWreqs || [],
        stats,
        logs
      });
    } catch (e) {
      console.error('Error fetching admin panels:', e);
    }
  }, [token, user, callApi]);

  // Fetch owner suite data
  const fetchOwnerData = useCallback(async () => {
    if (!token || user?.role !== 'owner') return;
    try {
      const [oStats, health, cfg, oLogs] = await Promise.all([
        callApi('/api/owner/stats'),
        callApi('/api/owner/system-health'),
        callApi('/api/owner/config'),
        callApi('/api/owner/logs')
      ]);

      setOwnerStats(oStats);
      setSystemHealth(health);
      setOwnerConfig(cfg);
      setOwnerLogs(oLogs);
    } catch (e) {
      console.error('Error fetching owner data:', e);
    }
  }, [token, user, callApi]);

  const updateOwnerConfig = async (newCfg: Partial<OwnerConfig>): Promise<boolean> => {
    try {
      const res = await callApi('/api/owner/config', {
        method: 'POST',
        body: JSON.stringify(newCfg)
      });
      setOwnerConfig(res.config);
      await fetchOwnerData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  // Handle auto load of user profile on mount / token change
  useEffect(() => {
    const initProfile = async () => {
      if (token) {
        try {
          const profile = await callApi('/api/auth/me');
          setUser(profile);
          await refreshUserData();
        } catch (e) {
          console.error('Invalid token, logging out', e);
          logout();
        }
      }
      fetchAnnouncements();
      setLoading(false);
    };

    initProfile();
  }, [token]);

  // SSE Real-Time pricing connection setup
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const rawPath = user ? `/api/realtime?userId=${user.id}` : '/api/realtime';
    const url = `${baseUrl}${rawPath}`;
    const sse = new EventSource(url);

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'price_feed') {
          // 1. Update general pricing feed
          setPrices(payload.prices);
          useMarketStore.getState().setPrices(payload.prices);
          
          // 2. Compute last digit for selected symbol
          const selectedSymbol = useMarketStore.getState().selectedSymbol;
          const currentPriceItem = payload.prices.find((p: any) => p.symbol === selectedSymbol);
          if (currentPriceItem) {
            const decimals = currentPriceItem.category === 'forex' ? 4 : 2;
            const priceStr = currentPriceItem.price.toFixed(decimals);
            const lastDigit = parseInt(priceStr[priceStr.length - 1], 10) || 0;
            useTradeStore.getState().addDigit(lastDigit);
          }

          // 3. Update user's open positions
          if (payload.activeTrades && token && user) {
            const userOpenTrades = payload.activeTrades.filter((t: Trade) => t.userId === user.id);
            setOpenPositions(userOpenTrades);
            useTradeStore.getState().setOpenPositions(userOpenTrades);
          }

          // 4. Update user's specific data
          if (payload.wallets) {
            setWallets(payload.wallets);
            useWalletStore.getState().setWallets(payload.wallets);
          }
          if (payload.closedTrades) {
            setClosedTrades(payload.closedTrades);
            useTradeStore.getState().setClosedTrades(payload.closedTrades);
            useHistoryStore.getState().setClosedTrades(payload.closedTrades);
          }
          if (payload.transactions) {
            setTransactions(payload.transactions);
            useHistoryStore.getState().setTransactions(payload.transactions);
          }
          if (payload.notifications) {
            setNotifications(payload.notifications);
            useNotificationStore.getState().setNotifications(payload.notifications);
          }
        }
      } catch (err) {
        console.error('SSE JSON error', err);
      }
    };

    sse.onerror = (e) => {
      console.warn('Real-time connection stream reconnecting...', e);
    };

    return () => {
      sse.close();
    };
  }, [token, user]);

  // Auth Operations
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      const res = await callApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('cth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return true;
    } catch (e: any) {
      setError(e.message || 'Login failed');
      return false;
    }
  };

  const register = async (email: string, password: string, fullName: string, referralCode?: string): Promise<boolean> => {
    try {
      setError(null);
      const res = await callApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName, referralCode })
      });
      localStorage.setItem('cth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return true;
    } catch (e: any) {
      setError(e.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('cth_token');
    setToken(null);
    setUser(null);
    setWallets([]);
    setTransactions([]);
    setOpenPositions([]);
    setClosedTrades([]);
    setSupportTickets([]);
    setNotifications([]);
  };

  const updateProfile = async (fullName: string, avatarUrl?: string): Promise<boolean> => {
    try {
      const res = await callApi('/api/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, avatarUrl })
      });
      setUser(res.user);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const changePassword = async (current: string, newPass: string): Promise<boolean> => {
    try {
      setError(null);
      await callApi('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: current, newPassword: newPass })
      });
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  // Fund Operations
  const depositFunds = async (amount: number, asset: string, isDemo: boolean): Promise<boolean> => {
    try {
      await callApi('/api/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount, asset, isDemo })
      });
      await refreshUserData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const withdrawFunds = async (amount: number, asset: string, isDemo: boolean, address?: string): Promise<boolean> => {
    try {
      await callApi('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, asset, isDemo, address })
      });
      await refreshUserData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  // Trading Operations
  const openTrade = async (
    symbol: string, 
    type: 'buy' | 'sell', 
    quantity: number, 
    isDemo: boolean,
    contractType?: string,
    prediction?: string,
    durationSeconds?: number
  ): Promise<boolean> => {
    try {
      setError(null);
      await callApi('/api/trade/open', {
        method: 'POST',
        body: JSON.stringify({ symbol, type, quantity, isDemo, contractType, prediction, durationSeconds })
      });
      await refreshUserData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const closeTrade = async (tradeId: string): Promise<boolean> => {
    try {
      setError(null);
      await callApi('/api/trade/close', {
        method: 'POST',
        body: JSON.stringify({ tradeId })
      });
      await refreshUserData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  // Support
  const createTicket = async (title: string, description: string): Promise<boolean> => {
    try {
      await callApi('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ title, description })
      });
      await refreshUserData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const replyTicket = async (ticketId: string, message: string): Promise<boolean> => {
    try {
      await callApi(`/api/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      await refreshUserData();
      if (user?.role === 'admin') {
        await fetchAdminData();
      }
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const markNotificationsRead = async () => {
    try {
      await callApi('/api/notifications/read-all', { method: 'POST' });
      await refreshUserData();
    } catch (e) {
      console.error(e);
    }
  };

  // ============================================================================
  // ADMIN PANEL OPERATIONS
  // ============================================================================
  const adminCloseTrade = async (tradeId: string): Promise<boolean> => {
    try {
      await callApi(`/api/admin/trades/${tradeId}/close`, { method: 'POST' });
      await fetchAdminData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const adminUpdateTx = async (txId: string, status: 'completed' | 'rejected'): Promise<boolean> => {
    try {
      await callApi(`/api/admin/transactions/${txId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      await fetchAdminData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const adminCreateAnnouncement = async (title: string, content: string, type: 'info' | 'warning' | 'success'): Promise<boolean> => {
    try {
      await callApi('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, content, type })
      });
      await fetchAnnouncements();
      await fetchAdminData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const adminDeleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
      await callApi(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      await fetchAnnouncements();
      await fetchAdminData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const adminChangeRole = async (userId: string, role: UserRole): Promise<boolean> => {
    try {
      await callApi(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      });
      await fetchAdminData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const adminAdjustWallet = async (payload: {
    targetUserId: string;
    actionType: 'credit' | 'debit' | 'reset';
    amount?: number;
    reason: string;
    asset?: string;
  }) => {
    try {
      const res = await callApi('/api/admin/wallet/adjust', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await fetchAdminData();
      await refreshUserData();
      return { success: true, refId: res.refId };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message || 'Failed to adjust wallet.' };
    }
  };

  const adminApproveWithdrawal = async (id: string): Promise<boolean> => {
    try {
      await callApi(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
      await fetchAdminData();
      await refreshUserData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  const adminRejectWithdrawal = async (id: string, remarks?: string): Promise<boolean> => {
    try {
      await callApi(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ remarks })
      });
      await fetchAdminData();
      await refreshUserData();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      user, token, prices, wallets, transactions, openPositions, closedTrades, supportTickets, notifications, announcements, loading, error, adminData,
      login, register, logout, updateProfile, changePassword, depositFunds, withdrawFunds, openTrade, closeTrade, createTicket, replyTicket, refreshUserData, markNotificationsRead,
      fetchAdminData, adminCloseTrade, adminUpdateTx, adminCreateAnnouncement, adminDeleteAnnouncement, adminChangeRole, adminAdjustWallet, adminApproveWithdrawal, adminRejectWithdrawal,
      ownerStats, systemHealth, ownerConfig, ownerLogs, fetchOwnerData, updateOwnerConfig
    }}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useNotificationStore } from '../../stores/notificationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency, getUsdKesRate, setUsdKesRate } from '../../lib/currency';
import { callApi } from '../../lib/api';
import { 
  ShieldCheck, Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, 
  Users, History, Search, CheckCircle2, AlertCircle, PlusCircle, 
  MinusCircle, Sparkles, FileText, Megaphone, Trash2, Shield,
  Crown, Server, Activity, Database, Lock, Key, Mail, Cpu, Settings, X
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const AdminView: React.FC = () => {
  const { 
    user, adminData, fetchAdminData, adminAdjustWallet, adminChangeRole, adminCreateAnnouncement, adminDeleteAnnouncement,
    ownerStats, systemHealth, ownerConfig, ownerLogs, fetchOwnerData, updateOwnerConfig,
    adminApproveWithdrawal, adminRejectWithdrawal
  } = useApp();
  const { addToast } = useNotificationStore();
  const { currency } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'owner' | 'payments' | 'withdrawals' | 'wallet' | 'users' | 'trades' | 'announcements' | 'exchange_rates' | 'platform_settings' | 'logs'>(
    user?.role === 'owner' ? 'owner' : 'payments'
  );

  // Platform Settings State (Minimum Deposit Limits)
  const [minDepositKESInput, setMinDepositKESInput] = useState<string>('100');
  const [minDepositUSDInput, setMinDepositUSDInput] = useState<string>('5');
  const [isSavingPlatformSettings, setIsSavingPlatformSettings] = useState<boolean>(false);

  // Exchange Rate State
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(getUsdKesRate().toString());
  const [isSavingRate, setIsSavingRate] = useState<boolean>(false);

  useEffect(() => {
    callApi<{ success: boolean; usdKesRate: number }>('/api/exchange-rates')
      .then(data => {
        if (data && data.usdKesRate) {
          setExchangeRateInput(data.usdKesRate.toString());
          setUsdKesRate(data.usdKesRate);
        }
      })
      .catch(() => {});

    callApi<{ minimumDepositKES: number; minimumDepositUSD: number }>('/api/admin/settings')
      .then(data => {
        if (data) {
          if (data.minimumDepositKES !== undefined) setMinDepositKESInput(data.minimumDepositKES.toString());
          if (data.minimumDepositUSD !== undefined) setMinDepositUSDInput(data.minimumDepositUSD.toString());
        }
      })
      .catch(() => {});
  }, []);

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const kesNum = parseFloat(minDepositKESInput);
    const usdNum = parseFloat(minDepositUSDInput);

    if (isNaN(kesNum) || kesNum <= 0) {
      addToast('Validation Error', 'Minimum deposit for KES must be greater than 0.', 'error');
      return;
    }
    if (isNaN(usdNum) || usdNum <= 0) {
      addToast('Validation Error', 'Minimum deposit for USD must be greater than 0.', 'error');
      return;
    }

    setIsSavingPlatformSettings(true);
    try {
      const res = await callApi<{ success: boolean; message: string; settings: any }>('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({ minimumDepositKES: kesNum, minimumDepositUSD: usdNum })
      });

      if (res && res.success) {
        addToast('Platform Settings Saved', res.message || 'Minimum deposit limits updated successfully.', 'success');
      } else {
        addToast('Update Failed', 'Failed to update platform settings.', 'error');
      }
    } catch (err: any) {
      addToast('Update Error', err.message || 'Error updating platform settings.', 'error');
    } finally {
      setIsSavingPlatformSettings(false);
    }
  };

  const handleUpdateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(exchangeRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      addToast('Validation Error', 'Please enter a valid positive exchange rate.', 'error');
      return;
    }

    setIsSavingRate(true);
    try {
      const res = await callApi<{ success: boolean; rate: number; message: string }>('/api/admin/exchange-rates', {
        method: 'POST',
        body: JSON.stringify({ rate: rateNum, pair: 'USD/KES' })
      });

      if (res && res.success) {
        setUsdKesRate(res.rate);
        setExchangeRateInput(res.rate.toString());
        addToast('Rate Updated', res.message || `Successfully updated exchange rate to 1 USD = ${res.rate} KES`, 'success');
      } else {
        addToast('Update Failed', 'Failed to update exchange rate.', 'error');
      }
    } catch (err: any) {
      addToast('Update Error', err.message || 'Error updating exchange rate.', 'error');
    } finally {
      setIsSavingRate(false);
    }
  };
  
  // Payment Management State
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'>('ALL');
  const [paymentSearch, setPaymentSearch] = useState<string>('');

  // Withdrawal Management State
  const [withdrawalFilter, setWithdrawalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [withdrawalSearch, setWithdrawalSearch] = useState<string>('');
  const [rejectingReq, setRejectingReq] = useState<any | null>(null);
  const [rejectRemarksInput, setRejectRemarksInput] = useState<string>('');
  const [processingWreqId, setProcessingWreqId] = useState<string | null>(null);
  
  // Owner Platform Config Form State
  const [cfgSmtpHost, setCfgSmtpHost] = useState(ownerConfig?.smtpHost || 'smtp.pesaoption.com');
  const [cfgSmtpPort, setCfgSmtpPort] = useState(ownerConfig?.smtpPort?.toString() || '587');
  const [cfgSmtpUser, setCfgSmtpUser] = useState(ownerConfig?.smtpUser || 'notifications@pesaoption.com');
  const [cfgEmailFrom, setCfgEmailFrom] = useState(ownerConfig?.emailFrom || 'PesaOption System <no-reply@pesaoption.com>');
  const [cfgLipiaApiKey, setCfgLipiaApiKey] = useState(ownerConfig?.lipiaApiKey || '');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState<boolean>(false);

  useEffect(() => {
    if (ownerConfig) {
      setCfgSmtpHost(ownerConfig.smtpHost);
      setCfgSmtpPort(ownerConfig.smtpPort.toString());
      setCfgSmtpUser(ownerConfig.smtpUser);
      setCfgEmailFrom(ownerConfig.emailFrom);
      setCfgLipiaApiKey(ownerConfig.lipiaApiKey || '');
    }
  }, [ownerConfig]);

  // Wallet Manager State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [actionType, setActionType] = useState<'credit' | 'debit' | 'reset'>('credit');
  const [amountInput, setAmountInput] = useState<string>('500');
  const [reasonInput, setReasonInput] = useState<string>('Manual Admin Credit');
  const [assetInput, setAssetInput] = useState<string>('USD');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [lastRefId, setLastRefId] = useState<string | null>(null);

  // Self Admin Wallet Quick Actions State
  const [selfActionType, setSelfActionType] = useState<'credit' | 'debit' | 'reset'>('credit');
  const [selfAmount, setSelfAmount] = useState<string>('1000');
  const [selfReason, setSelfReason] = useState<string>('Admin Treasury Allocation');
  const [isSelfSubmitting, setIsSelfSubmitting] = useState<boolean>(false);

  // Announcement State
  const [annTitle, setAnnTitle] = useState<string>('');
  const [annContent, setAnnContent] = useState<string>('');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'success'>('info');

  useEffect(() => {
    fetchAdminData();
    if (user?.role === 'owner') {
      fetchOwnerData();
    }
  }, [fetchAdminData, fetchOwnerData, user]);

  // Authorization check: allow both 'admin' and 'owner'
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return <Navigate to="/" replace />;
  }

  const registeredUsers = adminData.users || [];
  const allTxs = adminData.transactions || [];
  const adminManualTxs = allTxs.filter(t => t.type === 'admin_credit' || t.type === 'admin_debit' || (t.type as string) === 'Admin Credit' || (t.type as string) === 'Admin Debit');

  const allPayments = (adminData.payments || []).map((p: any) => ({
    ...p,
    normalizedStatus: p.normalizedStatus || (p.status === 'Completed' ? 'SUCCESS' : p.status === 'Failed' ? 'FAILED' : p.status === 'Cancelled' ? 'CANCELLED' : 'PENDING')
  }));

  const filteredPayments = allPayments.filter((p: any) => {
    const matchesFilter = paymentFilter === 'ALL' || p.normalizedStatus === paymentFilter || p.status.toUpperCase() === paymentFilter;
    const searchLower = paymentSearch.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      (p.reference || '').toLowerCase().includes(searchLower) ||
      (p.invoiceId || '').toLowerCase().includes(searchLower) ||
      (p.userEmail || '').toLowerCase().includes(searchLower) ||
      (p.userFullName || '').toLowerCase().includes(searchLower) ||
      (p.phone || '').includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // Filter users for selector
  const filteredUsers = registeredUsers.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedTargetUser = registeredUsers.find(u => u.id === selectedUserId) || registeredUsers[0];
  const selectedUserWallet = selectedTargetUser?.wallets?.find(w => w.asset === 'USD');

  // Find admin's own USD wallet
  const adminUserRecord = registeredUsers.find(u => u.id === user.id);
  const adminWallet = adminUserRecord?.wallets?.find(w => w.asset === 'USD');
  const adminBalance = adminWallet ? adminWallet.balance : 0;

  // Handle Registered User Wallet Adjustment
  const handleUserAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetUser) {
      addToast('Validation Error', 'Please select a registered user to adjust.', 'error');
      return;
    }

    if (!reasonInput.trim()) {
      addToast('Validation Error', 'A clear reason for manual adjustment is required.', 'error');
      return;
    }

    const numAmount = parseFloat(amountInput);
    if (actionType !== 'reset' && (isNaN(numAmount) || numAmount <= 0)) {
      addToast('Validation Error', 'Enter a valid positive dollar amount.', 'error');
      return;
    }

    setIsSubmitting(true);
    setLastRefId(null);

    const result = await adminAdjustWallet({
      targetUserId: selectedTargetUser.id,
      actionType,
      amount: actionType === 'reset' ? (isNaN(numAmount) ? 0 : numAmount) : numAmount,
      reason: reasonInput,
      asset: assetInput
    });

    setIsSubmitting(false);

    if (result.success) {
      setLastRefId(result.refId || 'ADM-TX-SUCCESS');
      addToast(
        'Wallet Adjustment Complete',
        `Successfully processed ${actionType.toUpperCase()} for ${selectedTargetUser.fullName}. Ref: ${result.refId}`,
        'success'
      );
    } else {
      addToast('Adjustment Failed', result.error || 'Failed to update user wallet.', 'error');
    }
  };

  // Handle Admin Self Wallet Adjustment
  const handleSelfAdjustment = async (action: 'credit' | 'debit' | 'reset') => {
    const amountVal = parseFloat(selfAmount);
    if (action !== 'reset' && (isNaN(amountVal) || amountVal <= 0)) {
      addToast('Validation Error', 'Enter a valid positive dollar amount for admin wallet.', 'error');
      return;
    }

    setIsSelfSubmitting(true);
    const result = await adminAdjustWallet({
      targetUserId: user.id,
      actionType: action,
      amount: action === 'reset' ? 0 : amountVal,
      reason: selfReason || `Admin Wallet ${action.toUpperCase()}`,
      asset: 'USD'
    });
    setIsSelfSubmitting(false);

    if (result.success) {
      addToast(
        'Admin Wallet Updated',
        `Admin wallet ${action} processed instantly. Ref: ${result.refId}`,
        'success'
      );
    } else {
      addToast('Operation Failed', result.error || 'Failed to adjust admin wallet.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-xs font-sans pb-12">
      
      {/* Top Banner Header */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl border ${
                user?.role === 'owner'
                  ? 'bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400'
                  : 'bg-gradient-to-tr from-teal-500/20 to-blue-500/20 border-teal-500/30 text-teal-400'
              }`}>
                {user?.role === 'owner' ? <Crown className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <h1 className="text-lg font-black font-sans uppercase tracking-wider text-slate-100">
                {user?.role === 'owner' ? 'PesaOption Executive & Owner Panel' : 'PesaOption Admin Panel'}
              </h1>
              {user?.role === 'owner' ? (
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono font-bold uppercase rounded-full flex items-center space-x-1">
                  <Crown className="w-3 h-3" />
                  <span>Role: Platform Owner</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[9px] font-mono font-bold uppercase rounded-full">
                  Role: Administrator
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs">
              {user?.role === 'owner'
                ? 'Full system governance, platform statistics, health monitoring, gateway config, and security audit logs.'
                : 'Executive controls, real-time wallet ledger manager, and user authorization tools.'}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-3 bg-slate-950/80 p-3 rounded-xl border border-slate-850">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">
                {user?.role === 'owner' ? 'Owner Treasury Balance' : 'Admin Real Balance'}
              </p>
              <p className={`text-sm font-mono font-black ${user?.role === 'owner' ? 'text-amber-400' : 'text-teal-400'}`}>
                {formatCurrency(adminBalance, currency)}
              </p>
            </div>
            <button
              onClick={() => {
                fetchAdminData();
                if (user?.role === 'owner') fetchOwnerData();
              }}
              className="p-2 bg-[#0D1527] hover:bg-[#131E38] border border-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-850/80 mt-6">
          {[
            ...(user?.role === 'owner' ? [{ id: 'owner', label: 'Owner Dashboard', icon: Crown, badge: 'OWNER' }] : []),
            { 
              id: 'payments', 
              label: 'Payment Deposits', 
              icon: ArrowDownLeft, 
              badge: (adminData.payments || []).length 
            },
            { 
              id: 'withdrawals', 
              label: 'Withdrawal Requests', 
              icon: ArrowUpRight, 
              badge: (adminData.withdrawalRequests || []).filter(w => w.status === 'PENDING').length 
            },
            { id: 'wallet', label: 'Wallet Manager', icon: Wallet, badge: registeredUsers.length },
            { id: 'users', label: 'Registered Users', icon: Users, badge: registeredUsers.length },
            { id: 'trades', label: 'Trading Desk Oversight', icon: History, badge: adminData.trades?.length || 0 },
            { id: 'announcements', label: 'System Bulletins', icon: Megaphone },
            { id: 'platform_settings', label: 'Platform Settings', icon: Settings },
            { id: 'exchange_rates', label: 'Exchange Rates', icon: RefreshCw },
            { id: 'logs', label: 'Activity Logs', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const isOwnerTab = tab.id === 'owner';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                  active 
                    ? isOwnerTab
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/5'
                      : 'bg-gradient-to-r from-teal-500/20 to-blue-500/20 text-teal-300 border border-teal-500/30 shadow-lg shadow-teal-500/5' 
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-850 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? (isOwnerTab ? 'text-amber-400' : 'text-teal-400') : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                    isOwnerTab ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 border border-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: OWNER DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'owner' && user?.role === 'owner' && (
        <div className="space-y-6">
          
          {/* Platform Statistics Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#090D1A] border border-amber-500/20 p-4 rounded-2xl shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Users</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-mono font-black text-slate-100">
                {ownerStats?.totalUsers || registeredUsers.length}
              </p>
              <span className="text-[9px] font-mono text-amber-400/80">
                {ownerStats?.totalAdmins || 0} Admins Active
              </span>
            </div>

            <div className="bg-[#090D1A] border border-emerald-500/20 p-4 rounded-2xl shadow-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Deposits</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-mono font-black text-emerald-400">
                {formatCurrency(ownerStats?.totalDepositsAmount || 0, currency)}
              </p>
              <span className="text-[9px] font-mono text-emerald-500/80">Completed Ingress</span>
            </div>

            <div className="bg-[#090D1A] border border-rose-500/20 p-4 rounded-2xl shadow-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Withdrawals</span>
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xl font-mono font-black text-rose-400">
                {formatCurrency(ownerStats?.totalWithdrawalsAmount || 0, currency)}
              </p>
              <span className="text-[9px] font-mono text-rose-500/80">Settled Egress</span>
            </div>

            <div className="bg-[#090D1A] border border-blue-500/20 p-4 rounded-2xl shadow-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Trading Volume</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xl font-mono font-black text-blue-400">
                {formatCurrency(ownerStats?.totalTradingVolume || 0, currency)}
              </p>
              <span className="text-[9px] font-mono text-blue-500/80">Options & Spot Stakes</span>
            </div>

            <div className="bg-[#090D1A] border border-amber-500/30 p-4 rounded-2xl shadow-xl space-y-2 bg-gradient-to-br from-[#090D1A] to-amber-950/20">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase">Platform Profit</span>
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-mono font-black text-amber-400">
                {formatCurrency(ownerStats?.platformEstimatedProfit || 0, currency)}
              </p>
              <span className="text-[9px] font-mono text-amber-400/80">Estimated Treasury</span>
            </div>

            <div className="bg-[#090D1A] border border-teal-500/20 p-4 rounded-2xl shadow-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">DB Engine</span>
                <Database className="w-4 h-4 text-teal-400" />
              </div>
              <p className="text-lg font-mono font-black text-teal-400">
                {systemHealth?.databaseStatus || 'Healthy'}
              </p>
              <span className="text-[9px] font-mono text-slate-400">{systemHealth?.databaseSizeKb || 14} KB JSON Store</span>
            </div>
          </div>

          {/* System Health & Maintenance Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* System Health Status */}
            <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                    System Health & Infrastructure Status
                  </h3>
                </div>
                <button
                  onClick={() => fetchOwnerData()}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Refresh System Health"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <div className="flex items-center space-x-3">
                    <Database className="w-4 h-4 text-teal-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">JSON Store Database</p>
                      <p className="text-[10px] font-mono text-slate-500">Persistent storage engine (`db-store.json`)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase rounded-full">
                    {systemHealth?.databaseStatus || 'Healthy'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">SMTP Mail Server</p>
                      <p className="text-[10px] font-mono text-slate-500">{ownerConfig?.smtpHost || 'smtp.pesaoption.com'}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold uppercase rounded-full">
                    {systemHealth?.smtpStatus || 'Configured'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <div className="flex items-center space-x-3">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">Lipia Online Gateway</p>
                      <p className="text-[10px] font-mono text-slate-500">API Key integration & Callbacks</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase rounded-full">
                    {systemHealth?.lipiaStatus || 'Configured'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <div className="flex items-center space-x-3">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">Server Uptime</p>
                      <p className="text-[10px] font-mono text-slate-500">Container Uptime Counter</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {Math.floor((systemHealth?.uptimeSeconds || 0) / 60)} mins
                  </span>
                </div>
              </div>
            </div>

            {/* Platform Maintenance & Configuration Panel */}
            <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                <div className="flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide">
                    Platform Settings & Maintenance Mode
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* Maintenance Mode Toggle */}
                <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/20 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                      <span>Platform Maintenance Mode</span>
                      {ownerConfig?.maintenanceMode && (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[9px] font-mono font-bold uppercase rounded">ACTIVE</span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      When enabled, non-owner users will see a system maintenance alert notice.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const newStatus = !ownerConfig?.maintenanceMode;
                      const ok = await updateOwnerConfig({ maintenanceMode: newStatus });
                      if (ok) {
                        addToast('Maintenance Mode Updated', `Maintenance Mode is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`, newStatus ? 'info' : 'success');
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                      ownerConfig?.maintenanceMode
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {ownerConfig?.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>

                {/* Gateway & SMTP Settings Form */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsUpdatingConfig(true);
                    const ok = await updateOwnerConfig({
                      smtpHost: cfgSmtpHost,
                      smtpPort: parseInt(cfgSmtpPort, 10) || 587,
                      smtpUser: cfgSmtpUser,
                      emailFrom: cfgEmailFrom,
                      lipiaApiKey: cfgLipiaApiKey
                    });
                    setIsUpdatingConfig(false);
                    if (ok) {
                      addToast('Config Saved', 'Platform Gateway, SMTP, and Security settings updated.', 'success');
                    }
                  }}
                  className="space-y-3 pt-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase">SMTP Host</label>
                      <input
                        type="text"
                        value={cfgSmtpHost}
                        onChange={e => setCfgSmtpHost(e.target.value)}
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase">SMTP Port</label>
                      <input
                        type="text"
                        value={cfgSmtpPort}
                        onChange={e => setCfgSmtpPort(e.target.value)}
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Lipia Online API Key</label>
                    <input
                      type="password"
                      placeholder="e.g. lipia_live_..."
                      value={cfgLipiaApiKey}
                      onChange={e => setCfgLipiaApiKey(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingConfig}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{isUpdatingConfig ? 'Saving Settings...' : 'Save Gateway & SMTP Settings'}</span>
                  </button>
                </form>

              </div>
            </div>

          </div>

          {/* Owner Audit Security Activity Logs Table */}
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div>
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Owner Audit & Security Activity Logs</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Full security log of administrative actions, platform configurations, user role updates, and IP logging.
                </p>
              </div>

              <span className="text-[10px] font-mono text-slate-400">
                {ownerLogs.length} Security Logs Recorded
              </span>
            </div>

            {ownerLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                No security activity logs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                      <th className="py-3">Timestamp</th>
                      <th>Action</th>
                      <th>User Account</th>
                      <th>Role</th>
                      <th>IP Address</th>
                      <th>Log Details & Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300 text-xs">
                    {ownerLogs.slice(0, 50).map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 font-mono text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold uppercase rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="font-semibold text-slate-200">
                          {log.userEmail}
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            log.userRole === 'owner' ? 'bg-amber-500/20 text-amber-300' : log.userRole === 'admin' ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {log.userRole}
                          </span>
                        </td>
                        <td className="font-mono text-slate-400 text-[10px]">
                          {log.ipAddress}
                        </td>
                        <td className="text-slate-400 text-[11px] max-w-[280px] truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PAYMENT DEPOSITS MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-850">
              <div>
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                  <span>Lipia Payment Deposits Management</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Monitor live M-PESA STK Push & Card Deposit transactions with automatic wallet synchronization.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'] as const).map(st => {
                  const count = st === 'ALL' 
                    ? allPayments.length 
                    : allPayments.filter((p: any) => p.normalizedStatus === st || p.status?.toUpperCase() === st).length;
                  const active = paymentFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setPaymentFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center space-x-1.5 ${
                        active 
                          ? st === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : st === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : st === 'FAILED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                          : 'bg-slate-950 text-slate-400 border border-slate-850 hover:bg-slate-900'
                      }`}
                    >
                      <span>{st}</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-slate-900/80 rounded border border-slate-800 text-slate-300 font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by reference (e.g. PO-DEP-XXXXXXXX), user email, phone, or invoice ID..."
                value={paymentSearch}
                onChange={e => setPaymentSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-850 text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5">Currency</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Provider Ref</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Created</th>
                    <th className="p-3.5">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 text-slate-300">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 italic font-mono">
                        No payment deposit records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p: any) => {
                      const norm = p.normalizedStatus || (p.status === 'Completed' ? 'SUCCESS' : p.status?.toUpperCase());
                      return (
                        <tr key={p.id} className="hover:bg-slate-900/50 transition">
                          <td className="p-3.5 font-mono font-bold text-teal-400 whitespace-nowrap">
                            {p.reference || p.invoiceId || p.id}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div>
                              <p className="font-bold text-slate-100">{p.userFullName || 'Trader'}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{p.userEmail}</p>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">
                            {p.phone || 'N/A'}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                            {Number(p.amount).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                            {p.currency || 'KES'}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                              {p.paymentMethod || 'M-PESA'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                            {p.invoiceId || '-'}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase inline-flex items-center space-x-1 ${
                              norm === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : norm === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                              : norm === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400'
                            }`}>
                              <span>{norm}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {new Date(p.createdAt || p.created).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                            {p.completed || p.updatedAt ? new Date(p.completed || p.updatedAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: WITHDRAWAL REQUESTS MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          
          {/* Header & Stats Banner */}
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-850">
              <div>
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2">
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
                  <span>Withdrawal Requests & Finance Review</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage user payout orders. Approvals dispatch live SMS & Email notifications to traders. Rejections instantly refund the reserved balance.
                </p>
              </div>

              <button
                onClick={() => fetchAdminData()}
                className="flex items-center space-x-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                <span>Refresh Requests</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/20 space-y-1">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Pending Review</span>
                <p className="text-xl font-mono font-black text-amber-300">
                  {(adminData.withdrawalRequests || []).filter(w => w.status === 'PENDING').length}
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Total: ${(adminData.withdrawalRequests || []).filter(w => w.status === 'PENDING').reduce((acc, w) => acc + w.amount, 0).toLocaleString()} USD
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/20 space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Approved & Paid</span>
                <p className="text-xl font-mono font-black text-emerald-300">
                  {(adminData.withdrawalRequests || []).filter(w => w.status === 'APPROVED' || w.status === 'COMPLETED').length}
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Dispatched: ${(adminData.withdrawalRequests || []).filter(w => w.status === 'APPROVED' || w.status === 'COMPLETED').reduce((acc, w) => acc + w.amount, 0).toLocaleString()} USD
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-500/20 space-y-1">
                <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">Rejected / Refunded</span>
                <p className="text-xl font-mono font-black text-rose-300">
                  {(adminData.withdrawalRequests || []).filter(w => w.status === 'REJECTED').length}
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Restored to balance
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Total Requests</span>
                <p className="text-xl font-mono font-black text-slate-100">
                  {(adminData.withdrawalRequests || []).length}
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Audit Ledger
                </p>
              </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 overflow-x-auto">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setWithdrawalFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                      withdrawalFilter === st
                        ? st === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : st === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : st === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {st} ({(adminData.withdrawalRequests || []).filter(w => st === 'ALL' ? true : st === 'APPROVED' ? (w.status === 'APPROVED' || w.status === 'COMPLETED') : w.status === st).length})
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Ref, Email, Method..."
                  value={withdrawalSearch}
                  onChange={e => setWithdrawalSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
                />
              </div>
            </div>
          </div>

          {/* Rejection Modal / Dialog */}
          {rejectingReq && (
            <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-rose-500/20">
                <div className="flex items-center space-x-2">
                  <MinusCircle className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-rose-200 text-sm">Reject Withdrawal Request: {rejectingReq.referenceId}</h3>
                </div>
                <button 
                  onClick={() => { setRejectingReq(null); setRejectRemarksInput(''); }}
                  className="p-1 hover:bg-slate-900 text-slate-400 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <p>User: <span className="font-bold text-slate-100">{rejectingReq.userName || rejectingReq.userEmail}</span></p>
                <p>Amount to restore: <span className="font-mono font-bold text-emerald-400">${rejectingReq.amount} {rejectingReq.currency}</span></p>
                <p>Payment Method: <span className="font-mono text-slate-300">{rejectingReq.paymentMethod}</span> ({rejectingReq.accountDetails || rejectingReq.phoneNumber || 'N/A'})</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Reason for Rejection (Included in SMS & Email)</label>
                <input
                  type="text"
                  placeholder="e.g. Unverified payment details or requested by trader"
                  value={rejectRemarksInput}
                  onChange={e => setRejectRemarksInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500/50"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRejectingReq(null); setRejectRemarksInput(''); }}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processingWreqId === rejectingReq.id}
                  onClick={async () => {
                    setProcessingWreqId(rejectingReq.id);
                    const success = await adminRejectWithdrawal(rejectingReq.id, rejectRemarksInput);
                    setProcessingWreqId(null);
                    if (success) {
                      addToast('Withdrawal Rejected', `Request ${rejectingReq.referenceId} rejected and $${rejectingReq.amount} restored to user.`, 'info');
                      setRejectingReq(null);
                      setRejectRemarksInput('');
                    } else {
                      addToast('Rejection Failed', 'Could not reject request.', 'error');
                    }
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5"
                >
                  {processingWreqId === rejectingReq.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MinusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Rejection & Restore Balance</span>
                </button>
              </div>
            </div>
          )}

          {/* Requests Table */}
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
            {(() => {
              const filtered = (adminData.withdrawalRequests || [])
                .filter(w => {
                  if (withdrawalFilter !== 'ALL') {
                    if (withdrawalFilter === 'APPROVED') {
                      if (w.status !== 'APPROVED' && w.status !== 'COMPLETED') return false;
                    } else if (w.status !== withdrawalFilter) {
                      return false;
                    }
                  }
                  if (withdrawalSearch.trim()) {
                    const q = withdrawalSearch.toLowerCase();
                    const matchRef = w.referenceId.toLowerCase().includes(q);
                    const matchEmail = (w.userEmail || '').toLowerCase().includes(q);
                    const matchName = (w.userName || '').toLowerCase().includes(q);
                    const matchMethod = w.paymentMethod.toLowerCase().includes(q);
                    return matchRef || matchEmail || matchName || matchMethod;
                  }
                  return true;
                });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <ArrowUpRight className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="font-bold text-sm">No withdrawal requests found</p>
                    <p className="text-xs text-slate-600">No payout orders match your active status or search query.</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-850 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Ref ID</th>
                        <th className="py-3 px-4">Trader Account</th>
                        <th className="py-3 px-4 text-right">Requested Amount</th>
                        <th className="py-3 px-4">Channel / Method</th>
                        <th className="py-3 px-4">Payout Account</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs">
                      {filtered.map(w => {
                        const isPending = w.status === 'PENDING';
                        const isApproved = w.status === 'APPROVED' || w.status === 'COMPLETED';
                        const isRejected = w.status === 'REJECTED';

                        return (
                          <tr key={w.id} className="hover:bg-slate-900/50 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                              {w.referenceId}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-200">{w.userName || 'Trader'}</p>
                              <p className="text-[10px] font-mono text-slate-400">{w.userEmail || 'N/A'}</p>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-slate-100">
                              ${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {w.currency || 'USD'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] font-mono font-bold text-slate-300 uppercase">
                                {w.paymentMethod}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                              {w.accountDetails || w.phoneNumber || 'Default Account'}
                            </td>
                            <td className="py-3.5 px-4">
                              {isPending && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold uppercase rounded-full animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  <span>PENDING REVIEW</span>
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>APPROVED</span>
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-bold uppercase rounded-full">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>REJECTED</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                              {new Date(w.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    disabled={processingWreqId === w.id}
                                    onClick={async () => {
                                      setProcessingWreqId(w.id);
                                      const ok = await adminApproveWithdrawal(w.id);
                                      setProcessingWreqId(null);
                                      if (ok) {
                                        addToast('Withdrawal Approved', `Request ${w.referenceId} approved & notifications sent.`, 'success');
                                      } else {
                                        addToast('Approval Failed', 'Failed to approve request.', 'error');
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] uppercase rounded-lg transition cursor-pointer flex items-center space-x-1 shadow-md shadow-emerald-500/10"
                                  >
                                    {processingWreqId === w.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    disabled={processingWreqId === w.id}
                                    onClick={() => setRejectingReq(w)}
                                    className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] uppercase rounded-lg transition cursor-pointer flex items-center space-x-1"
                                  >
                                    <MinusCircle className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500 italic">
                                  {isApproved ? `Approved` : `Rejected`}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: WALLET MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          
          {/* Section 1: Admin Self Wallet Quick Actions */}
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                  Admin Self-Wallet Manager
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                Instant Internal Ledger Operations (No Payment API)
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Admin Balance Display */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Admin Active Wallet</span>
                  <p className="text-xl font-mono font-black text-emerald-400 mt-1">
                    {formatCurrency(adminBalance, currency)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Account ID: {user.id}</p>
                </div>
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Status: Operational</span>
                  <span className="text-teal-400 font-bold">Ready</span>
                </div>
              </div>

              {/* Self Action Form */}
              <div className="md:col-span-2 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                      Adjustment Amount ($)
                    </label>
                    <input
                      type="number"
                      value={selfAmount}
                      onChange={(e) => setSelfAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full bg-[#090D1A] border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                      Audit Reason
                    </label>
                    <input
                      type="text"
                      value={selfReason}
                      onChange={(e) => setSelfReason(e.target.value)}
                      placeholder="e.g. Treasury Operations"
                      className="w-full bg-[#090D1A] border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSelfSubmitting}
                    onClick={() => handleSelfAdjustment('credit')}
                    className="flex-1 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Credit Admin Wallet</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSelfSubmitting}
                    onClick={() => handleSelfAdjustment('debit')}
                    className="flex-1 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <MinusCircle className="w-3.5 h-3.5" />
                    <span>Debit Admin Wallet</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSelfSubmitting}
                    onClick={() => handleSelfAdjustment('reset')}
                    className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Balance ($0)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Registered User Wallet Adjustments */}
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-850">
              <div>
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Credit / Debit Registered User Wallet</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select any user account to issue manual credit, debit, or reset balance instantly.
                </p>
              </div>

              {lastRefId && (
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[10px] font-mono font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Last Adjustment Ref: {lastRefId}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUserAdjustment} className="space-y-5">
              
              {/* Target User Selector */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                    1. Search & Select Target User ({registeredUsers.length} Users Registered)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filter users by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-teal-500/40"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>

                  <select
                    value={selectedUserId || (registeredUsers[0]?.id || '')}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500/40 font-mono"
                  >
                    {filteredUsers.length === 0 ? (
                      <option value="">No matching users found</option>
                    ) : (
                      filteredUsers.map(u => {
                        const usdW = u.wallets?.find(w => w.asset === 'USD');
                        const bal = usdW ? usdW.balance : 0;
                        return (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.email}) — Balance: ${bal.toLocaleString()} [{u.role.toUpperCase()}]
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                {/* Selected User Overview Card */}
                {selectedTargetUser && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-start space-x-3">
                    <img
                      src={selectedTargetUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                      alt={selectedTargetUser.fullName}
                      className="w-12 h-12 rounded-full border border-slate-800 object-cover flex-shrink-0"
                    />
                    <div className="space-y-1 overflow-hidden flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-xs truncate">{selectedTargetUser.fullName}</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          selectedTargetUser.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {selectedTargetUser.role}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{selectedTargetUser.email}</p>
                      <div className="flex items-center space-x-3 pt-1 font-mono text-[10px]">
                        <span className="text-slate-500">Real Balance: <strong className="text-emerald-400">${selectedUserWallet ? selectedUserWallet.balance.toLocaleString() : '0'}</strong></span>
                        <span className="text-slate-500">Ref Code: <strong className="text-teal-400">{selectedTargetUser.referralCode}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Type & Input Parameters */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-4">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                  2. Select Adjustment Type & Amounts
                </label>

                <div className="grid sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('credit')}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ${
                      actionType === 'credit'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-[#090D1A] border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Admin Credit (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('debit')}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ${
                      actionType === 'debit'
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-400 shadow-md shadow-rose-500/10'
                        : 'bg-[#090D1A] border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>Admin Debit (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('reset')}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer ${
                      actionType === 'reset'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-[#090D1A] border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset Balance (🔄)</span>
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                      {actionType === 'reset' ? 'Target Balance ($)' : 'Amount ($)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="e.g. 500.00"
                      className="w-full bg-[#090D1A] border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                      Asset Wallet
                    </label>
                    <select
                      value={assetInput}
                      onChange={(e) => setAssetInput(e.target.value)}
                      className="w-full bg-[#090D1A] border border-slate-850 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-teal-500/40"
                    >
                      <option value="USD">USD (Primary Balance)</option>
                      <option value="BTC">BTC (Bitcoin)</option>
                      <option value="ETH">ETH (Ethereum)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                      Reason / Reference Note (Required)
                    </label>
                    <input
                      type="text"
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="e.g. Compensation bonus, Account audit..."
                      className="w-full bg-[#090D1A] border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedTargetUser}
                  className={`px-6 py-3 rounded-xl font-bold uppercase text-xs flex items-center space-x-2 transition cursor-pointer shadow-xl ${
                    actionType === 'credit'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black'
                      : actionType === 'debit'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-slate-100 font-black'
                      : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isSubmitting ? 'Processing Ledger...' : `Execute Manual ${actionType.toUpperCase()}`}
                  </span>
                </button>
              </div>

            </form>
          </div>

          {/* Section 3: Manual Admin Transactions Audit Ledger Table */}
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-850">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <History className="w-4 h-4 text-teal-400" />
                  <span>Manual Admin Adjustment Ledger Logs</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Every manual credit or debit generates an immutable record with reference ID, timestamp, and reason.
                </p>
              </div>

              <span className="text-[10px] font-mono text-slate-400">
                {adminManualTxs.length} Total Manual Logs
              </span>
            </div>

            {adminManualTxs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-sans space-y-1">
                <p className="text-xs">No manual admin adjustments performed yet.</p>
                <p className="text-[10px] text-slate-600">Use the form above to issue instant credits or debits.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                      <th className="py-3">Reference ID</th>
                      <th>User Account</th>
                      <th>Adjustment Type</th>
                      <th>Amount</th>
                      <th>Reason / Note</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300 font-sans text-xs">
                    {adminManualTxs.map(tx => {
                      const isCredit = tx.type === 'admin_credit' || (tx.type as string) === 'Admin Credit';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-3.5 font-mono text-slate-400 font-bold text-[11px]">
                            {tx.txHash || tx.id}
                          </td>
                          <td className="font-semibold text-slate-200">
                            <div>{tx.userFullName}</div>
                            <div className="text-[10px] font-mono text-slate-500">{tx.userEmail}</div>
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isCredit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {isCredit ? 'Admin Credit' : 'Admin Debit'}
                            </span>
                          </td>
                          <td className={`font-mono font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCredit ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                          </td>
                          <td className="text-slate-400 text-[11px] max-w-[200px] truncate" title={tx.description}>
                            {tx.description || 'Manual Admin Adjustment'}
                          </td>
                          <td>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase rounded">
                              Completed
                            </span>
                          </td>
                          <td className="text-slate-500 font-mono text-[10px]">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-850">
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2">
              <Users className="w-4 h-4 text-teal-400" />
              <span>Registered User Directory & Roles</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-500">{registeredUsers.length} Registered Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                  <th className="py-3">User Details</th>
                  <th>Role</th>
                  <th>Referral Code</th>
                  <th>USD Real Balance</th>
                  <th>Joined Date</th>
                  <th>Role Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300 text-xs">
                {registeredUsers.map(u => {
                  const usdW = u.wallets?.find(w => w.asset === 'USD');
                  const bal = usdW ? usdW.balance : 0;
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 flex items-center space-x-3">
                        <img src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} alt={u.fullName} className="w-8 h-8 rounded-full border border-slate-800" />
                        <div>
                          <p className="font-bold text-slate-100">{u.fullName}</p>
                          <p className="text-[10px] font-mono text-slate-500">{u.email}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${
                          u.role === 'owner' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black'
                            : u.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold' 
                            : 'bg-slate-800 text-slate-400 font-medium'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="font-mono text-teal-400 text-[11px]">{u.referralCode}</td>
                      <td className="font-mono font-bold text-emerald-400">{formatCurrency(bal, currency)}</td>
                      <td className="text-slate-500 font-mono text-[10px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        {u.role === 'owner' ? (
                          <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center space-x-1">
                            <Crown className="w-3 h-3" />
                            <span>Protected Owner</span>
                          </span>
                        ) : u.id === user.id ? (
                          <span className="text-[10px] font-mono text-slate-500">Current Account</span>
                        ) : u.role === 'admin' && user.role !== 'owner' ? (
                          <span className="text-[10px] font-mono text-slate-500" title="Only owner can demote admins">Admin Protected</span>
                        ) : (
                          <button
                            onClick={async () => {
                              const newRole = u.role === 'admin' ? 'user' : 'admin';
                              const ok = await adminChangeRole(u.id, newRole);
                              if (ok) {
                                addToast('User Role Updated', `${u.fullName} is now assigned role "${newRole}".`, 'info');
                              }
                            }}
                            className="text-[10px] font-mono font-bold text-teal-400 hover:text-teal-300 underline cursor-pointer"
                          >
                            {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRADES OVERSIGHT */}
      {/* ========================================================================= */}
      {activeTab === 'trades' && (
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-850">
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2">
              <History className="w-4 h-4 text-teal-400" />
              <span>Platform Trade Positions Oversight</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-500">{adminData.trades?.length || 0} Total Executions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                  <th className="py-3">Trade ID</th>
                  <th>User</th>
                  <th>Contract Type</th>
                  <th>Symbol</th>
                  <th>Stake</th>
                  <th>P&L</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300 text-xs font-mono">
                {(adminData.trades || []).slice(0, 50).map(t => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 text-slate-500">{t.id}</td>
                    <td className="font-sans font-semibold text-slate-200">{t.userFullName}</td>
                    <td className="capitalize text-slate-300">{t.contractType || 'spot'}</td>
                    <td className="font-bold text-teal-400">{t.symbol}</td>
                    <td>{formatCurrency(t.quantity, currency)}</td>
                    <td className={t.pnl > 0 ? 'text-emerald-400 font-bold' : t.pnl < 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                      {t.pnl > 0 ? '+' : ''}{formatCurrency(t.pnl, currency)}
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono ${
                        t.status === 'open' ? 'bg-teal-500/10 text-teal-400 animate-pulse' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM ANNOUNCEMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2 pb-3 border-b border-slate-850">
              <Megaphone className="w-4 h-4 text-teal-400" />
              <span>Publish System Announcement</span>
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Announcement Title..."
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500/40"
              />
              <textarea
                placeholder="Announcement Content..."
                rows={3}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500/40"
              />
              <div className="flex justify-between items-center">
                <select
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-850 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="info">Info Type</option>
                  <option value="success">Success Type</option>
                  <option value="warning">Warning Type</option>
                </select>

                <button
                  onClick={async () => {
                    if (!annTitle || !annContent) return;
                    await adminCreateAnnouncement(annTitle, annContent, annType);
                    setAnnTitle('');
                    setAnnContent('');
                    addToast('Announcement Published', 'System bulletin is now visible to all users.', 'success');
                  }}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Publish Bulletin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PLATFORM SETTINGS (MINIMUM DEPOSIT) */}
      {/* ========================================================================= */}
      {activeTab === 'platform_settings' && (
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-850">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                Platform Settings & Minimum Deposit Control
              </h2>
              <p className="text-slate-400 text-xs">
                Configure global minimum deposit thresholds for KES and USD transactions across the platform.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePlatformSettings} className="bg-slate-950/80 border border-slate-850 rounded-xl p-6 space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-300 block uppercase">
                  Minimum Deposit (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-slate-500">KES</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={minDepositKESInput}
                    onChange={(e) => setMinDepositKESInput(e.target.value)}
                    placeholder="100"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:outline-none rounded-xl pl-14 pr-4 py-2 text-sm font-mono text-slate-100 font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Minimum amount required when user deposits using KES wallet currency.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-300 block uppercase">
                  Minimum Deposit (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={minDepositUSDInput}
                    onChange={(e) => setMinDepositUSDInput(e.target.value)}
                    placeholder="5"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 focus:outline-none rounded-xl pl-8 pr-4 py-2 text-sm font-mono text-slate-100 font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Minimum amount required when user deposits using USD wallet currency.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-850 flex items-center justify-between">
              <p className="text-xs text-slate-500">Changes take effect immediately for all new deposits.</p>
              <button
                type="submit"
                disabled={isSavingPlatformSettings}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold font-mono text-xs rounded-xl transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-500/10"
              >
                {isSavingPlatformSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: EXCHANGE RATES MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'exchange_rates' && (
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-850">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                Exchange Rate Management
              </h2>
              <p className="text-slate-400 text-xs">
                Configure central exchange rates for multi-currency conversion (e.g. USD / KES).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Active Rate Card */}
            <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-5 space-y-3">
              <p className="text-xs font-mono font-bold text-slate-400 uppercase">Active USD / KES Rate</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-mono font-black text-teal-400">1 USD = {getUsdKesRate()} KES</span>
              </div>
              <p className="text-[11px] text-slate-500">
                This rate is used by the payment pipeline for all new M-PESA deposits and withdrawals. Every payment transaction record stores its historical rate immutably upon creation.
              </p>
            </div>

            {/* Rate Update Form */}
            <form onSubmit={handleUpdateExchangeRate} className="bg-slate-950/80 border border-slate-850 rounded-xl p-5 space-y-4">
              <label className="text-xs font-mono font-bold text-slate-300 block uppercase">
                New Exchange Rate (1 USD = X KES)
              </label>
              <div className="flex space-x-3">
                <input
                  type="number"
                  step="0.01"
                  value={exchangeRateInput}
                  onChange={(e) => setExchangeRateInput(e.target.value)}
                  placeholder="e.g. 130.00"
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-teal-500 focus:outline-none rounded-xl px-4 py-2 text-sm font-mono text-slate-100 font-bold"
                />
                <button
                  type="submit"
                  disabled={isSavingRate}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold font-mono text-xs rounded-xl transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingRate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Update Rate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wide flex items-center space-x-2 pb-3 border-b border-slate-850">
            <FileText className="w-4 h-4 text-teal-400" />
            <span>Audit Activity Logs</span>
          </h2>

          <div className="space-y-2">
            {(adminData.logs || []).slice(0, 30).map(log => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-900 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-200">{log.action}</span>
                  <p className="text-[11px] text-slate-400">{log.details}</p>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-500">
                  <p>{log.ipAddress}</p>
                  <p>{new Date(log.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

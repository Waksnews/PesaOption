/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'user' | 'admin' | 'owner';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  verified: boolean;
  referralCode: string; // the user's own referral code
  referredBy?: string; // the code of the person who referred this user
  avatarUrl?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  passwordChangedAt?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  asset: string; // e.g., 'USD', 'BTC', 'ETH'
  balance: number; // real/live simulated
  demoBalance: number; // demo funds
  updatedAt: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'trade_buy' | 'trade_sell' | 'referral_bonus' | 'trade_win' | 'trade_loss' | 'admin_credit' | 'admin_debit';
export type TransactionStatus = 'pending' | 'completed' | 'rejected';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  asset: string;
  amount: number;
  status: TransactionStatus;
  txHash: string;
  description: string;
  phone?: string;
  createdAt: string;
}

export type TradeType = 'buy' | 'sell';
export type TradeStatus = 'open' | 'closed';
export type ContractType = 'spot' | 'rise_fall' | 'even_odd' | 'over_under' | 'matches_differ';

export interface Trade {
  id: string;
  userId: string;
  type: TradeType; // 'buy' or 'sell' (for spot or options prediction)
  symbol: string; // e.g., 'BTC', 'ETH', 'EUR/USD', 'Gold', etc.
  quantity: number; // stake amount for options, or coin quantity for spot
  entryPrice: number;
  exitPrice?: number;
  status: TradeStatus;
  pnl: number; // profit and loss (real-time/finalized)
  isDemo: boolean;
  createdAt: string;
  closedAt?: string;

  // advanced binary/options fields
  contractType?: ContractType; // defaults to 'spot' if undefined
  prediction?: string; // 'rise' | 'fall' | 'even' | 'odd' | 'over:X' | 'under:X' | 'match:X' | 'differ:X'
  durationSeconds?: number; // expiry duration
  expiryTime?: string; // ISO string when it settles
  barrier?: number;
  payoutRate?: number; // e.g. 0.95 (95% payout)
  settlementDigit?: number; // the last digit used for digit contracts
}

export interface TicketReply {
  id: string;
  userId: string;
  fullName: string;
  role: UserRole;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  title: string;
  description: string;
  status: 'open' | 'resolved';
  replies: TicketReply[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
}

export interface ReferralEarning {
  id: string;
  userId: string; // earning earner
  referrerId: string; // who did they refer
  amount: number;
  description: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  action: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number; // percentage change
  category: 'crypto' | 'forex' | 'indices' | 'commodities' | 'vol_index';
  sparkline: number[];
}

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeData {
  time: number; // Unix timestamp in seconds
  value: number;
  color: string;
}

export type MpesaStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface MpesaTransaction {
  id: string;
  userId: string;
  phone: string;
  amount: number;
  merchantRequestId: string;
  checkoutRequestId: string;
  receiptNumber?: string;
  status: MpesaStatus;
  resultCode?: number;
  resultDesc?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled';

export interface PaymentTransaction {
  id: string;
  userId: string;
  invoiceId: string;
  provider: string;
  paymentMethod: string;
  phone: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference?: string;
  createdAt: string;
  updatedAt: string;
  paymentCurrency?: string;
  walletCurrency?: string;
  exchangeRate?: number;
  originalAmount?: number;
  creditedAmount?: number;
  failedReason?: string;
  failureCode?: string;

  // ZetuPay transaction fields
  paymentKey?: string;
  waveTransactionId?: string;
  checkoutUrl?: string;
  receiptNumber?: string;
  grossAmount?: number;
  providerFee?: number;
  netAmount?: number;
  environment?: string;
  real?: boolean;

  // Legacy fields
  lipiaTransactionReference?: string;
  externalReference?: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
  resultCode?: number | string;
  resultDescription?: string;
  metadata?: any;
}

export interface PlatformSettings {
  id: string;
  minimumDepositKES: number;
  minimumDepositUSD: number;
  updatedAt: string;
  updatedBy?: string;
}

export type WithdrawalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'FAILED';

export interface WithdrawalRequest {
  id: string;
  referenceId: string;
  userId: string;
  walletId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  phoneNumber?: string;
  accountDetails?: string;
  status: WithdrawalRequestStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  userEmail?: string;
  userName?: string;
}

export interface OwnerStats {
  totalUsers: number;
  totalAdmins: number;
  totalDepositsAmount: number;
  totalWithdrawalsAmount: number;
  totalTradingVolume: number;
  platformEstimatedProfit: number;
}

export interface SystemHealth {
  databaseStatus: 'Healthy' | 'Degraded' | 'Offline';
  databaseSizeKb: number;
  smtpStatus: 'Configured' | 'Unconfigured' | 'Operational';
  lipiaStatus: 'Configured' | 'Unconfigured' | 'Live Environment';
  intaSendStatus?: 'Configured' | 'Unconfigured' | 'Live Environment';
  maintenanceMode: boolean;
  uptimeSeconds: number;
}

export interface OwnerConfig {
  maintenanceMode: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  emailFrom: string;
  lipiaApiKey?: string;
  intaSendPublishableKey?: string;
}




/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { 
  User, Wallet, Transaction, Trade, SupportTicket, 
  Announcement, Notification, ReferralCode, ReferralEarning, ActivityLog,
  MpesaTransaction, PaymentTransaction, WithdrawalRequest, PlatformSettings
} from '../src/types';

const DB_FILE = fs.existsSync(path.join(process.cwd(), 'backend')) 
  ? path.join(process.cwd(), 'backend', 'db-store.json') 
  : path.join(process.cwd(), 'db-store.json');

export interface DatabaseSchema {
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  trades: Trade[];
  supportTickets: SupportTicket[];
  announcements: Announcement[];
  notifications: Notification[];
  referralCodes: ReferralCode[];
  referralEarnings: ReferralEarning[];
  activityLogs: ActivityLog[];
  mpesaTransactions: MpesaTransaction[];
  paymentTransactions: PaymentTransaction[];
  withdrawalRequests: WithdrawalRequest[];
  exchangeRates: Record<string, number>;
  platformSettings?: PlatformSettings;
}

const defaultSchema: DatabaseSchema = {
  users: [],
  wallets: [],
  transactions: [],
  trades: [],
  supportTickets: [],
  announcements: [],
  notifications: [],
  referralCodes: [],
  referralEarnings: [],
  activityLogs: [],
  mpesaTransactions: [],
  paymentTransactions: [],
  withdrawalRequests: [],
  exchangeRates: {
    'USD_KES': 130.0
  },
  platformSettings: {
    id: 'default',
    minimumDepositKES: 100,
    minimumDepositUSD: 5,
    updatedAt: new Date().toISOString()
  }
};

// PBKDF2 Password Hashing Utility
export function hashPassword(password: string): string {
  const salt = 'cryptonichub_secret_salt_2026';
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  return hash.toString('hex');
}

// Safe ISO Date string converter helper
export function toSafeISOString(val: any): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val.toISOString();
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

// Lazy/safe Prisma client instantiation with connection pooling
let prismaClientInstance: PrismaClient | null = null;
export function getPrismaClient(): PrismaClient | null {
  if (!prismaClientInstance && process.env.DATABASE_URL) {
    try {
      let dbUrl = process.env.DATABASE_URL;
      if (!dbUrl.includes('connection_limit=')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        dbUrl = `${dbUrl}${separator}connection_limit=5&pool_timeout=10`;
      }
      prismaClientInstance = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl,
          },
        },
      });
    } catch (e) {
      console.warn('[DB] Failed to instantiate PrismaClient:', e);
    }
  }
  return prismaClientInstance;
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema = { ...defaultSchema };
  private initPromise: Promise<void> | null = null;
  private isSyncingPostgres = false;
  private pendingPostgresSync = false;
  private syncPostgresTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.init().catch(err => console.error('[DB] Database initialization error:', err));
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.loadFromDatabase();
    }
    return this.initPromise;
  }

  private async loadFromDatabase(): Promise<void> {
    const prisma = getPrismaClient();

    if (prisma) {
      try {
        console.log('[DB] Connecting to PostgreSQL via Prisma...');
        const userCount = await prisma.user.count();

        if (userCount > 0) {
          console.log(`[DB] PostgreSQL contains existing data (${userCount} users). Using PostgreSQL as single source of truth.`);
          
          const [
            users, wallets, transactions, trades, supportTickets,
            announcements, notifications, referralCodes, referralEarnings,
            activityLogs, mpesaTxs, paymentTxs, withdrawalReqs
          ] = await Promise.all([
            prisma.user.findMany(),
            prisma.wallet.findMany(),
            prisma.transaction.findMany(),
            prisma.trade.findMany(),
            prisma.supportTicket.findMany({ include: { replies: true } }),
            prisma.announcement.findMany(),
            prisma.notification.findMany(),
            prisma.referralCode.findMany(),
            prisma.referralEarning.findMany(),
            prisma.activityLog.findMany(),
            prisma.mpesaTransaction.findMany(),
            prisma.paymentTransaction.findMany(),
            prisma.withdrawalRequest.findMany(),
          ]);

          this.data.users = users.map((u: any) => ({
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            fullName: u.fullName,
            role: u.role as any,
            phoneNumber: u.phoneNumber || undefined,
            verified: u.verified,
            referralCode: u.referralCode,
            referredBy: u.referredBy || undefined,
            avatarUrl: u.avatarUrl || undefined,
            passwordResetToken: u.passwordResetToken || undefined,
            passwordResetExpires: toSafeISOString(u.passwordResetExpires),
            passwordChangedAt: toSafeISOString(u.passwordChangedAt),
            createdAt: toSafeISOString(u.createdAt) || new Date().toISOString()
          }));

          this.data.wallets = wallets.map((w: any) => ({
            id: w.id,
            userId: w.userId,
            asset: w.asset,
            balance: Number(w.balance),
            demoBalance: Number(w.demoBalance),
            updatedAt: toSafeISOString(w.updatedAt) || new Date().toISOString()
          }));

          this.data.transactions = transactions.map((t: any) => ({
            id: t.id,
            userId: t.userId,
            walletId: t.walletId,
            type: t.type as any,
            asset: t.asset,
            amount: Number(t.amount),
            status: t.status as any,
            txHash: t.txHash || '',
            description: t.description || '',
            phone: t.phone || undefined,
            createdAt: toSafeISOString(t.createdAt) || new Date().toISOString()
          }));

          this.data.trades = trades.map((tr: any) => ({
            id: tr.id,
            userId: tr.userId,
            type: tr.type as any,
            symbol: tr.symbol,
            quantity: Number(tr.quantity),
            entryPrice: Number(tr.entryPrice),
            exitPrice: tr.exitPrice != null ? Number(tr.exitPrice) : undefined,
            status: tr.status as any,
            pnl: Number(tr.pnl),
            isDemo: tr.isDemo,
            createdAt: toSafeISOString(tr.createdAt) || new Date().toISOString(),
            closedAt: toSafeISOString(tr.closedAt),
            contractType: (tr.contractType as any) || 'spot',
            prediction: tr.prediction || undefined,
            durationSeconds: tr.durationSeconds != null ? tr.durationSeconds : undefined,
            expiryTime: toSafeISOString(tr.expiryTime),
            barrier: tr.barrier != null ? Number(tr.barrier) : undefined,
            payoutRate: tr.payoutRate != null ? Number(tr.payoutRate) : undefined,
            settlementDigit: tr.settlementDigit != null ? tr.settlementDigit : undefined
          }));

          this.data.supportTickets = supportTickets.map((st: any) => ({
            id: st.id,
            userId: st.userId,
            userEmail: st.userEmail,
            fullName: st.fullName,
            title: st.title,
            description: st.description,
            status: st.status as any,
            createdAt: toSafeISOString(st.createdAt) || new Date().toISOString(),
            replies: (st.replies || []).map((r: any) => ({
              id: r.id,
              userId: r.userId,
              fullName: r.fullName,
              role: r.role as any,
              message: r.message,
              createdAt: toSafeISOString(r.createdAt) || new Date().toISOString()
            }))
          }));

          this.data.announcements = announcements.map((a: any) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            type: a.type as any,
            createdAt: toSafeISOString(a.createdAt) || new Date().toISOString()
          }));

          this.data.notifications = notifications.map((n: any) => ({
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            read: n.read,
            createdAt: toSafeISOString(n.createdAt) || new Date().toISOString()
          }));

          this.data.referralCodes = referralCodes.map((rc: any) => ({
            id: rc.id,
            userId: rc.userId,
            code: rc.code,
            createdAt: toSafeISOString(rc.createdAt) || new Date().toISOString()
          }));

          this.data.referralEarnings = referralEarnings.map((re: any) => ({
            id: re.id,
            userId: re.userId,
            referrerId: re.referrerId,
            amount: Number(re.amount),
            description: re.description,
            createdAt: toSafeISOString(re.createdAt) || new Date().toISOString()
          }));

          this.data.activityLogs = activityLogs.map((al: any) => ({
            id: al.id,
            userId: al.userId || undefined,
            action: al.action,
            ipAddress: al.ipAddress,
            details: al.details,
            createdAt: toSafeISOString(al.createdAt) || new Date().toISOString()
          }));

          this.data.mpesaTransactions = mpesaTxs.map((m: any) => ({
            id: m.id,
            userId: m.userId,
            phone: m.phone,
            amount: Number(m.amount),
            merchantRequestId: m.merchantRequestId,
            checkoutRequestId: m.checkoutRequestId,
            receiptNumber: m.receiptNumber || undefined,
            status: m.status as any,
            resultCode: m.resultCode != null ? m.resultCode : undefined,
            resultDesc: m.resultDesc || undefined,
            createdAt: toSafeISOString(m.createdAt) || new Date().toISOString(),
            updatedAt: toSafeISOString(m.updatedAt) || new Date().toISOString()
          }));

          this.data.paymentTransactions = paymentTxs.map((p: any) => ({
            id: p.id,
            userId: p.userId,
            invoiceId: p.invoiceId,
            provider: p.provider,
            paymentMethod: p.paymentMethod,
            phone: p.phone,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status as any,
            reference: p.reference || undefined,
            paymentKey: p.paymentKey || undefined,
            waveTransactionId: p.waveTransactionId || undefined,
            checkoutUrl: p.checkoutUrl || undefined,
            receiptNumber: p.receiptNumber || undefined,
            grossAmount: p.grossAmount != null ? Number(p.grossAmount) : undefined,
            providerFee: p.providerFee != null ? Number(p.providerFee) : undefined,
            netAmount: p.netAmount != null ? Number(p.netAmount) : undefined,
            environment: p.environment || undefined,
            real: p.real != null ? p.real : undefined,
            createdAt: toSafeISOString(p.createdAt) || new Date().toISOString(),
            updatedAt: toSafeISOString(p.updatedAt) || new Date().toISOString()
          }));

          this.data.withdrawalRequests = withdrawalReqs.map((w: any) => ({
            id: w.id,
            referenceId: w.referenceId,
            userId: w.userId,
            walletId: w.walletId,
            amount: Number(w.amount),
            currency: w.currency,
            paymentMethod: w.paymentMethod,
            phoneNumber: w.phoneNumber || undefined,
            accountDetails: w.accountDetails || undefined,
            status: w.status as any,
            remarks: w.remarks || undefined,
            createdAt: toSafeISOString(w.createdAt) || new Date().toISOString(),
            updatedAt: toSafeISOString(w.updatedAt) || new Date().toISOString(),
            approvedBy: w.approvedBy || undefined,
            approvedAt: toSafeISOString(w.approvedAt),
            rejectedAt: toSafeISOString(w.rejectedAt),
          }));

          console.log(`[DB] Successfully loaded from PostgreSQL (${this.data.users.length} users, ${this.data.wallets.length} wallets, ${this.data.trades.length} trades, ${this.data.transactions.length} transactions).`);

          // Ensure platform_settings table exists and load setting from PostgreSQL
          try {
            await prisma.$executeRawUnsafe(`
              CREATE TABLE IF NOT EXISTS platform_settings (
                id VARCHAR(255) PRIMARY KEY DEFAULT 'default',
                minimum_deposit_kes DECIMAL(16, 2) NOT NULL DEFAULT 100.00,
                minimum_deposit_usd DECIMAL(16, 2) NOT NULL DEFAULT 5.00,
                updated_by VARCHAR(255),
                updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
            `);

            const settingRecord = await prisma.platformSettings.findUnique({ where: { id: 'default' } });
            if (settingRecord) {
              this.data.platformSettings = {
                id: settingRecord.id,
                minimumDepositKES: Number(settingRecord.minimumDepositKES),
                minimumDepositUSD: Number(settingRecord.minimumDepositUSD),
                updatedBy: settingRecord.updatedBy || undefined,
                updatedAt: toSafeISOString(settingRecord.updatedAt) || new Date().toISOString()
              };
              console.log(`[DB] Loaded persistent platform settings from PostgreSQL: Min KES ${this.data.platformSettings.minimumDepositKES}, Min USD ${this.data.platformSettings.minimumDepositUSD}`);
            } else {
              const defaultKes = this.data.platformSettings?.minimumDepositKES ?? 100;
              const defaultUsd = this.data.platformSettings?.minimumDepositUSD ?? 5;
              const created = await prisma.platformSettings.create({
                data: {
                  id: 'default',
                  minimumDepositKES: defaultKes,
                  minimumDepositUSD: defaultUsd
                }
              });
              this.data.platformSettings = {
                id: created.id,
                minimumDepositKES: Number(created.minimumDepositKES),
                minimumDepositUSD: Number(created.minimumDepositUSD),
                updatedAt: toSafeISOString(created.updatedAt) || new Date().toISOString()
              };
              console.log('[DB] Initialized persistent platform_settings row in PostgreSQL.');
            }
          } catch (psErr) {
            console.warn('[DB] Error loading platform_settings from PostgreSQL:', psErr);
          }

          this.ensureOwnerRole();
          return;
        } else {
          console.log('[DB] PostgreSQL database is empty. Performing initial seed from db-store.json / default seed...');
          this.loadFromLocalJson();
          this.ensureOwnerRole();
          await this.syncToPostgres();
          console.log('[DB] Initial seed to PostgreSQL completed.');
          return;
        }
      } catch (err) {
        console.warn('[DB] PostgreSQL fetch error, falling back to local store:', err);
      }
    }

    // Fallback for local development when DATABASE_URL is not provided
    console.log('[DB] Loading local JSON store fallback...');
    this.loadFromLocalJson();
    this.ensureOwnerRole();
  }

  private loadFromLocalJson() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        console.log('[DB] Database loaded successfully from local file', DB_FILE);
      } else {
        console.log('[DB] No local db-store.json file found, initializing new default schema.');
        this.data = { ...defaultSchema };
        this.seed();
        this.save();
      }

      // Ensure demo USD balances are capped at max $5,000
      this.data.wallets.forEach(w => {
        if (w.asset === 'USD' && w.demoBalance > 5000) {
          w.demoBalance = 5000;
        }
      });
    } catch (error) {
      console.error('[DB] Error loading local json database, initializing default schema:', error);
      this.data = { ...defaultSchema };
      this.seed();
    }
  }

  private ensureOwnerRole() {
    const ownerAcc = this.data.users.find(u => u.email.toLowerCase() === 'bonayafatuma58@gmail.com');
    if (ownerAcc && ownerAcc.role !== 'owner') {
      ownerAcc.role = 'owner';
      console.log('[DB] Promoted bonayafatuma58@gmail.com to "owner" role');
      this.save();
    }
  }

  public async syncToPostgres() {
    const prisma = getPrismaClient();
    if (!prisma) return;

    try {
      // Upsert Users
      for (const u of this.data.users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {
            email: u.email,
            passwordHash: u.passwordHash,
            fullName: u.fullName,
            role: u.role as any,
            phoneNumber: u.phoneNumber || null,
            verified: u.verified,
            referralCode: u.referralCode,
            referredBy: u.referredBy || null,
            avatarUrl: u.avatarUrl || null,
            passwordResetToken: u.passwordResetToken || null,
            passwordResetExpires: u.passwordResetExpires ? new Date(u.passwordResetExpires) : null,
            passwordChangedAt: u.passwordChangedAt ? new Date(u.passwordChangedAt) : null,
          },
          create: {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            fullName: u.fullName,
            role: u.role as any,
            phoneNumber: u.phoneNumber || null,
            verified: u.verified,
            referralCode: u.referralCode,
            referredBy: u.referredBy || null,
            avatarUrl: u.avatarUrl || null,
            passwordResetToken: u.passwordResetToken || null,
            passwordResetExpires: u.passwordResetExpires ? new Date(u.passwordResetExpires) : null,
            passwordChangedAt: u.passwordChangedAt ? new Date(u.passwordChangedAt) : null,
            createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
          }
        });
      }

      // Upsert Wallets
      for (const w of this.data.wallets) {
        await prisma.wallet.upsert({
          where: { id: w.id },
          update: {
            balance: w.balance,
            demoBalance: w.demoBalance,
            updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date()
          },
          create: {
            id: w.id,
            userId: w.userId,
            asset: w.asset,
            balance: w.balance,
            demoBalance: w.demoBalance,
            updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date()
          }
        });
      }

      // Upsert Transactions
      for (const t of this.data.transactions) {
        await prisma.transaction.upsert({
          where: { id: t.id },
          update: {
            amount: t.amount,
            status: t.status as any,
            txHash: t.txHash || '',
            description: t.description || '',
            phone: t.phone || null
          },
          create: {
            id: t.id,
            userId: t.userId,
            walletId: t.walletId,
            type: t.type as any,
            asset: t.asset || 'USD',
            amount: t.amount,
            status: t.status as any,
            txHash: t.txHash || '',
            description: t.description || '',
            phone: t.phone || null,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date()
          }
        });
      }

      // Upsert Trades
      for (const tr of this.data.trades) {
        await prisma.trade.upsert({
          where: { id: tr.id },
          update: {
            quantity: tr.quantity,
            entryPrice: tr.entryPrice,
            exitPrice: tr.exitPrice != null ? tr.exitPrice : null,
            status: tr.status as any,
            pnl: tr.pnl,
            isDemo: tr.isDemo,
            closedAt: tr.closedAt ? new Date(tr.closedAt) : null
          },
          create: {
            id: tr.id,
            userId: tr.userId,
            type: tr.type as any,
            symbol: tr.symbol,
            quantity: tr.quantity,
            entryPrice: tr.entryPrice,
            exitPrice: tr.exitPrice != null ? tr.exitPrice : null,
            status: tr.status as any,
            pnl: tr.pnl,
            isDemo: tr.isDemo,
            createdAt: tr.createdAt ? new Date(tr.createdAt) : new Date(),
            closedAt: tr.closedAt ? new Date(tr.closedAt) : null,
            contractType: (tr.contractType as any) || 'spot',
            prediction: tr.prediction || null,
            durationSeconds: tr.durationSeconds || null,
            expiryTime: tr.expiryTime ? new Date(tr.expiryTime) : null,
            barrier: tr.barrier != null ? tr.barrier : null,
            payoutRate: tr.payoutRate != null ? tr.payoutRate : null,
            settlementDigit: tr.settlementDigit != null ? tr.settlementDigit : null
          }
        });
      }

      // Upsert Support Tickets & Replies
      for (const st of this.data.supportTickets) {
        await prisma.supportTicket.upsert({
          where: { id: st.id },
          update: {
            userEmail: st.userEmail,
            fullName: st.fullName,
            title: st.title,
            description: st.description,
            status: st.status
          },
          create: {
            id: st.id,
            userId: st.userId,
            userEmail: st.userEmail,
            fullName: st.fullName,
            title: st.title,
            description: st.description,
            status: st.status,
            createdAt: st.createdAt ? new Date(st.createdAt) : new Date()
          }
        });

        if (st.replies) {
          for (const rep of st.replies) {
            await prisma.ticketReply.upsert({
              where: { id: rep.id },
              update: {
                fullName: rep.fullName,
                role: rep.role as any,
                message: rep.message
              },
              create: {
                id: rep.id,
                ticketId: st.id,
                userId: rep.userId,
                fullName: rep.fullName,
                role: rep.role as any,
                message: rep.message,
                createdAt: rep.createdAt ? new Date(rep.createdAt) : new Date()
              }
            });
          }
        }
      }

      // Upsert Announcements
      for (const a of this.data.announcements) {
        await prisma.announcement.upsert({
          where: { id: a.id },
          update: {
            title: a.title,
            content: a.content,
            type: a.type as any
          },
          create: {
            id: a.id,
            title: a.title,
            content: a.content,
            type: a.type as any,
            createdAt: a.createdAt ? new Date(a.createdAt) : new Date()
          }
        });
      }

      // Upsert Notifications
      for (const n of this.data.notifications) {
        await prisma.notification.upsert({
          where: { id: n.id },
          update: {
            title: n.title,
            message: n.message,
            read: n.read
          },
          create: {
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            read: n.read,
            createdAt: n.createdAt ? new Date(n.createdAt) : new Date()
          }
        });
      }

      // Upsert Referral Codes
      for (const rc of this.data.referralCodes) {
        await prisma.referralCode.upsert({
          where: { id: rc.id },
          update: {
            code: rc.code
          },
          create: {
            id: rc.id,
            userId: rc.userId,
            code: rc.code,
            createdAt: rc.createdAt ? new Date(rc.createdAt) : new Date()
          }
        });
      }

      // Upsert Referral Earnings
      for (const re of this.data.referralEarnings) {
        await prisma.referralEarning.upsert({
          where: { id: re.id },
          update: {
            amount: re.amount,
            description: re.description
          },
          create: {
            id: re.id,
            userId: re.userId,
            referrerId: re.referrerId,
            amount: re.amount,
            description: re.description,
            createdAt: re.createdAt ? new Date(re.createdAt) : new Date()
          }
        });
      }

      // Upsert Activity Logs
      for (const al of this.data.activityLogs) {
        await prisma.activityLog.upsert({
          where: { id: al.id },
          update: {
            action: al.action,
            ipAddress: al.ipAddress,
            details: al.details
          },
          create: {
            id: al.id,
            userId: al.userId || null,
            action: al.action,
            ipAddress: al.ipAddress,
            details: al.details,
            createdAt: al.createdAt ? new Date(al.createdAt) : new Date()
          }
        });
      }

      // Upsert Mpesa Transactions
      for (const m of this.data.mpesaTransactions) {
        await prisma.mpesaTransaction.upsert({
          where: { id: m.id },
          update: {
            status: m.status as any,
            receiptNumber: m.receiptNumber || null,
            resultCode: m.resultCode != null ? m.resultCode : null,
            resultDesc: m.resultDesc || null,
            updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date()
          },
          create: {
            id: m.id,
            userId: m.userId,
            phone: m.phone,
            amount: m.amount,
            merchantRequestId: m.merchantRequestId,
            checkoutRequestId: m.checkoutRequestId,
            receiptNumber: m.receiptNumber || null,
            status: m.status as any,
            resultCode: m.resultCode != null ? m.resultCode : null,
            resultDesc: m.resultDesc || null,
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
            updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date()
          }
        });
      }

      // Upsert Payment Transactions
      for (const p of this.data.paymentTransactions) {
        await prisma.paymentTransaction.upsert({
          where: { id: p.id },
          update: {
            status: p.status as any,
            reference: p.reference || null,
            paymentKey: p.paymentKey || null,
            waveTransactionId: p.waveTransactionId || null,
            checkoutUrl: p.checkoutUrl || null,
            receiptNumber: p.receiptNumber || null,
            grossAmount: p.grossAmount != null ? p.grossAmount : null,
            providerFee: p.providerFee != null ? p.providerFee : null,
            netAmount: p.netAmount != null ? p.netAmount : null,
            environment: p.environment || null,
            real: p.real != null ? p.real : null,
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
          },
          create: {
            id: p.id,
            userId: p.userId,
            invoiceId: p.invoiceId,
            provider: p.provider || 'zetupay',
            paymentMethod: p.paymentMethod || 'M-PESA',
            phone: p.phone || '',
            amount: p.amount,
            currency: p.currency || 'KES',
            status: p.status as any,
            reference: p.reference || null,
            paymentKey: p.paymentKey || null,
            waveTransactionId: p.waveTransactionId || null,
            checkoutUrl: p.checkoutUrl || null,
            receiptNumber: p.receiptNumber || null,
            grossAmount: p.grossAmount != null ? p.grossAmount : null,
            providerFee: p.providerFee != null ? p.providerFee : null,
            netAmount: p.netAmount != null ? p.netAmount : null,
            environment: p.environment || 'live',
            real: p.real != null ? p.real : true,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date()
          }
        });
      }

      // Upsert Withdrawal Requests
      for (const w of (this.data.withdrawalRequests || [])) {
        await prisma.withdrawalRequest.upsert({
          where: { id: w.id },
          update: {
            status: w.status as any,
            remarks: w.remarks || null,
            approvedBy: w.approvedBy || null,
            approvedAt: w.approvedAt ? new Date(w.approvedAt) : null,
            rejectedAt: w.rejectedAt ? new Date(w.rejectedAt) : null,
            updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date()
          },
          create: {
            id: w.id,
            referenceId: w.referenceId,
            userId: w.userId,
            walletId: w.walletId,
            amount: w.amount,
            currency: w.currency || 'USD',
            paymentMethod: w.paymentMethod,
            phoneNumber: w.phoneNumber || null,
            accountDetails: w.accountDetails || null,
            status: w.status as any,
            remarks: w.remarks || null,
            approvedBy: w.approvedBy || null,
            approvedAt: w.approvedAt ? new Date(w.approvedAt) : null,
            rejectedAt: w.rejectedAt ? new Date(w.rejectedAt) : null,
            createdAt: w.createdAt ? new Date(w.createdAt) : new Date(),
            updatedAt: w.updatedAt ? new Date(w.updatedAt) : new Date()
          }
        });
      }

      // Upsert PlatformSettings
      if (this.data.platformSettings) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS platform_settings (
            id VARCHAR(255) PRIMARY KEY DEFAULT 'default',
            minimum_deposit_kes DECIMAL(16, 2) NOT NULL DEFAULT 100.00,
            minimum_deposit_usd DECIMAL(16, 2) NOT NULL DEFAULT 5.00,
            updated_by VARCHAR(255),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `).catch(() => {});

        await prisma.platformSettings.upsert({
          where: { id: 'default' },
          update: {
            minimumDepositKES: this.data.platformSettings.minimumDepositKES,
            minimumDepositUSD: this.data.platformSettings.minimumDepositUSD,
            updatedBy: this.data.platformSettings.updatedBy || null,
            updatedAt: new Date()
          },
          create: {
            id: 'default',
            minimumDepositKES: this.data.platformSettings.minimumDepositKES,
            minimumDepositUSD: this.data.platformSettings.minimumDepositUSD,
            updatedBy: this.data.platformSettings.updatedBy || null,
            updatedAt: new Date()
          }
        });
      }

      console.log('[DB] Synchronized data to PostgreSQL via Prisma successfully.');
    } catch (err) {
      console.warn('[DB] Error saving to PostgreSQL via Prisma:', err);
    }
  }

  public save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      if (!process.env.DATABASE_URL) {
        console.error('[DB] Error saving to local db-store.json file:', error);
      }
    }

    // Schedule debounced/throttled Postgres sync if DATABASE_URL is present
    if (process.env.DATABASE_URL) {
      this.schedulePostgresSync();
    }
  }

  private schedulePostgresSync() {
    if (this.syncPostgresTimer) {
      clearTimeout(this.syncPostgresTimer);
    }
    // Debounce background PostgreSQL syncs by 5 seconds
    this.syncPostgresTimer = setTimeout(() => {
      this.runQueuedPostgresSync();
    }, 5000);
  }

  private async runQueuedPostgresSync() {
    if (this.isSyncingPostgres) {
      this.pendingPostgresSync = true;
      return;
    }
    this.isSyncingPostgres = true;
    try {
      await this.syncToPostgres();
    } catch (e) {
      console.warn('[DB] Async Postgres sync error:', e);
    } finally {
      this.isSyncingPostgres = false;
      if (this.pendingPostgresSync) {
        this.pendingPostgresSync = false;
        this.schedulePostgresSync();
      }
    }
  }

  // Getters
  public get users(): User[] { return this.data.users; }
  public get wallets(): Wallet[] { return this.data.wallets; }
  public get transactions(): Transaction[] { return this.data.transactions; }
  public get trades(): Trade[] { return this.data.trades; }
  public get supportTickets(): SupportTicket[] { return this.data.supportTickets; }
  public get announcements(): Announcement[] { return this.data.announcements; }
  public get notifications(): Notification[] { return this.data.notifications; }
  public get referralCodes(): ReferralCode[] { return this.data.referralCodes; }
  public get referralEarnings(): ReferralEarning[] { return this.data.referralEarnings; }
  public get activityLogs(): ActivityLog[] { return this.data.activityLogs; }
  public get mpesaTransactions(): MpesaTransaction[] { return this.data.mpesaTransactions || (this.data.mpesaTransactions = []); }
  public get paymentTransactions(): PaymentTransaction[] { return this.data.paymentTransactions || (this.data.paymentTransactions = []); }
  public get withdrawalRequests(): WithdrawalRequest[] { return this.data.withdrawalRequests || (this.data.withdrawalRequests = []); }
  public getExchangeRates(): Record<string, number> {
    if (!this.data.exchangeRates) {
      this.data.exchangeRates = { 'USD_KES': 130.0 };
    }
    return this.data.exchangeRates;
  }
  public getExchangeRate(fromCurrency: string = 'USD', toCurrency: string = 'KES'): number {
    const pair = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    const rates = this.getExchangeRates();
    if (rates[pair]) return rates[pair];
    if (pair === 'USD_KES') return 130.0;
    return 1.0;
  }
  public setExchangeRate(fromCurrency: string, toCurrency: string, rate: number): void {
    const pair = `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
    const rates = this.getExchangeRates();
    rates[pair] = rate;
    this.save();
  }
  public getPlatformSettings(): PlatformSettings {
    if (!this.data.platformSettings) {
      this.data.platformSettings = {
        id: 'default',
        minimumDepositKES: 100,
        minimumDepositUSD: 5,
        updatedAt: new Date().toISOString()
      };
    }
    return this.data.platformSettings;
  }

  public async updatePlatformSettingsAsync(settings: Partial<PlatformSettings>, updatedBy?: string): Promise<PlatformSettings> {
    const current = this.getPlatformSettings();
    if (settings.minimumDepositKES !== undefined && settings.minimumDepositKES > 0) {
      current.minimumDepositKES = settings.minimumDepositKES;
    }
    if (settings.minimumDepositUSD !== undefined && settings.minimumDepositUSD > 0) {
      current.minimumDepositUSD = settings.minimumDepositUSD;
    }
    current.updatedAt = new Date().toISOString();
    if (updatedBy) current.updatedBy = updatedBy;

    const prisma = getPrismaClient();
    if (prisma) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS platform_settings (
            id VARCHAR(255) PRIMARY KEY DEFAULT 'default',
            minimum_deposit_kes DECIMAL(16, 2) NOT NULL DEFAULT 100.00,
            minimum_deposit_usd DECIMAL(16, 2) NOT NULL DEFAULT 5.00,
            updated_by VARCHAR(255),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `).catch(() => {});

        const updatedRecord = await prisma.platformSettings.upsert({
          where: { id: 'default' },
          update: {
            minimumDepositKES: current.minimumDepositKES,
            minimumDepositUSD: current.minimumDepositUSD,
            updatedBy: current.updatedBy || null,
            updatedAt: new Date()
          },
          create: {
            id: 'default',
            minimumDepositKES: current.minimumDepositKES,
            minimumDepositUSD: current.minimumDepositUSD,
            updatedBy: current.updatedBy || null,
            updatedAt: new Date()
          }
        });

        current.minimumDepositKES = Number(updatedRecord.minimumDepositKES);
        current.minimumDepositUSD = Number(updatedRecord.minimumDepositUSD);
        current.updatedAt = toSafeISOString(updatedRecord.updatedAt) || new Date().toISOString();
        if (updatedRecord.updatedBy) current.updatedBy = updatedRecord.updatedBy;
        console.log(`[DB] Successfully updated and persisted platform_settings to Neon PostgreSQL: KES ${current.minimumDepositKES}`);
      } catch (err) {
        console.error('[DB] Error persisting platform_settings to PostgreSQL:', err);
      }
    }

    this.save();
    return current;
  }

  public updatePlatformSettings(settings: Partial<PlatformSettings>, updatedBy?: string): PlatformSettings {
    const current = this.getPlatformSettings();
    if (settings.minimumDepositKES !== undefined && settings.minimumDepositKES > 0) {
      current.minimumDepositKES = settings.minimumDepositKES;
    }
    if (settings.minimumDepositUSD !== undefined && settings.minimumDepositUSD > 0) {
      current.minimumDepositUSD = settings.minimumDepositUSD;
    }
    current.updatedAt = new Date().toISOString();
    if (updatedBy) current.updatedBy = updatedBy;

    this.updatePlatformSettingsAsync(settings, updatedBy).catch(err => {
      console.error('[DB] Error running background updatePlatformSettingsAsync:', err);
    });

    this.save();
    return current;
  }

  // Seed default data
  private seed() {
    console.log('[DB] Seeding database schema with high-fidelity default demo data...');

    const traderId = 'trader_user_1';
    const traderPass = hashPassword('user123');
    const traderUser: User = {
      id: traderId,
      email: 'user@trading.demo',
      passwordHash: traderPass,
      fullName: 'Alex Mercier',
      role: 'user',
      verified: true,
      referralCode: 'ALEX500',
      referredBy: undefined,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    };

    const adminId = 'admin_user_1';
    const adminPass = hashPassword('admin123');
    const adminUser: User = {
      id: adminId,
      email: 'admin@trading.demo',
      passwordHash: adminPass,
      fullName: 'Chief Operations Officer',
      role: 'admin',
      verified: true,
      referralCode: 'PLATFORM_ADMIN',
      referredBy: undefined,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
      createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString()
    };

    this.data.users.push(traderUser, adminUser);

    const wallets: Wallet[] = [
      { id: 'w1', userId: traderId, asset: 'USD', balance: 2500, demoBalance: 5000, updatedAt: new Date().toISOString() },
      { id: 'w2', userId: traderId, asset: 'BTC', balance: 0.15, demoBalance: 1.5, updatedAt: new Date().toISOString() },
      { id: 'w3', userId: traderId, asset: 'ETH', balance: 1.25, demoBalance: 12.0, updatedAt: new Date().toISOString() },
      { id: 'w4', userId: adminId, asset: 'USD', balance: 1250000, demoBalance: 5000, updatedAt: new Date().toISOString() },
    ];
    this.data.wallets.push(...wallets);

    const announcements: Announcement[] = [
      {
        id: 'ann_1',
        title: 'CryptonicHub Platform Live Launch',
        content: 'Welcome to the future of portfolio and paper trading. Experience real-time speed, dynamic indicators, and modern analytics with paper funds.',
        type: 'success',
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'ann_2',
        title: 'Scheduled System Upgrade',
        content: 'We will be performing routine backend optimizations on Saturday at 03:00 UTC. Live systems will remain fully available.',
        type: 'info',
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    ];
    this.data.announcements.push(...announcements);

    const trades: Trade[] = [
      {
        id: 'tr_1',
        userId: traderId,
        type: 'buy',
        symbol: 'BTC',
        quantity: 0.5,
        entryPrice: 61250,
        exitPrice: 63400,
        status: 'closed',
        pnl: 1075,
        isDemo: true,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        closedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'tr_2',
        userId: traderId,
        type: 'buy',
        symbol: 'ETH',
        quantity: 2.5,
        entryPrice: 3200,
        exitPrice: 3320,
        status: 'closed',
        pnl: 300,
        isDemo: true,
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        closedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'tr_3',
        userId: traderId,
        type: 'sell',
        symbol: 'Gold',
        quantity: 10,
        entryPrice: 2350,
        exitPrice: 2320,
        status: 'closed',
        pnl: 300,
        isDemo: true,
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        closedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'tr_4',
        userId: traderId,
        type: 'buy',
        symbol: 'BTC',
        quantity: 0.2,
        entryPrice: 64200,
        status: 'open',
        pnl: 120,
        isDemo: true,
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      }
    ];
    this.data.trades.push(...trades);

    const notifications: Notification[] = [
      {
        id: 'not_1',
        userId: traderId,
        title: 'Welcome to CryptonicHub!',
        message: 'Your account was successfully registered and funded with $5,000 demo trading balance. Explore charts and practice trade executions.',
        read: false,
        createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'not_2',
        userId: traderId,
        title: 'Demo Trade Profit Realized',
        message: 'Your buy trade for BTC was closed at $63,400, realizing a profit of $1,075.',
        read: true,
        createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
      }
    ];
    this.data.notifications.push(...notifications);

    const transactions: Transaction[] = [
      {
        id: 'tx_1',
        userId: traderId,
        walletId: 'w1',
        type: 'deposit',
        asset: 'USD',
        amount: 2500,
        status: 'completed',
        txHash: '0x3a4b9c1d5e6f8a901234567890abcdef1234567890abcdef1234567890abcdef',
        description: 'Instant Bank Wire Deposit (Simulated Sandbox Credit)',
        createdAt: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'tx_2',
        userId: traderId,
        walletId: 'w1',
        type: 'withdrawal',
        asset: 'USD',
        amount: 300,
        status: 'completed',
        txHash: '0x901234567890abcdef1234567890abcdef1234567890abcdef1234567890abc12',
        description: 'ACH Outbound Settlement',
        createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      }
    ];
    this.data.transactions.push(...transactions);

    const supportTickets: SupportTicket[] = [
      {
        id: 't_1',
        userId: traderId,
        userEmail: 'user@trading.demo',
        fullName: 'Alex Mercier',
        title: 'Interactive TradingView indicators question',
        description: 'How can I add customized volume and moving average lines to my candlesticks charts?',
        status: 'resolved',
        createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        replies: [
          {
            id: 'rep_1',
            userId: adminId,
            fullName: 'Chief Operations Officer',
            role: 'admin',
            message: 'Hello Alex! On the dashboard, our charts support adding multiple overlays like Bollinger Bands or custom moving averages directly from the chart headers. Feel free to toggle them.',
            createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
          },
          {
            id: 'rep_2',
            userId: traderId,
            fullName: 'Alex Mercier',
            role: 'user',
            message: 'Awesome, thanks! That worked perfectly.',
            createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
          }
        ]
      },
      {
        id: 't_2',
        userId: traderId,
        userEmail: 'user@trading.demo',
        fullName: 'Alex Mercier',
        title: 'Request to reset sandbox demo funds',
        description: 'Can you please top up my USD paper portfolio? I executed several high-risk shorts and would love to restart.',
        status: 'open',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        replies: []
      }
    ];
    this.data.supportTickets.push(...supportTickets);

    const referralCodes: ReferralCode[] = [
      { id: 'ref_1', userId: traderId, code: 'ALEX500', createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString() }
    ];
    this.data.referralCodes.push(...referralCodes);

    const activityLogs: ActivityLog[] = [
      { id: 'al_1', userId: traderId, action: 'User Sign In', ipAddress: '192.168.1.5', details: 'Successful desktop logon session.', createdAt: new Date().toISOString() }
    ];
    this.data.activityLogs.push(...activityLogs);
  }
}

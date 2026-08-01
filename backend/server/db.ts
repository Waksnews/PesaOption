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
  MpesaTransaction, PaymentTransaction
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
  paymentTransactions: []
};

// PBKDF2 Password Hashing Utility
export function hashPassword(password: string): string {
  const salt = 'cryptonichub_secret_salt_2026';
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  return hash.toString('hex');
}

// Lazy/safe Prisma client instantiation
let prismaClientInstance: PrismaClient | null = null;
export function getPrismaClient(): PrismaClient | null {
  if (!prismaClientInstance && process.env.DATABASE_URL) {
    try {
      prismaClientInstance = new PrismaClient();
    } catch (e) {
      console.warn('[DB] Failed to instantiate PrismaClient:', e);
    }
  }
  return prismaClientInstance;
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema = { ...defaultSchema };

  private constructor() {
    this.load();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        console.log('[DB] Database loaded successfully from', DB_FILE);
      } else {
        console.log('[DB] No database file found, initializing new schema.');
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

      // Ensure owner role
      const ownerAcc = this.data.users.find(u => u.email.toLowerCase() === 'bonayafatuma58@gmail.com');
      if (ownerAcc && ownerAcc.role !== 'owner') {
        ownerAcc.role = 'owner';
        this.save();
        console.log('[DB] Promoted bonayafatuma58@gmail.com to "owner" role');
      }

      // Sync with PostgreSQL if DATABASE_URL is present
      this.syncFromPostgresIfConfigured();

    } catch (error) {
      console.error('[DB] Error loading database, running fallback init:', error);
      this.data = { ...defaultSchema };
      this.seed();
    }
  }

  private async syncFromPostgresIfConfigured() {
    const prisma = getPrismaClient();
    if (!prisma) return;

    try {
      console.log('[DB] Connecting to PostgreSQL via Prisma...');
      const dbUsers = await prisma.user.findMany({
        include: {
          wallets: true,
          transactions: true,
          trades: true,
          supportTickets: { include: { replies: true } },
          notifications: true,
          referralCodes: true,
          referralEarnings: true,
          activityLogs: true,
          mpesaTransactions: true,
          paymentTransactions: true,
        }
      });

      if (dbUsers.length > 0) {
        console.log(`[DB] Loaded ${dbUsers.length} users from PostgreSQL via Prisma.`);
        // Map users from PostgreSQL to JS format
        this.data.users = dbUsers.map(u => ({
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
          passwordResetExpires: u.passwordResetExpires ? u.passwordResetExpires.toISOString() : undefined,
          passwordChangedAt: u.passwordChangedAt ? u.passwordChangedAt.toISOString() : undefined,
          createdAt: u.createdAt.toISOString()
        }));

        // Fetch remaining global tables
        const [announcements, activityLogs] = await Promise.all([
          prisma.announcement.findMany(),
          prisma.activityLog.findMany()
        ]);

        if (announcements.length > 0) {
          this.data.announcements = announcements.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            type: a.type as any,
            createdAt: a.createdAt.toISOString()
          }));
        }

        if (activityLogs.length > 0) {
          this.data.activityLogs = activityLogs.map(a => ({
            id: a.id,
            userId: a.userId || undefined,
            action: a.action,
            ipAddress: a.ipAddress,
            details: a.details,
            createdAt: a.createdAt.toISOString()
          }));
        }
      } else {
        console.log('[DB] PostgreSQL database empty. Seeding PostgreSQL from local db-store.json (preserving legacy IDs)...');
        await this.syncToPostgres();
      }
    } catch (err) {
      console.warn('[DB] Prisma sync attempt failed (using db-store fallback):', err);
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

      console.log('[DB] Synchronized all data to PostgreSQL via Prisma successfully.');
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

      // Async background sync to PostgreSQL if connected
      this.syncToPostgres().catch(e => console.warn('[DB] Async Postgres sync error:', e));
    } catch (error) {
      console.error('[DB] Error saving database:', error);
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

  // Seed default data
  private seed() {
    console.log('[DB] Seeding database with high-fidelity demo data...');

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

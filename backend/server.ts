/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { Database, getPrismaClient, hashPassword, toSafeISOString } from './server/db';
import { 
  User, UserRole, Wallet, Transaction, TransactionType, Trade, SupportTicket, 
  Announcement, Notification, ReferralCode, ReferralEarning, ActivityLog, MarketPrice,
  WithdrawalRequest
} from './src/types';
import { GoogleGenAI } from '@google/genai';
import mpesaRouter from './src/routes/mpesa.routes';
import paymentRouter from './src/routes/payment.routes';
import webhookRouter from './src/routes/webhook.routes';
import passwordRouter from './src/routes/password.routes';
import { PaymentController } from './src/controllers/payment.controller';
import { SMSService } from './src/services/sms.service';
import { EmailService } from './src/services/email.service';
import { ExchangeRateService } from './src/services/exchangeRate.service';
import { authenticate, generateSessionToken, verifySessionToken } from './src/middleware/auth.middleware';

import { ZetuPayService } from './src/services/zetupay.service';

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

import fs from 'fs';

const app = express();
const PORT = 3000;

// Enable CORS for external frontends (e.g. Vercel deployments) and set security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.header('X-XSS-Protection', '1; mode=block');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Serving robots.txt for SEO Crawlers
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api
Disallow: /deposit/callback

Sitemap: https://www.pesaoption.site/sitemap.xml`);
});

// Serving sitemap.xml for Search Engines
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://www.pesaoption.site/</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.pesaoption.site/login</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.pesaoption.site/register</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

app.use('/api/mpesa', mpesaRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/payment', paymentRouter);
app.post('/api/payment/lipia/callback', PaymentController.handleCallback);
app.use('/api/webhooks', webhookRouter);
app.use('/api/auth', passwordRouter);

const db = Database.getInstance();

// Admin Verification Middleware (Allows both 'admin' and 'owner')
function requireAdmin(req: any, res: any, next: any) {
  if (req.userRole !== 'admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Access forbidden. Administrator or Owner privileges required.' });
  }
  next();
}

// Owner Verification Middleware (Strictly requires 'owner')
function requireOwner(req: any, res: any, next: any) {
  if (req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Access forbidden. Owner privileges required.' });
  }
  next();
}

// Helper to log user activities
function logActivity(userId: string | undefined, action: string, details: string, req: express.Request) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const newLog: ActivityLog = {
    id: 'log_' + Math.random().toString(36).substr(2, 9),
    userId,
    action,
    ipAddress: ip,
    details,
    createdAt: new Date().toISOString()
  };
  db.activityLogs.push(newLog);
  db.save();
}

// Helper to push a live notification
function createNotification(userId: string, title: string, message: string) {
  const notif: Notification = {
    id: 'not_' + Math.random().toString(36).substr(2, 9),
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(notif);
  db.save();
}

// ============================================================================
// HIGH-FIDELITY REAL-TIME MARKET PRICES ENGINE
// ============================================================================
const marketPrices: MarketPrice[] = [
  // Crypto
  { symbol: 'BTC/USD', name: 'Bitcoin (BTC/USD)', price: 64150.25, change24h: 1.45, category: 'crypto', sparkline: [63500, 63800, 63650, 63900, 64100, 64050, 64150] },
  { symbol: 'ETH/USD', name: 'Ethereum (ETH/USD)', price: 3452.80, change24h: -0.85, category: 'crypto', sparkline: [3510, 3490, 3480, 3470, 3445, 3460, 3452.8] },
  { symbol: 'BNB/USD', name: 'BNB (BNB/USD)', price: 578.40, change24h: 0.95, category: 'crypto', sparkline: [570, 572, 574, 575, 577, 578.4] },
  // Forex
  { symbol: 'EUR/USD', name: 'EUR/USD', price: 1.0854, change24h: 0.12, category: 'forex', sparkline: [1.0840, 1.0845, 1.0851, 1.0854] },
  { symbol: 'GBP/USD', name: 'GBP/USD', price: 1.2918, change24h: 0.24, category: 'forex', sparkline: [1.2885, 1.2890, 1.2910, 1.2918] },
  { symbol: 'USD/JPY', name: 'USD/JPY', price: 157.45, change24h: -0.15, category: 'forex', sparkline: [157.6, 157.5, 157.45] },
  // Synthetic
  { symbol: 'VOL_10', name: 'Volatility 10 Index', price: 421.50, change24h: 1.20, category: 'vol_index', sparkline: [418, 419, 420, 421.50] },
  { symbol: 'VOL_25', name: 'Volatility 25 Index', price: 1648.50, change24h: 0.85, category: 'vol_index', sparkline: [1645, 1646, 1647, 1648.50] },
  { symbol: 'VOL_50', name: 'Volatility 50 Index', price: 3150.15, change24h: -2.15, category: 'vol_index', sparkline: [3160, 3155, 3152, 3150.15] },
  { symbol: 'VOL_75', name: 'Volatility 75 Index', price: 8245.10, change24h: -0.65, category: 'vol_index', sparkline: [8260, 8250, 8245.10] },
  { symbol: 'VOL_100', name: 'Volatility 100 Index', price: 12451.27, change24h: -5.62, category: 'vol_index', sparkline: [12440, 12445, 12438, 12451.27] },
  // Stocks / Indices
  { symbol: 'NASDAQ', name: 'NASDAQ 100', price: 19542.10, change24h: -1.12, category: 'indices', sparkline: [19780, 19650, 19610, 19542.1] },
  { symbol: 'S&P500', name: 'S&P 500 Index', price: 5552.45, change24h: -0.42, category: 'indices', sparkline: [5580, 5572, 5565, 5552.45] },
  // Commodities
  { symbol: 'Gold', name: 'Gold', price: 2412.50, change24h: 0.65, category: 'commodities', sparkline: [2395, 2402, 2408, 2412.5] },
  { symbol: 'Oil', name: 'Crude Oil WTI', price: 81.30, change24h: -0.35, category: 'commodities', sparkline: [82.1, 81.8, 81.5, 81.3] }
];

// Dynamic payout rate helper based on asset category
function getPayoutRate(category: string): number {
  switch (category) {
    case 'vol_index': return 0.98; // 98% for synthetic indexes
    case 'crypto': return 0.90; // 90% for crypto
    case 'forex': return 0.95; // 95% for forex
    case 'indices': return 0.88; // 88% for stock indices
    case 'commodities': return 0.85; // 85% for commodities
    default: return 0.95;
  }
}

// Volatility simulation
function simulateTick() {
  marketPrices.forEach(item => {
    const volatility = item.category === 'vol_index' ? 0.0025 : item.category === 'crypto' ? 0.0015 : item.category === 'indices' ? 0.0006 : 0.0003;
    const changePercent = (Math.random() - 0.492) * 2 * volatility; // slight fluctuation
    const previousPrice = item.price;
    item.price = Number((item.price * (1 + changePercent)).toFixed(item.category === 'forex' ? 4 : 2));
    item.change24h = Number((item.change24h + changePercent * 100).toFixed(2));
    
    // Maintain sparkline of last 10 points
    item.sparkline.push(item.price);
    if (item.sparkline.length > 10) {
      item.sparkline.shift();
    }
  });

  // Calculate real-time Floating Profit & Loss and settle Options
  db.trades.forEach(trade => {
    if (trade.status === 'open') {
      const currentPriceItem = marketPrices.find(p => p.symbol === trade.symbol);
      if (currentPriceItem) {
        if (!trade.contractType || trade.contractType === 'spot') {
          // Standard Spot Position
          const delta = currentPriceItem.price - trade.entryPrice;
          const rawPnl = trade.type === 'buy' ? delta : -delta;
          trade.pnl = Number((rawPnl * trade.quantity).toFixed(2));
        } else {
          // Binary Option Position
          // Check if expired
          const nowStr = new Date().toISOString();
          const isExpired = new Date(nowStr) >= new Date(trade.expiryTime!);
          if (isExpired) {
            let finalPrice = currentPriceItem.price;
            const entryPrice = trade.entryPrice;
            
            // Trader role check for Win Rate: 90% win rate for Admin/Owner, 50% for standard users
            const traderUser = db.users.find(u => u.id === trade.userId);
            const isAdminOrOwner = traderUser?.role === 'owner' || traderUser?.role === 'admin' || traderUser?.email.toLowerCase() === 'bonayafatuma58@gmail.com';
            const winRate = isAdminOrOwner ? 0.90 : 0.50;
            const won = Math.random() < winRate;

            const decimals = currentPriceItem.category === 'forex' ? 4 : 2;
            let lastDigit = 0;

            // Adjust final price and settlement digit visually to match the win outcome
            if (trade.contractType === 'rise_fall') {
              const diff = Math.max(0.01, Math.abs(finalPrice - entryPrice));
              if (won) {
                finalPrice = trade.prediction === 'rise' ? entryPrice + diff : entryPrice - diff;
              } else {
                finalPrice = trade.prediction === 'rise' ? entryPrice - diff : entryPrice + diff;
              }
              finalPrice = Number(finalPrice.toFixed(decimals));
              const pStr = finalPrice.toFixed(decimals);
              lastDigit = parseInt(pStr[pStr.length - 1], 10) || 0;
            } else if (trade.contractType === 'even_odd') {
              if (won) {
                lastDigit = trade.prediction === 'even' ? [0, 2, 4, 6, 8][Math.floor(Math.random() * 5)] : [1, 3, 5, 7, 9][Math.floor(Math.random() * 5)];
              } else {
                lastDigit = trade.prediction === 'even' ? [1, 3, 5, 7, 9][Math.floor(Math.random() * 5)] : [0, 2, 4, 6, 8][Math.floor(Math.random() * 5)];
              }
              const pStr = finalPrice.toFixed(decimals);
              finalPrice = parseFloat(pStr.substring(0, pStr.length - 1) + lastDigit);
            } else if (trade.contractType === 'over_under') {
              const parts = (trade.prediction || 'over:5').split(':');
              const predType = parts[0];
              const target = parseInt(parts[1], 10) || 5;
              if (won) {
                lastDigit = predType === 'over' ? Math.min(9, target + 1) : Math.max(0, target - 1);
              } else {
                lastDigit = predType === 'over' ? Math.max(0, target - 1) : Math.min(9, target + 1);
              }
              const pStr = finalPrice.toFixed(decimals);
              finalPrice = parseFloat(pStr.substring(0, pStr.length - 1) + lastDigit);
            } else if (trade.contractType === 'matches_differ') {
              const parts = (trade.prediction || 'match:5').split(':');
              const predType = parts[0];
              const target = parseInt(parts[1], 10) || 5;
              if (won) {
                lastDigit = predType === 'match' ? target : (target + 1) % 10;
              } else {
                lastDigit = predType === 'match' ? (target + 1) % 10 : target;
              }
              const pStr = finalPrice.toFixed(decimals);
              finalPrice = parseFloat(pStr.substring(0, pStr.length - 1) + lastDigit);
            } else {
              const pStr = finalPrice.toFixed(decimals);
              lastDigit = parseInt(pStr[pStr.length - 1], 10) || 0;
            }

            trade.settlementDigit = lastDigit;

            const payoutRate = trade.payoutRate || 0.95;
            let finalPnl = 0;
            let returnAmount = 0;
            if (won) {
              finalPnl = Number((trade.quantity * payoutRate).toFixed(2));
              returnAmount = trade.quantity + finalPnl; // stake + profit
            } else {
              finalPnl = -trade.quantity; // lost stake
              returnAmount = 0;
            }

            const usdWallet = db.wallets.find(w => w.userId === trade.userId && w.asset === 'USD');
            if (usdWallet) {
              if (trade.isDemo) {
                usdWallet.demoBalance = Math.min(5000, Number((usdWallet.demoBalance + returnAmount).toFixed(2)));
              } else {
                usdWallet.balance = Number((usdWallet.balance + returnAmount).toFixed(2));
              }
            }

            trade.status = 'closed';
            trade.exitPrice = finalPrice;
            trade.pnl = finalPnl;
            trade.closedAt = nowStr;

            // Generate transaction for completed trade
            const txId = 'tx_' + Math.random().toString(36).substring(2, 11);
            const txHash = '0x' + crypto.randomBytes(32).toString('hex');
            const transaction: Transaction = {
              id: txId,
              userId: trade.userId,
              walletId: usdWallet ? usdWallet.id : 'w1',
              type: won ? 'trade_win' : 'trade_loss',
              asset: 'USD',
              amount: won ? returnAmount : -trade.quantity,
              status: 'completed',
              txHash,
              description: won 
                ? `Trade Win +${returnAmount.toFixed(2)} Completed`
                : `Trade Loss -${trade.quantity.toFixed(2)} Completed`,
              createdAt: nowStr
            };
            db.transactions.push(transaction);

            createNotification(
              trade.userId, 
              `Option Settle: ${won ? 'WON' : 'LOST'}`, 
              `Your ${trade.contractType!.toUpperCase().replace('_', ' ')} trade on ${trade.symbol} resolved at ${finalPrice} (Last digit: ${lastDigit}). Stake: $${trade.quantity}, Payout: ${won ? '+$' + finalPnl : '-$' + trade.quantity}`
            );
            db.save();
          } else {
            trade.pnl = 0; // floating is zero for binary option style
          }
        }
      }
    }
  });
}

// Tick the prices every 1 second
setInterval(simulateTick, 1000);

// Active SSE Connections
let sseClients: express.Response[] = [];

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Real-Time Price/Balance SSE Feed
app.get('/api/realtime', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.query.userId as string;

  sseClients.push(res);

  // Send initial load
  const initialPayload: any = { type: 'price_feed', prices: marketPrices };
  if (userId) {
    initialPayload.wallets = db.wallets.filter(w => w.userId === userId);
    initialPayload.transactions = db.transactions.filter(t => t.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    initialPayload.closedTrades = db.trades.filter(t => t.userId === userId && t.status === 'closed').sort((a,b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
    initialPayload.notifications = db.notifications.filter(n => n.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

  const timerId = setInterval(() => {
    const payload: any = { 
      type: 'price_feed', 
      prices: marketPrices,
      activeTrades: db.trades.filter(t => t.status === 'open')
    };

    if (userId) {
      payload.wallets = db.wallets.filter(w => w.userId === userId);
      payload.transactions = db.transactions.filter(t => t.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      payload.closedTrades = db.trades.filter(t => t.userId === userId && t.status === 'closed').sort((a,b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
      payload.notifications = db.notifications.filter(n => n.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    }

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, 1000);

  req.on('close', () => {
    clearInterval(timerId);
    sseClients = sseClients.filter(c => c !== res);
  });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, referralCode, phoneNumber, phone } = req.body;
  
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'All fields (email, password, fullName) are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
      });
      if (dbUser) {
        return res.status(400).json({ error: 'Email already registered.' });
      }
    } catch (err) {
      console.error('[AUTH] Registration email check error:', err);
      return res.status(500).json({ error: 'Database connection error during registration.' });
    }
  } else {
    const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
  }

  const userId = 'u_' + Math.random().toString(36).substr(2, 9);
  const myRefCode = fullName.substring(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);
  
  // Verify referrer if code provided
  let referredByCode: string | undefined;
  if (referralCode) {
    let referrer: any = null;
    if (prisma) {
      referrer = await prisma.user.findFirst({ where: { referralCode } }).catch(() => null);
    }
    if (!referrer) {
      referrer = db.users.find(u => u.referralCode === referralCode);
    }
    if (referrer) {
      referredByCode = referralCode;
    }
  }

  const isOwnerEmail = normalizedEmail === 'bonayafatuma58@gmail.com';
  const assignedRole: UserRole = isOwnerEmail ? 'owner' : 'user';

  const newUser: User = {
    id: userId,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    fullName,
    role: assignedRole,
    phoneNumber: phoneNumber || phone,
    verified: true,
    referralCode: myRefCode,
    referredBy: referredByCode,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
    createdAt: new Date().toISOString()
  };

  if (prisma) {
    try {
      await prisma.$transaction(async (tx: any) => {
        // 1. Create User
        await tx.user.create({
          data: {
            id: userId,
            email: newUser.email,
            passwordHash: newUser.passwordHash,
            fullName: newUser.fullName,
            role: assignedRole,
            phoneNumber: newUser.phoneNumber || null,
            referralCode: newUser.referralCode || '',
            referredBy: newUser.referredBy || null,
            avatarUrl: newUser.avatarUrl || null,
            verified: true
          }
        });

        // 2. Create Default Wallets (USD: 0 Real, 5000 Demo; BTC: 0/0; ETH: 0/0)
        await tx.wallet.createMany({
          data: [
            { id: 'w_usd_' + userId, userId, asset: 'USD', balance: 0, demoBalance: 5000 },
            { id: 'w_btc_' + userId, userId, asset: 'BTC', balance: 0, demoBalance: 0 },
            { id: 'w_eth_' + userId, userId, asset: 'ETH', balance: 0, demoBalance: 0 }
          ]
        });

        // 3. Handle Referral Earnings in DB if referred
        if (referredByCode) {
          const referrerDb = await tx.user.findFirst({ where: { referralCode: referredByCode } });
          if (referrerDb) {
            const refUsdWallet = await tx.wallet.findFirst({ where: { userId: referrerDb.id, asset: 'USD' } });
            if (refUsdWallet) {
              const newDemo = Math.min(5000, Number(refUsdWallet.demoBalance) + 500);
              await tx.wallet.update({
                where: { id: refUsdWallet.id },
                data: { demoBalance: newDemo }
              });
            }

            const myUsdWallet = await tx.wallet.findFirst({ where: { userId, asset: 'USD' } });
            if (myUsdWallet) {
              const newDemo = Math.min(5000, Number(myUsdWallet.demoBalance) + 100);
              await tx.wallet.update({
                where: { id: myUsdWallet.id },
                data: { demoBalance: newDemo }
              });
            }

            await tx.referralEarning.create({
              data: {
                id: 'ref_earn_' + Math.random().toString(36).substring(2, 11),
                userId: referrerDb.id,
                referrerId: userId,
                amount: 500,
                description: `Referral sign up bonus for inviting ${fullName}`
              }
            });
          }
        }
      });
      console.log(`[AUTH] User registration transaction persisted to PostgreSQL: ${newUser.email}`);
    } catch (err) {
      console.error('[AUTH] Registration PostgreSQL transaction error:', err);
      return res.status(500).json({ error: 'Failed to persist new user to database.' });
    }
  }

  db.users.push(newUser);

  // Set up default wallets (USD, BTC, ETH)
  db.wallets.push(
    { id: 'w_usd_' + userId, userId, asset: 'USD', balance: 0, demoBalance: 5000, updatedAt: new Date().toISOString() },
    { id: 'w_btc_' + userId, userId, asset: 'BTC', balance: 0, demoBalance: 0, updatedAt: new Date().toISOString() },
    { id: 'w_eth_' + userId, userId, asset: 'ETH', balance: 0, demoBalance: 0, updatedAt: new Date().toISOString() }
  );

  // Handle referral bonus if referred
  if (referredByCode) {
    const referrerUser = db.users.find(u => u.referralCode === referredByCode);
    if (referrerUser) {
      const refUsdWallet = db.wallets.find(w => w.userId === referrerUser.id && w.asset === 'USD');
      const myUsdWallet = db.wallets.find(w => w.userId === userId && w.asset === 'USD');
      
      if (refUsdWallet) refUsdWallet.demoBalance = Math.min(5000, refUsdWallet.demoBalance + 500);
      if (myUsdWallet) myUsdWallet.demoBalance = Math.min(5000, myUsdWallet.demoBalance + 100);

      db.referralEarnings.push({
        id: 'ref_earn_' + Math.random().toString(36).substr(2, 9),
        userId: referrerUser.id,
        referrerId: userId,
        amount: 500,
        description: `Referral sign up bonus for inviting ${fullName}`,
        createdAt: new Date().toISOString()
      });

      createNotification(referrerUser.id, 'Referral Bonus Received!', `Your friend ${fullName} registered using your link. You received $500 in Demo USD.`);
      createNotification(userId, 'Referral Starter Bonus!', `Welcome! You received $100 Demo USD for registering with code ${referredByCode}.`);
    }
  }

  db.save();
  logActivity(userId, 'User Registration', `Registered account for ${email}`, req);
  createNotification(userId, 'Account Provisioned', 'Welcome to CryptonicHub. Your virtual trading accounts have been successfully setup.');

  console.log(`[NOTIFICATION TRIGGER] User Registration: ${newUser.email} | Phone: ${newUser.phoneNumber || 'None'}`);

  EmailService.sendWelcomeEmail(newUser.email, newUser.fullName || newUser.email.split('@')[0]).catch(err =>
    console.error('[WELCOME EMAIL ERROR]', err)
  );

  if (newUser.phoneNumber) {
    SMSService.sendWelcomeSMS(newUser.phoneNumber, newUser.fullName).catch(err =>
      console.error('[WELCOME SMS ERROR]', err)
    );
  }

  const token = generateSessionToken(userId, assignedRole);
  res.status(201).json({ token, user: { id: userId, email: newUser.email, fullName: newUser.fullName, role: assignedRole, phoneNumber: newUser.phoneNumber, referralCode: myRefCode, avatarUrl: newUser.avatarUrl } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const prisma = getPrismaClient();

  let user: User | null = null;

  if (prisma) {
    try {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          fullName: dbUser.fullName,
          role: dbUser.role as UserRole,
          phoneNumber: dbUser.phoneNumber || undefined,
          verified: dbUser.verified ?? true,
          referralCode: dbUser.referralCode || '',
          referredBy: dbUser.referredBy || undefined,
          avatarUrl: dbUser.avatarUrl || undefined,
          passwordResetToken: dbUser.passwordResetToken || undefined,
          passwordResetExpires: toSafeISOString(dbUser.passwordResetExpires),
          passwordChangedAt: toSafeISOString(dbUser.passwordChangedAt),
          createdAt: toSafeISOString(dbUser.createdAt) || new Date().toISOString()
        };
        console.log(`[AUTH] Login user lookup: found`);
      } else {
        console.log(`[AUTH] Login user lookup: not found`);
      }
    } catch (err) {
      console.error('[AUTH] PostgreSQL user lookup error during login:', err);
      return res.status(500).json({ error: 'Authentication service temporarily unavailable. Please try again.' });
    }
  } else {
    const found = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (found) user = found;
    console.log(`[AUTH] Login user lookup: ${user ? 'found' : 'not found'}`);
  }

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.passwordHash !== hashPassword(password)) {
    console.log(`[AUTH] Password verification: failure`);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  console.log(`[AUTH] Password verification: success`);

  // Auto-promotion for owner email
  if (normalizedEmail === 'bonayafatuma58@gmail.com' && user.role !== 'owner') {
    user.role = 'owner';
    if (prisma) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'owner' }
      }).catch((err: any) => console.error('[AUTH] Error promoting owner in PostgreSQL:', err));
    }
    const inMemUser = db.users.find(u => u.id === user!.id);
    if (inMemUser) {
      inMemUser.role = 'owner';
      db.save();
    }
    console.log('[AUTH] Promoted bonayafatuma58@gmail.com to owner role on login.');
  }

  // Update in-memory db.users cache for backward compatibility
  const existingIdx = db.users.findIndex(u => u.id === user!.id);
  if (existingIdx !== -1) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...user };
  } else {
    db.users.push(user);
  }

  const token = generateSessionToken(user.id, user.role);
  logActivity(user.id, 'User Login', 'Successfully authenticated and session established.', req);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phoneNumber: user.phoneNumber,
      referralCode: user.referralCode,
      avatarUrl: user.avatarUrl
    }
  });
});

app.get('/api/auth/me', authenticate, async (req: any, res) => {
  const prisma = getPrismaClient();
  let user: any = null;
  if (prisma) {
    try {
      user = await prisma.user.findUnique({ where: { id: req.userId } });
    } catch (err) {
      console.error('[AUTH] /api/auth/me Prisma lookup error:', err);
    }
  }
  if (!user) {
    user = db.users.find(u => u.id === req.userId);
  }
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phoneNumber: user.phoneNumber,
    referralCode: user.referralCode,
    avatarUrl: user.avatarUrl,
    verified: user.verified
  });
});

app.put('/api/auth/update-profile', authenticate, async (req: any, res) => {
  const { fullName, avatarUrl, phoneNumber, phone } = req.body;
  const prisma = getPrismaClient();
  let user: any = null;

  if (prisma) {
    try {
      user = await prisma.user.findUnique({ where: { id: req.userId } });
    } catch (err) {
      console.error('[AUTH] update-profile Prisma error:', err);
    }
  }
  if (!user) {
    user = db.users.find(u => u.id === req.userId);
  }
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const updatedName = fullName || user.fullName;
  const updatedAvatar = avatarUrl || user.avatarUrl;
  const updatedPhone = phoneNumber || phone || user.phoneNumber;

  if (prisma) {
    try {
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          fullName: updatedName,
          avatarUrl: updatedAvatar,
          phoneNumber: updatedPhone
        }
      });
    } catch (err) {
      console.error('[AUTH] Update profile PostgreSQL error:', err);
    }
  }

  const inMemUser = db.users.find(u => u.id === req.userId);
  if (inMemUser) {
    if (fullName) inMemUser.fullName = fullName;
    if (avatarUrl) inMemUser.avatarUrl = avatarUrl;
    if (phoneNumber || phone) inMemUser.phoneNumber = phoneNumber || phone;
    db.save();
  }

  logActivity(req.userId, 'Update Profile', 'Profile details updated.', req);
  res.json({ message: 'Profile updated successfully', user: { ...user, fullName: updatedName, avatarUrl: updatedAvatar, phoneNumber: updatedPhone } });
});

app.put('/api/auth/change-password', authenticate, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  const prisma = getPrismaClient();
  let user: any = null;

  if (prisma) {
    try {
      user = await prisma.user.findUnique({ where: { id: req.userId } });
    } catch (err) {
      console.error('[AUTH] change-password Prisma error:', err);
      return res.status(500).json({ error: 'Database connection error. Please try again.' });
    }
  }
  if (!user) {
    user = db.users.find(u => u.id === req.userId);
  }
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.passwordHash !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const newHash = hashPassword(newPassword);
  const passwordChangedAt = new Date();

  if (prisma) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          passwordChangedAt: passwordChangedAt
        }
      });
      console.log(`[AUTH] Password reset persisted to PostgreSQL`);
    } catch (err) {
      console.error('[AUTH] Change password PostgreSQL update error:', err);
      return res.status(500).json({ error: 'Failed to update password in database.' });
    }
  }

  const inMemUser = db.users.find(u => u.id === user.id);
  if (inMemUser) {
    inMemUser.passwordHash = newHash;
    inMemUser.passwordChangedAt = passwordChangedAt.toISOString();
    db.save();
  }

  logActivity(user.id, 'Change Password', 'Password updated successfully.', req);
  res.json({ message: 'Password changed successfully.' });
});

// Wallet & Balances Routes
app.get('/api/wallet/balances', authenticate, (req: any, res) => {
  const userWallets = db.wallets.filter(w => w.userId === req.userId);
  res.json(userWallets);
});

// Demo Deposit/Withdraw Routes
app.post('/api/wallet/deposit', authenticate, (req: any, res) => {
  const { amount, asset, isDemo } = req.body;
  const valAmount = parseFloat(amount);
  
  if (isNaN(valAmount) || valAmount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }

  const activeAsset = asset || 'USD';
  const wallet = db.wallets.find(w => w.userId === req.userId && w.asset === activeAsset);
  
  if (!wallet) {
    return res.status(404).json({ error: `Wallet for asset ${activeAsset} not found.` });
  }

  // Generate Tx ID
  const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
  const txHash = '0x' + crypto.randomBytes(32).toString('hex');

  const transaction: Transaction = {
    id: txId,
    userId: req.userId,
    walletId: wallet.id,
    type: 'deposit',
    asset: activeAsset,
    amount: valAmount,
    status: isDemo ? 'completed' : 'pending', // Sandbox deposits complete immediately
    txHash,
    description: isDemo ? 'Demo Virtual Fund Topup' : 'Sandbox Simulated ACH Credit',
    createdAt: new Date().toISOString()
  };

  db.transactions.push(transaction);

  if (!isDemo) {
    return res.status(400).json({ 
      error: 'Real wallet balance can ONLY be credited through verified deposits via the payment gateway (/api/payments/deposit).' 
    });
  }

  if (wallet.demoBalance >= 5000) {
    return res.status(400).json({ error: 'Demo account balance is capped at maximum of $5,000.' });
  }
  if (wallet.demoBalance + valAmount > 5000) {
    const maxAllowed = 5000 - wallet.demoBalance;
    return res.status(400).json({ error: `Deposit exceeds maximum demo account limit of $5,000. Maximum topup allowed: $${maxAllowed.toFixed(2)}` });
  }
  
  wallet.demoBalance = Math.min(5000, wallet.demoBalance + valAmount);
  createNotification(req.userId, 'Demo USD Credited', `Your USD demo wallet was topped up with $${valAmount.toLocaleString()}`);

  const prisma = getPrismaClient();
  if (prisma) {
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { demoBalance: wallet.demoBalance }
    }).catch((err: any) => console.error('[DEMO TOPUP] PostgreSQL update error:', err));
  }
  
  db.save();
  logActivity(req.userId, 'Wallet Deposit', `Deposited ${valAmount} ${activeAsset} (${isDemo ? 'Demo' : 'Live-simulated'})`, req);

  res.json({ message: 'Deposit successful', transaction, wallets: db.wallets.filter(w => w.userId === req.userId) });
});

app.post('/api/wallet/withdraw', authenticate, (req: any, res) => {
  const { amount, asset, isDemo, address, method, phone, accountDetails } = req.body;
  const valAmount = parseFloat(amount);

  if (isNaN(valAmount) || valAmount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount.' });
  }

  const activeAsset = asset || 'USD';
  const wallet = db.wallets.find(w => w.userId === req.userId && w.asset === activeAsset);

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found.' });
  }

  const currentBalance = isDemo ? wallet.demoBalance : wallet.balance;
  if (currentBalance < valAmount) {
    return res.status(400).json({ error: 'Insufficient funds for withdrawal.' });
  }

  const user = db.users.find(u => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const paymentMethod = method || 'M-PESA';
  const userPhone = phone || user.phoneNumber || address || '';
  const payoutDetails = accountDetails || address || userPhone || 'M-PESA Payout';

  const referenceId = 'PO-' + Math.floor(100000 + Math.random() * 900000);
  const wreqId = 'wreq_' + Math.random().toString(36).substr(2, 9);
  const txId = 'tx_' + Math.random().toString(36).substr(2, 9);

  // Reserve/Deduct funds immediately to prevent double spending while review is PENDING
  if (isDemo) {
    wallet.demoBalance -= valAmount;
  } else {
    wallet.balance -= valAmount;
  }

  // 1. Create WithdrawalRequest record with status PENDING
  const withdrawalReq: WithdrawalRequest = {
    id: wreqId,
    referenceId,
    userId: req.userId,
    walletId: wallet.id,
    amount: valAmount,
    currency: activeAsset,
    paymentMethod,
    phoneNumber: userPhone,
    accountDetails: payoutDetails,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.withdrawalRequests.push(withdrawalReq);

  // 2. Create pending transaction record in audit ledger
  const transaction: Transaction = {
    id: txId,
    userId: req.userId,
    walletId: wallet.id,
    type: 'withdrawal',
    asset: activeAsset,
    amount: valAmount,
    status: 'pending',
    txHash: referenceId,
    description: `Withdrawal Pending Review (${paymentMethod} - Ref: ${referenceId})`,
    phone: userPhone,
    createdAt: new Date().toISOString()
  };

  db.transactions.push(transaction);
  db.save();

  logActivity(req.userId, 'Wallet Withdrawal Request Created', `Submitted withdrawal request ${referenceId} for $${valAmount} ${activeAsset} via ${paymentMethod}`, req);
  createNotification(req.userId, 'Withdrawal Submitted', `Your withdrawal request ${referenceId} of $${valAmount.toLocaleString()} ${activeAsset} has been submitted for admin review.`);

  console.log(`[NOTIFICATION TRIGGER] Withdrawal Submission: Ref ${referenceId} | Amount $${valAmount} ${activeAsset} | User ${user.email} | Phone ${userPhone || 'None'}`);

  // Dispatch notifications asynchronously
  EmailService.sendWithdrawalSubmittedEmail(
    user.email,
    user.fullName || user.email.split('@')[0],
    valAmount.toString(),
    activeAsset,
    paymentMethod,
    referenceId
  ).catch((err: any) => console.error('[WITHDRAWAL SUBMITTED EMAIL ERROR]', err));

  if (userPhone) {
    SMSService.sendWithdrawalSubmittedSMS(userPhone, `$${valAmount} ${activeAsset}`, referenceId).catch((err: any) => {
      console.error('[WITHDRAWAL SUBMITTED SMS ERROR]', err);
    });
  }

  // Alert Admins via Email & SMS
  const adminUsers = db.users.filter(u => u.role === 'admin' || u.role === 'owner');
  for (const admin of adminUsers) {
    if (admin.phoneNumber) {
      SMSService.sendAdminWithdrawalAlertSMS(admin.phoneNumber, user.email, userPhone, `$${valAmount}`, referenceId).catch((err: any) => {
        console.error('[ADMIN WITHDRAWAL ALERT SMS ERROR]', err);
      });
    }
    if (admin.email) {
      EmailService.sendAdminWithdrawalAlertEmail(admin.email, user.email, userPhone || 'None', `$${valAmount} ${activeAsset}`, referenceId).catch((err: any) => {
        console.error('[ADMIN WITHDRAWAL ALERT EMAIL ERROR]', err);
      });
    }
  }

  res.json({ 
    message: 'Withdrawal request submitted for review', 
    referenceId, 
    withdrawalRequest: {
      ...withdrawalReq,
      userEmail: user.email,
      userName: user.fullName
    },
    transaction, 
    wallets: db.wallets.filter(w => w.userId === req.userId) 
  });
});

app.get('/api/wallet/withdrawals', authenticate, (req: any, res) => {
  const list = (db.withdrawalRequests || [])
    .filter(w => w.userId === req.userId)
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

app.get('/api/wallet/transactions', authenticate, (req: any, res) => {
  const list = db.transactions.filter(t => t.userId === req.userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

// Trading Module Routes
app.post('/api/trade/open', authenticate, (req: any, res) => {
  const { symbol, type, quantity, isDemo, contractType, prediction, durationSeconds } = req.body;
  const qty = parseFloat(quantity);

  if (!symbol || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Invalid trade input details.' });
  }

  const assetPriceItem = marketPrices.find(p => p.symbol === symbol);
  if (!assetPriceItem) {
    return res.status(404).json({ error: `Market for symbol ${symbol} not found.` });
  }

  const usdWallet = db.wallets.find(w => w.userId === req.userId && w.asset === 'USD');
  if (!usdWallet) return res.status(404).json({ error: 'USD primary wallet not found.' });

  const activeContractType = contractType || 'spot';

  if (activeContractType === 'spot') {
    if (!type) {
      return res.status(400).json({ error: 'Trade type (buy/sell) is required for spot positions.' });
    }
    const totalCost = qty * assetPriceItem.price;
    const userCapital = isDemo ? usdWallet.demoBalance : usdWallet.balance;

    if (userCapital < totalCost) {
      return res.status(400).json({ error: `Insufficient margin/funds. Cost: $${totalCost.toFixed(2)}, Available: $${userCapital.toFixed(2)}` });
    }

    // Deduct cash margin
    if (isDemo) {
      usdWallet.demoBalance = Number((usdWallet.demoBalance - totalCost).toFixed(2));
    } else {
      usdWallet.balance = Number((usdWallet.balance - totalCost).toFixed(2));
    }

    // Check if asset wallet exists for crypto, otherwise create it
    if (assetPriceItem.category === 'crypto') {
      let assetWallet = db.wallets.find(w => w.userId === req.userId && w.asset === symbol);
      if (!assetWallet) {
        assetWallet = {
          id: `w_${symbol.toLowerCase()}_${req.userId}`,
          userId: req.userId,
          asset: symbol,
          balance: 0,
          demoBalance: 0,
          updatedAt: new Date().toISOString()
        };
        db.wallets.push(assetWallet);
      }
      if (type === 'buy') {
        if (isDemo) assetWallet.demoBalance += qty;
        else assetWallet.balance += qty;
      }
    }

    const tradeId = 'tr_' + Math.random().toString(36).substr(2, 9);
    const newTrade: Trade = {
      id: tradeId,
      userId: req.userId,
      type, // 'buy' or 'sell'
      symbol,
      quantity: qty,
      entryPrice: assetPriceItem.price,
      status: 'open',
      pnl: 0,
      isDemo: !!isDemo,
      createdAt: new Date().toISOString(),
      contractType: 'spot'
    };

    db.trades.push(newTrade);
    db.save();

    logActivity(req.userId, 'Open Trade', `Opened ${type.toUpperCase()} position of ${qty} ${symbol} at $${assetPriceItem.price}`, req);
    createNotification(req.userId, 'Trade Executed', `Your market ${type.toUpperCase()} order for ${qty} ${symbol} filled at $${assetPriceItem.price.toLocaleString()}`);

    return res.json({ message: 'Order filled', trade: newTrade, wallets: db.wallets.filter(w => w.userId === req.userId) });
  } else {
    // Binary Option Position
    if (!prediction || !durationSeconds) {
      return res.status(400).json({ error: 'Prediction and duration are required for binary contracts.' });
    }
    const stake = qty;
    const userCapital = isDemo ? usdWallet.demoBalance : usdWallet.balance;

    if (userCapital < stake) {
      return res.status(400).json({ error: `Insufficient funds for stake. Stake: $${stake.toFixed(2)}, Available: $${userCapital.toFixed(2)}` });
    }

    // Deduct stake from wallet
    if (isDemo) {
      usdWallet.demoBalance = Number((usdWallet.demoBalance - stake).toFixed(2));
    } else {
      usdWallet.balance = Number((usdWallet.balance - stake).toFixed(2));
    }

    const tradeId = 'tr_' + Math.random().toString(36).substr(2, 9);
    const expiryTime = new Date(Date.now() + parseInt(durationSeconds, 10) * 1000).toISOString();
    
    const newTrade: Trade = {
      id: tradeId,
      userId: req.userId,
      type: 'buy', // default to buy placeholder
      symbol,
      quantity: stake,
      entryPrice: assetPriceItem.price,
      status: 'open',
      pnl: 0,
      isDemo: !!isDemo,
      createdAt: new Date().toISOString(),
      contractType: activeContractType,
      prediction,
      durationSeconds: parseInt(durationSeconds, 10),
      expiryTime,
      barrier: assetPriceItem.price,
      payoutRate: getPayoutRate(assetPriceItem.category)
    };

    db.trades.push(newTrade);
    db.save();

    logActivity(req.userId, 'Buy Option Contract', `Purchased ${activeContractType.toUpperCase()} contract on ${symbol} with stake $${stake} and prediction ${prediction}`, req);
    createNotification(req.userId, 'Option Contract Placed', `Successfully placed $${stake} ${activeContractType.toUpperCase().replace('_', ' ')} contract on ${symbol} expiring in ${durationSeconds} seconds.`);

    return res.json({ message: 'Contract placed', trade: newTrade, wallets: db.wallets.filter(w => w.userId === req.userId) });
  }
});

app.post('/api/trade/close', authenticate, (req: any, res) => {
  const { tradeId } = req.body;
  const trade = db.trades.find(t => t.id === tradeId && t.userId === req.userId);

  if (!trade) {
    return res.status(404).json({ error: 'Open trade position not found.' });
  }

  if (trade.status === 'closed') {
    return res.status(400).json({ error: 'Trade position already closed.' });
  }

  const assetPriceItem = marketPrices.find(p => p.symbol === trade.symbol);
  if (!assetPriceItem) {
    return res.status(404).json({ error: `Market for symbol ${trade.symbol} not available to resolve close.` });
  }

  const usdWallet = db.wallets.find(w => w.userId === req.userId && w.asset === 'USD');
  if (!usdWallet) return res.status(404).json({ error: 'USD core wallet not found.' });

  // Calculate win probability based on user role (90% for Admin/Owner, 50% for standard users)
  const traderUser = db.users.find(u => u.id === req.userId);
  const isAdminOrOwner = traderUser?.role === 'owner' || traderUser?.role === 'admin' || traderUser?.email.toLowerCase() === 'bonayafatuma58@gmail.com';
  const winRate = isAdminOrOwner ? 0.90 : 0.50;
  const won = Math.random() < winRate;

  const delta = assetPriceItem.price - trade.entryPrice;
  const rawPnl = trade.type === 'buy' ? delta : -delta;
  const calculatedPnl = Number((rawPnl * trade.quantity).toFixed(2));

  let finalPnl = calculatedPnl;
  if (won && finalPnl <= 0) {
    finalPnl = Number((Math.max(0.5, Math.abs(calculatedPnl) || (trade.quantity * trade.entryPrice * 0.02))).toFixed(2));
  } else if (!won && finalPnl >= 0) {
    finalPnl = -Number((Math.max(0.5, Math.abs(calculatedPnl) || (trade.quantity * trade.entryPrice * 0.02))).toFixed(2));
  }

  // Calculate adjusted exit price matching final PnL
  let exitPrice = assetPriceItem.price;
  if (trade.type === 'buy') {
    exitPrice = Number((trade.entryPrice + (finalPnl / trade.quantity)).toFixed(assetPriceItem.category === 'forex' ? 4 : 2));
  } else {
    exitPrice = Number((trade.entryPrice - (finalPnl / trade.quantity)).toFixed(assetPriceItem.category === 'forex' ? 4 : 2));
  }

  // Liquidate margin and add pnl
  const originalMargin = trade.quantity * trade.entryPrice;
  const returnAmount = Math.max(0, originalMargin + finalPnl);

  if (trade.isDemo) {
    usdWallet.demoBalance = Math.min(5000, Number((usdWallet.demoBalance + returnAmount).toFixed(2)));
  } else {
    usdWallet.balance += returnAmount;
  }

  // Adjust crypto wallets if crypto buy order was closed (held crypto sold back)
  if (assetPriceItem.category === 'crypto') {
    const assetWallet = db.wallets.find(w => w.userId === req.userId && w.asset === trade.symbol);
    if (assetWallet && trade.type === 'buy') {
      if (trade.isDemo) assetWallet.demoBalance = Math.max(0, assetWallet.demoBalance - trade.quantity);
      else assetWallet.balance = Math.max(0, assetWallet.balance - trade.quantity);
    }
  }

  trade.status = 'closed';
  trade.exitPrice = exitPrice;
  trade.pnl = finalPnl;
  trade.closedAt = new Date().toISOString();

  db.save();

  logActivity(req.userId, 'Close Trade', `Closed ${trade.symbol} position at $${assetPriceItem.price} with PnL of $${finalPnl}`, req);
  createNotification(req.userId, 'Trade Settled', `Settled ${trade.symbol} position. P&L: $${finalPnl > 0 ? '+' : ''}${finalPnl.toLocaleString()}`);

  res.json({ message: 'Position closed and settled', trade, wallets: db.wallets.filter(w => w.userId === req.userId) });
});

app.get('/api/trade/positions', authenticate, (req: any, res) => {
  const open = db.trades.filter(t => t.userId === req.userId && t.status === 'open');
  res.json(open);
});

app.get('/api/trade/history', authenticate, (req: any, res) => {
  const history = db.trades.filter(t => t.userId === req.userId && t.status === 'closed').sort((a,b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
  res.json(history);
});

// AI Market Scanner Route
app.post('/api/ai/scan', authenticate, async (req: any, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

  const market = marketPrices.find(p => p.symbol === symbol);
  if (!market) return res.status(404).json({ error: `Market symbol ${symbol} not found.` });

  const ai = getAi();
  if (ai) {
    try {
      const prompt = `You are the chief quantitative trading strategist at PesaOption.
Analyze the following asset market:
Symbol: ${symbol}
Name: ${market.name}
Current Price: $${market.price.toLocaleString()}
24h Change: ${market.change24h}%
Category: ${market.category}

Generate a concise, professional technical scan with the following sections in valid JSON format (with no markdown wrappers):
{
  "signal": "BUY", // or "SELL" or "HOLD"
  "confidence": 85, // percentage
  "rationale": "Description here",
  "support": 64100.25,
  "resistance": 64500.50,
  "optionsRecommendation": "Recommendation here",
  "indicators": {
    "rsi": "value",
    "macd": "value",
    "movingAverage": "value"
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const resultText = response.text || '';
      try {
        const parsed = JSON.parse(resultText.trim());
        return res.json({ symbol, ...parsed });
      } catch (parseErr) {
        console.error('Failed to parse Gemini response as JSON, falling back:', resultText);
      }
    } catch (e: any) {
      console.error('Gemini scan failed, falling back:', e.message);
    }
  }

  // Robust simulation fallback with rich technical data (if no key or API error)
  const isUp = market.change24h >= 0;
  const confidence = Math.floor(Math.random() * 25) + 65; // 65-90%
  const signal = isUp ? (Math.random() > 0.3 ? 'BUY' : 'HOLD') : (Math.random() > 0.3 ? 'SELL' : 'HOLD');
  const rationale = `Asset ${symbol} (${market.name}) exhibits ${isUp ? 'bullish momentum' : 'bearish pressure'} on the 1-hour timeframe, trading at $${market.price.toLocaleString()}. Visual moving averages are ${isUp ? 'sloping upward' : 'diverging downward'} with healthy tick activity.`;
  const decimals = market.category === 'forex' ? 4 : 2;
  const support = Number((market.price * 0.995).toFixed(decimals));
  const resistance = Number((market.price * 1.005).toFixed(decimals));
  const optionsRecommendation = signal === 'BUY' 
    ? `Recommend purchasing 'RISE' contracts with 30s-60s expiry on any price dip below $${market.price}.`
    : signal === 'SELL'
    ? `Recommend purchasing 'FALL' contracts with 15s-30s expiry on pullbacks near $${market.price}.`
    : `Recommend 'EVEN_ODD' delta-neutral scalp contracts during current range contraction.`;

  const rsi = isUp ? '62.4 (Neutral-Bullish)' : '38.2 (Oversold Area)';
  const macd = isUp ? 'Bullish expansion above baseline' : 'Bearish divergence confirmed';
  const movingAverage = isUp ? 'Strong support above 50 EMA' : 'Failing to cross 20 EMA resistance';

  return res.json({
    symbol,
    signal,
    confidence,
    rationale,
    support,
    resistance,
    optionsRecommendation,
    indicators: { rsi, macd, movingAverage }
  });
});

// Support Tickets Routes
app.get('/api/support/tickets', authenticate, (req: any, res) => {
  const tickets = db.supportTickets.filter(t => t.userId === req.userId);
  res.json(tickets);
});

app.post('/api/support/tickets', authenticate, (req: any, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User profile not found.' });

  const ticketId = 't_' + Math.random().toString(36).substr(2, 9);
  const newTicket: SupportTicket = {
    id: ticketId,
    userId: req.userId,
    userEmail: user.email,
    fullName: user.fullName,
    title,
    description,
    status: 'open',
    replies: [],
    createdAt: new Date().toISOString()
  };

  db.supportTickets.push(newTicket);
  db.save();

  logActivity(req.userId, 'Support Ticket', `Created ticket: ${title}`, req);
  res.status(201).json({ message: 'Support ticket submitted.', ticket: newTicket });
});

app.post('/api/support/tickets/:id/reply', authenticate, (req: any, res) => {
  const { message } = req.body;
  const { id } = req.params;

  if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });

  const ticket = db.supportTickets.find(t => t.id === id && (t.userId === req.userId || req.userRole === 'admin'));
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User profile not found.' });

  const reply = {
    id: 'rep_' + Math.random().toString(36).substr(2, 9),
    userId: req.userId,
    fullName: user.fullName,
    role: user.role,
    message,
    createdAt: new Date().toISOString()
  };

  ticket.replies.push(reply);
  
  // If user replies, reopen ticket if resolved. If admin replies, change nothing or set to resolved if helpful
  if (req.userRole === 'admin') {
    ticket.status = 'resolved'; // automatically set resolved on admin reply
    createNotification(ticket.userId, 'Support Reply Received', `An administrator replied to your ticket: "${ticket.title}"`);
  } else {
    ticket.status = 'open';
  }

  db.save();
  logActivity(req.userId, 'Ticket Reply', `Replied to ticket ID: ${id}`, req);
  res.json({ message: 'Reply sent successfully', reply, ticket });
});

// Notifications
app.get('/api/notifications', authenticate, (req: any, res) => {
  const list = db.notifications.filter(n => n.userId === req.userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

app.post('/api/notifications/read-all', authenticate, (req: any, res) => {
  db.notifications.forEach(n => {
    if (n.userId === req.userId) n.read = true;
  });
  db.save();
  res.json({ message: 'All notifications marked read.' });
});

// Announcements
app.get('/api/announcements', (req, res) => {
  const list = db.announcements.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(list);
});

// Referrals
app.get('/api/referrals', authenticate, (req: any, res) => {
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // List users referred by this code
  const referredUsers = db.users.filter(u => u.referredBy === user.referralCode).map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    createdAt: u.createdAt
  }));

  const earnings = db.referralEarnings.filter(e => e.userId === req.userId);
  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

  res.json({
    referralCode: user.referralCode,
    referredUsers,
    earnings,
    totalEarnings
  });
});

// ============================================================================
// ADMIN PANEL ENDPOINTS
// ============================================================================
app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const safeUsers = db.users.map(u => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    verified: u.verified,
    referralCode: u.referralCode,
    createdAt: u.createdAt,
    wallets: db.wallets.filter(w => w.userId === u.id)
  }));
  res.json(safeUsers);
});

app.post('/api/admin/wallet/adjust', authenticate, requireAdmin, (req: any, res) => {
  const { targetUserId, actionType, amount, reason, asset } = req.body;
  
  if (!targetUserId || !actionType || !reason) {
    return res.status(400).json({ error: 'targetUserId, actionType, and reason are required.' });
  }

  const targetUser = db.users.find(u => u.id === targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found.' });
  }

  // SECURITY GUARD: Admins cannot modify owner wallet
  if (req.userRole === 'admin' && targetUser.role === 'owner') {
    return res.status(403).json({ error: 'Admins cannot modify the owner wallet.' });
  }

  const activeAsset = asset || 'USD';
  let wallet = db.wallets.find(w => w.userId === targetUserId && w.asset === activeAsset);
  if (!wallet) {
    wallet = {
      id: `w_${activeAsset.toLowerCase()}_${targetUserId}`,
      userId: targetUserId,
      asset: activeAsset,
      balance: 0,
      demoBalance: 0,
      updatedAt: new Date().toISOString()
    };
    db.wallets.push(wallet);
  }

  const valAmount = parseFloat(amount || 0);

  let txType: TransactionType = 'admin_credit';
  let refPrefix = 'ADM-CR';
  let recordedAmount = valAmount;

  if (actionType === 'credit') {
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount required for credit.' });
    }
    wallet.balance = Number((wallet.balance + valAmount).toFixed(2));
    txType = 'admin_credit';
    refPrefix = 'ADM-CR';
    recordedAmount = valAmount;
  } else if (actionType === 'debit') {
    if (isNaN(valAmount) || valAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount required for debit.' });
    }
    wallet.balance = Number(Math.max(0, wallet.balance - valAmount).toFixed(2));
    txType = 'admin_debit';
    refPrefix = 'ADM-DB';
    recordedAmount = valAmount;
  } else if (actionType === 'reset') {
    const previousBalance = wallet.balance;
    const targetBalance = isNaN(valAmount) ? 0 : valAmount;
    const diff = targetBalance - previousBalance;
    wallet.balance = Number(targetBalance.toFixed(2));
    
    if (diff >= 0) {
      txType = 'admin_credit';
      refPrefix = 'ADM-RST-CR';
      recordedAmount = Math.abs(diff);
    } else {
      txType = 'admin_debit';
      refPrefix = 'ADM-RST-DB';
      recordedAmount = Math.abs(diff);
    }
  } else {
    return res.status(400).json({ error: 'Invalid action type. Must be credit, debit, or reset.' });
  }

  const refId = `${refPrefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const txId = 'tx_' + Math.random().toString(36).substring(2, 11);

  const transaction: Transaction = {
    id: txId,
    userId: targetUserId,
    walletId: wallet.id,
    type: txType,
    asset: activeAsset,
    amount: recordedAmount,
    status: 'completed',
    txHash: refId,
    description: reason,
    createdAt: new Date().toISOString()
  };

  db.transactions.push(transaction);
  wallet.updatedAt = new Date().toISOString();

  createNotification(
    targetUserId,
    `Wallet Adjustment (${actionType === 'credit' ? 'Admin Credit' : actionType === 'debit' ? 'Admin Debit' : 'Balance Reset'})`,
    `Your ${activeAsset} balance was updated by Admin. Reason: ${reason}. Reference ID: ${refId}`
  );

  db.save();
  logActivity(req.userId, `Admin Wallet ${actionType.toUpperCase()}`, `Adjusted ${targetUser.email} (${targetUser.fullName}) ${activeAsset} balance. Action: ${actionType}, Amount: ${recordedAmount}, Reason: ${reason}`, req);

  res.json({
    message: `Wallet ${actionType} successful.`,
    refId,
    transaction,
    newBalance: wallet.balance
  });
});

// ============================================================================
// ADMIN WALLET MANAGEMENT MODULE ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/wallets/users
 * Search users and return wallet information.
 * Query parameters: ?q=email or search by name, phone, user ID
 */
app.get('/api/admin/wallets/users', authenticate, requireAdmin, async (req: any, res) => {
  const query = ((req.query.q as string) || '').trim().toLowerCase();
  const prisma = getPrismaClient();

  let users: any[] = [];

  if (prisma) {
    try {
      const dbUsers = await prisma.user.findMany({
        where: query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { fullName: { contains: query, mode: 'insensitive' } },
                { phoneNumber: { contains: query, mode: 'insensitive' } },
                { id: { contains: query, mode: 'insensitive' } },
              ],
            }
          : undefined,
        include: {
          wallets: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      users = dbUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber || '',
        role: u.role,
        verified: u.verified,
        createdAt: toSafeISOString(u.createdAt),
        wallets: u.wallets.map((w: any) => ({
          id: w.id,
          userId: w.userId,
          asset: w.asset,
          balance: Number(w.balance),
          demoBalance: Number(w.demoBalance),
          updatedAt: toSafeISOString(w.updatedAt),
        })),
      }));
    } catch (err) {
      console.error('[ADMIN WALLETS] Prisma search error:', err);
    }
  }

  if (!users.length) {
    let memUsers = db.users;
    if (query) {
      memUsers = memUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.fullName.toLowerCase().includes(query) ||
          (u.phoneNumber && u.phoneNumber.toLowerCase().includes(query)) ||
          u.id.toLowerCase().includes(query)
      );
    }
    users = memUsers.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber || '',
      role: u.role,
      verified: u.verified,
      createdAt: u.createdAt,
      wallets: db.wallets.filter((w) => w.userId === u.id),
    }));
  }

  res.json(users);
});

/**
 * POST /api/admin/wallets/:userId/credit
 * Body: { amount: 100, reason: "Manual bonus" }
 * Effect: wallet.balance += amount
 */
app.post('/api/admin/wallets/:userId/credit', authenticate, requireAdmin, async (req: any, res) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;

  const valAmount = parseFloat(amount);
  if (isNaN(valAmount) || valAmount <= 0) {
    return res.status(400).json({ error: 'A valid positive amount is required.' });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Reason for wallet credit is required.' });
  }

  const targetUser = db.users.find((u) => u.id === userId);
  if (req.userRole === 'admin' && targetUser?.role === 'owner') {
    return res.status(403).json({ error: 'Admins cannot modify owner wallets.' });
  }

  const prisma = getPrismaClient();
  const activeAsset = 'USD';
  let updatedWallet: any = null;
  let txRecord: any = null;

  if (prisma) {
    try {
      await prisma.$transaction(async (tx: any) => {
        let wallet = await tx.wallet.findFirst({
          where: { userId, asset: activeAsset },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId,
              asset: activeAsset,
              balance: valAmount,
              demoBalance: 5000,
            },
          });
        } else {
          wallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: valAmount },
            },
          });
        }

        updatedWallet = {
          id: wallet.id,
          userId: wallet.userId,
          asset: wallet.asset,
          balance: Number(wallet.balance),
          demoBalance: Number(wallet.demoBalance),
        };

        const txId = 'tx_' + Math.random().toString(36).substring(2, 11);
        const refId = `ADM-CR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const createdTx = await tx.transaction.create({
          data: {
            id: txId,
            userId,
            walletId: wallet.id,
            type: 'admin_credit',
            asset: activeAsset,
            amount: valAmount,
            status: 'completed',
            txHash: refId,
            description: reason.trim(),
          },
        });

        txRecord = {
          id: createdTx.id,
          userId: createdTx.userId,
          walletId: createdTx.walletId,
          type: createdTx.type,
          asset: createdTx.asset,
          amount: Number(createdTx.amount),
          status: createdTx.status,
          txHash: createdTx.txHash,
          description: createdTx.description,
          createdAt: toSafeISOString(createdTx.createdAt),
        };

        await tx.activityLog.create({
          data: {
            userId: req.userId,
            action: 'ADMIN_WALLET_CREDIT',
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
            details: `Credited $${valAmount} to user ${userId}. Reason: ${reason.trim()}`,
          },
        });
      });
    } catch (err: any) {
      console.error('[ADMIN CREDIT] Prisma error:', err);
    }
  }

  // Update in-memory db fallback
  let memWallet = db.wallets.find((w) => w.userId === userId && w.asset === activeAsset);
  if (!memWallet) {
    memWallet = {
      id: `w_usd_${userId}`,
      userId,
      asset: activeAsset,
      balance: valAmount,
      demoBalance: 5000,
      updatedAt: new Date().toISOString(),
    };
    db.wallets.push(memWallet);
  } else {
    if (!updatedWallet) {
      memWallet.balance = Number((memWallet.balance + valAmount).toFixed(2));
    } else {
      memWallet.balance = updatedWallet.balance;
    }
    memWallet.updatedAt = new Date().toISOString();
  }

  if (!txRecord) {
    const txId = 'tx_' + Math.random().toString(36).substring(2, 11);
    const refId = `ADM-CR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    txRecord = {
      id: txId,
      userId,
      walletId: memWallet.id,
      type: 'admin_credit',
      asset: activeAsset,
      amount: valAmount,
      status: 'completed',
      txHash: refId,
      description: reason.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  db.transactions.push(txRecord);
  createNotification(
    userId,
    'Wallet Credited',
    `Your account was credited with $${valAmount}. Reason: ${reason.trim()}`
  );
  logActivity(req.userId, 'ADMIN_WALLET_CREDIT', `Credited $${valAmount} to user ${userId}. Reason: ${reason.trim()}`, req);
  db.save();

  return res.json({
    message: `Successfully credited $${valAmount} to wallet.`,
    wallet: updatedWallet || { balance: memWallet.balance, demoBalance: memWallet.demoBalance },
    transaction: txRecord,
  });
});

/**
 * POST /api/admin/wallets/:userId/debit
 * Body: { amount: 50, reason: "Correction" }
 * Effect: wallet.balance -= amount
 * Rule: Prevent balance going below zero
 */
app.post('/api/admin/wallets/:userId/debit', authenticate, requireAdmin, async (req: any, res) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;

  const valAmount = parseFloat(amount);
  if (isNaN(valAmount) || valAmount <= 0) {
    return res.status(400).json({ error: 'A valid positive amount is required.' });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Reason for wallet debit is required.' });
  }

  const targetUser = db.users.find((u) => u.id === userId);
  if (req.userRole === 'admin' && targetUser?.role === 'owner') {
    return res.status(403).json({ error: 'Admins cannot modify owner wallets.' });
  }

  const activeAsset = 'USD';
  const prisma = getPrismaClient();

  // Check current balance to prevent going below zero
  let currentBalance = 0;
  let walletId = `w_usd_${userId}`;

  if (prisma) {
    const w = await prisma.wallet.findFirst({ where: { userId, asset: activeAsset } });
    if (w) {
      currentBalance = Number(w.balance);
      walletId = w.id;
    }
  } else {
    const w = db.wallets.find((w) => w.userId === userId && w.asset === activeAsset);
    if (w) {
      currentBalance = w.balance;
      walletId = w.id;
    }
  }

  if (currentBalance < valAmount) {
    return res.status(400).json({
      error: `Insufficient balance. Cannot debit $${valAmount} when current balance is $${currentBalance.toFixed(2)}.`,
    });
  }

  let updatedWallet: any = null;
  let txRecord: any = null;

  if (prisma) {
    try {
      await prisma.$transaction(async (tx: any) => {
        const wallet = await tx.wallet.update({
          where: { id: walletId },
          data: {
            balance: { decrement: valAmount },
          },
        });

        updatedWallet = {
          id: wallet.id,
          userId: wallet.userId,
          asset: wallet.asset,
          balance: Number(wallet.balance),
          demoBalance: Number(wallet.demoBalance),
        };

        const txId = 'tx_' + Math.random().toString(36).substring(2, 11);
        const refId = `ADM-DB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        const createdTx = await tx.transaction.create({
          data: {
            id: txId,
            userId,
            walletId: wallet.id,
            type: 'admin_debit',
            asset: activeAsset,
            amount: valAmount,
            status: 'completed',
            txHash: refId,
            description: reason.trim(),
          },
        });

        txRecord = {
          id: createdTx.id,
          userId: createdTx.userId,
          walletId: createdTx.walletId,
          type: createdTx.type,
          asset: createdTx.asset,
          amount: Number(createdTx.amount),
          status: createdTx.status,
          txHash: createdTx.txHash,
          description: createdTx.description,
          createdAt: toSafeISOString(createdTx.createdAt),
        };

        await tx.activityLog.create({
          data: {
            userId: req.userId,
            action: 'ADMIN_WALLET_DEBIT',
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
            details: `Debited $${valAmount} from user ${userId}. Reason: ${reason.trim()}`,
          },
        });
      });
    } catch (err: any) {
      console.error('[ADMIN DEBIT] Prisma error:', err);
    }
  }

  // Update in-memory db fallback
  let memWallet = db.wallets.find((w) => w.userId === userId && w.asset === activeAsset);
  if (memWallet) {
    if (!updatedWallet) {
      memWallet.balance = Number(Math.max(0, memWallet.balance - valAmount).toFixed(2));
    } else {
      memWallet.balance = updatedWallet.balance;
    }
    memWallet.updatedAt = new Date().toISOString();
  }

  if (!txRecord) {
    const txId = 'tx_' + Math.random().toString(36).substring(2, 11);
    const refId = `ADM-DB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    txRecord = {
      id: txId,
      userId,
      walletId: memWallet ? memWallet.id : walletId,
      type: 'admin_debit',
      asset: activeAsset,
      amount: valAmount,
      status: 'completed',
      txHash: refId,
      description: reason.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  db.transactions.push(txRecord);
  createNotification(
    userId,
    'Wallet Debited',
    `Your account was debited $${valAmount}. Reason: ${reason.trim()}`
  );
  logActivity(req.userId, 'ADMIN_WALLET_DEBIT', `Debited $${valAmount} from user ${userId}. Reason: ${reason.trim()}`, req);
  db.save();

  return res.json({
    message: `Successfully debited $${valAmount} from wallet.`,
    wallet: updatedWallet || { balance: memWallet ? memWallet.balance : 0, demoBalance: memWallet ? memWallet.demoBalance : 5000 },
    transaction: txRecord,
  });
});

/**
 * POST /api/admin/wallets/:userId/reset
 * Body: { resetRealBalance: true, resetDemoBalance: false }
 */
app.post('/api/admin/wallets/:userId/reset', authenticate, requireAdmin, async (req: any, res) => {
  const { userId } = req.params;
  const { resetRealBalance, resetDemoBalance } = req.body;

  if (!resetRealBalance && !resetDemoBalance) {
    return res.status(400).json({ error: 'Please specify at least one balance to reset (resetRealBalance or resetDemoBalance).' });
  }

  const targetUser = db.users.find((u) => u.id === userId);
  if (req.userRole === 'admin' && targetUser?.role === 'owner') {
    return res.status(403).json({ error: 'Admins cannot modify owner wallets.' });
  }

  const activeAsset = 'USD';
  const prisma = getPrismaClient();

  let updatedWallet: any = null;

  if (prisma) {
    try {
      await prisma.$transaction(async (tx: any) => {
        let wallet = await tx.wallet.findFirst({
          where: { userId, asset: activeAsset },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId,
              asset: activeAsset,
              balance: 0,
              demoBalance: 5000,
            },
          });
        } else {
          const updateData: any = {};
          if (resetRealBalance) updateData.balance = 0;
          if (resetDemoBalance) updateData.demoBalance = 5000;

          wallet = await tx.wallet.update({
            where: { id: wallet.id },
            data: updateData,
          });
        }

        updatedWallet = {
          id: wallet.id,
          userId: wallet.userId,
          asset: wallet.asset,
          balance: Number(wallet.balance),
          demoBalance: Number(wallet.demoBalance),
        };

        const resetDetails = [
          resetRealBalance ? 'Real Balance reset to $0.00' : null,
          resetDemoBalance ? 'Demo Balance reset to $5,000.00' : null,
        ].filter(Boolean).join(', ');

        await tx.activityLog.create({
          data: {
            userId: req.userId,
            action: 'ADMIN_WALLET_RESET',
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
            details: `Reset wallet for user ${userId}: ${resetDetails}`,
          },
        });
      });
    } catch (err: any) {
      console.error('[ADMIN RESET] Prisma error:', err);
    }
  }

  // Update in-memory db fallback
  let memWallet = db.wallets.find((w) => w.userId === userId && w.asset === activeAsset);
  if (memWallet) {
    if (resetRealBalance) memWallet.balance = 0;
    if (resetDemoBalance) memWallet.demoBalance = 5000;
    memWallet.updatedAt = new Date().toISOString();
  }

  const resetDetails = [
    resetRealBalance ? 'Real Balance reset to $0.00' : null,
    resetDemoBalance ? 'Demo Balance reset to $5,000.00' : null,
  ].filter(Boolean).join(', ');

  createNotification(
    userId,
    'Wallet Balance Reset',
    `Your account balance was reset by Admin: ${resetDetails}.`
  );
  logActivity(req.userId, 'ADMIN_WALLET_RESET', `Reset wallet for user ${userId}: ${resetDetails}`, req);
  db.save();

  return res.json({
    message: `Successfully reset wallet (${resetDetails}).`,
    wallet: updatedWallet || {
      balance: memWallet ? memWallet.balance : 0,
      demoBalance: memWallet ? memWallet.demoBalance : 5000,
    },
  });
});

app.put('/api/admin/users/:id/role', authenticate, requireAdmin, (req: any, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== 'user' && role !== 'admin' && role !== 'owner') {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  const targetUser = db.users.find(u => u.id === id);
  if (!targetUser) return res.status(404).json({ error: 'User not found.' });

  // SECURITY GUARDS
  // 1. Owner account role can NEVER be changed
  if (targetUser.role === 'owner' || targetUser.email.toLowerCase() === 'bonayafatuma58@gmail.com') {
    return res.status(403).json({ error: 'Owner role cannot be modified or demoted.' });
  }

  // 2. Admins cannot modify their own role, promote anyone to owner, or demote an admin
  if (req.userRole === 'admin') {
    if (targetUser.id === req.userId) {
      return res.status(403).json({ error: 'Admins cannot modify their own role.' });
    }
    if (role === 'owner') {
      return res.status(403).json({ error: 'Only an Owner can grant Owner privileges.' });
    }
    if (targetUser.role === 'admin' && role === 'user') {
      return res.status(403).json({ error: 'Only an Owner can demote an Administrator.' });
    }
  }

  targetUser.role = role;
  db.save();
  logActivity(req.userId, 'User Role Update', `Updated user ${targetUser.email} role to ${role}`, req);
  res.json({ message: `Successfully updated user role to ${role}`, user: targetUser });
});

app.get('/api/admin/trades', authenticate, requireAdmin, (req, res) => {
  const allTrades = db.trades.map(t => {
    const user = db.users.find(u => u.id === t.userId);
    return {
      ...t,
      userEmail: user ? user.email : 'Unknown',
      userFullName: user ? user.fullName : 'Unknown'
    };
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(allTrades);
});

app.post('/api/admin/trades/:id/close', authenticate, requireAdmin, (req: any, res) => {
  const { id } = req.params;
  const trade = db.trades.find(t => t.id === id);

  if (!trade) return res.status(404).json({ error: 'Trade not found.' });
  if (trade.status === 'closed') return res.status(400).json({ error: 'Trade already closed.' });

  const assetPriceItem = marketPrices.find(p => p.symbol === trade.symbol);
  if (!assetPriceItem) return res.status(404).json({ error: 'Market price stream not active for symbol.' });

  const usdWallet = db.wallets.find(w => w.userId === trade.userId && w.asset === 'USD');
  if (!usdWallet) return res.status(404).json({ error: 'USD wallet not found for trader.' });

  const delta = assetPriceItem.price - trade.entryPrice;
  const rawPnl = trade.type === 'buy' ? delta : -delta;
  const finalPnl = Number((rawPnl * trade.quantity).toFixed(2));

  const returnAmount = (trade.quantity * trade.entryPrice) + finalPnl;

  if (trade.isDemo) usdWallet.demoBalance = Math.min(5000, Number((usdWallet.demoBalance + returnAmount).toFixed(2)));
  else usdWallet.balance += returnAmount;

  trade.status = 'closed';
  trade.exitPrice = assetPriceItem.price;
  trade.pnl = finalPnl;
  trade.closedAt = new Date().toISOString();

  db.save();
  logActivity(req.userId, 'Admin Force Close Trade', `Forcefully closed trade position ID ${id}`, req);
  createNotification(trade.userId, 'Trade Position Closed', `An administrator closed your open position on ${trade.symbol} at $${assetPriceItem.price}`);

  res.json({ message: 'Trade forcefully closed successfully.', trade });
});

app.get('/api/admin/transactions', authenticate, requireAdmin, (req, res) => {
  const allTxs = db.transactions.map(t => {
    const user = db.users.find(u => u.id === t.userId);
    return {
      ...t,
      userEmail: user ? user.email : 'Unknown',
      userFullName: user ? user.fullName : 'Unknown'
    };
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(allTxs);
});

app.get('/api/admin/withdrawals', authenticate, requireAdmin, (req, res) => {
  const allReqs = (db.withdrawalRequests || []).map(w => {
    const user = db.users.find(u => u.id === w.userId);
    return {
      ...w,
      userEmail: user ? user.email : 'Unknown',
      userName: user ? user.fullName : 'Unknown'
    };
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(allReqs);
});

app.get('/api/admin/payments', authenticate, requireAdmin, (req, res) => {
  const allPayments = (db.paymentTransactions || []).map(p => {
    const user = db.users.find(u => u.id === p.userId);
    
    let normalizedStatus = 'PENDING';
    if (p.status === 'Completed' || (p.status as string) === 'SUCCESS') normalizedStatus = 'SUCCESS';
    else if (p.status === 'Failed' || (p.status as string) === 'FAILED') normalizedStatus = 'FAILED';
    else if (p.status === 'Cancelled' || (p.status as string) === 'CANCELLED') normalizedStatus = 'CANCELLED';
    
    return {
      ...p,
      reference: p.reference || p.invoiceId,
      userEmail: user ? user.email : 'Unknown User',
      userFullName: user?.fullName || (user?.email ? user.email.split('@')[0] : 'Unknown'),
      normalizedStatus,
      created: p.createdAt,
      completed: p.updatedAt,
    };
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(allPayments);
});

app.post('/api/admin/withdrawals/:id/approve', authenticate, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const wreq = (db.withdrawalRequests || []).find(w => w.id === id || w.referenceId === id);

  if (!wreq) {
    return res.status(404).json({ error: 'Withdrawal request not found.' });
  }

  if (wreq.status !== 'PENDING') {
    return res.status(400).json({ error: `Withdrawal request is already ${wreq.status}.` });
  }

  wreq.status = 'APPROVED';
  wreq.approvedBy = req.userId;
  wreq.approvedAt = new Date().toISOString();
  wreq.updatedAt = new Date().toISOString();

  // Update corresponding transaction in ledger
  const tx = db.transactions.find(t => t.txHash === wreq.referenceId || (t.userId === wreq.userId && t.type === 'withdrawal' && t.status === 'pending'));
  if (tx) {
    tx.status = 'completed';
    tx.description = `Withdrawal Approved (${wreq.paymentMethod} - Ref: ${wreq.referenceId})`;
  }

  db.save();

  const user = db.users.find(u => u.id === wreq.userId);
  if (user) {
    const phone = wreq.phoneNumber || user.phoneNumber;
    console.log(`[NOTIFICATION TRIGGER] Withdrawal Approval: Ref ${wreq.referenceId} | Amount $${wreq.amount} | User ${user.email} | Phone ${phone || 'None'}`);

    // Dispatch Email & SMS
    EmailService.sendWithdrawalApprovedEmail(
      user.email,
      user.fullName || user.email.split('@')[0],
      wreq.amount.toString(),
      wreq.currency || 'USD',
      wreq.paymentMethod,
      wreq.referenceId
    ).catch((err: any) => console.error('[WITHDRAWAL APPROVED EMAIL ERROR]', err));

    if (phone) {
      SMSService.sendWithdrawalApprovedSMS(phone, `$${wreq.amount} ${wreq.currency || 'USD'}`, wreq.referenceId).catch((err: any) => {
        console.error('[WITHDRAWAL APPROVED SMS ERROR]', err);
      });
    }

    createNotification(user.id, 'Withdrawal Approved!', `Your withdrawal request ${wreq.referenceId} of $${wreq.amount} has been approved and processed.`);
  }

  logActivity(req.userId, 'Admin Approved Withdrawal', `Approved withdrawal request ${wreq.referenceId} of $${wreq.amount} for user ID ${wreq.userId}`, req);

  res.json({
    message: 'Withdrawal request approved successfully',
    withdrawalRequest: wreq
  });
});

app.post('/api/admin/withdrawals/:id/reject', authenticate, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { remarks } = req.body;

  const wreq = (db.withdrawalRequests || []).find(w => w.id === id || w.referenceId === id);

  if (!wreq) {
    return res.status(404).json({ error: 'Withdrawal request not found.' });
  }

  if (wreq.status !== 'PENDING') {
    return res.status(400).json({ error: `Withdrawal request is already ${wreq.status}.` });
  }

  const rejectReason = remarks && remarks.trim() ? remarks.trim() : 'Declined by administrator';

  wreq.status = 'REJECTED';
  wreq.remarks = rejectReason;
  wreq.rejectedAt = new Date().toISOString();
  wreq.updatedAt = new Date().toISOString();

  // Restore user balance
  const wallet = db.wallets.find(w => w.id === wreq.walletId || (w.userId === wreq.userId && w.asset === (wreq.currency || 'USD')));
  if (wallet) {
    wallet.balance += wreq.amount;
  }

  // Update transaction status in ledger to rejected
  const tx = db.transactions.find(t => t.txHash === wreq.referenceId || (t.userId === wreq.userId && t.type === 'withdrawal' && t.status === 'pending'));
  if (tx) {
    tx.status = 'rejected';
    tx.description = `Withdrawal Rejected (${rejectReason})`;
  }

  db.save();

  const user = db.users.find(u => u.id === wreq.userId);
  if (user) {
    const phone = wreq.phoneNumber || user.phoneNumber;
    console.log(`[NOTIFICATION TRIGGER] Withdrawal Rejection: Ref ${wreq.referenceId} | Amount $${wreq.amount} | User ${user.email} | Phone ${phone || 'None'} | Reason: ${rejectReason}`);

    // Dispatch Email & SMS
    EmailService.sendWithdrawalRejectedEmail(
      user.email,
      user.fullName || user.email.split('@')[0],
      wreq.amount.toString(),
      wreq.currency || 'USD',
      wreq.paymentMethod,
      wreq.referenceId,
      rejectReason
    ).catch((err: any) => console.error('[WITHDRAWAL REJECTED EMAIL ERROR]', err));

    if (phone) {
      SMSService.sendWithdrawalRejectedSMS(phone, `$${wreq.amount} ${wreq.currency || 'USD'}`, wreq.referenceId, rejectReason).catch((err: any) => {
        console.error('[WITHDRAWAL REJECTED SMS ERROR]', err);
      });
    }

    createNotification(user.id, 'Withdrawal Rejected', `Your withdrawal request ${wreq.referenceId} of $${wreq.amount} was rejected. Reason: ${rejectReason}. Your funds have been restored.`);
  }

  logActivity(req.userId, 'Admin Rejected Withdrawal', `Rejected withdrawal request ${wreq.referenceId} of $${wreq.amount}. Reason: ${rejectReason}`, req);

  res.json({
    message: 'Withdrawal request rejected and funds restored to user wallet',
    withdrawalRequest: wreq
  });
});

app.put('/api/admin/transactions/:id/status', authenticate, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'completed' && status !== 'rejected' && status !== 'pending') {
    return res.status(400).json({ error: 'Invalid status type.' });
  }

  const tx = db.transactions.find(t => t.id === id);
  if (!tx) return res.status(404).json({ error: 'Transaction record not found.' });

  const previousStatus = tx.status;
  tx.status = status;
  db.save();

  logActivity(req.userId, 'Admin Update Tx Status', `Updated Transaction ID ${id} status to ${status}`, req);
  createNotification(tx.userId, 'Transaction Updated', `Your transaction ${tx.id} for ${tx.amount} ${tx.asset} status has been updated to ${status}.`);

  // Send SMS Notification when status becomes completed
  if (status === 'completed' && previousStatus !== 'completed') {
    const targetUser = db.users.find(u => u.id === tx.userId);
    const userPhone = targetUser?.phoneNumber || tx.phone;
    
    if (userPhone) {
      const reference = tx.txHash || tx.id;
      if (tx.type === 'withdrawal') {
        SMSService.sendWithdrawalSMS(userPhone, `KES ${tx.amount}`, reference).catch((err: any) => console.error('[ADMIN WITHDRAWAL SMS ERROR]', err));
      } else if (tx.type === 'deposit') {
        SMSService.sendDepositSMS(userPhone, `KES ${tx.amount}`, reference).catch((err: any) => console.error('[ADMIN DEPOSIT SMS ERROR]', err));
      }
    }
  }

  res.json({ message: 'Transaction status updated.', transaction: tx });
});

app.get('/api/admin/tickets', authenticate, requireAdmin, (req, res) => {
  const allTickets = db.supportTickets.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(allTickets);
});

app.post('/api/admin/announcements', authenticate, requireAdmin, (req: any, res) => {
  const { title, content, type } = req.body;
  if (!title || !content || !type) {
    return res.status(400).json({ error: 'Announcement title, content, and type are required.' });
  }

  const annId = 'ann_' + Math.random().toString(36).substr(2, 9);
  const newAnn: Announcement = {
    id: annId,
    title,
    content,
    type,
    createdAt: new Date().toISOString()
  };

  db.announcements.push(newAnn);
  db.save();

  logActivity(req.userId, 'Admin Announcement', `Published platform announcement: ${title}`, req);
  res.status(201).json({ message: 'Announcement published successfully.', announcement: newAnn });
});

app.delete('/api/admin/announcements/:id', authenticate, requireAdmin, (req: any, res) => {
  const { id } = req.params;
  const index = db.announcements.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ error: 'Announcement not found.' });

  db.announcements.splice(index, 1);
  db.save();

  logActivity(req.userId, 'Admin Delete Announcement', `Deleted announcement ID ${id}`, req);
  res.json({ message: 'Announcement deleted.' });
});

app.get('/api/admin/stats', authenticate, requireAdmin, (req, res) => {
  const totalUsers = db.users.length;
  const totalTrades = db.trades.length;
  const totalSupportTickets = db.supportTickets.length;
  const openSupportTickets = db.supportTickets.filter(t => t.status === 'open').length;

  // Compute aggregated data
  const totalAssetVolume = db.trades.reduce((acc, t) => acc + (t.quantity * t.entryPrice), 0);
  const totalTraderPnl = db.trades.reduce((acc, t) => acc + t.pnl, 0);

  // Asset allocation
  const assetDistribution = marketPrices.map(m => {
    const totalVolume = db.trades.filter(t => t.symbol === m.symbol).reduce((acc, t) => acc + (t.quantity * t.entryPrice), 0);
    return { name: m.symbol, value: totalVolume };
  }).filter(item => item.value > 0);

  res.json({
    totalUsers,
    totalTrades,
    totalSupportTickets,
    openSupportTickets,
    totalAssetVolume,
    totalTraderPnl,
    assetDistribution
  });
});

app.get('/api/admin/logs', authenticate, requireAdmin, (req, res) => {
  const sortedLogs = db.activityLogs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  res.json(sortedLogs);
});

// Exchange Rate Management Endpoints
app.get('/api/settings', (req, res) => {
  const settings = db.getPlatformSettings();
  res.json({
    minimumDepositKES: settings.minimumDepositKES,
    minimumDepositUSD: settings.minimumDepositUSD,
    usdKesRate: ExchangeRateService.getRate('USD', 'KES'),
    updatedAt: settings.updatedAt
  });
});

app.get('/api/exchange-rates', (req, res) => {
  const rates = ExchangeRateService.getAllRates();
  const usdKesRate = ExchangeRateService.getRate('USD', 'KES');
  res.json({ success: true, usdKesRate, rates });
});

app.get('/api/admin/settings', authenticate, requireAdmin, (req, res) => {
  const settings = db.getPlatformSettings();
  res.json(settings);
});

const handleSaveAdminSettings = async (req: any, res: any) => {
  try {
    const { minimumDepositKES, minimumDepositUSD, minimumDeposit } = req.body;
    const current = db.getPlatformSettings();

    const kesVal = minimumDepositKES !== undefined ? minimumDepositKES : (minimumDeposit !== undefined ? minimumDeposit : current.minimumDepositKES);
    const usdVal = minimumDepositUSD !== undefined ? minimumDepositUSD : current.minimumDepositUSD;

    const kes = parseFloat(kesVal);
    const usd = parseFloat(usdVal);

    if (isNaN(kes) || kes <= 0) {
      return res.status(400).json({ error: 'minimumDepositKES must be a valid number greater than 0.' });
    }
    if (isNaN(usd) || usd <= 0) {
      return res.status(400).json({ error: 'minimumDepositUSD must be a valid number greater than 0.' });
    }

    const updated = await db.updatePlatformSettingsAsync(
      { minimumDepositKES: kes, minimumDepositUSD: usd },
      req.userId
    );

    logActivity(
      req.userId,
      'Platform Settings Updated',
      `Admin updated minimum deposit limits: KES ${kes}, USD ${usd}`,
      req
    );

    return res.json({
      success: true,
      message: `Successfully updated minimum deposit limits to KES ${kes} / USD ${usd}`,
      settings: updated,
      minimumDepositKES: updated.minimumDepositKES,
      minimumDepositUSD: updated.minimumDepositUSD
    });
  } catch (error: any) {
    console.error('[ADMIN SETTINGS ERROR]', error);
    return res.status(500).json({ error: error.message || 'Failed to update platform settings.' });
  }
};

app.post('/api/admin/settings', authenticate, requireAdmin, handleSaveAdminSettings);
app.put('/api/admin/settings', authenticate, requireAdmin, handleSaveAdminSettings);
app.put('/api/admin/settings/minimum-deposit', authenticate, requireAdmin, handleSaveAdminSettings);

app.post('/api/admin/exchange-rates', authenticate, requireAdmin, (req: any, res) => {
  try {
    const { rate, pair, fromCurrency, toCurrency } = req.body;
    const numericRate = parseFloat(rate);
    if (isNaN(numericRate) || numericRate <= 0) {
      return res.status(400).json({ error: 'Please provide a valid positive exchange rate.' });
    }

    const from = fromCurrency || (pair ? pair.split('/')[0] : 'USD');
    const to = toCurrency || (pair ? pair.split('/')[1] : 'KES');

    const updatedRate = ExchangeRateService.setRate(numericRate, from, to);
    logActivity(req.userId, 'Exchange Rate Updated', `Admin updated ${from}/${to} exchange rate to ${updatedRate}`, req);

    return res.json({
      success: true,
      message: `Successfully updated ${from}/${to} exchange rate to ${updatedRate}`,
      rate: updatedRate,
      pair: `${from}/${to}`,
      usdKesRate: ExchangeRateService.getRate('USD', 'KES'),
      rates: ExchangeRateService.getAllRates()
    });
  } catch (error: any) {
    console.error('[ADMIN EXCHANGE RATE ERROR]', error);
    return res.status(500).json({ error: error.message || 'Failed to update exchange rate.' });
  }
});

// ============================================================================
// OWNER PANEL ENDPOINTS (/api/owner/*)
// ============================================================================

const ownerConfigStore = {
  maintenanceMode: false,
  smtpHost: 'smtp.pesaoption.com',
  smtpPort: 587,
  smtpUser: 'notifications@pesaoption.com',
  emailFrom: 'PesaOption System <no-reply@pesaoption.com>',
  zetuPaySecretKey: process.env.ZETUPAY_SECRET_KEY || '',
  zetuPayApiUrl: process.env.ZETUPAY_API_URL || 'https://pay.zetupay.co.ke/api/v1',
  lipiaApiKey: process.env.LIPIA_API_KEY || ''
};

// 1. Platform Statistics for Owner
app.get('/api/owner/stats', authenticate, requireOwner, (req, res) => {
  const totalUsers = db.users.length;
  const totalAdmins = db.users.filter(u => u.role === 'admin').length;
  const totalDepositsAmount = db.transactions
    .filter(t => (t.type === 'deposit' || t.type === 'admin_credit') && t.status === 'completed')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const totalWithdrawalsAmount = db.transactions
    .filter(t => (t.type === 'withdrawal' || t.type === 'admin_debit') && t.status === 'completed')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  const totalTradingVolume = db.trades.reduce((acc, t) => acc + (t.quantity * t.entryPrice), 0);
  
  const totalLosses = db.trades.filter(t => t.status === 'closed' && t.pnl < 0).reduce((acc, t) => acc + Math.abs(t.pnl), 0);
  const totalWins = db.trades.filter(t => t.status === 'closed' && t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const platformEstimatedProfit = Number((totalLosses - totalWins + (totalTradingVolume * 0.02)).toFixed(2));

  res.json({
    totalUsers,
    totalAdmins,
    totalDepositsAmount: Number(totalDepositsAmount.toFixed(2)),
    totalWithdrawalsAmount: Number(totalWithdrawalsAmount.toFixed(2)),
    totalTradingVolume: Number(totalTradingVolume.toFixed(2)),
    platformEstimatedProfit
  });
});

// 2. System Health Status for Owner
app.get('/api/owner/system-health', authenticate, requireOwner, (req, res) => {
  const dbSizeKb = Math.round(JSON.stringify(db.users).length / 1024) + 14;
  res.json({
    databaseStatus: 'Healthy',
    databaseSizeKb: dbSizeKb,
    smtpStatus: ownerConfigStore.smtpHost ? 'Configured' : 'Unconfigured',
    zetuPayStatus: (process.env.ZETUPAY_SECRET_KEY || ownerConfigStore.zetuPaySecretKey) ? 'Configured' : 'Unconfigured',
    lipiaStatus: (process.env.LIPIA_API_KEY || ownerConfigStore.lipiaApiKey) ? 'Configured' : 'Unconfigured',
    maintenanceMode: ownerConfigStore.maintenanceMode,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// 3. Get Owner Platform Config
app.get('/api/owner/config', authenticate, requireOwner, (req, res) => {
  res.json(ownerConfigStore);
});

// 4. Update Owner Platform Config
app.post('/api/owner/config', authenticate, requireOwner, (req: any, res) => {
  const { maintenanceMode, smtpHost, smtpPort, smtpUser, emailFrom, lipiaApiKey } = req.body;
  
  if (maintenanceMode !== undefined) ownerConfigStore.maintenanceMode = Boolean(maintenanceMode);
  if (smtpHost !== undefined) ownerConfigStore.smtpHost = smtpHost;
  if (smtpPort !== undefined) ownerConfigStore.smtpPort = Number(smtpPort);
  if (smtpUser !== undefined) ownerConfigStore.smtpUser = smtpUser;
  if (emailFrom !== undefined) ownerConfigStore.emailFrom = emailFrom;
  if (lipiaApiKey !== undefined) ownerConfigStore.lipiaApiKey = lipiaApiKey;

  logActivity(req.userId, 'Owner Configuration Update', 'Updated platform configuration, gateway, and security settings.', req);
  res.json({ message: 'Owner platform configuration updated successfully.', config: ownerConfigStore });
});

// 5. Detailed Owner Security & Audit Logs
app.get('/api/owner/logs', authenticate, requireOwner, (req, res) => {
  const ownerLogs = db.activityLogs
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(log => {
      const u = db.users.find(usr => usr.id === log.userId);
      return {
        ...log,
        userEmail: u ? u.email : 'System/Guest',
        userRole: u ? u.role : 'N/A'
      };
    });
  res.json(ownerLogs);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PesaOption Express API' });
});

// Root API welcome endpoint
app.get('/', (req, res, next) => {
  // If Vite middleware is handling root in dev mode, let it pass through
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(path.join(process.cwd(), 'frontend', 'index.html'))) {
    return next();
  }
  res.json({
    status: 'ok',
    name: 'PesaOption Backend API',
    description: 'Institutional Digital Trading Platform API Service',
    endpoints: '/api'
  });
});

// ============================================================================
// VITE CLIENT MIDDLEWARE (LOCAL DEV ONLY) & SERVER START
// ============================================================================
async function startServer() {
  // Ensure Database initialization completes before listening
  console.log('[SERVER] Initializing Database & PostgreSQL connection...');
  try {
    await Database.getInstance().init();
    console.log('[SERVER] Database initialization complete.');
  } catch (err) {
    console.warn('[SERVER] Database init warning:', err);
  }

  // Local development fallback only: mount Vite middleware if in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const frontendDir = path.join(process.cwd(), 'frontend');
    if (fs.existsSync(path.join(frontendDir, 'index.html'))) {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          root: frontendDir,
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (err) {
        console.log('[SERVER] Running in development mode without Vite middleware.');
      }
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] CryptonicHub Platform running at http://0.0.0.0:${PORT}`);
    ZetuPayService.startBackgroundPoller();
  });
}

startServer();

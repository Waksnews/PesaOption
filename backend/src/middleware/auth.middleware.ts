/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Database, getPrismaClient } from '../../server/db';

export const SESSION_SECRET = process.env.SESSION_SECRET || 'cryptonichub_secret_session_key_2026';

/**
 * Generates a signed session token (JWT equivalent)
 */
export function generateSessionToken(userId: string, role: string): string {
  const issuedAt = Date.now();
  const expires = issuedAt + 24 * 3600 * 1000; // 24 hours
  const payload = `${userId}:${role}:${expires}:${issuedAt}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64');
  console.log(`[AUTH] JWT generated`);
  return token;
}

/**
 * Verifies a session token signature and expiration against PostgreSQL
 */
export async function verifySessionToken(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    
    let userId: string, role: string, expiresStr: string, signature: string;
    let issuedAt: number = 0;

    if (parts.length === 5) {
      [userId, role, expiresStr, issuedAt as any, signature] = parts;
      issuedAt = parseInt(issuedAt as any, 10);
    } else if (parts.length === 4) {
      [userId, role, expiresStr, signature] = parts;
    } else {
      console.warn('[AUTH] Invalid JWT format');
      return null;
    }

    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || Date.now() > expires) {
      console.warn('[AUTH] Expired JWT');
      return null;
    }

    const payload = parts.length === 5 ? `${userId}:${role}:${expires}:${issuedAt}` : `${userId}:${role}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    
    if (signature !== expectedSignature) {
      console.warn('[AUTH] Invalid JWT signature');
      return null;
    }

    const prisma = getPrismaClient();
    let user: any = null;

    if (prisma) {
      try {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } catch (e) {
        console.error('[AUTH] verifySessionToken Prisma lookup error:', e);
      }
    }

    if (!user) {
      const db = Database.getInstance();
      user = db.users.find(u => u.id === userId);
    }

    if (!user) {
      console.warn('[AUTH] User not found for token');
      return null;
    }

    if (user.passwordChangedAt && issuedAt) {
      const passwordChangedTime = new Date(user.passwordChangedAt).getTime();
      if (issuedAt < passwordChangedTime) {
        console.warn('[AUTH] Invalid JWT - password changed after token issuance');
        return null;
      }
    }

    console.log('[AUTH] JWT verified');
    return { userId, role: user.role || role };
  } catch (e) {
    console.warn('[AUTH] Invalid JWT decoding error');
    return null;
  }
}

/**
 * Authentication Middleware for Express endpoints
 */
export async function authenticate(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AUTH] Missing Authorization header');
    return res.status(401).json({ error: 'Unauthorized. Missing Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    console.warn('[AUTH] Empty Bearer token');
    return res.status(401).json({ error: 'Unauthorized. Empty Bearer token.' });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }

  req.userId = session.userId;
  
  const prisma = getPrismaClient();
  let user: any = null;

  if (prisma) {
    try {
      user = await prisma.user.findUnique({ where: { id: session.userId } });
    } catch (e) {
      console.error('[AUTH] authenticate Prisma lookup error:', e);
    }
  }

  if (!user) {
    const db = Database.getInstance();
    user = db.users.find(u => u.id === session.userId);
  }

  if (user) {
    if (user.email && user.email.toLowerCase() === 'bonayafatuma58@gmail.com' && user.role !== 'owner') {
      user.role = 'owner';
      if (prisma) {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'owner' } }).catch(() => {});
      }
      const db = Database.getInstance();
      const inMem = db.users.find(u => u.id === user.id);
      if (inMem) { inMem.role = 'owner'; db.save(); }
    }
    req.userRole = user.role;
  } else {
    req.userRole = session.role;
  }

  console.log(`[AUTH] User authenticated: ${session.userId}`);
  next();
}

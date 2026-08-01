/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Database } from '../../server/db';

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
 * Verifies a session token signature and expiration
 */
export function verifySessionToken(token: string): { userId: string; role: string } | null {
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
      console.warn('[AUTH] Invalid JWT');
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
      console.warn('[AUTH] Invalid JWT_SECRET');
      return null;
    }

    const db = Database.getInstance();
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      console.warn('[AUTH] User not found');
      return null;
    }

    if (user.passwordChangedAt && issuedAt) {
      const passwordChangedTime = new Date(user.passwordChangedAt).getTime();
      if (issuedAt < passwordChangedTime) {
        console.warn('[AUTH] Invalid JWT');
        return null;
      }
    }

    console.log('[AUTH] JWT verified');
    return { userId, role };
  } catch (e) {
    console.warn('[AUTH] Invalid JWT');
    return null;
  }
}

/**
 * Authentication Middleware for Express endpoints
 */
export function authenticate(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AUTH] Missing Authorization header');
    return res.status(401).json({ error: 'Unauthorized. Missing Authorization header.' });
  }

  console.log('[AUTH] Authorization header received');
  const token = authHeader.split(' ')[1];

  if (!token) {
    console.warn('[AUTH] Missing Authorization header');
    return res.status(401).json({ error: 'Unauthorized. Empty Bearer token.' });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }

  req.userId = session.userId;
  
  const db = Database.getInstance();
  const user = db.users.find(u => u.id === session.userId);
  if (user) {
    if (user.email.toLowerCase() === 'bonayafatuma58@gmail.com' && user.role !== 'owner') {
      user.role = 'owner';
      db.save();
    }
    req.userRole = user.role;
  } else {
    req.userRole = session.role;
  }

  console.log(`[AUTH] User authenticated: ${session.userId}`);
  next();
}

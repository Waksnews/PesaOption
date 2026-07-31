/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * In-memory rate limiter middleware for sensitive auth endpoints
 * Default: Maximum 5 requests per 15-minute window per IP
 */
export function rateLimiter(maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    
    const record = rateLimitStore.get(clientIp);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const minutesRemaining = Math.ceil((record.resetTime - now) / (60 * 1000));
      return res.status(429).json({
        error: `Too many password reset requests. Please try again after ${minutesRemaining} minute(s).`,
      });
    }

    record.count += 1;
    return next();
  };
}

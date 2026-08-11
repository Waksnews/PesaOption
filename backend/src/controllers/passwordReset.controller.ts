/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { Database, getPrismaClient, hashPassword } from '../../server/db';
import { generateRandomToken, hashToken, validatePasswordStrength } from '../utils/token';
import { EmailService } from '../services/email.service';
import { SMSService } from '../services/sms.service';

export class PasswordResetController {
  /**
   * POST /api/auth/forgot-password
   * Initiates password reset flow and sends email with token
   */
  public static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    // Return constant success message to prevent user email enumeration attacks
    const genericSuccessMsg = 'If an account exists, a password reset email has been sent.';

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(200).json({ message: genericSuccessMsg });
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const prisma = getPrismaClient();

      let user: any = null;

      if (prisma) {
        user = await prisma.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
        });
      }

      if (!user) {
        const db = Database.getInstance();
        user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
      }

      if (user) {
        // Generate secure 32-byte raw token
        const rawToken = generateRandomToken(32);
        const hashedToken = hashToken(rawToken);
        const expiresDate = new Date(Date.now() + 15 * 60 * 1000);

        if (prisma) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              passwordResetToken: hashedToken,
              passwordResetExpires: expiresDate
            }
          });
          console.log(`[AUTH] Password reset token persisted to PostgreSQL for user ID: ${user.id}`);
        }

        // Also update in-memory user object for compatibility
        const db = Database.getInstance();
        const inMemUser = db.users.find(u => u.id === user.id);
        if (inMemUser) {
          inMemUser.passwordResetToken = hashedToken;
          inMemUser.passwordResetExpires = expiresDate.toISOString();
          db.save();
        }

        // Construct reset link using FRONTEND_URL or APP_URL
        const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

        console.log(`[NOTIFICATION TRIGGER] Password Reset Request: User ${user.email} | Phone ${user.phoneNumber || 'None'}`);

        // Send email via EmailService
        EmailService.sendPasswordResetEmail(
          user.email,
          user.fullName || user.email.split('@')[0],
          resetUrl
        ).catch(err => console.error('[PASSWORD RESET EMAIL ERROR]', err));

        // Send SMS via SMSService if phone number exists
        if (user.phoneNumber) {
          SMSService.sendPasswordResetSMS(user.phoneNumber, resetUrl).catch(err =>
            console.error('[PASSWORD RESET SMS ERROR]', err)
          );
        }
      }

      return res.status(200).json({ message: genericSuccessMsg });
    } catch (error: any) {
      console.error('[PASSWORD RESET CONTROLLER] Forgot Password Error:', error);
      return res.status(200).json({ message: genericSuccessMsg });
    }
  }

  /**
   * GET /api/auth/reset-password/:token
   * Verifies if a reset token is valid and not expired
   */
  public static async verifyToken(req: Request, res: Response) {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required.' });
    }

    try {
      const hashedToken = hashToken(token);
      const prisma = getPrismaClient();

      let user: any = null;

      if (prisma) {
        user = await prisma.user.findFirst({
          where: { passwordResetToken: hashedToken }
        });
      }

      if (!user) {
        const db = Database.getInstance();
        user = db.users.find(u => u.passwordResetToken === hashedToken);
      }

      if (!user || !user.passwordResetExpires) {
        return res.status(400).json({ valid: false, error: 'Password reset link is invalid or has already been used.' });
      }

      const expiresAt = new Date(user.passwordResetExpires).getTime();
      if (Date.now() > expiresAt) {
        return res.status(400).json({ valid: false, error: 'Password reset link has expired (15-minute limit exceeded).' });
      }

      return res.json({ valid: true, email: user.email });
    } catch (error: any) {
      console.error('[PASSWORD RESET CONTROLLER] Verify Token Error:', error);
      return res.status(500).json({ valid: false, error: 'Failed to verify token.' });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Updates user password using valid token and invalidates token/sessions
   */
  public static async resetPassword(req: Request, res: Response) {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Token, password, and password confirmation are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Validate password rules: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strengthResult = validatePasswordStrength(password);
    if (!strengthResult.isValid) {
      return res.status(400).json({
        error: 'Password does not meet complexity requirements.',
        details: strengthResult.errors,
      });
    }

    try {
      const hashedToken = hashToken(token);
      const prisma = getPrismaClient();

      let user: any = null;

      if (prisma) {
        user = await prisma.user.findFirst({
          where: { passwordResetToken: hashedToken }
        });
      }

      if (!user) {
        const db = Database.getInstance();
        user = db.users.find(u => u.passwordResetToken === hashedToken);
      }

      if (!user || !user.passwordResetExpires) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      const expiresAt = new Date(user.passwordResetExpires).getTime();
      if (Date.now() > expiresAt) {
        return res.status(400).json({ error: 'Password reset token has expired.' });
      }

      const newPasswordHash = hashPassword(password);
      const passwordChangedAt = new Date();

      if (prisma) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newPasswordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordChangedAt: passwordChangedAt
          }
        });
        console.log(`[AUTH] Password reset persisted to PostgreSQL`);
      }

      // Invalidate in-memory user cache single-use token and update passwordHash
      const db = Database.getInstance();
      const inMemUser = db.users.find(u => u.id === user.id);
      if (inMemUser) {
        inMemUser.passwordHash = newPasswordHash;
        delete inMemUser.passwordResetToken;
        delete inMemUser.passwordResetExpires;
        inMemUser.passwordChangedAt = passwordChangedAt.toISOString();
        db.save();
      }

      return res.json({
        message: 'Password updated successfully. Please log in with your new credentials.',
      });
    } catch (error: any) {
      console.error('[PASSWORD RESET CONTROLLER] Reset Password Error:', error);
      return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
  }
}

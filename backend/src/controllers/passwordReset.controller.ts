/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { Database, hashPassword } from '../../server/db';
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
      const db = Database.getInstance();
      const normalizedEmail = email.trim().toLowerCase();
      const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

      if (user) {
        // Generate secure 32-byte raw token
        const rawToken = generateRandomToken(32);
        const hashedToken = hashToken(rawToken);

        // Store hashed token and 15-minute expiration time
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        db.save();

        // Construct reset link using FRONTEND_URL or APP_URL
        const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

        // Send email via EmailService
        await EmailService.sendPasswordResetEmail(
          user.email,
          user.fullName || user.email.split('@')[0],
          resetUrl
        );

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
      const db = Database.getInstance();
      const hashedToken = hashToken(token);
      const user = db.users.find(u => u.passwordResetToken === hashedToken);

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
      const db = Database.getInstance();
      const hashedToken = hashToken(token);
      const user = db.users.find(u => u.passwordResetToken === hashedToken);

      if (!user || !user.passwordResetExpires) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      const expiresAt = new Date(user.passwordResetExpires).getTime();
      if (Date.now() > expiresAt) {
        return res.status(400).json({ error: 'Password reset token has expired.' });
      }

      // 1. Update password hash
      user.passwordHash = hashPassword(password);

      // 2. Invalidate reset token immediately (single-use)
      delete user.passwordResetToken;
      delete user.passwordResetExpires;

      // 3. Invalidate all active JWT sessions
      user.passwordChangedAt = new Date().toISOString();

      // 4. Commit changes
      db.save();

      console.log(`[PASSWORD RESET CONTROLLER] Password successfully reset for user: ${user.email}`);

      return res.json({
        message: 'Password updated successfully. Please log in with your new credentials.',
      });
    } catch (error: any) {
      console.error('[PASSWORD RESET CONTROLLER] Reset Password Error:', error);
      return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
  }
}

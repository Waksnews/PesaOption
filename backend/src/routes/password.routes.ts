/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { PasswordResetController } from '../controllers/passwordReset.controller';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Password reset routes with rate limiting guards
router.post('/forgot-password', rateLimiter(5, 15 * 60 * 1000), PasswordResetController.forgotPassword);
router.get('/reset-password/:token', PasswordResetController.verifyToken);
router.post('/reset-password', rateLimiter(5, 15 * 60 * 1000), PasswordResetController.resetPassword);

export default router;

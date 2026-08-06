/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = express.Router();

/**
 * Public Callback Endpoints for Lipia Payment Notifications
 */
router.post('/lipia', PaymentController.handleCallback);
router.post('/lipia/callback', PaymentController.handleCallback);

export default router;

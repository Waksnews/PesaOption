/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { webhookVerify } from '../middleware/webhookVerify';

const router = express.Router();

/**
 * POST /api/webhooks/intasend
 * Public Webhook Receiver protected by IntaSend signature verification
 */
router.post('/intasend', webhookVerify, PaymentController.handleWebhook);

export default router;

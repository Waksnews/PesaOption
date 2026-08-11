/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = express.Router();

/**
 * Public Webhook Endpoints
 */
router.post('/zetupay', PaymentController.handleCallback);
router.post('/zetupay/callback', PaymentController.handleCallback);
router.get('/zetupay', PaymentController.handleCallback);
router.get('/zetupay/callback', PaymentController.handleCallback);

router.post('/callback', PaymentController.handleCallback);
router.get('/callback', PaymentController.handleCallback);

router.post('/lipia', PaymentController.handleCallback);
router.post('/lipia/callback', PaymentController.handleCallback);

export default router;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Deposit endpoints
router.post('/deposit', authenticate, PaymentController.createDeposit);
router.post('/callback', PaymentController.handleCallback);
router.get('/callback', PaymentController.handleCallback);
router.get('/:reference/status', authenticate, PaymentController.getDepositByRef);
router.get('/:reference', authenticate, PaymentController.getDepositByRef);

export default router;

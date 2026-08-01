/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Payment endpoints
router.post('/deposit', authenticate, PaymentController.createDeposit);
router.post('/intasend/create', authenticate, PaymentController.createIntaSendPayment);
router.get('/intasend/status/:invoiceId', authenticate, PaymentController.getIntaSendStatus);
router.get('/:reference', authenticate, PaymentController.getDepositByRef);

export default router;

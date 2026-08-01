/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { MpesaController } from '../controllers/mpesa.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Endpoints configuration
router.post('/stkpush', authenticate, MpesaController.stkPush);
router.post('/callback', MpesaController.callback); // Public for Safaricom calls
router.get('/status/:checkoutRequestId', authenticate, MpesaController.status);

export default router;

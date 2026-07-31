-- Migration: Create payment_transactions table for IntaSend Payment Gateway
-- Platform: PesaOption Trading Platform

CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id VARCHAR(128) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL DEFAULT 'intasend',
    payment_method VARCHAR(32) NOT NULL DEFAULT 'M-PESA',
    phone VARCHAR(32) DEFAULT '',
    amount DECIMAL(16, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'KES',
    status VARCHAR(16) NOT NULL DEFAULT 'Pending',
    reference VARCHAR(128) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user transaction history lookups
CREATE INDEX IF NOT EXISTS idx_payment_tx_user_id ON payment_transactions(user_id);
-- Index for fast invoice lookup during webhook callbacks
CREATE INDEX IF NOT EXISTS idx_payment_tx_invoice_id ON payment_transactions(invoice_id);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);

-- Migration: Add password reset fields to users table
-- Platform: PesaOption Trading Platform

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index on password_reset_token for fast verification lookup
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

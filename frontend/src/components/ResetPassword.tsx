/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Lock, Eye, EyeOff, Check, X, ShieldAlert, 
  CheckCircle2, Loader2, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { callApi } from '../lib/api';
import { validatePasswordStrength } from '../utils/token';

interface ResetPasswordProps {
  tokenOverride?: string;
  onBackToLogin: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ tokenOverride, onBackToLogin }) => {
  // Extract token from override, window location search or hash route
  const getTokenFromUrl = (): string => {
    if (tokenOverride) return tokenOverride;
    
    // Check standard query string ?token=...
    const urlParams = new URLSearchParams(window.location.search);
    const searchToken = urlParams.get('token');
    if (searchToken) return searchToken;

    // Check hash parameter e.g. #/reset-password?token=...
    const hash = window.location.hash;
    if (hash.includes('token=')) {
      const match = hash.match(/token=([^&]+)/);
      if (match && match[1]) return match[1];
    }

    return '';
  };

  const [token] = useState<string>(getTokenFromUrl());
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Real-time password strength validation
  const validation = validatePasswordStrength(password);

  // Verify token on mount
  useEffect(() => {
    async function verify() {
      if (!token) {
        setTokenError('No password reset token was provided in the URL link.');
        setVerifyingToken(false);
        return;
      }

      setVerifyingToken(true);
      setTokenError(null);

      try {
        const data = await callApi(`/api/auth/reset-password/${encodeURIComponent(token)}`);
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(data.error || 'Password reset link is invalid or has expired.');
        }
      } catch (err: any) {
        console.error('[RESET TOKEN VERIFICATION ERROR]', err);
        setTokenValid(false);
        setTokenError(err.message || 'The password reset token is invalid or has expired.');
      } finally {
        setVerifyingToken(false);
      }
    }

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (!validation.isValid) {
      setFormError('Please satisfy all password complexity requirements before proceeding.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await callApi('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('[RESET PASSWORD SUBMIT ERROR]', err);
      setFormError(err.message || 'Failed to update password. Please try requesting a new reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate strength score 0-100
  const metCount = [
    validation.hasMinLength,
    validation.hasUppercase,
    validation.hasLowercase,
    validation.hasNumber,
    validation.hasSpecialChar,
  ].filter(Boolean).length;
  const strengthPercentage = (metCount / 5) * 100;

  const getStrengthColor = () => {
    if (metCount <= 2) return 'bg-rose-500';
    if (metCount <= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-slate-950 min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Back Link */}
        <button 
          onClick={onBackToLogin}
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-xs mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </button>

        {/* Form Container Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-tr from-teal-500 to-indigo-600 rounded flex items-center justify-center shadow-md">
              <TrendingUp className="w-4.5 h-4.5 text-slate-950 font-bold" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-slate-100">
              Pesa<span className="text-teal-400">Option</span>
            </span>
          </div>

          <h2 className="font-display font-bold text-2xl text-slate-100 tracking-tight mb-2">
            Reset Password
          </h2>

          {/* Verification Loader State */}
          {verifyingToken && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono animate-pulse">
                Verifying password reset security token...
              </p>
            </div>
          )}

          {/* Invalid or Expired Token State */}
          {!verifyingToken && !tokenValid && !success && (
            <div className="py-6 space-y-6 text-center">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-100">Reset Link Invalid</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {tokenError || 'This password reset link is invalid, broken, or has expired after 15 minutes.'}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-left text-xs text-slate-400 space-y-2 font-mono">
                <p className="text-amber-400 font-bold">Why did this happen?</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>Tokens automatically expire after 15 minutes.</li>
                  <li>Reset links can only be used once.</li>
                  <li>A newer reset link may have been requested.</li>
                </ul>
              </div>

              <button
                onClick={onBackToLogin}
                className="w-full py-3 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                Request New Password Reset Link
              </button>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="py-6 space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-100">Password Updated Successfully</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Your PesaOption account password has been updated. All active sessions have been invalidated for security.
                </p>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-xs text-emerald-400 font-mono">
                ✓ Token cleared & active sessions revoked.
              </div>

              <button
                onClick={onBackToLogin}
                className="w-full py-3.5 bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg hover:shadow-teal-500/10 active:scale-[0.98]"
              >
                Log In With New Password
              </button>
            </div>
          )}

          {/* Valid Token - Enter New Password Form */}
          {!verifyingToken && tokenValid && !success && (
            <>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Please set a new secure password for your PesaOption account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* New Password Field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter & Rules */}
                {password.length > 0 && (
                  <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-400 uppercase font-bold">Password Strength</span>
                      <span className="text-slate-300 font-bold">{metCount} / 5 Criteria</span>
                    </div>

                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${getStrengthColor()}`}
                        style={{ width: `${strengthPercentage}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-1 pt-1 text-[11px] font-mono">
                      <div className={`flex items-center space-x-1.5 ${validation.hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {validation.hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${validation.hasUppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {validation.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>At least 1 uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${validation.hasLowercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {validation.hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>At least 1 lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${validation.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {validation.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>At least 1 number (0-9)</span>
                      </div>
                      <div className={`flex items-center space-x-1.5 ${validation.hasSpecialChar ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {validation.hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>At least 1 special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition font-mono"
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-rose-400 mt-1 font-mono">Passwords do not match.</p>
                  )}
                </div>

                {/* Error Banner */}
                {formError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !validation.isValid || password !== confirmPassword}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-teal-500/10 active:scale-[0.98] transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

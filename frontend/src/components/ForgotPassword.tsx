/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TrendingUp, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { callApi } from '../lib/api';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  onBackToLanding?: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin, onBackToLanding }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await callApi('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      setResponseMessage(data.message || 'Reset instructions have been sent to your email');
      setSubmitted(true);
    } catch (err: any) {
      console.error('[FORGOT PASSWORD ERROR]', err);
      setErrorMessage(err.message || 'Failed to submit request. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Navigation back buttons */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={onBackToLogin}
            className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>
          
          {onBackToLanding && (
            <button 
              onClick={onBackToLanding}
              className="text-slate-500 hover:text-slate-300 text-xs transition cursor-pointer"
            >
              Landing Page
            </button>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-tr from-teal-500 to-indigo-600 rounded flex items-center justify-center shadow-md">
              <TrendingUp className="w-4.5 h-4.5 text-slate-950 font-bold" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-slate-100">
              Pesa<span className="text-teal-400">Option</span>
            </span>
          </div>

          <h2 className="font-display font-bold text-2xl text-slate-100 tracking-tight mb-2">
            Forgot Password?
          </h2>

          {!submitted ? (
            <>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Enter your registered PesaOption email address below. We will generate and send a 15-minute secure password reset link to your inbox.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. trader@pesaoption.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition font-sans"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-teal-500/10 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <span>SEND RESET LINK</span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-100">Check Your Inbox</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-sm mx-auto p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-300">
                  Reset instructions have been sent to your email
                </p>
                <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] font-mono text-slate-400 text-left mt-4 space-y-1">
                  <p className="text-emerald-400 font-bold">⏱️ Link expires in 15 minutes</p>
                  <p className="text-slate-500">If you don't see the email, check your spam or junk folder.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onBackToLogin}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs uppercase rounded-xl transition cursor-pointer tracking-wider"
                >
                  RETURN TO LOGIN
                </button>
              </div>
            </div>
          )}

          {/* Security Notice Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              Secured with SHA-256 token encryption & rate-limited API protection.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

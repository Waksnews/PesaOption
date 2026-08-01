/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, ShieldAlert, ArrowLeft, Mail, Lock, User, Gift, Sparkles } from 'lucide-react';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';

interface AuthViewProps {
  initialMode: 'login' | 'register' | 'forgot' | 'reset';
  onBackToLanding: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode, onBackToLanding }) => {
  const { login, register, error } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  if (mode === 'forgot') {
    return <ForgotPassword onBackToLogin={() => setMode('login')} onBackToLanding={onBackToLanding} />;
  }

  if (mode === 'reset') {
    return <ResetPassword onBackToLogin={() => setMode('login')} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalErr(null);
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const ok = await login(email, password);
        if (!ok) setLocalErr('Invalid credentials or network timeout.');
      } else if (mode === 'register') {
        if (password.length < 6) {
          setLocalErr('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const ok = await register(email, password, fullName, referralCode || undefined);
        if (!ok) setLocalErr('Registration failed. Email might already be taken.');
      } else if (mode === 'forgot') {
        // Mock success
        setSuccessMsg('Reset code and instructions sent to your email.');
        setLocalErr(null);
      }
    } catch (err: any) {
      setLocalErr(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden max-w-full">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none overflow-hidden" />
      <div className="absolute top-1/3 left-1/4 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none overflow-hidden" />

      <div className="w-full max-w-md relative z-10">
        {/* Back link */}
        <button 
          onClick={onBackToLanding}
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-xs mb-8 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-tr from-teal-500 to-indigo-600 rounded flex items-center justify-center shadow-md">
              <TrendingUp className="w-4.5 h-4.5 text-slate-950 font-bold" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-slate-100">PesaOption</span>
          </div>

          <h2 className="font-display font-bold text-2xl text-slate-100 tracking-tight mb-2">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Open Trading Account'}
          </h2>
          
          <p className="text-slate-400 text-xs mb-6">
            {mode === 'login' && 'Sign in to access your trading desk, charts, execute orders, and manage funds.'}
            {mode === 'register' && 'Create your secure trading account in under one minute to access real and demo trading, secure funding, withdrawals and professional trading tools.'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Mercier"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@trading.demo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] text-teal-400 hover:underline hover:text-teal-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'user123' : '••••••••'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <Gift className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter friend's code (e.g., ALEX500)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {/* Error alerts */}
            {(localErr || error) && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{localErr || error}</span>
              </div>
            )}

            {/* Success alerts */}
            {successMsg && (
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs rounded-xl">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-teal-500/10 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Processing Account...' : (
                mode === 'login' ? 'Sign In' : 
                mode === 'register' ? 'Open Trading Account' : 'Send Instructions'
              )}
            </button>
          </form>

          {/* Toggle Footers */}
          <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have a trading account?{' '}
                <button 
                  onClick={() => setMode('register')}
                  className="text-teal-400 font-semibold hover:underline"
                >
                  Open free account
                </button>
              </p>
            ) : mode === 'register' ? (
              <p>
                Already have an account?{' '}
                <button 
                  onClick={() => setMode('login')}
                  className="text-teal-400 font-semibold hover:underline"
                >
                  Log in
                </button>
              </p>
            ) : (
              <p>
                Remembered password?{' '}
                <button 
                  onClick={() => setMode('login')}
                  className="text-teal-400 font-semibold hover:underline"
                >
                  Back to login
                </button>
              </p>
            )}
          </div>

          {/* Quick Login Credentials Help */}
          <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800/60 rounded-xl text-[10px] text-slate-500 space-y-1">
            <p className="font-mono uppercase text-slate-400 tracking-wider font-semibold">Test Login Credentials</p>
            <div className="flex justify-between">
              <span>Standard Trader:</span>
              <span className="font-mono text-slate-300 font-medium">user@trading.demo / user123</span>
            </div>
            <div className="flex justify-between">
              <span>Admin Operator:</span>
              <span className="font-mono text-slate-300 font-medium">admin@trading.demo / admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

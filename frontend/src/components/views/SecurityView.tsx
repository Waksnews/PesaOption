/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { Shield, Lock, ShieldAlert, Check, RefreshCw } from 'lucide-react';

export const SecurityView: React.FC = () => {
  const { changePassword } = useApp();
  const { twoFactorEnabled, toggleTwoFactor } = useSettingsStore();
  const { addToast } = useNotificationStore();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const success = await changePassword(currentPass, newPass);
    if (success) {
      setSuccessMsg('Your security password has been updated in our database nodes.');
      addToast('Password Changed', 'Security credentials updated successfully.', 'success');
      setCurrentPass('');
      setNewPass('');
    } else {
      setErrorMsg('Verification failed: Current password is incorrect.');
      addToast('Change Failed', 'Your current credentials failed verification.', 'error');
    }
    setSubmitting(false);
  };

  const handle2FAToggle = () => {
    toggleTwoFactor();
    addToast(
      twoFactorEnabled ? 'Two-Factor Disabled' : 'Two-Factor Engaged',
      twoFactorEnabled ? 'SMS/TOTP challenge disabled.' : 'Encrypted challenge active on ledger withdrawal.',
      'info'
    );
  };

  // Mock sessions logs for technical platform atmosphere
  const sessionLogs = [
    { ip: '194.22.41.109', device: 'Chrome Browser (Linux)', date: '2026-07-19 05:14 UTC', status: 'Active Session' },
    { ip: '194.22.41.109', device: 'Mobile Safari (iOS)', date: '2026-07-18 19:42 UTC', status: 'Closed' }
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      
      {/* Box 1: Passwords and 2FA */}
      <div className="space-y-6">
        
        {/* Passwords change */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Lock className="w-4.5 h-4.5 text-blue-400" />
            <span>Update Secret Password</span>
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Current Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">New Secret Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-lg">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg">
                {successMsg}
              </div>
            )}

            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              {submitting ? 'Updating Nodes...' : 'Modify Credentials'}
            </button>
          </form>
        </div>

        {/* 2FA Panel */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-teal-400 animate-pulse" />
              <span>Two-Factor Authentication (2FA)</span>
            </h4>
            <p className="text-[10px] text-slate-500 max-w-xs">
              Require a cryptographic TOTP/SMS challenge for all outbound ledger withdrawals.
            </p>
          </div>

          <button 
            onClick={handle2FAToggle}
            className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-lg transition border cursor-pointer select-none ${
              twoFactorEnabled 
                ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' 
                : 'bg-slate-950 border-slate-850 text-slate-500'
            }`}
          >
            {twoFactorEnabled ? 'ACTIVE 2FA' : 'DISABLED'}
          </button>
        </div>

      </div>

      {/* Box 2: Sessions Logs & Security Score */}
      <div className="space-y-6">
        
        {/* Security Score */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Security Level Assessment</h3>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
              95%
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-200">Robust SSL & Cryptographic Ciphering</p>
              <p className="text-slate-500 leading-relaxed">Your ledger key is fully active. Password strength meets maximum compliance standards.</p>
            </div>
          </div>
        </div>

        {/* Sessions audit */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
            <span>Active Session Audit Trail</span>
          </h3>

          <div className="space-y-3">
            {sessionLogs.map((log, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs bg-slate-950 border border-slate-850 p-3 rounded-xl">
                <div className="space-y-1">
                  <p className="font-bold text-slate-300">{log.device}</p>
                  <p className="text-[9px] text-slate-550 font-mono">{log.ip} • {log.date}</p>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                  log.status.includes('Active') 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse' 
                    : 'bg-slate-900 border-slate-800 text-slate-650'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

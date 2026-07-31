/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Gift, Copy, Check, Award, Users, DollarSign, ArrowUpRight } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

export const ReferralView: React.FC = () => {
  const { user } = useApp();
  const { addToast } = useNotificationStore();
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referralCode || 'NOVA_883X';
  const referralLink = `${window.location.origin}/#/register?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    addToast('Link Copied', 'Your custom referral invitation link is ready to share.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Static high-fidelity mock referral data for platform feel
  const referralsList = [
    { name: 'Alex M.', email: 'alex.m***@gmail.com', date: '2026-07-10', reward: 50, status: 'Active' },
    { name: 'Sofia R.', email: 'sofia.r***@hotmail.com', date: '2026-07-12', reward: 50, status: 'Active' },
    { name: 'Marcus T.', email: 'marcus.t***@yahoo.com', date: '2026-07-15', reward: 50, status: 'Active' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Card: Invitation Dashboard */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid md:grid-cols-3 gap-6 items-center">
          
          <div className="md:col-span-2 space-y-3.5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Gift className="w-5.5 h-5.5 text-teal-400" />
              <span>Referral Networks & Rewards</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Invite other derivative strategists to trade on our high-frequency Brownian options desk. You will receive a flat <span className="text-teal-400 font-bold">$50 reward</span> credited directly to your simulated live account for every verified sign-up.
            </p>

            {/* Copyable referral Link Box */}
            <div className="flex bg-slate-950 border border-slate-850 rounded-xl p-1.5 max-w-lg items-center">
              <input 
                type="text" 
                value={referralLink} 
                readOnly
                className="bg-transparent border-none text-[11px] font-mono text-slate-400 px-3 py-1.5 focus:outline-none flex-1 truncate"
              />
              <button 
                onClick={copyToClipboard}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer select-none"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Code box */}
          <div className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl text-center">
            <span className="text-[10px] text-slate-550 font-mono block">YOUR DIRECT CODE</span>
            <span className="text-2xl font-mono font-black text-slate-200 tracking-wider mt-1.5 block uppercase">
              {referralCode}
            </span>
          </div>

        </div>
      </div>

      {/* Network stats counters */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-4 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-550 block font-mono">REFERRED PARTNERS</span>
            <span className="text-lg font-mono font-bold text-slate-200">3 Verified</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-4 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-550 block font-mono">TOTAL BONUS EARNINGS</span>
            <span className="text-lg font-mono font-bold text-slate-200">$150.00</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-4 shadow-xl flex items-center space-x-4">
          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-550 block font-mono">REWARD CONVERSION RATE</span>
            <span className="text-lg font-mono font-bold text-slate-200">100%</span>
          </div>
        </div>
      </div>

      {/* Referrals table logs */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Referred Accounts Ledger</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase">
                <th className="py-3">Name</th>
                <th>Email Mask</th>
                <th>Joined Date</th>
                <th>Commission Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {referralsList.map((ref, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 transition">
                  <td className="py-3 font-semibold">{ref.name}</td>
                  <td className="font-mono text-slate-400">{ref.email}</td>
                  <td className="font-mono">{ref.date}</td>
                  <td className="font-mono text-emerald-400 font-bold">+${ref.reward}.00 USD</td>
                  <td>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-mono rounded">
                      {ref.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

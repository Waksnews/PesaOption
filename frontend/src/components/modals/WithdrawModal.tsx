/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useApp } from '../../context/AppContext';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatCurrency, convertToUsd, convertToActive, USD_TO_KES_RATE } from '../../lib/currency';
import { 
  X, ArrowRight, Check, Compass, RefreshCw, Phone, Mail, 
  Building2, CheckCircle2, AlertCircle, Sparkles, ShieldCheck 
} from 'lucide-react';

export const WithdrawModal: React.FC = () => {
  const { withdrawModalOpen, setWithdrawModalOpen, withdraw, getUsdBalance, isDemo } = useWalletStore();
  const { currency } = useSettingsStore();
  const { refreshUserData } = useApp();
  const { addToast } = useNotificationStore();

  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [method, setMethod] = useState<'mpesa' | 'paypal' | 'bank'>('mpesa');
  
  // Fields
  const [amount, setAmount] = useState(''); // active currency amount
  const [phone, setPhone] = useState('07');
  const [email, setEmail] = useState('');
  
  // Bank fields
  const [selectedBank, setSelectedBank] = useState('KCB Bank Kenya');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');

  const [submitting, setSubmitting] = useState(false);

  if (!withdrawModalOpen) return null;

  const { balance, demoBalance } = getUsdBalance();
  const usdBalance = isDemo ? demoBalance : balance;
  const activeBalance = convertToActive(usdBalance, currency);

  const amountNum = parseFloat(amount) || 0;
  const usdEquivalent = convertToUsd(amountNum, currency);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNum <= 0) {
      addToast('Validation Alert', 'Please enter a valid withdrawal sum.', 'error');
      return;
    }

    if (amountNum > activeBalance) {
      addToast('Insufficient Funds', 'Your requested withdrawal exceeds your available ledger balance.', 'error');
      return;
    }

    let destination = '';

    if (method === 'mpesa') {
      const cleanedPhone = phone.replace(/\s+/g, '');
      const mpesaRegex = /^(?:254|\+254|0)?(7|1)\d{8}$/;
      if (!mpesaRegex.test(cleanedPhone)) {
        addToast('M-PESA Validation Error', 'Please enter a valid Kenyan Safaricom mobile number starting with 07 or 01.', 'error');
        return;
      }
      destination = `M-PESA: ${cleanedPhone}`;
    } else if (method === 'paypal') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        addToast('PayPal Validation Error', 'Please enter a valid PayPal account email.', 'error');
        return;
      }
      destination = `PayPal: ${email}`;
    } else if (method === 'bank') {
      if (!bankAccount || !bankHolder) {
        addToast('Bank Validation Error', 'Please fill in both the account number and holder name.', 'error');
        return;
      }
      destination = `${selectedBank} - Acc: ${bankAccount} (Holder: ${bankHolder})`;
    }

    // Enter processing state
    setStep('processing');
    setSubmitting(true);

    // Simulate standard transaction clearance window (2.5 seconds)
    setTimeout(async () => {
      const success = await withdraw(usdEquivalent, 'USD', destination);
      setSubmitting(false);

      if (success) {
        setStep('success');
        addToast('Withdrawal Settled', 'Your withdrawal request has been fully processed and settled.', 'success');
        refreshUserData();
      } else {
        setStep('details');
      }
    }, 2500);
  };

  const handleClose = () => {
    setAmount('');
    setPhone('07');
    setEmail('');
    setBankAccount('');
    setBankHolder('');
    setStep('details');
    setWithdrawModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#090D1A] border border-slate-850 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        {/* Header bar */}
        <div className="p-5 border-b border-slate-850 flex justify-between items-center bg-slate-950/30">
          <span className="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center space-x-2">
            <Compass className="w-4 h-4 text-blue-400" />
            <span>Debit Withdrawal Order</span>
          </span>
          <button onClick={handleClose} className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-350 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6">
          {step === 'details' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-5">
              
              {/* Balance display */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Available Balance</span>
                <span className="font-mono text-slate-200 font-bold text-sm">
                  {formatCurrency(usdBalance, currency)}
                </span>
              </div>

              {/* Method Switcher */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-555 block font-bold">Withdrawal Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('mpesa')}
                    className={`py-3 px-2 rounded-xl text-center border transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      method === 'mpesa'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-[10px] font-mono">M-PESA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('paypal')}
                    className={`py-3 px-2 rounded-xl text-center border transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      method === 'paypal'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-[10px] font-mono">PayPal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('bank')}
                    className={`py-3 px-2 rounded-xl text-center border transition flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      method === 'bank'
                        ? 'bg-teal-500/10 border-teal-500 text-teal-400 font-bold'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="text-[10px] font-mono">Bank</span>
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-555 block font-bold">Withdrawal Amount ({currency})</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="e.g. 1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/40 focus:outline-none rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-100"
                    required
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono font-bold text-slate-600">{currency}</span>
                </div>
                
                {/* Equivalent in USD if KES */}
                {amountNum > 0 && currency === 'KES' && (
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1 pt-1">
                    <span>Equivalent in USD:</span>
                    <span className="font-bold text-slate-400">${usdEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                  </div>
                )}
              </div>

              {/* Dynamic Sub-forms */}
              {method === 'mpesa' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] uppercase font-mono text-slate-555 block font-bold">M-PESA Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-3 text-emerald-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. 0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/40 focus:outline-none rounded-xl pl-11 pr-4 py-3 text-sm font-mono text-slate-100"
                      required
                    />
                  </div>
                </div>
              )}

              {method === 'paypal' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] uppercase font-mono text-slate-555 block font-bold">PayPal Account Email</label>
                  <div className="relative">
                    <div className="absolute left-4 top-3 text-blue-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input 
                      type="email" 
                      placeholder="e.g. payout@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-blue-500/40 focus:outline-none rounded-xl pl-11 pr-4 py-3 text-xs font-mono text-slate-100"
                      required
                    />
                  </div>
                </div>
              )}

              {method === 'bank' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-slate-555 block font-bold">Select Local Bank</label>
                    <select 
                      value={selectedBank} 
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500/40 text-xs"
                    >
                      <option value="KCB Bank Kenya">KCB Bank Kenya</option>
                      <option value="Equity Bank Kenya">Equity Bank Kenya</option>
                      <option value="Co-operative Bank of Kenya">Co-operative Bank of Kenya</option>
                      <option value="Absa Bank Kenya">Absa Bank Kenya</option>
                      <option value="NCBA Bank Kenya">NCBA Bank Kenya</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-slate-555 block font-bold">Account Number</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1109876543"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/40 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-slate-555 block font-bold">Account Holder</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Jane Doe"
                        value={bankHolder}
                        onChange={(e) => setBankHolder(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/40 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                type="submit"
                className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition shadow-lg shadow-teal-500/10 mt-6 active:scale-98"
              >
                <span>Settle Withdrawal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Processing screen */}
          {step === 'processing' && (
            <div className="text-center py-10 space-y-6 animate-fade-in">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-850" />
                <div className="absolute inset-0 rounded-full border-4 border-t-teal-500 animate-spin" />
                <ShieldCheck className="w-8 h-8 text-teal-400 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-100 text-sm">Validating Settlement Node</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Reconciling simulated credit-debit reserves and broadcasting standard financial reference keys...
                </p>
              </div>
            </div>
          )}

          {/* Success screen */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-5 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg shadow-emerald-500/5 animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-200 text-base">Withdrawal Order Broadcasted</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Your debit withdrawal has been settled instantly within this educational simulation environment.
                </p>
                
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 mt-3 max-w-xs mx-auto text-[11px] font-mono text-slate-300 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-550">Debited Amount:</span>
                    <span className="text-rose-400 font-bold">-${usdEquivalent.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-550">Method:</span>
                    <span className="text-slate-350 font-bold uppercase">{method}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleClose}
                className="px-6 py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                Return to Desk
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

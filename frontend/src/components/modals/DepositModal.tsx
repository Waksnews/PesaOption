/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useApp } from '../../context/AppContext';
import { useNotificationStore } from '../../stores/notificationStore';
import { getUsdKesRate } from '../../lib/currency';
import { callApi } from '../../lib/api';
import { 
  X, Smartphone, ArrowRight, CheckCircle2, 
  Phone, ShieldAlert, Check, Loader2, CreditCard, ExternalLink, RefreshCw, Clock
} from 'lucide-react';

export const DepositModal: React.FC = () => {
  const { depositModalOpen, setDepositModalOpen } = useWalletStore();
  const { currency } = useSettingsStore();
  const { refreshUserData, user } = useApp();
  const { addToast } = useNotificationStore();

  // Selected Payment Method: 'M-PESA' | 'Visa' | 'Mastercard'
  const [paymentMethod, setPaymentMethod] = useState<'M-PESA' | 'Visa' | 'Mastercard'>('M-PESA');

  // Platform Settings State (Minimum Deposit Limits)
  const [minSettings, setMinSettings] = useState<{ minimumDepositKES: number; minimumDepositUSD: number }>({
    minimumDepositKES: 100,
    minimumDepositUSD: 5,
  });

  // State Management
  const [step, setStep] = useState<'details' | 'sending' | 'waiting' | 'success' | 'failed' | 'cancelled'>('details');
  const [phone, setPhone] = useState('07');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(''); // Amount entered by user
  const [submitting, setSubmitting] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string>('');
  
  // Polling & Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);
  const [liveStatusMessage, setLiveStatusMessage] = useState<string>('Preparing payment...');

  // Fetch platform settings on modal mount or open
  useEffect(() => {
    if (depositModalOpen) {
      callApi<{ minimumDepositKES: number; minimumDepositUSD: number }>('/api/settings')
        .then(data => {
          if (data) {
            setMinSettings({
              minimumDepositKES: data.minimumDepositKES ?? 100,
              minimumDepositUSD: data.minimumDepositUSD ?? 5,
            });
          }
        })
        .catch(err => console.warn('[DEPOSIT MODAL] Failed to fetch settings:', err));
    }
  }, [depositModalOpen]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (!depositModalOpen) {
      // Reset modal state on close
      setStep('details');
      setPhone('07');
      setAmount('');
      setInvoiceId(null);
      setCheckoutUrl(null);
      setErrorReason('');
      setSubmitting(false);
      setSecondsRemaining(120);
      setLiveStatusMessage('Preparing payment...');
    }
  }, [depositModalOpen]);

  // Polling Engine: Checks ZetuPay payment status every 5 seconds for up to 120 seconds
  useEffect(() => {
    let intervalId: any = null;
    let countdownId: any = null;
    const maxTimeoutSeconds = 120;
    let secondsElapsed = 0;

    if (step === 'waiting' && invoiceId) {
      setSecondsRemaining(120);
      setLiveStatusMessage('Waiting for PIN or Authorization...');

      countdownId = setInterval(() => {
        setSecondsRemaining(prev => Math.max(0, prev - 1));
      }, 1000);

      const pollStatus = async () => {
        try {
          secondsElapsed += 5;

          const data = await callApi(`/api/payments/${invoiceId}/status`);

          if (data.status === 'SUCCESS' || data.status === 'Completed') {
            setLiveStatusMessage('Payment confirmed');
            setStep('success');
            addToast('Deposit Received', `${data.currency || 'KES'} ${parseFloat(data.amount).toLocaleString()} added successfully to your Real Wallet.`, 'success');
            await refreshUserData();
            if (intervalId) clearInterval(intervalId);
            if (countdownId) clearInterval(countdownId);
          } else if (data.status === 'FAILED' || data.status === 'Failed') {
            setLiveStatusMessage('Payment failed');
            setErrorReason(data.failedReason || 'The payment transaction was declined or failed.');
            setStep('failed');
            addToast('Deposit Failed', data.failedReason || 'ZetuPay payment failed.', 'error');
            if (intervalId) clearInterval(intervalId);
            if (countdownId) clearInterval(countdownId);
          } else if (data.status === 'CANCELLED' || data.status === 'Cancelled') {
            setLiveStatusMessage('Payment cancelled');
            setErrorReason(data.failedReason || 'The payment request was cancelled by user.');
            setStep('cancelled');
            addToast('Deposit Cancelled', 'The payment request was cancelled.', 'info');
            if (intervalId) clearInterval(intervalId);
            if (countdownId) clearInterval(countdownId);
          } else if (data.status === 'EXPIRED' || data.status === 'Expired') {
            setLiveStatusMessage('Payment expired');
            setErrorReason(data.failedReason || 'Payment request expired.');
            setStep('failed');
            if (intervalId) clearInterval(intervalId);
            if (countdownId) clearInterval(countdownId);
          }
        } catch (err: any) {
          console.error('[ZETUPAY STATUS POLL ERROR]', err);
        }

        // Timeout fallback after 120 seconds
        if (secondsElapsed >= maxTimeoutSeconds) {
          setErrorReason('Payment check timed out. If you completed payment, your wallet will be updated automatically via background confirmation.');
          setStep('failed');
          setLiveStatusMessage('Polling timed out');
          if (intervalId) clearInterval(intervalId);
          if (countdownId) clearInterval(countdownId);
        }
      };

      pollStatus();
      intervalId = setInterval(pollStatus, 5000); // Poll every 5 seconds as specified
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (countdownId) clearInterval(countdownId);
    };
  }, [step, invoiceId, refreshUserData, addToast]);

  if (!depositModalOpen) return null;

  // Phone validation & formatters
  const formatKenyanPhone = (num: string): string => {
    let cleaned = num.replace(/\D/g, '');
    if ((cleaned.startsWith('2547') || cleaned.startsWith('2541')) && cleaned.length === 12) {
      return cleaned;
    }
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '254' + cleaned.substring(1);
    }
    if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    return cleaned;
  };

  const isValidPhone = (num: string): boolean => {
    const formatted = formatKenyanPhone(num);
    return /^254(7|1)\d{8}$/.test(formatted);
  };

  const amountNum = parseFloat(amount) || 0;
  const isKes = currency === 'KES';
  const minRequired = isKes ? minSettings.minimumDepositKES : minSettings.minimumDepositUSD;
  const isAmountBelowMin = amountNum > 0 && amountNum < minRequired;
  const isAmountValid = amountNum >= minRequired;
  
  // ZetuPay charge is processed in KES
  const rate = getUsdKesRate();
  const stkAmountInKes = isKes ? amountNum : Math.round(amountNum * rate);
  const creditedAmountInUsd = isKes ? (rate > 0 ? amountNum / rate : 0) : amountNum;

  const handleInitiateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAmountValid) {
      addToast('Validation Warning', `Minimum deposit amount is ${currency} ${minRequired}.`, 'error');
      return;
    }

    if (paymentMethod === 'M-PESA' && !isValidPhone(phone)) {
      addToast('Phone Validation Error', 'Please enter a valid Safaricom phone number (e.g. 07xxxxxxxx or 01xxxxxxxx).', 'error');
      return;
    }

    const formattedPhone = paymentMethod === 'M-PESA' ? formatKenyanPhone(phone) : phone;

    setSubmitting(true);
    setStep('sending');
    setErrorReason('');
    setCheckoutUrl(null);

    try {
      // Call ZetuPay deposit endpoint
      const response = await callApi('/api/payments/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount: stkAmountInKes,
          phone: formattedPhone,
          currency: 'KES',
          email: email || user?.email || 'trader@pesaoption.com',
          paymentMethod,
          domain: window.location.origin,
        }),
      });

      const refOrInvoice = response.reference || response.invoiceId;
      setInvoiceId(refOrInvoice);
      if (response.checkoutUrl || response.url) {
        setCheckoutUrl(response.checkoutUrl || response.url);
      }

      setStep('waiting');

      // If ZetuPay returns a checkout URL, redirect user to checkout
      if (response.checkoutUrl || response.url) {
        const destUrl = response.checkoutUrl || response.url;
        console.log('[ZETUPAY] Redirecting to checkout:', destUrl);
        setTimeout(() => {
          window.location.href = destUrl;
        }, 1200);
      }
    } catch (error: any) {
      console.error('[ZETUPAY DEPOSIT INIT ERROR]', error);
      setErrorReason(error.message || 'Failed to initiate ZetuPay payment.');
      setStep('failed');
      addToast('Request Rejected', error.message || 'ZetuPay payment request rejected.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Retry Deposit Action: Resets state to create a brand new reference
  const handleRetryDeposit = () => {
    setStep('details');
    setInvoiceId(null);
    setCheckoutUrl(null);
    setErrorReason('');
    setSubmitting(false);
    setSecondsRemaining(120);
    setLiveStatusMessage('Preparing payment...');
  };

  const handleClose = () => {
    setDepositModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#090D1A] border border-slate-850 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Header bar */}
        <div className="p-4 sm:p-5 border-b border-slate-850 flex justify-between items-center bg-slate-950/30 flex-shrink-0">
          <span className="text-xs font-bold text-slate-100 uppercase tracking-widest flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ZetuPay Gateway</span>
          </span>
          <button 
            onClick={handleClose} 
            disabled={step === 'sending' || step === 'waiting'}
            className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-350 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {step === 'details' && (
            <form onSubmit={handleInitiateDeposit} className="space-y-5">
              
              {/* Payment Method Selector Tabs */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-500 block font-bold">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('M-PESA')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition ${
                      paymentMethod === 'M-PESA'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-[11px]">M-PESA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Visa')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition ${
                      paymentMethod === 'Visa'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[11px]">Visa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Mastercard')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 cursor-pointer transition ${
                      paymentMethod === 'Mastercard'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[11px]">Mastercard</span>
                  </button>
                </div>
              </div>

              {/* Info Header */}
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3.5 flex items-start space-x-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 mt-0.5">
                  {paymentMethod === 'M-PESA' ? <Smartphone className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">ZetuPay Gateway</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    {paymentMethod === 'M-PESA'
                      ? 'Secure M-PESA payment prompt via ZetuPay gateway.'
                      : 'Secure checkout processing via ZetuPay payment gateway.'}
                  </p>
                </div>
              </div>

              {/* Phone Field (for M-PESA) */}
              {paymentMethod === 'M-PESA' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-500 block font-bold">M-PESA Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-3.5 text-emerald-500">
                      <Phone className="w-4.5 h-4.5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. 0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/40 focus:outline-none rounded-2xl pl-12 pr-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-650"
                      required
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pt-0.5">
                    <span>Formats: 07xxxx / 01xxxx / 254xxxx</span>
                    {phone && isValidPhone(phone) && (
                      <span className="text-emerald-400 flex items-center font-bold">
                        <Check className="w-3 h-3 mr-0.5" /> Validated: {formatKenyanPhone(phone)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Amount Field with Dynamic Minimum Deposit Enforcement (KES ONLY) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-mono text-slate-500 block font-bold">
                    Deposit Amount (KES)
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    Min: KES {minSettings.minimumDepositKES}
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    step="any"
                    placeholder={`e.g. ${minSettings.minimumDepositKES}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full bg-slate-950 border rounded-2xl px-4 py-3.5 text-sm font-mono font-bold text-slate-100 focus:outline-none ${
                      isAmountBelowMin 
                        ? 'border-rose-500/80 focus:border-rose-500' 
                        : 'border-slate-850 focus:border-emerald-500/40'
                    }`}
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-slate-500">KES</span>
                </div>
                
                {/* Minimum Deposit Validation Error Message */}
                {isAmountBelowMin && (
                  <p className="text-[11px] font-mono font-bold text-rose-400 pt-0.5 flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Minimum deposit is KES {minSettings.minimumDepositKES}.</span>
                  </p>
                )}
                
                {/* Dynamic Conversion Details */}
                {amountNum >= minSettings.minimumDepositKES && (
                  <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 space-y-1.5 text-[10px] font-mono mt-1">
                    <div className="flex justify-between text-slate-400">
                      <span>ZetuPay KES Charge:</span>
                      <span className="font-bold text-emerald-400">KES {amountNum.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-450">
                      <span>Credited Real USD Balance:</span>
                      <span className="font-bold text-teal-400">
                        ${(amountNum / (rate || 130)).toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={submitting || !amount || !isAmountValid || (paymentMethod === 'M-PESA' && !isValidPhone(phone))}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold text-xs uppercase rounded-2xl flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to ZetuPay...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed with {paymentMethod} Deposit</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Stage 1: Preparing secure payment */}
          {step === 'sending' && (
            <div className="text-center py-10 space-y-6">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-850" />
                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                <Smartphone className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-100 text-sm">Preparing secure payment...</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Connecting to Lipia Online gateway. Requesting <strong className="text-emerald-400">KES {stkAmountInKes.toLocaleString()}</strong> charge via <strong className="text-slate-200">{paymentMethod}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Stage 2 & 3: STK Push Sent & Waiting for M-PESA Confirmation */}
          {step === 'waiting' && (
            <div className="text-center py-8 space-y-6">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-850" />
                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
              
              <div className="space-y-3">
                {paymentMethod === 'M-PESA' ? (
                  <>
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold mb-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>✔ STK Push sent</span>
                    </div>
                    <h4 className="font-bold text-slate-100 text-base">Check your phone</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Payment prompt of <strong className="text-emerald-400">KES {stkAmountInKes.toLocaleString()}</strong> sent to <strong className="text-slate-200">+{formatKenyanPhone(phone)}</strong>.
                    </p>
                    {invoiceId && (
                      <div className="bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-400 inline-block mt-1">
                        Reference: <span className="text-emerald-400 font-bold">{invoiceId}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-slate-100 text-sm">Completing Payment...</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Please complete your secure payment authentication.
                    </p>
                    {invoiceId && (
                      <div className="bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-400 inline-block mt-1">
                        Reference: <span className="text-emerald-400 font-bold">{invoiceId}</span>
                      </div>
                    )}
                    {checkoutUrl && (
                      <a 
                        href={checkoutUrl} 
                        target="_self" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl mt-2 transition shadow-md"
                      >
                        <span>Open ZetuPay Checkout</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </>
                )}

                {/* Live Status Indicator Badge */}
                <div className="pt-2 flex flex-col items-center space-y-2">
                  <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                    <span className="text-[11px] font-mono font-bold text-teal-300">
                      Status: {liveStatusMessage}
                    </span>
                  </div>

                  {/* 120-Second Countdown Timer & Progress Bar */}
                  <div className="w-full max-w-[240px] space-y-1.5 pt-1">
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                        style={{ width: `${(secondsRemaining / 120) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                      <span className="flex items-center space-x-1 text-slate-400">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{secondsRemaining}s remaining...</span>
                      </span>
                      <span>Polling every 5s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage 4: Success Screen */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg shadow-emerald-500/5 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-base">Payment Successful</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Deposit received. Your PesaOption wallet has been automatically credited.
                </p>
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 mt-4 max-w-xs mx-auto text-[11px] font-mono text-slate-300 space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billed Amount:</span>
                    <span className="text-emerald-400 font-bold">KES {stkAmountInKes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900/50 pt-1.5">
                    <span className="text-slate-550">Credited Balance:</span>
                    <span className="text-teal-400 font-bold">+${creditedAmountInUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900/50 pt-1.5">
                    <span className="text-slate-550">Payment Provider:</span>
                    <span className="text-slate-400 font-bold">ZetuPay ({paymentMethod})</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          {/* Stage 4: Failed Screen with Retry Deposit and Human-Readable Reason */}
          {step === 'failed' && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg">
                <ShieldAlert className="w-9 h-9" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-base">Deposit Failed</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Reason:
                </p>
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3.5 text-rose-300 font-mono text-xs max-w-xs mx-auto leading-relaxed">
                  {errorReason || 'Payment was not completed. Please try again.'}
                </div>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button 
                  onClick={handleRetryDeposit}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Deposit</span>
                </button>
                <button 
                  onClick={handleClose}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Stage 4: Cancelled Screen */}
          {step === 'cancelled' && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-slate-900 border border-slate-850 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg">
                <X className="w-9 h-9" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-base">Payment Cancelled</h4>
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 text-slate-300 font-mono text-xs max-w-xs mx-auto">
                  {errorReason || 'Request cancelled by user.'}
                </div>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button 
                  onClick={handleRetryDeposit}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Deposit</span>
                </button>
                <button 
                  onClick={handleClose}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

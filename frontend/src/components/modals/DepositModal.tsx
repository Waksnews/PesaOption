/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useApp } from '../../context/AppContext';
import { useNotificationStore } from '../../stores/notificationStore';
import { USD_TO_KES_RATE } from '../../lib/currency';
import { callApi } from '../../lib/api';
import { 
  X, Smartphone, ArrowRight, CheckCircle2, 
  Phone, ShieldAlert, Check, Loader2, CreditCard, ExternalLink
} from 'lucide-react';

export const DepositModal: React.FC = () => {
  const { depositModalOpen, setDepositModalOpen } = useWalletStore();
  const { currency } = useSettingsStore();
  const { refreshUserData, user } = useApp();
  const { addToast } = useNotificationStore();

  // Selected Payment Method: 'M-PESA' | 'Visa' | 'Mastercard'
  const [paymentMethod, setPaymentMethod] = useState<'M-PESA' | 'Visa' | 'Mastercard'>('M-PESA');

  // State Management
  const [step, setStep] = useState<'details' | 'sending' | 'waiting' | 'success' | 'failed' | 'cancelled'>('details');
  const [phone, setPhone] = useState('07');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(''); // Amount entered by user
  const [submitting, setSubmitting] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string>('');
  
  // Progress state
  const [timerProgress, setTimerProgress] = useState(100);

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
    }
  }, [depositModalOpen]);

  // Polling Engine: Checks IntaSend payment status every 3 seconds
  useEffect(() => {
    let intervalId: any = null;
    let secondsElapsed = 0;
    const maxTimeoutSeconds = 90; // Wait up to 90 seconds for live STK / webhook completion

    if (step === 'waiting' && invoiceId) {
      setTimerProgress(100);
      
      const pollStatus = async () => {
        try {
          secondsElapsed += 3;
          setTimerProgress(Math.max(0, 100 - (secondsElapsed / maxTimeoutSeconds) * 100));

          const data = await callApi(`/api/payments/intasend/status/${invoiceId}`);
          
          if (data.status === 'Completed') {
            setStep('success');
            addToast('Deposit Received', `KES ${parseFloat(data.amount).toLocaleString()} added successfully.`, 'success');
            await refreshUserData();
            if (intervalId) clearInterval(intervalId);
          } else if (data.status === 'Failed') {
            setErrorReason('The payment transaction was declined or failed.');
            setStep('failed');
            addToast('Deposit Failed', 'IntaSend payment failed.', 'error');
            if (intervalId) clearInterval(intervalId);
          } else if (data.status === 'Cancelled') {
            setStep('cancelled');
            addToast('Deposit Cancelled', 'The payment request was cancelled.', 'info');
            if (intervalId) clearInterval(intervalId);
          }
        } catch (err: any) {
          console.error('[INTASEND STATUS POLL ERROR]', err);
        }

        // Timeout fallback
        if (secondsElapsed >= maxTimeoutSeconds) {
          setErrorReason('The payment check timed out. If your wallet was charged, balance will be credited automatically via live webhook.');
          setStep('failed');
          if (intervalId) clearInterval(intervalId);
        }
      };

      pollStatus();
      intervalId = setInterval(pollStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
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
  
  // IntaSend charge is processed in KES
  const stkAmountInKes = isKes ? amountNum : Math.round(amountNum * USD_TO_KES_RATE);
  const creditedAmountInUsd = isKes ? amountNum / USD_TO_KES_RATE : amountNum;

  const handleInitiateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amountNum <= 0) {
      addToast('Validation Warning', 'Please enter a valid deposit amount greater than 0.', 'error');
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
      // Call IntaSend LIVE payment creation route
      const response = await callApi('/api/payments/intasend/create', {
        method: 'POST',
        body: JSON.stringify({
          amount: stkAmountInKes,
          phone: formattedPhone,
          currency: 'KES',
          email: email || user?.email || 'trader@pesaoption.com',
          paymentMethod,
        }),
      });

      setInvoiceId(response.invoiceId);
      if (response.url) {
        setCheckoutUrl(response.url);
      }

      setStep('waiting');
    } catch (error: any) {
      console.error('[INTASEND DEPOSIT INIT ERROR]', error);
      setErrorReason(error.message || 'Failed to initiate IntaSend payment.');
      setStep('failed');
      addToast('Request Rejected', error.message || 'IntaSend LIVE payment request rejected.', 'error');
    } finally {
      setSubmitting(false);
    }
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
            <span>IntaSend LIVE Payment</span>
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
                  <h4 className="text-xs font-bold text-slate-200">IntaSend LIVE Gateway</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    {paymentMethod === 'M-PESA'
                      ? 'Instant M-PESA STK Push payment prompt sent directly to your phone handset.'
                      : 'Secure Card processing via IntaSend Live Checkout.'}
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

              {/* Amount Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-550 block font-bold">
                  Deposit Amount ({currency})
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="any"
                    placeholder={isKes ? 'e.g. 1000' : 'e.g. 10'}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/40 focus:outline-none rounded-2xl px-4 py-3.5 text-sm font-mono font-bold text-slate-100"
                    required
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-slate-500">{currency}</span>
                </div>
                
                {/* Dynamic Conversion Details */}
                {amountNum > 0 && (
                  <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 space-y-1.5 text-[10px] font-mono mt-1">
                    <div className="flex justify-between text-slate-400">
                      <span>IntaSend KES Charge:</span>
                      <span className="font-bold text-emerald-400">KES {stkAmountInKes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-450">
                      <span>Credited to Trading Wallet:</span>
                      <span className="font-bold text-teal-400">
                        ${creditedAmountInUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold text-xs uppercase rounded-2xl flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Communicating with IntaSend...</span>
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

          {/* Sending State */}
          {step === 'sending' && (
            <div className="text-center py-10 space-y-6">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-850" />
                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                <Smartphone className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-100 text-sm">Initiating IntaSend Payment...</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Connecting to IntaSend LIVE gateway. Requesting <strong className="text-emerald-400">KES {stkAmountInKes.toLocaleString()}</strong> charge via <strong className="text-slate-200">{paymentMethod}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Waiting for PIN / Confirmation State */}
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
                    <h4 className="font-bold text-slate-100 text-sm">Check your phone and enter your M-Pesa PIN.</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Payment prompt of <strong className="text-emerald-400">KES {stkAmountInKes.toLocaleString()}</strong> sent to <strong className="text-slate-200">+{formatKenyanPhone(phone)}</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-slate-100 text-sm">Completing Card Payment...</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Please complete your secure card authentication.
                    </p>
                    {checkoutUrl && (
                      <a 
                        href={checkoutUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl mt-2 transition"
                      >
                        <span>Open IntaSend Checkout</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </>
                )}

                {/* Progress bar */}
                <div className="w-full max-w-[240px] mx-auto space-y-1.5 pt-2">
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${timerProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Awaiting IntaSend webhook confirmation</span>
                    <span>Polling...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Screen */}
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
                    <span className="text-slate-550">Billed Amount:</span>
                    <span className="text-emerald-400 font-bold">KES {stkAmountInKes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900/50 pt-1.5">
                    <span className="text-slate-550">Credited Balance:</span>
                    <span className="text-teal-400 font-bold">+${creditedAmountInUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900/50 pt-1.5">
                    <span className="text-slate-550">Payment Provider:</span>
                    <span className="text-slate-400 font-bold">IntaSend ({paymentMethod})</span>
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

          {/* Failed Screen */}
          {step === 'failed' && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg">
                <ShieldAlert className="w-9 h-9" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-base">Deposit Failed</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  The IntaSend gateway responded with the following status detail:
                </p>
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-rose-300 font-mono text-xs max-w-xs mx-auto">
                  {errorReason || 'Payment declined or cancelled'}
                </div>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button 
                  onClick={() => setStep('details')}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  Try Again
                </button>
                <button 
                  onClick={handleClose}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Cancelled Screen */}
          {step === 'cancelled' && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-slate-900 border border-slate-850 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg">
                <X className="w-9 h-9" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 text-base">Payment Cancelled</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  The IntaSend payment request was cancelled.
                </p>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button 
                  onClick={() => setStep('details')}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  Retry Payment
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

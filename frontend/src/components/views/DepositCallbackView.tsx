/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { callApi } from '../../lib/api';
import { CheckCircle2, ShieldAlert, Loader2, ArrowRight, RefreshCw, Wallet, Clock } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

export const DepositCallbackView: React.FC = () => {
  const { refreshUserData } = useApp();
  const { addToast } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'>('PENDING');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [pollCount, setPollCount] = useState(0);

  // Extract reference from URL search params or hash
  const getReferenceFromUrl = (): string => {
    const searchParams = new URLSearchParams(window.location.search);
    let ref = searchParams.get('reference') || searchParams.get('ref') || searchParams.get('paymentKey') || searchParams.get('waveTransactionId');

    if (!ref && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      const hashParams = new URLSearchParams(hashQuery);
      ref = hashParams.get('reference') || hashParams.get('ref') || hashParams.get('paymentKey');
    }

    return ref || '';
  };

  const reference = getReferenceFromUrl();

  useEffect(() => {
    let timerId: any = null;

    const checkStatus = async () => {
      if (!reference) {
        setLoading(false);
        setStatus('FAILED');
        setErrorMsg('No payment reference found in URL.');
        return;
      }

      try {
        const data = await callApi(`/api/payments/${reference}/status`);
        setPaymentData(data);

        if (data.status === 'SUCCESS' || data.status === 'Completed') {
          setStatus('SUCCESS');
          setLoading(false);
          await refreshUserData();
          addToast('Deposit Confirmed', 'Payment verified successfully.', 'success');
        } else if (data.status === 'FAILED' || data.status === 'Failed') {
          setStatus('FAILED');
          setErrorMsg(data.failedReason || 'Payment request failed or was declined.');
          setLoading(false);
        } else if (data.status === 'CANCELLED' || data.status === 'Cancelled') {
          setStatus('CANCELLED');
          setErrorMsg(data.failedReason || 'Payment request was cancelled.');
          setLoading(false);
        } else {
          // Still pending, continue polling up to 20 times (100 seconds)
          if (pollCount < 20) {
            timerId = setTimeout(() => {
              setPollCount(prev => prev + 1);
            }, 5000);
          } else {
            setLoading(false);
            setStatus('PENDING');
          }
        }
      } catch (err: any) {
        console.error('[DEPOSIT CALLBACK ERROR]', err);
        setErrorMsg(err.message || 'Failed to verify payment status.');
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [reference, pollCount, refreshUserData, addToast]);

  const handleReturnToWallet = () => {
    window.location.hash = '#wallet';
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-[#090D1A] border border-slate-850 rounded-3xl shadow-2xl text-center space-y-6">
      <div className="flex justify-center">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
          <Wallet className="w-8 h-8" />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold font-display text-slate-100">ZetuPay Deposit Verification</h2>
        <p className="text-xs text-slate-400">Verifying transaction ref: <span className="font-mono font-bold text-teal-400">{reference || 'N/A'}</span></p>
      </div>

      {loading && (
        <div className="py-8 space-y-4">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-slate-850" />
            <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
          <p className="text-xs font-mono text-slate-400 animate-pulse flex items-center justify-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>Confirming payment status with ZetuPay...</span>
          </p>
        </div>
      )}

      {!loading && status === 'SUCCESS' && (
        <div className="space-y-5 py-4">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-100">Deposit Received!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your payment has been successfully processed and credited to your trading balance.
            </p>
          </div>

          {paymentData && (
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 text-left font-mono text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Billed:</span>
                <span className="text-emerald-400 font-bold">KES {parseFloat(paymentData.amount || 0).toLocaleString()}</span>
              </div>
              {paymentData.receiptNumber && (
                <div className="flex justify-between border-t border-slate-900 pt-1.5">
                  <span className="text-slate-500">M-Pesa Receipt:</span>
                  <span className="text-slate-200 font-bold">{paymentData.receiptNumber}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-500">Payment Provider:</span>
                <span className="text-teal-400 font-bold">ZetuPay</span>
              </div>
            </div>
          )}

          <button
            onClick={handleReturnToWallet}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-2xl transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <span>View Trading Wallet</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading && status === 'FAILED' && (
        <div className="space-y-5 py-4">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-100">Payment Unsuccessful</h3>
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-2xl font-mono text-xs max-w-xs mx-auto">
              {errorMsg || 'Payment was not completed. Please try again.'}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => window.location.hash = '#wallet'}
              className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs uppercase rounded-2xl transition cursor-pointer"
            >
              Return to Wallet
            </button>
          </div>
        </div>
      )}

      {!loading && status === 'PENDING' && (
        <div className="space-y-5 py-4">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-100">Payment Pending Confirmation</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              If you completed payment on your phone, your trading balance will be automatically updated as soon as ZetuPay confirms the callback.
            </p>
          </div>

          <button
            onClick={handleReturnToWallet}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-2xl transition cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>Return to Wallet</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

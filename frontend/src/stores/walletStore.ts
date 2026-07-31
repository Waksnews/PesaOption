/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Wallet } from '../types';
import { callApi } from '../lib/api';
import { useNotificationStore } from './notificationStore';

export interface WalletState {
  wallets: Wallet[];
  isDemo: boolean;
  depositModalOpen: boolean;
  withdrawModalOpen: boolean;
  accountDropdownOpen: boolean;
  setWallets: (wallets: Wallet[]) => void;
  setIsDemo: (isDemo: boolean) => void;
  setDepositModalOpen: (open: boolean) => void;
  setWithdrawModalOpen: (open: boolean) => void;
  setAccountDropdownOpen: (open: boolean) => void;
  
  // Actions
  deposit: (amount: number, asset: string) => Promise<boolean>;
  withdraw: (amount: number, asset: string, address?: string) => Promise<boolean>;
  getUsdBalance: () => { balance: number; demoBalance: number };
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallets: [],
      isDemo: true,
      depositModalOpen: false,
      withdrawModalOpen: false,
      accountDropdownOpen: false,
      setWallets: (wallets) => set({ wallets }),
      setIsDemo: (isDemo) => {
        set({ isDemo });
        useNotificationStore.getState().addToast(
          'Account Switched',
          `Successfully swapped to your ${isDemo ? 'DEMO PAPER' : 'LIVE SIMULATED'} account framework.`,
          'info'
        );
      },
      setDepositModalOpen: (depositModalOpen) => set({ depositModalOpen }),
      setWithdrawModalOpen: (withdrawModalOpen) => set({ withdrawModalOpen }),
      setAccountDropdownOpen: (accountDropdownOpen) => set({ accountDropdownOpen }),
      
      deposit: async (amount, asset) => {
        const isDemo = get().isDemo;
        try {
          await callApi('/api/wallet/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount, asset, isDemo })
          });
          
          // Trigger instant visual toast and notification
          useNotificationStore.getState().addToast(
            'Deposit Confirmed',
            `Successfully credited $${amount.toLocaleString()} ${asset} to your ${isDemo ? 'Demo' : 'Real-Sim'} balance.`,
            'success'
          );
          
          return true;
        } catch (err: any) {
          useNotificationStore.getState().addToast(
            'Deposit Failed',
            err.message || 'Unable to finalize deposit transfer.',
            'error'
          );
          return false;
        }
      },
      
      withdraw: async (amount, asset, address) => {
        const isDemo = get().isDemo;
        try {
          await callApi('/api/wallet/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, asset, isDemo, address })
          });
          
          useNotificationStore.getState().addToast(
            'Withdrawal Processed',
            `Debit of $${amount.toLocaleString()} ${asset} completed from your ${isDemo ? 'Demo' : 'Real-Sim'} ledger.`,
            'success'
          );
          
          return true;
        } catch (err: any) {
          useNotificationStore.getState().addToast(
            'Withdrawal Failed',
            err.message || 'Unable to execute withdrawal request.',
            'error'
          );
          return false;
        }
      },
      
      getUsdBalance: () => {
        const usdWallet = get().wallets.find(w => w.asset === 'USD');
        return {
          balance: usdWallet ? usdWallet.balance : 0,
          demoBalance: usdWallet ? usdWallet.demoBalance : 5000
        };
      }
    }),
    {
      name: 'cth_wallet_store',
      partialize: (state) => ({ isDemo: state.isDemo }) // only persist isDemo preference
    }
  )
);

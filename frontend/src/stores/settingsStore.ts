/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  soundEnabled: boolean;
  currency: string;
  language: string;
  chartColors: 'blue' | 'emerald' | 'ruby';
  twoFactorEnabled: boolean;
  notificationsEnabled: boolean;
  toggleSound: () => void;
  setCurrency: (currency: string) => void;
  setLanguage: (lang: string) => void;
  setChartColors: (colors: 'blue' | 'emerald' | 'ruby') => void;
  toggleTwoFactor: () => void;
  toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      currency: 'USD',
      language: 'English',
      chartColors: 'blue',
      twoFactorEnabled: false,
      notificationsEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
      setChartColors: (chartColors) => set({ chartColors }),
      toggleTwoFactor: () => set((state) => ({ twoFactorEnabled: !state.twoFactorEnabled })),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
    }),
    {
      name: 'cth_settings_store',
    }
  )
);

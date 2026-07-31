/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { playSound } from '../../lib/sound';
import { Settings, Volume2, Globe, Palette, Coins, Bell, ShieldCheck } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    soundEnabled, toggleSound, currency, setCurrency, 
    language, setLanguage, chartColors, setChartColors,
    notificationsEnabled, toggleNotifications
  } = useSettingsStore();

  const { addToast } = useNotificationStore();

  const triggerSoundPreview = (type: 'open' | 'win' | 'lose' | 'notif') => {
    playSound(type);
    addToast('Audio Sample', `Triggered synthesized ${type.toUpperCase()} effect.`, 'info');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 text-xs">
      
      {/* Column 1: Core Platform Preferences */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl space-y-5">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center space-x-2">
          <Settings className="w-4.5 h-4.5 text-blue-400" />
          <span>General Platform Settings</span>
        </h3>

        {/* Currency select */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-mono text-slate-550 flex items-center space-x-1.5 font-bold">
            <Coins className="w-4 h-4 text-slate-500" />
            <span>Base Ledger Currency</span>
          </label>
          <select 
            value={currency} 
            onChange={(e) => {
              setCurrency(e.target.value);
              addToast('Currency Adjusted', `Wallet displays will render in ${e.target.value}.`, 'info');
            }}
            className="w-full bg-slate-950 border border-slate-850 text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="USD">USD ($) - United States Dollar</option>
            <option value="EUR">EUR (€) - Euro Standard</option>
            <option value="GBP">GBP (£) - British Sterling</option>
            <option value="BTC">BTC (₿) - Bitcoin Simulated Core</option>
          </select>
        </div>

        {/* Language select */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-mono text-slate-550 flex items-center space-x-1.5 font-bold">
            <Globe className="w-4 h-4 text-slate-500" />
            <span>Interface Language</span>
          </label>
          <select 
            value={language} 
            onChange={(e) => {
              setLanguage(e.target.value);
              addToast('Language Updated', `Interface vocabulary remapped to ${e.target.value}.`, 'success');
            }}
            className="w-full bg-slate-950 border border-slate-850 text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="English">English (US/UK)</option>
            <option value="Spanish">Español (ES/MX)</option>
            <option value="French">Français (FR)</option>
            <option value="German">Deutsch (DE)</option>
          </select>
        </div>

        {/* Chart theme selectors */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-mono text-slate-550 flex items-center space-x-1.5 font-bold">
            <Palette className="w-4 h-4 text-slate-500" />
            <span>Chart Layout Palette</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'blue', label: 'Cosmic Blue', bg: 'bg-blue-500' },
              { id: 'emerald', label: 'Golden Emerald', bg: 'bg-emerald-500' },
              { id: 'ruby', label: 'Sunset Ruby', bg: 'bg-rose-500' }
            ].map((theme) => (
              <button 
                key={theme.id}
                onClick={() => {
                  setChartColors(theme.id as any);
                  addToast('Theme Applied', `Chart visual scheme re-targeted to ${theme.label}.`, 'info');
                }}
                className={`py-2 px-3 border rounded-xl flex items-center justify-between text-left transition cursor-pointer select-none ${
                  chartColors === theme.id 
                    ? 'border-teal-500/50 bg-teal-500/5 text-teal-400 font-bold' 
                    : 'border-slate-850 text-slate-400 hover:border-slate-800'
                }`}
              >
                <span>{theme.label}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${theme.bg}`} />
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Column 2: Audio Feedback & Notifications */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl space-y-5">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center space-x-2">
          <Volume2 className="w-4.5 h-4.5 text-teal-400" />
          <span>Audio Feed & Alerts</span>
        </h3>

        {/* Audio sound toggler */}
        <div className="flex justify-between items-center bg-slate-950 border border-slate-900 p-3.5 rounded-xl">
          <div className="space-y-0.5">
            <p className="font-bold text-slate-300">Synthesized Audio Feedback</p>
            <p className="text-[10px] text-slate-550">Play real-time blips on purchases, chimes on wins, and downswells on losses.</p>
          </div>
          <button 
            onClick={toggleSound}
            className={`px-3 py-1 font-bold font-mono border rounded-lg transition cursor-pointer select-none ${
              soundEnabled ? 'bg-teal-500/10 border-teal-500/35 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-600'
            }`}
          >
            {soundEnabled ? 'ACTIVE' : 'MUTED'}
          </button>
        </div>

        {/* Play samples preview grids */}
        {soundEnabled && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono text-slate-550 block font-bold">Synthesizer Test Panel</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => triggerSoundPreview('open')}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-350 border border-slate-850 hover:border-slate-800 rounded-xl font-bold font-mono transition cursor-pointer"
              >
                🔊 Open Blip
              </button>
              <button 
                onClick={() => triggerSoundPreview('win')}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-350 border border-slate-850 hover:border-slate-800 rounded-xl font-bold font-mono transition cursor-pointer"
              >
                🔊 Win Golden chime
              </button>
              <button 
                onClick={() => triggerSoundPreview('lose')}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-350 border border-slate-850 hover:border-slate-800 rounded-xl font-bold font-mono transition cursor-pointer"
              >
                🔊 Loss downswell
              </button>
              <button 
                onClick={() => triggerSoundPreview('notif')}
                className="py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-350 border border-slate-850 hover:border-slate-800 rounded-xl font-bold font-mono transition cursor-pointer"
              >
                🔊 Alert ding
              </button>
            </div>
          </div>
        )}

        {/* Notifications toggle */}
        <div className="flex justify-between items-center bg-slate-950 border border-slate-900 p-3.5 rounded-xl pt-4">
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-300 flex items-center space-x-1">
              <Bell className="w-4.5 h-4.5 text-blue-400" />
              <span>In-App Toast Alerts</span>
            </h4>
            <p className="text-[10px] text-slate-550">Receive glowing toast cards on trades, withdrawals, deposits, and status restored.</p>
          </div>
          <button 
            onClick={() => {
              toggleNotifications();
              addToast('Toasts Configured', `Notifications are now ${!notificationsEnabled ? 'active' : 'silenced'}.`, 'info');
            }}
            className={`px-3 py-1 font-bold font-mono border rounded-lg transition cursor-pointer select-none ${
              notificationsEnabled ? 'bg-teal-500/10 border-teal-500/35 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-600'
            }`}
          >
            {notificationsEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

      </div>

    </div>
  );
};

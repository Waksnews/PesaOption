/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNotificationStore } from '../../stores/notificationStore';
import { User, Check, AlertCircle, Camera, ShieldCheck } from 'lucide-react';

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
];

export const ProfileView: React.FC = () => {
  const { user, updateProfile, refreshUserData } = useApp();
  const { addToast } = useNotificationStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || AVATARS[0]);
  const [phone, setPhone] = useState('+1 (555) 481-9923');
  const [country, setCountry] = useState('United States');
  const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'unverified'>('verified');
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    const success = await updateProfile(fullName, avatarUrl);
    if (success) {
      addToast('Profile Synchronized', 'Your identity card info has been updated.', 'success');
      refreshUserData();
    } else {
      addToast('Sync Error', 'An error occurred during profile synchronization.', 'error');
    }
    setUpdating(false);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      
      {/* Column 1: Avatar Pane */}
      <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-between text-center space-y-4 h-72">
        <div className="relative">
          <img 
            src={avatarUrl} 
            alt={fullName}
            className="w-24 h-24 rounded-full border-2 border-teal-500 object-cover"
          />
          <div className="absolute bottom-0 right-0 p-1.5 bg-teal-500 text-slate-950 rounded-full border border-slate-900 cursor-pointer">
            <Camera className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-slate-200 text-sm">{fullName}</h4>
          <span className="text-[10px] text-teal-400 font-mono tracking-wider bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 uppercase">
            ID: {user?.id.substring(0, 8)}...
          </span>
        </div>

        <div className="flex items-center space-x-1 text-xs text-slate-500">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
          <span>KYC Identity Verified</span>
        </div>
      </div>

      {/* Column 2 & 3: Editable Form */}
      <div className="md:col-span-2 bg-[#090D1A] border border-slate-850 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-3 mb-5">
          Edit Identity Portfolio
        </h3>

        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Full Legal Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Email Address (Immutable)</label>
              <input 
                type="email" 
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-950 border border-slate-900 text-slate-600 rounded-xl px-3 py-2.5 text-xs font-mono select-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Registered Country</label>
              <input 
                type="text" 
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Phone Number</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* Avatar selector panel */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono text-slate-500 block font-bold">Select Interface Avatar</span>
            <div className="flex space-x-3 pt-1">
              {AVATARS.map((avatar, idx) => (
                <img 
                  key={idx}
                  src={avatar}
                  onClick={() => setAvatarUrl(avatar)}
                  className={`w-11 h-11 rounded-full object-cover cursor-pointer hover:scale-105 transition border-2 ${
                    avatarUrl === avatar ? 'border-teal-400' : 'border-slate-900'
                  }`}
                  alt="avatar selector"
                />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-850 flex justify-end">
            <button 
              type="submit"
              disabled={updating}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              {updating ? 'Saving Info...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

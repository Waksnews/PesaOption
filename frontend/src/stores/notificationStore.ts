/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { playSound } from '../lib/sound';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationState {
  toasts: Toast[];
  notifications: NotificationItem[];
  addToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (title: string, message: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  notifications: [],
  addToast: (title, message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Play synthesis sounds based on type or context
    if (type === 'success') {
      playSound('win');
    } else if (type === 'error') {
      playSound('lose');
    } else {
      playSound('notif');
    }

    const newToast: Toast = {
      id,
      title,
      message,
      type,
      createdAt: new Date().toISOString()
    };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // Auto remove toast after 4 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (title, message) => {
    const newNotif: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };
    set((state) => ({ notifications: [newNotif, ...state.notifications] }));
  },
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true }))
  }))
}));

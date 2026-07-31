/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  sender: 'operator' | 'user';
  text: string;
  timestamp: string;
}

export interface ChatState {
  chatOpen: boolean;
  messages: ChatMessage[];
  unreadCount: number;
  isTyping: boolean;
  setChatOpen: (open: boolean) => void;
  sendMessage: (text: string) => void;
  clearUnread: () => void;
}

const OPERATOR_RESPONSES = [
  "Hello! I am Valerie, your Senior Market Support Specialist. How can I assist you with your binary derivative hedges today?",
  "Our Brownian Pricing Feed operates with a 100ms high-frequency tick refresh rate, modeled using Geometric Brownian Motion plus momentum constants. It is completely organic and non-predictable.",
  "To deposit simulated funds, please use the beautiful 'Deposit' control panel at the top. Choose a mock payment gateway, enter the target value, and click confirm.",
  "Yes! The payout for our binary option contracts is standard fixed-yield at 95%. Winning trades return your initial stake plus 95% net profit. Losing contracts yield 0 return (stake deducted).",
  "To swap between your Real-Sim simulated balance and the Demo paper sandbox instantly, click the account pill at the top right of the navigation bar.",
  "Active contracts settle automatically down to the millisecond on contract expiry. You can view progress under 'Active Open Contracts' in your bottom desk panel."
];

export const useChatStore = create<ChatState>((set, get) => ({
  chatOpen: false,
  messages: [
    {
      id: 'init',
      sender: 'operator',
      text: "Welcome to support! Valerie is online and ready to help. Feel free to ask any question regarding binary option predictions, Brownian feeds, or portfolio funding.",
      timestamp: new Date().toISOString()
    }
  ],
  unreadCount: 1,
  isTyping: false,
  setChatOpen: (chatOpen) => {
    set({ chatOpen });
    if (chatOpen) {
      set({ unreadCount: 0 });
    }
  },
  sendMessage: (text) => {
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      messages: [...state.messages, newMessage]
    }));

    // Trigger fake live operator responses
    set({ isTyping: true });

    const delay = Math.random() * 1000 + 1500; // 1.5s to 2.5s response delay
    setTimeout(() => {
      const messagesCount = get().messages.filter(m => m.sender === 'user').length;
      const responseText = OPERATOR_RESPONSES[messagesCount % OPERATOR_RESPONSES.length];

      const opMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'operator',
        text: responseText,
        timestamp: new Date().toISOString()
      };

      set((state) => ({
        messages: [...state.messages, opMessage],
        isTyping: false,
        unreadCount: state.chatOpen ? 0 : state.unreadCount + 1
      }));
    }, delay);
  },
  clearUnread: () => set({ unreadCount: 0 })
}));

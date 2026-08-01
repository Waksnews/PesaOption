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
  "Hello! I am Valerie, your Senior Market Support Specialist. How can I assist you with your binary options or forex trading today?",
  "Our platform streaming pricing feed operates with a 100ms high-frequency tick refresh rate, bringing real-time institutional price movements directly to your chart.",
  "To deposit funds into your account, please click the 'Deposit' button. Select M-Pesa STK Push or another preferred payment gateway, enter your amount, and confirm.",
  "Yes! The payout for our binary option contracts is standard fixed-yield up to 95%. Winning trades return your initial stake plus up to 95% net profit.",
  "To switch between your Real Account and Demo Account instantly, click the account selector pill at the top right of the navigation bar.",
  "Active option contracts settle automatically down to the second upon expiration. You can view progress under 'Active Open Contracts' in your trading desk."
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

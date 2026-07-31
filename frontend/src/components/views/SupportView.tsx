/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageSquare, Plus, CheckCircle, Clock, Send, ChevronRight, MessageCircle } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

export const SupportView: React.FC = () => {
  const { supportTickets, createTicket, replyTicket, refreshUserData } = useApp();
  const { addToast } = useNotificationStore();

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [creating, setCreating] = useState(false);

  const activeTicket = supportTickets.find(t => t.id === selectedTicketId);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle || !ticketDesc) return;
    setCreating(true);

    const success = await createTicket(ticketTitle, ticketDesc);
    if (success) {
      addToast('Ticket Created', 'Your support ticket has been registered in the queue.', 'success');
      setTicketTitle('');
      setTicketDesc('');
      refreshUserData();
    }
    setCreating(false);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMsg) return;

    const success = await replyTicket(selectedTicketId, replyMsg);
    if (success) {
      addToast('Message Dispatched', 'Your comment has been appended to the ticket history.', 'success');
      setReplyMsg('');
      refreshUserData();
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      
      {/* Column 1: Left Create & Ticket List */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Creation Box */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Plus className="w-4.5 h-4.5 text-teal-400" />
            <span>Open Help Desk Ticket</span>
          </h3>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Subject Title</label>
              <input 
                type="text" 
                placeholder="e.g. Withdrawal ledger sync issue"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-bold">Details Description</label>
              <textarea 
                rows={4}
                placeholder="Explain the technical difficulties you encountered on the Brownian ledger..."
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-3 py-2 text-xs text-slate-200 leading-relaxed resize-none"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
            >
              {creating ? 'Registering...' : 'Dispatch Support Order'}
            </button>
          </form>
        </div>

        {/* Existing tickets list */}
        <div className="bg-[#090D1A] border border-slate-850 rounded-2xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <MessageSquare className="w-4.5 h-4.5 text-blue-400" />
            <span>Support Ticket History</span>
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {supportTickets.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10 font-sans">No tickets created.</p>
            ) : (
              supportTickets.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1.5 ${
                    t.id === selectedTicketId 
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : 'bg-slate-950 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 truncate pr-2">{t.title}</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase ${
                      t.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{t.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Column 2 & 3: Chat Thread Detail */}
      <div className="lg:col-span-2">
        {activeTicket ? (
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl shadow-xl flex flex-col h-[520px] justify-between">
            
            {/* Header info bar */}
            <div className="p-4 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-200 text-xs">{activeTicket.title}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{activeTicket.description}</p>
              </div>

              <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase ${
                activeTicket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
              }`}>
                {activeTicket.status}
              </span>
            </div>

            {/* Scrollable messages area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin bg-slate-950/20">
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-3.5 text-xs max-w-lg">
                <span className="font-bold text-slate-400 block mb-1">Customer Inquiry</span>
                <p className="text-slate-300 leading-relaxed">{activeTicket.description}</p>
                <span className="text-[9px] text-slate-600 block mt-2 font-mono">{new Date(activeTicket.createdAt).toLocaleString()}</span>
              </div>

              {activeTicket.replies?.map(r => (
                <div 
                  key={r.id} 
                  className={`flex flex-col p-3.5 rounded-2xl text-xs max-w-lg ${
                    r.role === 'admin' 
                      ? 'bg-blue-950/40 border border-blue-900/30 ml-auto items-end' 
                      : 'bg-slate-950 border border-slate-900'
                  }`}
                >
                  <span className="font-bold text-slate-400 block mb-1">
                    {r.role === 'admin' ? 'Operator Valerie (Risk Spec)' : r.fullName}
                  </span>
                  <p className="text-slate-300 leading-relaxed">{r.message}</p>
                  <span className="text-[9px] text-slate-600 block mt-2 font-mono">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Input message form */}
            <form onSubmit={handleReply} className="p-4 border-t border-slate-850 bg-slate-950/40 flex items-center space-x-3">
              <input 
                type="text" 
                placeholder="Enter message replies..."
                value={replyMsg}
                onChange={(e) => setReplyMsg(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 focus:border-teal-500/50 focus:outline-none rounded-xl px-4 py-2 text-xs text-slate-250"
                required
              />
              <button 
                type="submit"
                className="p-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        ) : (
          <div className="bg-[#090D1A] border border-slate-850 rounded-2xl shadow-xl flex flex-col h-[520px] items-center justify-center text-center p-8 text-slate-500">
            <MessageCircle className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
            <p className="text-sm">Select an active ticket from your list history to read thread responses and write comments.</p>
          </div>
        )}
      </div>

    </div>
  );
};

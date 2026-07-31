/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNotificationStore } from '../stores/notificationStore';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col space-y-2.5 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-[#090D1A]/95 border border-slate-850 shadow-2xl p-4 rounded-xl flex items-start space-x-3.5 relative pointer-events-auto overflow-hidden min-w-[280px]"
            >
              {/* Highlight strip */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                isSuccess ? 'bg-emerald-500' : isError ? 'bg-rose-500' : 'bg-blue-500'
              }`} />

              <div className="pt-0.5">
                {isSuccess ? (
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                ) : isError ? (
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
                ) : (
                  <Info className="w-4.5 h-4.5 text-blue-400" />
                )}
              </div>

              <div className="text-xs space-y-1 flex-1 pr-4">
                <p className="font-bold text-slate-100">{toast.title}</p>
                <p className="text-slate-400 leading-relaxed text-[11px]">{toast.message}</p>
              </div>

              <button 
                onClick={() => removeToast(toast.id)}
                className="text-slate-650 hover:text-slate-450 p-0.5 rounded cursor-pointer transition absolute top-3.5 right-3"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
}

export const AndroidToast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  if (!message) return null;

  return (
    <div
      id="android-toast-snackbar"
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none no-print transition-all duration-300 transform"
    >
      <div className="bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2 border border-slate-700/40 dark:border-slate-300/40">
        {type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />}
        {type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 dark:text-red-600 shrink-0" />}
        {type === 'info' && <Info className="w-4 h-4 text-blue-400 dark:text-blue-600 shrink-0" />}
        <span>{message}</span>
      </div>
    </div>
  );
};

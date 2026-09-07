import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { sound } from '../utils/audio';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="android-confirm-dialog-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none no-print"
      onClick={onCancel}
    >
      <div
        id="android-confirm-dialog-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 w-full max-w-xs rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3"
      >
        <div
          className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
            isDangerous
              ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => {
              sound.playTap();
              onConfirm();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl text-white transition shadow-xs ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={() => {
              sound.playTap();
              onCancel();
            }}
            className="flex-1 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

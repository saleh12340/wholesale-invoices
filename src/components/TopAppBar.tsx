import React from 'react';
import {
  Store,
  Printer,
  Copy,
  RotateCcw,
  Moon,
  Sun,
  Smartphone,
  Maximize2,
  Share2
} from 'lucide-react';
import { sound } from '../utils/audio';

interface TopAppBarProps {
  invoiceNumber: number;
  dateStr: string;
  timeStr: string;
  isDark: boolean;
  isPhoneFrame: boolean;
  onToggleDark: () => void;
  onToggleFrame: () => void;
  onPrint: () => void;
  onCopy: () => void;
  onReset: () => void;
  onOpenPreview: () => void;
  storeName?: string;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  invoiceNumber,
  dateStr,
  timeStr,
  isDark,
  isPhoneFrame,
  onToggleDark,
  onToggleFrame,
  onPrint,
  onCopy,
  onReset,
  onOpenPreview,
  storeName = 'بقالة العزي',
}) => {
  return (
    <header
      id="android-top-appbar"
      className="no-print bg-emerald-700 dark:bg-emerald-900 text-white px-3.5 py-2.5 shadow-md flex items-center justify-between select-none"
    >
      {/* Store Branding & Invoice badge */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-800 border border-emerald-500/50 flex items-center justify-center text-amber-300 shadow-sm">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black tracking-tight leading-tight">{storeName}</h1>
            <span className="text-[11px] font-mono font-bold bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-md shadow-sm">
              #{invoiceNumber}
            </span>
          </div>
          <div className="text-[10px] text-emerald-100 flex items-center gap-2 font-mono mt-0.5">
            <span>{dateStr}</span>
            <span>•</span>
            <span>{timeStr}</span>
          </div>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1">
        {/* Receipt Preview & Thermal Print */}
        <button
          id="btn-thermal-preview"
          onClick={() => {
            sound.playTap();
            onOpenPreview();
          }}
          title="معاينة وطباعة حرارية"
          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition shadow-sm"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Copy for WhatsApp */}
        <button
          id="btn-copy-receipt"
          onClick={() => {
            sound.playTap();
            onCopy();
          }}
          title="نسخ للواتساب"
          className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-600 text-emerald-100 active:scale-95 transition"
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* New Invoice */}
        <button
          id="btn-reset-invoice"
          onClick={() => {
            sound.playTap();
            onReset();
          }}
          title="فاتورة جديدة"
          className="p-2 rounded-xl bg-emerald-800/80 hover:bg-red-600 hover:text-white text-emerald-100 active:scale-95 transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          id="btn-toggle-dark"
          onClick={() => {
            sound.playTap();
            onToggleDark();
          }}
          title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-600 text-emerald-100 active:scale-95 transition"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Frame Toggle (Phone screen vs Fullscreen) */}
        <button
          id="btn-toggle-frame"
          onClick={() => {
            sound.playTap();
            onToggleFrame();
          }}
          title={isPhoneFrame ? 'عرض كاشير ملء الشاشة' : 'عرض إطار هاتف أندرويد'}
          className="p-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-600 text-emerald-100 active:scale-95 transition hidden sm:flex"
        >
          {isPhoneFrame ? <Maximize2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

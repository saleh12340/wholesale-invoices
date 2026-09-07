import React, { useState } from 'react';
import {
  Search,
  FileText,
  Trash2,
  Printer,
  Share2,
  RotateCcw,
  Calendar,
  User,
  Package,
  TrendingUp
} from 'lucide-react';
import { Invoice } from '../types';
import { formatNumber } from '../utils/arabic';
import { sound } from '../utils/audio';

interface HistoryViewProps {
  history: Invoice[];
  onRestore: (invoice: Invoice) => void;
  onDelete: (invoiceNumber: number) => void;
  onClearAll: () => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onShareInvoice: (invoice: Invoice) => void;
  currency?: string;
  isDark?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onRestore,
  onDelete,
  onClearAll,
  onPrintInvoice,
  onShareInvoice,
  currency = 'ر.ي',
  isDark = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cash' | 'credit'>('all');

  const filteredHistory = history.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      inv.number.toString().includes(q) ||
      (inv.customer || '').toLowerCase().includes(q) ||
      inv.date.includes(q);

    if (!matchesQuery) return false;
    if (filterType === 'all') return true;
    return inv.paymentType === filterType;
  });

  const totalSalesSum = history.reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div id="history-view-container" className="space-y-3 select-none">
      {/* Sales Summary Banner */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 text-white p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <div className="text-[11px] text-blue-100 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-200" />
            <span>إجمالي المبيعات المؤرشفة:</span>
          </div>
          <div className="text-xl font-black font-mono mt-0.5">
            {formatNumber(totalSalesSum)} <span className="text-xs font-normal">{currency}</span>
          </div>
        </div>

        <div className="text-left bg-white/10 px-3 py-1.5 rounded-xl">
          <div className="text-[10px] text-blue-100">عدد الفواتير</div>
          <div className="text-lg font-bold font-mono">{history.length}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
        <div className="relative">
          <input
            type="text"
            id="history-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة، اسم العميل، أو التاريخ..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                sound.playTap();
                setFilterType('all');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              الكل ({history.length})
            </button>
            <button
              onClick={() => {
                sound.playTap();
                setFilterType('cash');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterType === 'cash'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              نقدي
            </button>
            <button
              onClick={() => {
                sound.playTap();
                setFilterType('credit');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterType === 'credit'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              آجل
            </button>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => {
                sound.playTap();
                onClearAll();
              }}
              className="text-red-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            لا توجد فواتير تطابق البحث
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            عند حفظ الفواتير من شاشة المبيعات، ستظهر هنا في السجل التاريخي فوراً.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-0.5">
          {filteredHistory.map((inv) => (
            <div
              key={inv.id || inv.number}
              id={`history-card-${inv.number}`}
              className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2 hover:border-blue-400 transition"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                    #{inv.number}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.paymentType === 'credit'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    }`}
                  >
                    {inv.paymentType === 'credit' ? 'آجل' : 'نقدي'}
                  </span>
                </div>

                <div className="text-right font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                  {formatNumber(inv.total)} {currency}
                </div>
              </div>

              {/* Customer & Info */}
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{inv.customer || 'عميل نقدي'}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Package className="w-3.5 h-3.5" />
                  <span>{inv.items.length} أصناف</span>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                <Calendar className="w-3 h-3" />
                <span>{inv.date}</span>
                {inv.time && <span>• {inv.time}</span>}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => {
                    sound.playTap();
                    onRestore(inv);
                  }}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استكمال وتعديل</span>
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    onPrintInvoice(inv);
                  }}
                  title="طباعة حرارية"
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    onShareInvoice(inv);
                  }}
                  title="إرسال واتساب"
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-green-100 hover:text-green-700 rounded-xl transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    onDelete(inv.number);
                  }}
                  title="حذف من السجل"
                  className="p-1.5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-xl transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

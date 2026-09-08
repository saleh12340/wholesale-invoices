import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Clock3, CreditCard, Banknote, X } from 'lucide-react';
import { Invoice } from '../types';
import { formatNumber } from '../utils/arabic';

interface ReportsViewProps {
  history: Invoice[];
  currency: string;
  storeName: string;
  onBack: () => void;
}

type ReportPeriod = 'daily' | 'monthly' | 'yearly';

const toDate = (value: Invoice) => {
  const timestamp = Number(value.lastModifiedTimestamp || value.timestamp || 0);
  if (timestamp > 0) return new Date(timestamp);
  const parsed = new Date(`${value.date || ''} ${value.time || ''}`);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const invoiceProfit = (invoice: Invoice) => {
  if (typeof invoice.profit === 'number' && Number.isFinite(invoice.profit)) return invoice.profit;
  if (typeof invoice.costTotal === 'number' && Number.isFinite(invoice.costTotal)) return invoice.total - invoice.costTotal;
  return invoice.items.reduce((sum, item) => {
    const cost = Number(item.costPrice || 0);
    return sum + (Number(item.total) || 0) - cost * (Number(item.qty) || 0);
  }, 0);
};

const periodKey = (date: Date, period: ReportPeriod) => {
  if (period === 'daily') return date.toISOString().slice(0, 10);
  if (period === 'monthly') return date.toISOString().slice(0, 7);
  return date.getFullYear().toString();
};

const periodTitle = (period: ReportPeriod) =>
  period === 'daily' ? 'التقرير اليومي' : period === 'monthly' ? 'التقرير الشهري' : 'التقرير السنوي';

export const ReportsView: React.FC<ReportsViewProps> = ({ history, currency, storeName, onBack }) => {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [selectedKey, setSelectedKey] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    history.forEach((invoice) => {
      const key = periodKey(toDate(invoice), period);
      const list = map.get(key) || [];
      list.push(invoice);
      map.set(key, list);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [history, period]);

  const activeKey = selectedKey || groups[0]?.[0] || '';
  const invoices = groups.find(([key]) => key === activeKey)?.[1] || [];
  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        acc.sales += Number(invoice.total) || 0;
        acc.profit += invoiceProfit(invoice);
        if (invoice.paymentType === 'credit') acc.credit += Number(invoice.total) || 0;
        else acc.cash += Number(invoice.total) || 0;
        return acc;
      },
      { sales: 0, profit: 0, cash: 0, credit: 0 }
    );
  }, [invoices]);

  const changePeriod = (next: ReportPeriod) => {
    setPeriod(next);
    setSelectedKey('');
  };

  return (
    <section className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          رجوع
        </button>
        <div className="text-right">
          <h2 className="font-black text-base flex items-center gap-1.5"><BarChart3 className="w-5 h-5 text-amber-500" /> التقارير</h2>
          <p className="text-[10px] text-slate-500">{storeName} • المبيعات والأرباح والعمليات</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        {(['daily', 'monthly', 'yearly'] as ReportPeriod[]).map((item) => (
          <button
            key={item}
            onClick={() => changePeriod(item)}
            className={`py-2 rounded-xl text-xs font-black transition ${period === item ? 'bg-white dark:bg-slate-700 shadow text-amber-600' : 'text-slate-500'}`}
          >
            {item === 'daily' ? 'يومي' : item === 'monthly' ? 'شهري' : 'سنوي'}
          </button>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {groups.slice(0, 24).map(([key, list]) => (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-[11px] font-bold ${activeKey === key ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700' : 'border-slate-200 dark:border-slate-700'}`}
            >
              {key} <span className="opacity-60">({list.length})</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-100 dark:border-emerald-900">
          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">إجمالي المبيعات</p>
          <p className="text-lg font-black mt-1">{formatNumber(totals.sales)} <span className="text-[10px]">{currency}</span></p>
        </div>
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-100 dark:border-blue-900">
          <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">إجمالي الأرباح</p>
          <p className="text-lg font-black mt-1">{formatNumber(totals.profit)} <span className="text-[10px]">{currency}</span></p>
        </div>
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> نقدي</p>
          <p className="text-sm font-black mt-1">{formatNumber(totals.cash)} {currency}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-100 dark:border-amber-900">
          <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> آجل</p>
          <p className="text-sm font-black mt-1">{formatNumber(totals.credit)} {currency}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm">{periodTitle(period)}</h3>
            <p className="text-[10px] text-slate-500">{activeKey || 'لا توجد بيانات'}</p>
          </div>
          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{invoices.length} فاتورة</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">لا توجد فواتير محفوظة لهذه الفترة.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((invoice) => {
              const modified = toDate(invoice);
              const profit = invoiceProfit(invoice);
              return (
                <div key={invoice.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-black text-xs">فاتورة #{invoice.number} • {invoice.customer || 'عميل نقدي'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><Clock3 className="w-3 h-3" /> {invoice.lastModified || `${invoice.date} ${invoice.time || ''}`}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm">{formatNumber(invoice.total)} {currency}</p>
                      <p className={`text-[10px] font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>ربح: {formatNumber(profit)} {currency}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
                    <span>العملية: <b>{invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'}</b></span>
                    <span>الأصناف: <b>{invoice.items.length}</b></span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {modified.toLocaleDateString('ar-YE')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
        يتم حساب الربح من حقل الربح المحفوظ، أو من تكلفة الفاتورة/تكلفة الصنف عند توفرها. الفواتير القديمة التي لا تحتوي تكلفة يظهر ربحها المحاسبي كصافي المبيعات.
      </div>
    </section>
  );
};

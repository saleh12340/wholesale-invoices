import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Trash2,
  Calendar,
  DollarSign,
  Share2,
  Printer,
  X,
  FileText,
  Clock,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';
import { CustomerAccount, CustomerTransaction } from '../types';
import { formatNumber, parseArabicNumber } from '../utils/arabic';
import { sound } from '../utils/audio';

interface CustomersViewProps {
  customers: CustomerAccount[];
  currency?: string;
  storeName?: string;
  onAddCustomer: (customer: { name: string; phone?: string; initialBalance?: number; notes?: string }) => void;
  onAddPayment: (customerId: string, amount: number, notes?: string) => void;
  onDeleteCustomer: (customerId: string) => void;
  onSelectCustomerForInvoice: (customerName: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  currency = 'ر.ي',
  storeName = 'بقالة العزي',
  onAddCustomer,
  onAddPayment,
  onDeleteCustomer,
  onSelectCustomerForInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debtors' | 'settled'>('all');

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<CustomerAccount | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<CustomerAccount | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Calculations
  const totalDebts = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const debtorsCount = customers.filter((c) => c.balance > 0).length;

  // Filtered list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));
    if (!matchesSearch) return false;

    if (filterType === 'debtors') return c.balance > 0;
    if (filterType === 'settled') return c.balance <= 0;
    return true;
  });

  // Handle Add Customer Submit
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      sound.playError();
      return;
    }
    const initBalance = parseArabicNumber(newInitialBalance) || 0;
    onAddCustomer({
      name: trimmed,
      phone: newPhone.trim(),
      initialBalance: initBalance,
      notes: newNotes.trim(),
    });
    sound.playSuccess();
    setNewName('');
    setNewPhone('');
    setNewInitialBalance('');
    setNewNotes('');
    setIsAddCustomerOpen(false);
  };

  // Handle Payment Submit
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    const amount = parseArabicNumber(paymentAmount);
    if (amount <= 0) {
      sound.playError();
      return;
    }
    onAddPayment(paymentCustomer.id, amount, paymentNotes.trim() || 'سداد نقدي');
    sound.playSuccess();
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentCustomer(null);
  };

  // Share Statement via WhatsApp
  const handleShareStatement = (customer: CustomerAccount) => {
    sound.playTap();
    const balanceText =
      customer.balance > 0
        ? `المبلغ المطلوب (المتبقي): ${formatNumber(customer.balance)} ${currency}`
        : customer.balance < 0
        ? `لكم رصيد دائن: ${formatNumber(Math.abs(customer.balance))} ${currency}`
        : `الحساب خالص ومسدد بالكامل`;

    let msg = `*كشف حساب العميل: ${customer.name}*\n`;
    msg += `متجر: ${storeName}\n`;
    msg += `التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n`;
    msg += `---------------------------------\n`;
    msg += `*الرصيد الحالي: ${balanceText}*\n`;
    msg += `إجمالي العمليات: ${customer.transactions.length}\n`;
    msg += `---------------------------------\n`;
    msg += `آخر العمليات المسجلة:\n`;

    const recent = customer.transactions.slice(0, 5);
    recent.forEach((t, i) => {
      const typeStr =
        t.type === 'invoice_credit'
          ? `فاتورة آجل ${t.invoiceNumber ? '#' + t.invoiceNumber : ''}`
          : t.type === 'payment'
          ? 'سداد نقدي'
          : 'رصيد سابق';
      const sign = t.amount >= 0 ? '+' : '';
      msg += `${i + 1}. ${t.date}: ${typeStr} (${sign}${formatNumber(t.amount)} ${currency})\n`;
    });

    msg += `---------------------------------\n`;
    msg += `شكراً لتعاملكم معنا`;

    const url = `https://wa.me/${customer.phone ? customer.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 select-none pb-12">
      {/* 1. Header & Summary Stats */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white p-4 rounded-3xl shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">دليل حسابات العملاء</h2>
              <p className="text-[11px] text-emerald-200">متابعة الأرصدة، الفواتير الآجلة، وسندات السداد</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              setIsAddCustomerOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-xs py-2 px-3 rounded-2xl shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>عميل جديد</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-emerald-600/40">
          <div className="bg-white/10 rounded-xl p-2">
            <div className="text-[10px] text-emerald-200">إجمالي ديون العملاء</div>
            <div className="text-sm sm:text-base font-black font-mono text-amber-300 truncate">
              {formatNumber(totalDebts)} <span className="text-[9px] font-sans text-emerald-200">{currency}</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="text-[10px] text-emerald-200">عملاء عليهم ديون</div>
            <div className="text-sm sm:text-base font-black font-mono text-red-200">{debtorsCount}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="text-[10px] text-emerald-200">إجمالي العملاء</div>
            <div className="text-sm sm:text-base font-black font-mono">{customers.length}</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => {
              sound.playTap();
              setFilterType('all');
            }}
            className={`px-3 py-1 rounded-full font-bold transition shrink-0 ${
              filterType === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            الكل ({customers.length})
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setFilterType('debtors');
            }}
            className={`px-3 py-1 rounded-full font-bold transition shrink-0 flex items-center gap-1 ${
              filterType === 'debtors'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>مدينون ({debtorsCount})</span>
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setFilterType('settled');
            }}
            className={`px-3 py-1 rounded-full font-bold transition shrink-0 flex items-center gap-1 ${
              filterType === 'settled'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>خالصون ({customers.length - debtorsCount})</span>
          </button>
        </div>
      </div>

      {/* 3. Customers List */}
      <div className="space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery ? 'لا يوجد عملاء يطابقون كلمة البحث' : 'لم يتم تسجيل أي عملاء بعد'}
            </p>
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>أضف أول عميل الآن</span>
            </button>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isDebtor = cust.balance > 0;
            const isSettled = cust.balance === 0;

            return (
              <div
                key={cust.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition"
              >
                {/* Customer Row Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar with initial letter */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        isDebtor
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {cust.name.trim().charAt(0) || 'ع'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {cust.name}
                      </h3>
                      {cust.phone ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span dir="ltr" className="font-mono">{cust.phone}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">بدون هاتف</span>
                      )}
                    </div>
                  </div>

                  {/* Balance Display ("حسابه") */}
                  <div className="text-left">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">الحساب الحالي:</div>
                    <div
                      className={`font-mono font-black text-sm sm:text-base ${
                        isDebtor
                          ? 'text-red-600 dark:text-red-400'
                          : isSettled
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {formatNumber(cust.balance)}{' '}
                      <span className="text-[10px] font-sans font-normal text-slate-500">{currency}</span>
                    </div>
                    <span
                      className={`inline-block text-[9px] px-1.5 py-0.2 rounded-md font-bold mt-0.5 ${
                        isDebtor
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : isSettled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {isDebtor ? 'مدين (عليه دين)' : isSettled ? 'خالص (مسدد)' : 'له رصيد'}
                    </span>
                  </div>
                </div>

                {/* Operations & Metadata */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {cust.transactions.length > 0
                        ? `${cust.transactions.length} عملية مسجلة`
                        : 'لا توجد عمليات سابقة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>تاريخ الإضافة: {cust.createdAt.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {/* Ledger / Transactions View */}
                  <button
                    onClick={() => {
                      sound.playTap();
                      setSelectedLedgerCustomer(cust);
                    }}
                    className="py-1.5 px-1 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                    title="كشف الحساب والعمليات"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>العمليات</span>
                  </button>

                  {/* Record Payment */}
                  <button
                    onClick={() => {
                      sound.playTap();
                      setPaymentCustomer(cust);
                    }}
                    className="py-1.5 px-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                    title="تسجيل دفعة سداد"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>سداد</span>
                  </button>

                  {/* Create New Invoice for Customer */}
                  <button
                    onClick={() => {
                      sound.playTap();
                      onSelectCustomerForInvoice(cust.name);
                    }}
                    className="py-1.5 px-1 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                    title="إنشاء فاتورة جديدة لهذا العميل"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                    <span>فاتورة</span>
                  </button>

                  {/* WhatsApp Statement */}
                  <button
                    onClick={() => handleShareStatement(cust)}
                    className="py-1.5 px-1 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                    title="إرسال كشف الحساب واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>واتساب</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Add New Customer */}
      {isAddCustomerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddCustomerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">إضافة عميل جديد</h3>
              </div>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صالح العمري، أبو أحمد..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="tel"
                  placeholder="مثال: 777123456"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرصيد الافتتاحي / الدين السابق (اختياري)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="0"
                    value={newInitialBalance}
                    onChange={(e) => setNewInitialBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-3 top-2 text-xs text-slate-400">{currency}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  إذا كان على العميل دين سابق قبل استخدام التطبيق
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  placeholder="عنوان العميل أو أي تفاصيل أخرى..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  حفظ العميل
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Payment (سند قبض / سداد دفعة) */}
      {paymentCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPaymentCustomer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">تسجيل دفعة سداد</h3>
                  <p className="text-[11px] text-slate-500">العميل: {paymentCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Debt Badge */}
            <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-200 dark:border-red-900/60 flex items-center justify-between">
              <span className="text-xs text-red-800 dark:text-red-300">الرصيد المدين الحالي:</span>
              <span className="font-mono font-black text-sm text-red-700 dark:text-red-400">
                {formatNumber(paymentCustomer.balance)} {currency}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ المسدد *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="أدخل مبلغ السداد..."
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">{currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البيان / ملاحظات السداد
                </label>
                <input
                  type="text"
                  placeholder="مثال: دفعة نقدية، تحويل بنكي..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  تأكيد سداد المبلغ
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Transactions Ledger (كشف الحساب والعمليات) */}
      {selectedLedgerCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedLedgerCustomer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    كشف حساب: {selectedLedgerCustomer.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedLedgerCustomer.phone || 'بدون هاتف'} • {selectedLedgerCustomer.transactions.length} عملية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balance Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">الرصيد المتبقي الإجمالي:</span>
                <div
                  className={`text-lg font-black font-mono ${
                    selectedLedgerCustomer.balance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatNumber(selectedLedgerCustomer.balance)} {currency}
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setPaymentCustomer(selectedLedgerCustomer);
                }}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>إضافة دفعة سداد</span>
              </button>
            </div>

            {/* Transactions Timeline */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800">
              {selectedLedgerCustomer.transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  لا توجد عمليات سابقة مسجلة لهذا العميل
                </div>
              ) : (
                selectedLedgerCustomer.transactions.map((tx) => {
                  const isDebit = tx.amount > 0; // Debt increases
                  return (
                    <div key={tx.id} className="pt-2.5 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1 rounded-lg ${
                              isDebit
                                ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                            }`}
                          >
                            {isDebit ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {tx.type === 'invoice_credit'
                                ? `فاتورة مبيعات آجل #${tx.invoiceNumber || ''}`
                                : tx.type === 'payment'
                                ? 'سند قبض / سداد نقدي'
                                : 'رصيد افتتاحي سابق'}
                            </span>
                            {tx.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{tx.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-left">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isDebit ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isDebit ? '+' : '-'}
                            {formatNumber(Math.abs(tx.amount))} {currency}
                          </span>
                        </div>
                      </div>

                      {/* Meta: Date & Cumulative Balance */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pr-7">
                        <span>{tx.date} {tx.time}</span>
                        <span>الرصيد بعدها: {formatNumber(tx.balanceAfter)} {currency}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => handleShareStatement(selectedLedgerCustomer)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>إرسال كشف الحساب واتساب</span>
              </button>
              <button
                onClick={() => {
                  sound.playTap();
                  onDeleteCustomer(selectedLedgerCustomer.id);
                  setSelectedLedgerCustomer(null);
                }}
                className="py-2 px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition"
                title="حذف العميل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

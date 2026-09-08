import { Invoice } from '../types';

const HISTORY_KEY = 'azizi_invoice_history';
const CARD_MARKER = 'data-azizi-invoices-list';
const MODAL_MARKER = 'data-azizi-invoices-modal-list';

function loadInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizePhone(phone: string): string {
  let digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('967')) return digits;
  if (digits.length === 9 && /^7/.test(digits)) return `967${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `967${digits.slice(1)}`;
  return digits;
}

function sameCustomer(invoice: Invoice, name: string): boolean {
  const target = name.trim().toLowerCase();
  const invoiceName = String(invoice.customer || '').trim().toLowerCase();
  if (!target || !invoiceName) return false;
  return invoiceName === target || String(invoice.customerId || '').toLowerCase() === target;
}

function customerInvoices(name: string): Invoice[] {
  return loadInvoices()
    .filter((invoice) => sameCustomer(invoice, name))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

function paymentLabel(invoice: Invoice): string {
  return invoice.paymentType === 'credit' ? 'آجل / غير مسدد بالكامل' : 'نقدي / مدفوع';
}

function formatAmount(value: number): string {
  try {
    return new Intl.NumberFormat('ar-YE').format(Number(value) || 0);
  } catch {
    return String(Number(value) || 0);
  }
}

function formatInvoiceDate(invoice: Invoice): string {
  return `${invoice.date || ''}${invoice.time ? ` ${invoice.time}` : ''}`.trim();
}

function buildInvoiceRows(container: HTMLElement, invoices: Invoice[], emptyText = 'لا توجد فواتير مرتبطة بهذا العميل') {
  container.replaceChildren();
  if (!invoices.length) {
    const empty = document.createElement('div');
    empty.className = 'text-[10px] text-slate-400 dark:text-slate-500 py-2';
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  invoices.slice(0, 30).forEach((invoice) => {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-[auto_1fr_auto] gap-2 items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0';

    const number = document.createElement('span');
    number.className = 'font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200';
    number.textContent = `#${invoice.number}`;

    const middle = document.createElement('div');
    middle.className = 'min-w-0';
    const date = document.createElement('div');
    date.className = 'text-[10px] text-slate-600 dark:text-slate-300 truncate';
    date.textContent = formatInvoiceDate(invoice) || 'بدون تاريخ';
    const status = document.createElement('div');
    status.className = `text-[9px] font-bold ${invoice.paymentType === 'credit' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`;
    status.textContent = paymentLabel(invoice);
    middle.append(date, status);

    const amount = document.createElement('span');
    amount.className = 'font-mono text-[10px] font-black text-slate-800 dark:text-slate-100 whitespace-nowrap';
    amount.textContent = formatAmount(invoice.total);

    row.append(number, middle, amount);
    container.appendChild(row);
  });
}

function addSection(parent: HTMLElement, invoices: Invoice[], title = 'فواتير العميل') {
  const section = document.createElement('div');
  section.className = 'mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70';
  section.setAttribute(CARD_MARKER, 'true');

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-1.5';
  const titleEl = document.createElement('span');
  titleEl.className = 'text-[11px] font-black text-slate-700 dark:text-slate-200';
  titleEl.textContent = title;
  const count = document.createElement('span');
  count.className = 'text-[9px] font-bold text-slate-400';
  count.textContent = `${invoices.length} فاتورة`;
  header.append(titleEl, count);

  const rows = document.createElement('div');
  rows.setAttribute('data-azizi-invoice-rows', 'true');
  section.append(header, rows);
  buildInvoiceRows(rows, invoices);
  parent.appendChild(section);
}

function enhanceCustomerCards(root: ParentNode = document) {
  const headings = Array.from(root.querySelectorAll('h3')) as HTMLElement[];
  headings.forEach((heading) => {
    const name = heading.textContent?.trim() || '';
    if (!name || name.includes('كشف حساب:')) return;
    const card = heading.closest('div.bg-white') as HTMLElement | null;
    if (!card) return;
    const old = card.querySelector(`[${CARD_MARKER}]`) as HTMLElement | null;
    const invoices = customerInvoices(name);
    if (old) {
      const rows = old.querySelector('[data-azizi-invoice-rows]') as HTMLElement | null;
      const count = old.querySelector('span.text-\\[9px\\]') as HTMLElement | null;
      if (rows) buildInvoiceRows(rows, invoices);
      if (count) count.textContent = `${invoices.length} فاتورة`;
      return;
    }
    addSection(card, invoices);
  });
}

function enhanceCustomerLedger(root: ParentNode = document) {
  const headings = Array.from(root.querySelectorAll('h3')) as HTMLElement[];
  headings.forEach((heading) => {
    const text = heading.textContent?.trim() || '';
    if (!text.startsWith('كشف حساب:')) return;
    const name = text.replace(/^كشف حساب:\s*/, '').trim();
    const modal = heading.closest('.fixed') as HTMLElement | null;
    if (!modal) return;
    const invoices = customerInvoices(name);
    let section = modal.querySelector(`[${MODAL_MARKER}]`) as HTMLElement | null;
    if (!section) {
      section = document.createElement('div');
      section.className = 'mx-4 mb-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60';
      section.setAttribute(MODAL_MARKER, 'true');
      const title = document.createElement('div');
      title.className = 'text-[11px] font-black text-blue-800 dark:text-blue-300 mb-1.5';
      title.textContent = 'فواتير العميل المرتبطة';
      const rows = document.createElement('div');
      rows.setAttribute('data-azizi-invoice-rows', 'true');
      section.append(title, rows);
      const balanceBanner = Array.from(modal.querySelectorAll('.p-4')).find((el) => (el.textContent || '').includes('الرصيد المتبقي الإجمالي')) as HTMLElement | undefined;
      if (balanceBanner) balanceBanner.insertAdjacentElement('afterend', section);
      else modal.appendChild(section);
    }
    const rows = section.querySelector('[data-azizi-invoice-rows]') as HTMLElement | null;
    if (rows) buildInvoiceRows(rows, invoices);
  });
}

function extractCustomerFromButton(button: HTMLElement): { name: string; phone: string } | null {
  const card = button.closest('div.bg-white') as HTMLElement | null;
  if (card) {
    const heading = card.querySelector('h3') as HTMLElement | null;
    const phone = card.querySelector('[dir="ltr"]') as HTMLElement | null;
    if (heading) return { name: heading.textContent?.trim() || '', phone: phone?.textContent?.trim() || '' };
  }

  const modal = button.closest('.fixed') as HTMLElement | null;
  if (modal) {
    const heading = Array.from(modal.querySelectorAll('h3')).find((h) => (h.textContent || '').includes('كشف حساب:')) as HTMLElement | undefined;
    if (heading) {
      const name = (heading.textContent || '').replace(/^.*كشف حساب:\s*/, '').trim();
      const headerText = heading.parentElement?.parentElement?.textContent || '';
      const phoneMatch = headerText.match(/(?:\+?\d[\d\s-]{7,})/);
      return { name, phone: phoneMatch?.[0] || '' };
    }
  }
  return null;
}

function shareCustomerWhatsApp(name: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    window.alert('لا يوجد رقم واتساب محفوظ لهذا العميل. أضف رقم الهاتف أولاً.');
    return;
  }
  const invoices = customerInvoices(name);
  let message = `*حساب العميل: ${name}*\n`;
  message += `بقالة العزي للمواد الغذائية\n`;
  message += `الرصيد والفواتير المرتبطة:\n`;
  message += '--------------------------------\n';
  if (!invoices.length) {
    message += 'لا توجد فواتير محفوظة لهذا العميل.\n';
  } else {
    invoices.slice(0, 20).forEach((invoice, index) => {
      message += `${index + 1}. فاتورة #${invoice.number} | ${invoice.date || '-'} | ${formatAmount(invoice.total)} | ${paymentLabel(invoice)}\n`;
    });
  }
  message += '--------------------------------\n';
  message += 'يمكنكم مراجعة كشف الحساب من التطبيق.';
  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

function installWhatsAppInterceptor() {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button') as HTMLElement | null;
    if (!button) return;
    const label = button.textContent || '';
    if (!label.includes('واتساب')) return;
    const page = document.body.textContent || '';
    if (!page.includes('دليل حسابات العملاء') && !page.includes('كشف حساب:')) return;
    const customer = extractCustomerFromButton(button);
    if (!customer?.name) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    shareCustomerWhatsApp(customer.name, customer.phone);
  }, true);
}

export function startCustomerInvoicesEnhancer() {
  if (typeof window === 'undefined') return;
  const run = () => {
    enhanceCustomerCards();
    enhanceCustomerLedger();
  };
  run();
  const observer = new MutationObserver(() => run());
  observer.observe(document.body, { childList: true, subtree: true });
  installWhatsAppInterceptor();
}

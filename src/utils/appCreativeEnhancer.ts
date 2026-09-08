import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { CustomerAccount, CustomerTransaction, Invoice } from '../types';
import { formatNumber } from './arabic';
import { saveFileToDownloads, shareBlobToWhatsApp } from './devicePermissions';
import { renderReceiptToCanvas } from './receiptCanvas';

const HISTORY_KEY = 'azizi_invoice_history';
const CUSTOMERS_KEY = 'azizi_customer_accounts';
const SETTINGS_KEY = 'azizi_app_settings';
const CURRENCY = 'ر.ي';
const APP_NAME = 'بقالة العزي';
const IMAGE_WIDTH = 384; // 58mm thermal density target

function arabicDigitsToLatin(value: string): string {
  return String(value || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function normalizePhone(phone: string): string {
  let p = arabicDigitsToLatin(phone).replace(/[^0-9]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('967')) return p;
  if (p.length === 9 && p.startsWith('7')) return `967${p}`;
  if (p.length === 10 && p.startsWith('0')) return `967${p.slice(1)}`;
  return p;
}

function loadInvoices(): Invoice[] {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function loadCustomers(): CustomerAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function getSettings() {
  try {
    return {
      storeName: APP_NAME,
      currency: CURRENCY,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'),
    } as { storeName: string; currency: string; storeSubtitle?: string; storePhone?: string };
  } catch {
    return { storeName: APP_NAME, currency: CURRENCY, storeSubtitle: 'للمواد الغذائية والاستهلاكية', storePhone: '' };
  }
}

function persistLinkage() {
  const invoices = loadInvoices();
  const customers = loadCustomers();
  if (!invoices.length || !customers.length) return;

  let invoiceChanged = false;
  let customerChanged = false;
  const nextInvoices = invoices.map((invoice) => {
    const current = invoice.customerId ? customers.find((c) => c.id === invoice.customerId) : null;
    const customer = current || customers.find((c) => String(c.name).trim().toLowerCase() === String(invoice.customer || '').trim().toLowerCase());
    if (!customer) return invoice;

    const next = { ...invoice } as Invoice;
    if (next.customerId !== customer.id) { next.customerId = customer.id; invoiceChanged = true; }
    if (!next.customerPhone && customer.phone) { next.customerPhone = customer.phone; invoiceChanged = true; }
    return next;
  });

  const nextCustomers = customers.map((customer) => {
    const ids = nextInvoices.filter((invoice) => invoice.customerId === customer.id).map((invoice) => invoice.id);
    const old = Array.isArray(customer.invoiceIds) ? customer.invoiceIds : [];
    const merged = Array.from(new Set([...old, ...ids].filter(Boolean)));
    if (merged.length !== old.length || merged.some((id, i) => id !== old[i])) {
      customerChanged = true;
      return { ...customer, invoiceIds: merged };
    }
    return customer;
  });

  if (invoiceChanged) localStorage.setItem(HISTORY_KEY, JSON.stringify(nextInvoices));
  if (customerChanged) localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(nextCustomers));
}

function findCustomerByName(name: string): CustomerAccount | null {
  const target = String(name || '').trim().toLowerCase();
  return loadCustomers().find((c) => String(c.name || '').trim().toLowerCase() === target) || null;
}

function findCustomerFromLedger(): CustomerAccount | null {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>('.fixed')).filter((el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && (el.textContent || '').includes('كشف حساب:');
  });
  for (const overlay of overlays.reverse()) {
    const text = overlay.textContent || '';
    const match = text.match(/كشف حساب:\s*([^\n•]+)/);
    if (match) {
      const customer = findCustomerByName(match[1].trim());
      if (customer) return customer;
    }
  }
  return null;
}

function findCustomerFromCard(button: HTMLElement): CustomerAccount | null {
  let node: HTMLElement | null = button;
  for (let i = 0; i < 7 && node; i++, node = node.parentElement) {
    const text = node.textContent || '';
    const customer = loadCustomers().find((c) => c.name && text.includes(c.name));
    if (customer) return customer;
  }
  return null;
}

function statementText(customer: CustomerAccount, storeName: string, currency: string): string {
  const balance = customer.balance > 0
    ? `المبلغ المطلوب: ${formatNumber(customer.balance)} ${currency}`
    : customer.balance < 0
      ? `رصيد دائن للعميل: ${formatNumber(Math.abs(customer.balance))} ${currency}`
      : 'الحساب خالص ومسدد بالكامل';
  const lines = [
    `كشف حساب العميل: ${customer.name}`,
    `المتجر: ${storeName}`,
    customer.phone ? `الهاتف: ${customer.phone}` : 'الهاتف: غير مسجل',
    `إجمالي العمليات: ${customer.transactions.length}`,
    balance,
    '',
    'آخر العمليات:',
  ];
  customer.transactions.slice(0, 8).forEach((tx, index) => {
    const type = tx.type === 'invoice_credit'
      ? `فاتورة آجل #${tx.invoiceNumber || ''}`
      : tx.type === 'payment' ? 'سداد نقدي' : 'رصيد افتتاحي';
    lines.push(`${index + 1}. ${tx.date} ${tx.time || ''} - ${type} - ${formatNumber(tx.amount)} ${currency}`);
  });
  lines.push('', `الإجمالي المستحق حالياً: ${formatNumber(customer.balance)} ${currency}`, 'شكراً لتعاملكم معنا');
  return lines.join('\n');
}

function transactionTitle(tx: CustomerTransaction): string {
  if (tx.type === 'invoice_credit') return `فاتورة آجل #${tx.invoiceNumber || ''}`;
  if (tx.type === 'payment') return 'سداد نقدي';
  return 'رصيد افتتاحي';
}

function makeStatementCanvas(customer: CustomerAccount, storeName: string, currency: string): HTMLCanvasElement {
  const sourceWidth = 800;
  const padding = 34;
  const rowHeight = 54;
  const header = 235;
  const footer = 125;
  const height = header + Math.max(1, customer.transactions.length) * rowHeight + footer;
  const source = document.createElement('canvas');
  source.width = sourceWidth;
  source.height = height;
  const ctx = source.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sourceWidth, height);
  ctx.fillStyle = '#075985';
  ctx.fillRect(0, 0, sourceWidth, 120);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 30px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(storeName || APP_NAME, sourceWidth / 2, 48);
  ctx.font = "bold 22px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(`كشف حساب: ${customer.name}`, sourceWidth / 2, 88);
  ctx.fillStyle = '#0f172a';
  ctx.font = "bold 17px 'Cairo', Tahoma, sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText(`الهاتف: ${customer.phone || 'غير مسجل'}`, sourceWidth - padding, 155);
  ctx.textAlign = 'left';
  ctx.fillText(`عدد العمليات: ${customer.transactions.length}`, padding, 155);
  ctx.font = "bold 19px 'Cairo', Tahoma, sans-serif";
  ctx.textAlign = 'center';
  ctx.fillStyle = customer.balance > 0 ? '#b91c1c' : '#166534';
  ctx.fillText(`الرصيد الحالي: ${formatNumber(customer.balance)} ${currency}`, sourceWidth / 2, 202);

  let y = header;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(padding, y, sourceWidth - padding * 2, 38);
  ctx.fillStyle = '#0f172a';
  ctx.font = "bold 14px 'Cairo', Tahoma, sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText('التاريخ', sourceWidth - padding - 10, y + 25);
  ctx.fillText('العملية', sourceWidth - padding - 185, y + 25);
  ctx.textAlign = 'left';
  ctx.fillText('المبلغ', padding + 150, y + 25);
  ctx.fillText('الرصيد', padding + 15, y + 25);
  y += 48;

  ctx.font = "normal 13px 'Cairo', Tahoma, sans-serif";
  customer.transactions.forEach((tx, index) => {
    ctx.fillStyle = index % 2 ? '#f8fafc' : '#ffffff';
    ctx.fillRect(padding, y - 7, sourceWidth - padding * 2, rowHeight);
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'right';
    ctx.fillText(`${tx.date} ${tx.time || ''}`, sourceWidth - padding - 10, y + 20);
    ctx.fillText(transactionTitle(tx), sourceWidth - padding - 185, y + 20);
    ctx.textAlign = 'left';
    ctx.fillStyle = tx.amount > 0 ? '#b91c1c' : '#15803d';
    ctx.fillText(`${tx.amount > 0 ? '+' : ''}${formatNumber(tx.amount)} ${currency}`, padding + 150, y + 20);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${formatNumber(tx.balanceAfter)} ${currency}`, padding + 15, y + 20);
    y += rowHeight;
  });

  y += 14;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(padding, y, sourceWidth - padding * 2, 66);
  ctx.fillStyle = '#075985';
  ctx.font = "bold 19px 'Cairo', Tahoma, sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(`الإجمالي المستحق: ${formatNumber(customer.balance)} ${currency}`, sourceWidth / 2, y + 40);
  return source;
}

function resize58mm(source: HTMLCanvasElement): HTMLCanvasElement {
  if (source.width === IMAGE_WIDTH) return source;
  const ratio = IMAGE_WIDTH / source.width;
  const target = document.createElement('canvas');
  target.width = IMAGE_WIDTH;
  target.height = Math.max(1, Math.round(source.height * ratio));
  const ctx = target.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0, target.width, target.height);
  return target;
}

async function canvasBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.86): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('تعذر إنشاء الملف');
  return blob;
}

async function shareGeneric(blob: Blob, fileName: string, mimeType: string, title: string, text: string) {
  const file = new File([blob], fileName, { type: mimeType });
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
    return { success: true, message: `تمت مشاركة ${fileName} بنجاح` };
  }
  const saved = await saveFileToDownloads(blob, fileName, mimeType);
  return { success: saved.success, message: saved.success ? `تم حفظ ${fileName} للمشاركة من الجهاز` : saved.message };
}

async function shareStatementImage(customer: CustomerAccount) {
  const settings = getSettings();
  const source = makeStatementCanvas(customer, settings.storeName || APP_NAME, settings.currency || CURRENCY);
  const canvas = resize58mm(source);
  const blob = await canvasBlob(canvas, 'image/jpeg', 0.84);
  const phone = normalizePhone(customer.phone || '');
  const fileName = `كشف_حساب_${customer.name.replace(/\s+/g, '_')}_58mm.jpg`;
  const result = await shareBlobToWhatsApp(blob, fileName, 'image/jpeg', phone, statementText(customer, settings.storeName || APP_NAME, settings.currency || CURRENCY));
  window.dispatchEvent(new CustomEvent('azizi-native-message', { detail: result.message }));
}

async function shareStatementPdf(customer: CustomerAccount) {
  const settings = getSettings();
  const source = makeStatementCanvas(customer, settings.storeName || APP_NAME, settings.currency || CURRENCY);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const image = source.toDataURL('image/jpeg', 0.94);
  const width = 190;
  const height = Math.min(270, (source.height / source.width) * width);
  pdf.addImage(image, 'JPEG', 10, 12, width, height);
  const blob = pdf.output('blob');
  return shareGeneric(blob, `كشف_حساب_${customer.name.replace(/\s+/g, '_')}.pdf`, 'application/pdf', `كشف حساب ${customer.name}`, statementText(customer, settings.storeName || APP_NAME, settings.currency || CURRENCY));
}

async function shareStatementExcel(customer: CustomerAccount) {
  const settings = getSettings();
  const currency = settings.currency || CURRENCY;
  const rows = [
    [settings.storeName || APP_NAME, '', '', '', '', ''],
    [`كشف حساب العميل: ${customer.name}`, '', '', '', '', ''],
    ['الهاتف', customer.phone || 'غير مسجل', 'تاريخ الإصدار', new Date().toLocaleDateString('ar-YE'), '', ''],
    ['الرصيد الحالي', customer.balance, currency, 'عدد العمليات', customer.transactions.length, ''],
    [''],
    ['م', 'التاريخ', 'الوقت', 'العملية', `المبلغ (${currency})`, `الرصيد (${currency})`],
    ...customer.transactions.map((tx, i) => [i + 1, tx.date, tx.time || '', transactionTitle(tx), tx.amount, tx.balanceAfter]),
    [''],
    ['', '', '', 'الإجمالي المستحق', customer.balance, currency],
    ['ملاحظة', 'الملف مرتبط بحساب العميل ورقمه داخل التطبيق', '', '', '', ''],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 12 }, { wch: 32 }, { wch: 18 }, { wch: 18 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'كشف الحساب');
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return shareGeneric(blob, `كشف_حساب_${customer.name.replace(/\s+/g, '_')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `كشف حساب ${customer.name}`, statementText(customer, settings.storeName || APP_NAME, currency));
}

function addImageButton() {
  const visibleLedger = Array.from(document.querySelectorAll<HTMLElement>('.fixed')).find((el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && (el.textContent || '').includes('تصدير PDF') && (el.textContent || '').includes('تصدير Excel');
  });
  if (!visibleLedger) return;
  const pdfButton = Array.from(visibleLedger.querySelectorAll<HTMLButtonElement>('button')).find((b) => (b.textContent || '').includes('تصدير PDF'));
  if (!pdfButton) return;
  const row = pdfButton.parentElement;
  if (!row || row.querySelector('[data-azizi-statement-image]')) return;
  row.classList.remove('grid-cols-2');
  row.classList.add('grid-cols-3');
  const imageButton = document.createElement('button');
  imageButton.type = 'button';
  imageButton.setAttribute('data-azizi-statement-image', 'true');
  imageButton.className = 'py-1.5 px-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95';
  imageButton.title = 'مشاركة كشف الحساب كصورة إيصال صغيرة 58mm';
  imageButton.textContent = '🧾 صورة 58mm';
  row.appendChild(imageButton);
}

function addPrinterSearchButton() {
  const host = document.getElementById('settings-view-container');
  if (!host || host.querySelector('[data-azizi-printer-search]')) return;
  const card = document.createElement('div');
  card.setAttribute('data-azizi-printer-search', 'true');
  card.dir = 'rtl';
  card.className = 'mt-3 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/80 dark:bg-sky-950/30 p-3 space-y-2';
  card.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <div>
        <div class="font-bold text-xs text-slate-900 dark:text-slate-100">🖨️ الطابعة الحرارية</div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400">بحث عن الطابعات الحرارية المقترنة عبر Bluetooth فقط</div>
      </div>
      <button type="button" data-azizi-search-printer class="shrink-0 px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold active:scale-95">🔎 بحث الطابعة</button>
    </div>
    <div class="text-[10px] text-slate-500 dark:text-slate-400">بعد الاقتران من إعدادات الهاتف، سيظهر اسم الطابعة هنا وفي شاشة الطباعة الحرارية.</div>
  `;
  host.appendChild(card);
  card.querySelector<HTMLButtonElement>('[data-azizi-search-printer]')?.addEventListener('click', () => {
    const android = (window as any).Android;
    if (android && typeof android.searchBluetoothPrinters === 'function') {
      android.searchBluetoothPrinters();
    } else {
      window.alert('البحث المباشر عن الطابعة متاح داخل نسخة Android. قم بإقران الطابعة عبر Bluetooth أولاً.');
    }
  });
}

function hideNonBluetoothPrinterButtons() {
  const labels = ['RawBT', 'نافذة طباعة', 'طباعة فورية', 'Web Bluetooth'];
  document.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const text = (button.textContent || '').trim();
    if (labels.some((label) => text.includes(label))) {
      button.style.display = 'none';
      button.setAttribute('aria-hidden', 'true');
    }
  });
}

export function startAppCreativeEnhancer() {
  if (typeof window === 'undefined') return;
  persistLinkage();
  window.setInterval(persistLinkage, 2500);
  const observer = new MutationObserver(() => {
    addImageButton();
    addPrinterSearchButton();
    hideNonBluetoothPrinterButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button') as HTMLElement | null;
    if (!button) return;
    const label = (button.textContent || '').trim();

    if (label.includes('إرسال واتساب') || label === 'واتساب' || label.includes('واتساب')) {
      const customer = findCustomerFromLedger() || findCustomerFromCard(button);
      if (!customer) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void shareStatementImage(customer).catch((error) => {
        console.error(error);
        window.alert('تعذر تجهيز صورة كشف الحساب. تأكد من رقم العميل ثم حاول مرة أخرى.');
      });
      return;
    }

    if (label.includes('تصدير PDF')) {
      const customer = findCustomerFromLedger();
      if (!customer) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void shareStatementPdf(customer).catch((error) => {
        console.error(error);
        window.alert('تعذر تجهيز كشف الحساب PDF.');
      });
      return;
    }

    if (label.includes('تصدير Excel')) {
      const customer = findCustomerFromLedger();
      if (!customer) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void shareStatementExcel(customer).catch((error) => {
        console.error(error);
        window.alert('تعذر تجهيز كشف الحساب Excel.');
      });
      return;
    }

    if (button.matches('[data-azizi-statement-image]')) {
      const customer = findCustomerFromLedger();
      if (!customer) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void shareStatementImage(customer).catch((error) => {
        console.error(error);
        window.alert('تعذر تجهيز صورة كشف الحساب.');
      });
    }
  }, true);
}

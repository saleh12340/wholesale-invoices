import { Invoice, CustomerAccount, AppSettings } from '../types';
import { renderReceiptToCanvas } from './receiptCanvas';
import { saveFileToDownloads, shareBlobToWhatsApp } from './devicePermissions';

const HISTORY_KEY = 'azizi_invoice_history';
const CUSTOMERS_KEY = 'azizi_customer_accounts';
const SETTINGS_KEY = 'azizi_app_settings';

function arabicDigitsToLatin(value: string): string {
  return String(value || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function loadInvoices(): Invoice[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function loadCustomers(): CustomerAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function getSettings(): AppSettings {
  try {
    return {
      storeName: 'بقالة العزي',
      storeSubtitle: 'للمواد الغذائية والاستهلاكية',
      storePhone: '',
      address: 'صنعاء - اليمن',
      currency: 'ر.ي',
      taxEnabled: false,
      taxRate: 0,
      soundEnabled: true,
      thermalWidth: '80mm',
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'),
    } as AppSettings;
  } catch {
    return {
      storeName: 'بقالة العزي', storeSubtitle: 'للمواد الغذائية والاستهلاكية', storePhone: '',
      address: 'صنعاء - اليمن', currency: 'ر.ي', taxEnabled: false, taxRate: 0,
      soundEnabled: true, thermalWidth: '80mm',
    } as AppSettings;
  }
}

function normalizePhone(phone: string): string {
  let p = arabicDigitsToLatin(String(phone || '')).replace(/[^0-9]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('967')) return p;
  if (p.length === 9 && p.startsWith('7')) return `967${p}`;
  if (p.length === 10 && p.startsWith('0')) return `967${p.slice(1)}`;
  return p;
}

function findInvoiceFromButton(button: HTMLElement): Invoice | null {
  const root = button.closest('.fixed') || document.body;
  const text = root.textContent || '';
  const match = text.match(/فاتورة\s*#\s*([0-9٠-٩]+)/);
  if (!match) return null;
  const number = arabicDigitsToLatin(match[1]);
  return loadInvoices().find((invoice) => String(invoice.number) === number) || null;
}

function findPhone(invoice: Invoice): string {
  if (invoice.customerPhone) return normalizePhone(invoice.customerPhone);
  const target = String(invoice.customer || '').trim().toLowerCase();
  const customer = loadCustomers().find((c) => String(c.name || '').trim().toLowerCase() === target);
  return normalizePhone(customer?.phone || '');
}

async function savePng(button: HTMLElement) {
  const invoice = findInvoiceFromButton(button);
  if (!invoice) { window.alert('تعذر تحديد الفاتورة الحالية لحفظ الصورة.'); return; }
  const settings = getSettings();
  const canvas = renderReceiptToCanvas(invoice, {
    storeName: settings.storeName,
    storeSubtitle: settings.storeSubtitle,
    storePhone: settings.storePhone,
    currency: settings.currency,
    thermalWidth: settings.thermalWidth,
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('تعذر إنشاء صورة PNG');
  const fileName = `فاتورة_${invoice.number}_${String(invoice.customer || 'نقدي').replace(/[\\/:*?"<>|]+/g, '_')}.png`;
  const result = await saveFileToDownloads(blob, fileName, 'image/png');
  window.dispatchEvent(new CustomEvent('azizi-native-message', { detail: result.message }));
}

async function shareWhatsAppImage(button: HTMLElement) {
  const invoice = findInvoiceFromButton(button);
  if (!invoice) { window.alert('تعذر تحديد الفاتورة الحالية.'); return; }
  const settings = getSettings();
  const canvas = renderReceiptToCanvas(invoice, {
    storeName: settings.storeName,
    storeSubtitle: settings.storeSubtitle,
    storePhone: settings.storePhone,
    currency: settings.currency,
    thermalWidth: settings.thermalWidth,
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
  if (!blob) throw new Error('تعذر إنشاء صورة الفاتورة');
  const fileName = `فاتورة_${invoice.number}_${String(invoice.customer || 'نقدي').replace(/[\\/:*?"<>|]+/g, '_')}.jpg`;
  const phone = findPhone(invoice);
  const text = `فاتورة #${invoice.number} من ${settings.storeName || 'بقالة العزي'} - الإجمالي: ${invoice.total} ${settings.currency || 'ر.ي'}`;
  const result = await shareBlobToWhatsApp(blob, fileName, 'image/jpeg', phone, text);
  window.dispatchEvent(new CustomEvent('azizi-native-message', { detail: result.message }));
}

export function startExportAndShareEnhancer() {
  if (typeof window === 'undefined') return;
  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement | null)?.closest('button') as HTMLElement | null;
    if (!button) return;
    const label = (button.textContent || '').trim();
    if (label.includes('واتساب (صورة)')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void shareWhatsAppImage(button).catch((e) => {
        console.error(e);
        window.alert('تعذر تجهيز صورة الفاتورة لواتساب. تأكد من وجود الفاتورة ورقم العميل.');
      });
      return;
    }
    if (label.includes('حفظ PNG')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void savePng(button).catch((e) => {
        console.error(e);
        window.alert('تعذر حفظ صورة PNG في مجلد Downloads.');
      });
    }
  }, true);
}

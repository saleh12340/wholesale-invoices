import { Invoice, CustomerAccount, AppSettings } from '../types';
import { renderReceiptToCanvas } from './receiptCanvas';
import { saveFileToDownloads, shareBlobToWhatsApp } from './devicePermissions';
import { exportInvoiceToPdf, exportInvoiceToExcel } from './exportTools';

const HISTORY_KEY = 'azizi_invoice_history';
const CUSTOMERS_KEY = 'azizi_customer_accounts';
const SETTINGS_KEY = 'azizi_app_settings';
function arabicDigitsToLatin(value: string): string { return String(value || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); }
function loadInvoices(): Invoice[] { try { const p = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } }
function loadCustomers(): CustomerAccount[] { try { const p = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } }
function getSettings(): AppSettings {
  const base = { storeName:'بقالة العزي', storeSubtitle:'للمواد الغذائية والاستهلاكية', storePhone:'', address:'صنعاء - اليمن', currency:'ر.ي', taxEnabled:false, taxRate:0, soundEnabled:true, thermalWidth:'58mm' };
  try { return { ...base, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } as AppSettings; } catch { return base as AppSettings; }
}
function normalizePhone(phone: string): string {
  let p = arabicDigitsToLatin(String(phone || '')).replace(/[^0-9]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('967')) return p;
  if (p.length === 9 && p.startsWith('7')) return `967${p}`;
  if (p.length === 10 && p.startsWith('0')) return `967${p.slice(1)}`;
  return p;
}
function findCustomerForInvoice(invoice: Invoice): CustomerAccount | null {
  const customers = loadCustomers();
  if (invoice.customerId) { const byId = customers.find((c) => c.id === invoice.customerId); if (byId) return byId; }
  const target = String(invoice.customer || '').trim().toLowerCase();
  return customers.find((c) => String(c.name || '').trim().toLowerCase() === target) || null;
}
function findInvoiceFromButton(button: HTMLElement): Invoice | null {
  const root = button.closest('.fixed') || document.body;
  const match = (root.textContent || '').match(/فاتورة\s*#\s*([0-9٠-٩]+)/);
  if (!match) return null;
  const number = arabicDigitsToLatin(match[1]);
  return loadInvoices().find((invoice) => String(invoice.number) === number) || null;
}
function findPhone(invoice: Invoice): string { return normalizePhone(invoice.customerPhone || findCustomerForInvoice(invoice)?.phone || ''); }
function makeSmallReceiptCanvas(invoice: Invoice, settings: AppSettings): HTMLCanvasElement {
  const source = renderReceiptToCanvas(invoice, { storeName:settings.storeName, storeSubtitle:settings.storeSubtitle, storePhone:settings.storePhone, currency:settings.currency, thermalWidth:'58mm' });
  const targetWidth = 384;
  if (source.width <= targetWidth) return source;
  const ratio = targetWidth / source.width;
  const canvas = document.createElement('canvas'); canvas.width = targetWidth; canvas.height = Math.max(1, Math.round(source.height * ratio));
  const ctx = canvas.getContext('2d'); if (!ctx) return source;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
async function savePng(button: HTMLElement) {
  const invoice = findInvoiceFromButton(button); if (!invoice) { window.alert('تعذر تحديد الفاتورة الحالية لحفظ الصورة.'); return; }
  const canvas = makeSmallReceiptCanvas(invoice, getSettings());
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('تعذر إنشاء صورة PNG');
  const fileName = `فاتورة_${invoice.number}_ايصال.png`;
  const result = await saveFileToDownloads(blob, fileName, 'image/png');
  window.dispatchEvent(new CustomEvent('azizi-native-message', { detail: result.message }));
}
async function shareWhatsAppImage(button: HTMLElement) {
  const invoice = findInvoiceFromButton(button); if (!invoice) { window.alert('تعذر تحديد الفاتورة الحالية.'); return; }
  const settings = getSettings(); const canvas = makeSmallReceiptCanvas(invoice, settings);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error('تعذر إنشاء صورة الإيصال');
  const fileName = `فاتورة_${invoice.number}_ايصال.jpg`;
  const phone = findPhone(invoice);
  const text = `فاتورة #${invoice.number} من ${settings.storeName || 'بقالة العزي'} - الإجمالي: ${invoice.total} ${settings.currency || 'ر.ي'}`;
  const result = await shareBlobToWhatsApp(blob, fileName, 'image/jpeg', phone, text);
  window.dispatchEvent(new CustomEvent('azizi-native-message', { detail: result.message }));
}
async function sharePdf(button: HTMLElement) {
  const invoice = findInvoiceFromButton(button); if (!invoice) { window.alert('تعذر تحديد الفاتورة الحالية.'); return; }
  const settings = getSettings();
  const result = await exportInvoiceToPdf(invoice, { storeName:settings.storeName, storeSubtitle:settings.storeSubtitle, storePhone:settings.storePhone, currency:settings.currency, thermalWidth:'58mm' }, 'share');
  window.dispatchEvent(new CustomEvent('azizi-native-message', { detail: result.message }));
}
async function shareExcel(button: HTMLElement) {
  const invoice = findInvoiceFromButton(button); if (!invoice) { window.alert('تعذر تحديد الفاتورة الحالية.'); return; }
  const settings = getSettings(); const result = await exportInvoiceToExcel(invoice, { storeName:settings.storeName, currency:settings.currency }, 'share');
  window.dispatchEvent(new CustomEvent('azizi-native-message', { detail: result.message }));
}
function hideOtherPrinters() {
  const unwanted = ['RawBT صورة', 'RawBT نص', 'نافذة طباعة', 'طباعة فورية'];
  document.querySelectorAll('button').forEach((button) => { const text=(button.textContent||'').trim(); if(unwanted.some((label)=>text.includes(label))){ (button as HTMLElement).style.display='none'; (button as HTMLElement).setAttribute('aria-hidden','true'); } });
}
export function startExportAndShareEnhancer() {
  if (typeof window === 'undefined') return;
  document.addEventListener('click', (event) => {
    const button=(event.target as HTMLElement | null)?.closest('button') as HTMLElement | null; if(!button)return;
    const label=(button.textContent||'').trim();
    if(label.includes('واتساب (صورة)')){event.preventDefault();event.stopImmediatePropagation();void shareWhatsAppImage(button).catch((e)=>{console.error(e);window.alert('تعذر تجهيز صورة الإيصال لواتساب. تأكد من وجود الفاتورة ورقم العميل.');});return;}
    if(label.includes('حفظ PNG')){event.preventDefault();event.stopImmediatePropagation();void savePng(button).catch((e)=>{console.error(e);window.alert('تعذر حفظ صورة الإيصال في مجلد Downloads.');});return;}
    if(label.includes('مشاركة')&&label.toLowerCase().includes('pdf')){event.preventDefault();event.stopImmediatePropagation();void sharePdf(button).catch((e)=>{console.error(e);window.alert('تعذر تجهيز PDF للمشاركة.');});return;}
    if(label.includes('مشاركة')&&(label.toLowerCase().includes('excel')||label.toLowerCase().includes('xlsx'))){event.preventDefault();event.stopImmediatePropagation();void shareExcel(button).catch((e)=>{console.error(e);window.alert('تعذر تجهيز Excel للمشاركة.');});}
  }, true);
  hideOtherPrinters(); window.setInterval(hideOtherPrinters,1000);
}

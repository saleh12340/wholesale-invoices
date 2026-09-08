import { Invoice } from '../types';
import { renderReceiptToCanvas } from './receiptCanvas';

function buildInvoice(): Invoice | null {
  try {
    const draft = JSON.parse(localStorage.getItem('azizi_active_draft') || '{}');
    const items = Array.isArray(draft.items) ? draft.items : [];
    if (!items.length) return null;
    const number = Number(localStorage.getItem('azizi_last_inv_num') || '1001');
    const now = Date.now();
    const settings = JSON.parse(localStorage.getItem('azizi_app_settings') || '{}');
    const total = items.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
    return {
      id: `bluetooth-preview-${now}`,
      number,
      customer: draft.customerName || 'عميل نقدي',
      date: new Date(now).toLocaleDateString('ar-YE'),
      time: new Date(now).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', hour12: true }),
      timestamp: now,
      items,
      total,
      paymentType: draft.paymentType === 'credit' ? 'credit' : 'cash',
    };
  } catch { return null; }
}

function applyLabel() {
  const button = document.getElementById('btn-top-print') as HTMLButtonElement | null;
  if (!button) return;
  const span = button.querySelector('span');
  if (span) span.textContent = 'Bluetooth';
  button.title = 'طباعة الفاتورة عبر الطابعة الحرارية Bluetooth فقط';
  button.setAttribute('aria-label', 'طباعة عبر Bluetooth');
  button.dataset.aziziBluetoothTop = 'true';
}

export function startTopBluetoothPrinterEnhancer() {
  if (typeof window === 'undefined') return;
  const apply = () => applyLabel();
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(apply, 1000);

  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement | null)?.closest('#btn-top-print') as HTMLButtonElement | null;
    if (!button || button.disabled || (window as any).__aziziTopBluetoothBusy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const android = (window as any).Android;
    if (!android || typeof android.printBluetoothImage !== 'function') {
      window.alert('الطابعة في الشاشة الرئيسية تعمل عبر Bluetooth فقط داخل نسخة Android.');
      return;
    }
    const invoice = buildInvoice();
    if (!invoice) {
      window.alert('أضف صنفاً واحداً على الأقل قبل الطباعة.');
      return;
    }
    const settings = JSON.parse(localStorage.getItem('azizi_app_settings') || '{}');
    const canvas = renderReceiptToCanvas(invoice, {
      storeName: settings.storeName || 'بقالة العزي',
      storeSubtitle: settings.storeSubtitle || 'للمواد الغذائية والاستهلاكية',
      storePhone: settings.storePhone || '',
      currency: settings.currency || 'ر.ي',
      thermalWidth: '58mm',
    });
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    if (!base64) return;
    (window as any).__aziziTopBluetoothBusy = true;
    try { android.printBluetoothImage(base64, 384); } finally { window.setTimeout(() => { (window as any).__aziziTopBluetoothBusy = false; }, 1200); }
  }, true);
}

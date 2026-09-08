import { CustomerAccount } from '../types';
import { formatNumber } from './arabic';

const CUSTOMERS_KEY = 'azizi_customer_accounts';

function customers(): CustomerAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function visibleLedger(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('.fixed')).reverse().find((el) => {
    const style = getComputedStyle(el);
    const text = el.textContent || '';
    return style.display !== 'none' && text.includes('كشف حساب:') && text.includes('إرسال واتساب');
  }) || null;
}

function ledgerCustomer(): CustomerAccount | null {
  const modal = visibleLedger();
  if (!modal) return null;
  const match = (modal.textContent || '').match(/كشف حساب:\s*([^\n•]+)/);
  if (!match) return null;
  const name = match[1].trim();
  return customers().find((c) => c.name === name) || customers().find((c) => name.includes(c.name)) || null;
}

function renderStatement(customer: CustomerAccount): string {
  const width = 384;
  const rowHeight = 50;
  const height = 190 + Math.max(1, customer.transactions.length) * rowHeight + 100;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#075985';
  ctx.fillRect(0, 0, width, 80);
  ctx.fillStyle = '#fff';
  ctx.font = "bold 18px 'Cairo', Tahoma, sans-serif";
  ctx.fillText('بقالة العزي', width / 2, 30);
  ctx.font = "bold 15px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(`كشف حساب: ${customer.name}`, width / 2, 58);
  ctx.fillStyle = '#0f172a';
  ctx.font = "bold 13px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(`الرصيد الحالي: ${formatNumber(customer.balance)} ر.ي`, width / 2, 110);
  ctx.font = "11px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(`الهاتف: ${customer.phone || 'غير مسجل'}  •  ${customer.transactions.length} عملية`, width / 2, 138);
  let y = 160;
  customer.transactions.forEach((tx, index) => {
    ctx.fillStyle = index % 2 ? '#f8fafc' : '#fff';
    ctx.fillRect(10, y - 18, width - 20, rowHeight);
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'right';
    ctx.font = "10px 'Cairo', Tahoma, sans-serif";
    const type = tx.type === 'invoice_credit' ? `فاتورة #${tx.invoiceNumber || ''}` : tx.type === 'payment' ? 'سداد' : 'رصيد افتتاحي';
    ctx.fillText(`${tx.date} ${tx.time || ''} — ${type}`, width - 18, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = tx.amount > 0 ? '#b91c1c' : '#15803d';
    ctx.fillText(`${tx.amount > 0 ? '+' : ''}${formatNumber(tx.amount)} ر.ي`, 18, y);
    ctx.fillStyle = '#64748b';
    ctx.fillText(`الرصيد: ${formatNumber(tx.balanceAfter)}`, 18, y + 18);
    y += rowHeight;
  });
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(10, y, width - 20, 58);
  ctx.fillStyle = '#075985';
  ctx.textAlign = 'center';
  ctx.font = "bold 15px 'Cairo', Tahoma, sans-serif";
  ctx.fillText(`الإجمالي المستحق: ${formatNumber(customer.balance)} ر.ي`, width / 2, y + 35);
  return canvas.toDataURL('image/png').split(',')[1] || '';
}

function addBluetoothLedgerButton() {
  const modal = visibleLedger();
  if (!modal) return;
  const footer = Array.from(modal.querySelectorAll<HTMLElement>('div')).find((el) => {
    const text = el.textContent || '';
    return text.includes('إرسال واتساب') && text.includes('تصدير PDF') && text.includes('تصدير Excel');
  });
  if (!footer || footer.querySelector('[data-azizi-bluetooth-print]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('data-azizi-bluetooth-print', 'true');
  button.className = 'w-full py-2 px-3 bg-sky-700 hover:bg-sky-800 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs';
  button.textContent = '🖨️ طباعة كشف الحساب عبر Bluetooth';
  footer.appendChild(button);
}

function hideNonBluetoothPrinters() {
  const forbidden = ['RawBT', 'نافذة طباعة', 'طباعة فورية', 'Web Bluetooth', 'طباعة حرارية'];
  document.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const text = (button.textContent || '').trim();
    if (forbidden.some((label) => text.includes(label)) && !text.includes('Bluetooth')) {
      button.style.display = 'none';
      button.setAttribute('aria-hidden', 'true');
    }
  });
}

export function startBluetoothOnlyEnhancer() {
  if (typeof window === 'undefined') return;
  const observer = new MutationObserver(() => {
    hideNonBluetoothPrinters();
    addBluetoothLedgerButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(() => { hideNonBluetoothPrinters(); addBluetoothLedgerButton(); }, 1000);

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button') as HTMLElement | null;
    if (!button || !button.matches('[data-azizi-bluetooth-print]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const customer = ledgerCustomer();
    const android = (window as any).Android;
    if (!customer) { window.alert('تعذر تحديد حساب العميل.'); return; }
    if (!android || typeof android.printBluetoothImage !== 'function') {
      window.alert('الطباعة الحرارية عبر Bluetooth متاحة في نسخة Android.');
      return;
    }
    const base64 = renderStatement(customer);
    if (!base64) { window.alert('تعذر تجهيز كشف الحساب للطباعة.'); return; }
    android.printBluetoothImage(base64, 384);
  }, true);
}

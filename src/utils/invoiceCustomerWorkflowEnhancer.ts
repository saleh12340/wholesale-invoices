import { Invoice, CustomerAccount, CustomerTransaction } from '../types';
import { shareBlobToWhatsApp } from './devicePermissions';

const HISTORY_KEY = 'azizi_invoice_history';
const ACCOUNTS_KEY = 'azizi_customer_accounts';
const CUSTOMERS_KEY = 'azizi_customers_list';
const SETTINGS_KEY = 'azizi_app_settings';

function read<T>(key: string, fallback: T): T {
  try { const value = JSON.parse(localStorage.getItem(key) || ''); return value ?? fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function digits(value: string): string { return String(value || '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, ''); }
function normalizePhone(value: string): string {
  let d = digits(value);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('967')) return d;
  if (d.length === 9 && d.startsWith('7')) return `967${d}`;
  if (d.length === 10 && d.startsWith('0')) return `967${d.slice(1)}`;
  return d;
}
function money(value: number): string { return new Intl.NumberFormat('ar-YE').format(Number(value) || 0); }
function currentCustomerName(): string {
  return ((document.querySelector('#customer-input') as HTMLInputElement | null)?.value || '').trim();
}
function currentPaymentType(): 'cash' | 'credit' {
  const text = document.querySelector('#btn-payment-type-pill')?.textContent || '';
  return text.includes('آجل') ? 'credit' : 'cash';
}
function findAccount(name: string): CustomerAccount | undefined {
  const target = name.trim().toLowerCase();
  return read<CustomerAccount[]>(ACCOUNTS_KEY, []).find(a => String(a.name || '').trim().toLowerCase() === target);
}
function ensureCustomerAfterInvoice(name: string, phone: string) {
  if (!name || name === 'عميل نقدي') return;
  const now = Date.now();
  const accounts = read<CustomerAccount[]>(ACCOUNTS_KEY, []);
  const invoices = read<Invoice[]>(HISTORY_KEY, []);
  const invoice = [...invoices].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).find(i => String(i.customer || '').trim().toLowerCase() === name.toLowerCase());
  const account = accounts.find(a => a.name.trim().toLowerCase() === name.toLowerCase());
  if (account) {
    const updated = accounts.map(a => a.id === account.id ? { ...a, phone: phone || a.phone, invoiceIds: Array.from(new Set([...(a.invoiceIds || []), ...(invoice ? [invoice.id] : [])])) } : a);
    write(ACCOUNTS_KEY, updated);
  } else {
    const newId = `cust-${now}`;
    const newAccount: CustomerAccount = {
      id: newId,
      name,
      phone: phone || undefined,
      balance: currentPaymentType() === 'credit' && invoice ? Number(invoice.total) || 0 : 0,
      createdAt: `${invoice?.date || new Date().toLocaleDateString('ar-YE')} ${invoice?.time || ''}`,
      transactions: currentPaymentType() === 'credit' && invoice ? [{
        id: `tx-${now}`,
        date: invoice.date,
        time: invoice.time,
        timestamp: invoice.timestamp || now,
        type: 'invoice_credit',
        amount: Number(invoice.total) || 0,
        balanceAfter: Number(invoice.total) || 0,
        invoiceNumber: invoice.number,
        invoiceId: invoice.id,
        notes: `فاتورة مبيعات آجل #${invoice.number}`,
      }] : [],
      invoiceIds: invoice ? [invoice.id] : [],
    };
    write(ACCOUNTS_KEY, [newAccount, ...accounts]);
  }
  const names = read<string[]>(CUSTOMERS_KEY, []);
  if (!names.some(n => n.trim().toLowerCase() === name.toLowerCase())) write(CUSTOMERS_KEY, [name, ...names]);
  if (invoice) {
    const patched = invoices.map(i => i.id === invoice.id ? { ...i, customerPhone: phone || i.customerPhone, customerId: (findAccount(name)?.id || read<CustomerAccount[]>(ACCOUNTS_KEY, []).find(a => a.name.trim().toLowerCase() === name.toLowerCase())?.id) } : i);
    write(HISTORY_KEY, patched);
  }
}

function showNewCustomerDialog(name: string, onConfirm: (phone: string) => void) {
  document.getElementById('azizi-new-invoice-customer-dialog')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'azizi-new-invoice-customer-dialog';
  overlay.dir = 'rtl';
  overlay.innerHTML = `
    <div class="azizi-ncd-backdrop"></div>
    <div class="azizi-ncd-card">
      <div class="azizi-ncd-title">👤 حفظ عميل جديد مع الفاتورة</div>
      <div class="azizi-ncd-sub">العميل <b>${name.replace(/[<>]/g, '')}</b> غير مسجل. أدخل رقم الهاتف ليتم حفظه تلقائياً.</div>
      <label class="azizi-ncd-label">رقم العميل / واتساب</label>
      <input id="azizi-new-customer-phone" class="azizi-ncd-input" type="tel" inputmode="tel" placeholder="777123456" autocomplete="tel">
      <div class="azizi-ncd-hint">يمكن استخدام الرقم لاحقاً لإرسال الفواتير وكشف الحساب عبر واتساب.</div>
      <div class="azizi-ncd-actions">
        <button id="azizi-ncd-cancel" type="button">إلغاء</button>
        <button id="azizi-ncd-save" type="button">حفظ العميل والفاتورة</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#azizi-new-customer-phone') as HTMLInputElement;
  const close = () => overlay.remove();
  overlay.querySelector('#azizi-ncd-cancel')?.addEventListener('click', close);
  overlay.querySelector('#azizi-ncd-save')?.addEventListener('click', () => { const phone = input.value.trim(); close(); onConfirm(phone); });
  input.focus();
}

function installInvoiceCustomerDialog() {
  document.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement | null)?.closest('#btn-top-save') as HTMLButtonElement | null;
    if (!button || button.disabled || (window as any).__aziziCustomerDialogBypass) return;
    const name = currentCustomerName();
    if (!name || name === 'عميل نقدي') return;
    const exists = !!findAccount(name) || read<string[]>(CUSTOMERS_KEY, []).some(n => n.trim().toLowerCase() === name.toLowerCase());
    if (exists) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showNewCustomerDialog(name, (phone) => {
      (window as any).__aziziCustomerDialogBypass = true;
      try {
        button.click();
      } finally {
        window.setTimeout(() => {
          ensureCustomerAfterInvoice(name, phone);
          (window as any).__aziziCustomerDialogBypass = false;
          window.dispatchEvent(new CustomEvent('azizi-data-updated'));
        }, 450);
      }
    });
  }, true);
}

function customerFromLedger(modal: HTMLElement): CustomerAccount | undefined {
  const heading = Array.from(modal.querySelectorAll('h3')).find(h => (h.textContent || '').startsWith('كشف حساب:'));
  if (!heading) return undefined;
  const name = (heading.textContent || '').replace(/^كشف حساب:\s*/, '').trim();
  return findAccount(name);
}

function statementText(account: CustomerAccount, selected?: CustomerTransaction[]) {
  const rows = selected?.length ? selected : account.transactions;
  const balance = account.balance;
  const balanceText = balance > 0 ? `عليه ${money(balance)} ر.ي` : balance < 0 ? `له ${money(Math.abs(balance))} ر.ي` : 'الحساب خالص';
  let text = `*كشف حساب العميل: ${account.name}*\nبقالة العزي للمواد الغذائية\nالرصيد الحالي: ${balanceText}\nعدد العمليات: ${rows.length}\n------------------------------\n`;
  rows.forEach((tx, i) => {
    const type = tx.type === 'invoice_credit' ? `فاتورة آجل #${tx.invoiceNumber || ''}` : tx.type === 'payment' ? 'سداد / دفعة' : 'رصيد افتتاحي';
    text += `${i + 1}. ${tx.date} ${tx.time || ''} | ${type} | ${tx.amount >= 0 ? '+' : '-'}${money(Math.abs(tx.amount))} ر.ي | الرصيد: ${money(tx.balanceAfter)} ر.ي\n`;
  });
  text += '------------------------------\nالإجمالي الحالي: ' + money(balance) + ' ر.ي';
  return text;
}

function addLedgerSharing(modal: HTMLElement) {
  if (modal.dataset.aziziLedgerEnhanced === '1') return;
  const account = customerFromLedger(modal);
  if (!account) return;
  modal.dataset.aziziLedgerEnhanced = '1';
  modal.classList.add('azizi-full-ledger-modal');
  const footer = Array.from(modal.querySelectorAll('button')).find(b => (b.textContent || '').includes('تصدير PDF'))?.parentElement?.parentElement;
  const balanceBanner = Array.from(modal.querySelectorAll('div')).find(d => (d.textContent || '').includes('الرصيد المتبقي الإجمالي:')) as HTMLElement | undefined;
  const toolbar = document.createElement('div');
  toolbar.className = 'azizi-ledger-share-toolbar';
  toolbar.innerHTML = `
    <button data-ledger-share="all-text">💬 الحساب كامل نص</button>
    <button data-ledger-share="all-image">🧾 الحساب كامل صورة</button>
    <button data-ledger-share="selected">☑️ مشاركة عمليات محددة</button>`;
  (balanceBanner || footer || modal.firstElementChild)?.insertAdjacentElement('afterend', toolbar);

  const txContainer = Array.from(modal.querySelectorAll('div')).find(d => {
    const c = d.className || '';
    return typeof c === 'string' && c.includes('overflow-y-auto') && c.includes('flex-1');
  }) as HTMLElement | undefined;
  if (!txContainer) return;
  const rows = Array.from(txContainer.children).filter(el => el instanceof HTMLElement) as HTMLElement[];
  rows.forEach((row, index) => {
    const tx = account.transactions[index];
    if (!tx || row.dataset.aziziTxShare === '1') return;
    row.dataset.aziziTxShare = '1';
    const share = document.createElement('button');
    share.type = 'button';
    share.textContent = '💬 مشاركة';
    share.className = 'azizi-tx-share';
    share.addEventListener('click', async (e) => {
      e.stopPropagation();
      const phone = normalizePhone(account.phone || '');
      const text = statementText(account, [tx]);
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      else await shareBlobToWhatsApp(new Blob([text], { type: 'text/plain;charset=utf-8' }), `عملية_${tx.invoiceNumber || tx.id}.txt`, 'text/plain', '', text);
    });
    row.appendChild(share);
  });

  const clickShare = async (mode: string) => {
    if (mode === 'all-text') {
      const phone = normalizePhone(account.phone || '');
      const text = statementText(account);
      if (!phone) { window.alert('أضف رقم الهاتف للعميل أولاً لإرسال كشف الحساب إلى واتساب.'); return; }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (mode === 'all-image') {
      const img = modal.querySelector('button') as HTMLButtonElement | null;
      const imageButton = Array.from(modal.querySelectorAll('button')).find(b => (b.textContent || '').includes('صورة 58mm')) as HTMLButtonElement | undefined;
      if (imageButton) imageButton.click(); else {
        const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 220; const ctx = canvas.getContext('2d');
        if (ctx) { ctx.fillStyle = '#fff'; ctx.fillRect(0,0,384,220); ctx.fillStyle='#000'; ctx.direction='rtl'; ctx.textAlign='right'; ctx.font='bold 18px Cairo, sans-serif'; ctx.fillText(`كشف حساب: ${account.name}`, 368, 30); ctx.font='13px Cairo, sans-serif'; ctx.fillText(`الرصيد الحالي: ${money(account.balance)} ر.ي`, 368, 56); account.transactions.slice(0,8).forEach((tx,i)=>ctx.fillText(`${i+1}. ${tx.date} | ${money(tx.amount)} | ${money(tx.balanceAfter)}`,368,82+i*16)); const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/jpeg',.86)); if(blob) await shareBlobToWhatsApp(blob,`كشف_${account.name}.jpg`,'image/jpeg',account.phone,statementText(account)); }
      }
      return;
    }
    const checks = Array.from(txContainer?.querySelectorAll('input[type="checkbox"]') || []) as HTMLInputElement[];
    if (checks.length) {
      const selected = checks.map((c,i)=>c.checked ? account.transactions[i] : null).filter(Boolean) as CustomerTransaction[];
      if (!selected.length) { window.alert('حدد عملية واحدة على الأقل.'); return; }
      const text = statementText(account, selected); const phone = normalizePhone(account.phone || '');
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      else window.alert('أضف رقم الهاتف للعميل أولاً.');
    }
  };
  toolbar.querySelectorAll('[data-ledger-share]').forEach(btn => btn.addEventListener('click', () => clickShare((btn as HTMLElement).dataset.ledgerShare || '')));

  rows.forEach((row,index) => {
    if (!account.transactions[index] || row.querySelector('input[type="checkbox"]')) return;
    const check = document.createElement('input'); check.type='checkbox'; check.className='azizi-tx-check'; check.title='تحديد العملية للمشاركة'; row.insertBefore(check,row.firstChild);
  });
}

function enhanceLedger() {
  const headings = Array.from(document.querySelectorAll('h3')) as HTMLElement[];
  headings.forEach(h => { if (!(h.textContent || '').startsWith('كشف حساب:')) return; const modal = h.closest('.fixed') as HTMLElement | null; if (modal) addLedgerSharing(modal); });
}

function injectStyles() {
  if (document.getElementById('azizi-invoice-customer-styles')) return;
  const style = document.createElement('style'); style.id='azizi-invoice-customer-styles'; style.textContent=`
    #azizi-new-invoice-customer-dialog{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Cairo,Tahoma,Arial,sans-serif}
    .azizi-ncd-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.72);backdrop-filter:blur(4px)}
    .azizi-ncd-card{position:relative;width:min(420px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 25px 70px rgba(0,0,0,.35);direction:rtl}
    .azizi-ncd-title{font-weight:900;font-size:17px;margin-bottom:8px}.azizi-ncd-sub{font-size:12px;color:#64748b;line-height:1.7;margin-bottom:14px}.azizi-ncd-label{display:block;font-size:12px;font-weight:800;margin-bottom:6px}.azizi-ncd-input{width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:13px;font-size:16px;font-family:monospace;outline:none}.azizi-ncd-input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.12)}.azizi-ncd-hint{font-size:10px;color:#94a3b8;margin-top:6px}.azizi-ncd-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:16px}.azizi-ncd-actions button{border:0;border-radius:12px;padding:11px;font-weight:800;cursor:pointer}.azizi-ncd-actions button:first-child{background:#f1f5f9;color:#475569}.azizi-ncd-actions button:last-child{background:#059669;color:#fff}
    .azizi-full-ledger-modal{z-index:9999!important}.azizi-full-ledger-modal>div:last-child{width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;border-radius:0!important}.azizi-ledger-share-toolbar{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.dark .azizi-ledger-share-toolbar{background:#0f172a;border-color:#1e293b}.azizi-ledger-share-toolbar button{border:0;border-radius:10px;padding:8px 5px;font-size:10px;font-weight:800;background:#e2e8f0;color:#0f172a}.dark .azizi-ledger-share-toolbar button{background:#1e293b;color:#e2e8f0}.azizi-tx-share{margin-top:7px!important;border:0;border-radius:8px;padding:5px 8px;background:#ecfdf5;color:#047857;font-size:10px;font-weight:800}.azizi-tx-check{margin-left:7px;width:16px;height:16px;accent-color:#059669;vertical-align:middle}
  `; document.head.appendChild(style);
}

export function startInvoiceCustomerWorkflowEnhancer() {
  if (typeof window === 'undefined') return;
  injectStyles();
  installInvoiceCustomerDialog();
  window.setTimeout(enhanceLedger, 900);
  window.setInterval(enhanceLedger, 1200);
}

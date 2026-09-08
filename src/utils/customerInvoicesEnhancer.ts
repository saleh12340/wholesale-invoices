import { Invoice, CustomerAccount } from '../types';

const HISTORY_KEY = 'azizi_invoice_history';
const CUSTOMERS_KEY = 'azizi_customer_accounts';
const CARD_MARKER = 'data-azizi-invoices-list';
const MODAL_MARKER = 'data-azizi-invoices-modal-list';

function arabicDigitsToLatin(value: string): string { return String(value || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); }
function loadInvoices(): Invoice[] { try { const p=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); return Array.isArray(p)?p:[]; } catch { return []; } }
function loadAccounts(): CustomerAccount[] { try { const p=JSON.parse(localStorage.getItem(CUSTOMERS_KEY)||'[]'); return Array.isArray(p)?p:[]; } catch { return []; } }
function normalizePhone(phone: string): string {
  let digits=arabicDigitsToLatin(String(phone||'')).replace(/[^0-9]/g,'');
  if(digits.startsWith('00'))digits=digits.slice(2);
  if(digits.startsWith('967'))return digits;
  if(digits.length===9&&digits.startsWith('7'))return `967${digits}`;
  if(digits.length===10&&digits.startsWith('0'))return `967${digits.slice(1)}`;
  return digits;
}
function getInvoicesForAccount(account?: CustomerAccount, name=''): Invoice[] {
  const invoices=loadInvoices();
  if(account?.invoiceIds?.length){
    const ids=new Set(account.invoiceIds.map(String));
    const byId=invoices.filter(i=>ids.has(String(i.id)));
    if(byId.length)return byId.sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
  }
  const target=name.trim().toLowerCase();
  return invoices.filter(i=>String(i.customerId||'')===String(account?.id||'') || String(i.customer||'').trim().toLowerCase()===target).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
}
function findAccount(name:string):CustomerAccount|undefined{const target=name.trim().toLowerCase();return loadAccounts().find(a=>String(a.name||'').trim().toLowerCase()===target);}
function amount(value:number):string{return new Intl.NumberFormat('ar-YE').format(Number(value)||0);}
function status(invoice:Invoice):string{return invoice.paymentType==='credit'?'آجل / غير مسدد بالكامل':'نقدي / مدفوع';}
function renderRows(container:HTMLElement,invoices:Invoice[]){
  const signature=invoices.map(i=>`${i.id}:${i.total}:${i.paymentType}:${i.date}:${i.lastModified||''}`).join('|');
  if(container.dataset.signature===signature)return; container.dataset.signature=signature; container.replaceChildren();
  if(!invoices.length){const e=document.createElement('div');e.className='text-[10px] text-slate-400 py-2';e.textContent='لا توجد فواتير مرتبطة بهذا العميل';container.appendChild(e);return;}
  invoices.slice(0,50).forEach(invoice=>{const row=document.createElement('div');row.className='grid grid-cols-[auto_1fr_auto] gap-2 items-center py-1.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0';
    const no=document.createElement('span');no.className='font-mono text-[10px] font-bold';no.textContent=`#${invoice.number}`;
    const info=document.createElement('div');info.className='min-w-0';const date=document.createElement('div');date.className='text-[10px] truncate';date.textContent=`${invoice.date||'-'} ${invoice.time||''}`.trim();
    const state=document.createElement('div');state.className=`text-[9px] font-bold ${invoice.paymentType==='credit'?'text-amber-600':'text-emerald-600'}`;state.textContent=status(invoice);info.append(date,state);
    const total=document.createElement('span');total.className='font-mono text-[10px] font-black whitespace-nowrap';total.textContent=amount(invoice.total);row.append(no,info,total);container.appendChild(row);
  });
}
function addInvoiceSection(parent:HTMLElement,invoices:Invoice[],modal=false){const section=document.createElement('div');section.className=modal?'mx-4 mb-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60':'mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70';section.setAttribute(modal?MODAL_MARKER:CARD_MARKER,'true');const title=document.createElement('div');title.className='text-[11px] font-black mb-1.5';title.textContent=modal?'فواتير العميل المرتبطة':'فواتير العميل';const count=document.createElement('span');count.className='float-left text-[9px] font-bold text-slate-400';count.textContent=`${invoices.length} فاتورة`;title.appendChild(count);const rows=document.createElement('div');rows.dataset.invoiceRows='true';section.append(title,rows);renderRows(rows,invoices);parent.appendChild(section);}
function enhance(){
  const headings=Array.from(document.querySelectorAll('h3')) as HTMLElement[];
  headings.forEach(heading=>{const text=heading.textContent?.trim()||'';if(!text)return;
    if(text.startsWith('كشف حساب:')){const name=text.replace(/^كشف حساب:\s*/,'').trim();const modal=heading.closest('.fixed') as HTMLElement|null;if(!modal)return;const account=findAccount(name);const invoices=getInvoicesForAccount(account,name);let section=modal.querySelector(`[${MODAL_MARKER}]`) as HTMLElement|null;
      if(!section){section=document.createElement('div');section.className='mx-4 mb-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60';section.setAttribute(MODAL_MARKER,'true');const title=document.createElement('div');title.className='text-[11px] font-black text-blue-800 dark:text-blue-300 mb-1.5';title.textContent=`فواتير العميل (${invoices.length})`;const rows=document.createElement('div');rows.dataset.invoiceRows='true';section.append(title,rows);const banner=Array.from(modal.querySelectorAll('.p-4')).find(el=>(el.textContent||'').includes('الرصيد المتبقي الإجمالي')) as HTMLElement|undefined;if(banner)banner.insertAdjacentElement('afterend',section);else modal.appendChild(section);}
      const rows=section.querySelector('[data-invoice-rows]') as HTMLElement|null;if(rows)renderRows(rows,invoices);return;
    }
    const card=heading.closest('div.bg-white') as HTMLElement|null;if(!card)return;if(card.querySelector(`[${CARD_MARKER}]`))return;const account=findAccount(text);addInvoiceSection(card,getInvoicesForAccount(account,text));
  });
}
function getCustomerFromButton(button:HTMLElement):{name:string;phone:string;account?:CustomerAccount}{
  const card=button.closest('div.bg-white') as HTMLElement|null;if(card){const name=(card.querySelector('h3') as HTMLElement|null)?.textContent?.trim()||'';const phoneEl=card.querySelector('[dir="ltr"]') as HTMLElement|null;const account=findAccount(name);return{name,phone:phoneEl?.textContent?.trim()||account?.phone||'',account};}
  const modal=button.closest('.fixed') as HTMLElement|null;const heading=modal?Array.from(modal.querySelectorAll('h3')).find(h=>(h.textContent||'').includes('كشف حساب:')) as HTMLElement|undefined:undefined;if(!heading)return{name:'',phone:''};const name=(heading.textContent||'').replace(/^.*كشف حساب:\s*/,'').trim();const account=findAccount(name);return{name,phone:account?.phone||'',account};
}
function installCustomerCardClick(){
  document.addEventListener('click',(event)=>{const target=event.target as HTMLElement|null;if(!target||target.closest('button,a,input,select,textarea'))return;const card=target.closest('div.bg-white') as HTMLElement|null;if(!card)return;const heading=card.querySelector('h3') as HTMLElement|null;if(!heading)return;const name=heading.textContent?.trim()||'';if(!name||name.startsWith('كشف حساب:'))return;const operations=Array.from(card.querySelectorAll('button')).find(b=>(b.textContent||'').includes('العمليات')) as HTMLButtonElement|undefined;if(operations){event.preventDefault();operations.click();}});
}
function installWhatsApp(){
  document.addEventListener('click',(event)=>{const button=(event.target as HTMLElement|null)?.closest('button') as HTMLElement|null;if(!button||!(button.textContent||'').includes('واتساب'))return;const body=document.body.textContent||'';if(!body.includes('دليل حسابات العملاء')&&!body.includes('كشف حساب:'))return;const customer=getCustomerFromButton(button);if(!customer.name)return;const normalized=normalizePhone(customer.phone||customer.account?.phone||'');event.preventDefault();event.stopImmediatePropagation();if(!normalized){window.alert('لا يوجد رقم واتساب محفوظ لهذا العميل. أضف رقم الهاتف من بيانات العميل أولاً.');return;}
    const invoices=getInvoicesForAccount(customer.account,customer.name);const balance=Number(customer.account?.balance||0);const balanceText=balance>0?`المبلغ المطلوب: ${amount(balance)} ر.ي`:balance<0?`رصيد دائن للعميل: ${amount(Math.abs(balance))} ر.ي`:'الحساب خالص ومسدد بالكامل';let message=`*كشف حساب العميل: ${customer.name}*\nبقالة العزي للمواد الغذائية\nرقم واتساب العميل: ${normalized}\nالرصيد الحالي: ${balanceText}\nإجمالي العمليات: ${customer.account?.transactions?.length||0}\n--------------------------------\n`;
    if(invoices.length){message+=`الفواتير المرتبطة (${invoices.length}):\n`;invoices.slice(0,30).forEach((inv,i)=>{message+=`${i+1}. #${inv.number} | ${inv.date||'-'} ${inv.time||''} | ${amount(inv.total)} ر.ي | ${status(inv)}\n`;});}else message+='لا توجد فواتير محفوظة لهذا العميل.\n';message+='--------------------------------\nيمكن مراجعة كشف الحساب والفواتير من التطبيق.';window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
  },true);
}
export function startCustomerInvoicesEnhancer(){if(typeof window==='undefined')return;window.setTimeout(enhance,700);window.setInterval(enhance,1500);installCustomerCardClick();installWhatsApp();}

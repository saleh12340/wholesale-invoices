const KEY = 'azizi_ui_preferences';
const MARKER = 'data-azizi-smart-settings';

type Prefs = { compact: boolean; receiptShare: 'small'; autoOpenSaved: boolean };
const defaults: Prefs = { compact: false, receiptShare: 'small', autoOpenSaved: true };

function load(): Prefs {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return defaults; }
}
function save(prefs: Prefs) { localStorage.setItem(KEY, JSON.stringify(prefs)); }
function applyCompact(enabled: boolean) {
  document.documentElement.classList.toggle('azizi-compact', enabled);
}
function button(text: string, active: boolean, onClick: () => void) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'w-full py-2 px-3 rounded-xl border text-[11px] font-bold transition text-right';
  b.textContent = text; b.setAttribute('aria-pressed', String(active));
  b.style.background = active ? '#ecfdf5' : '';
  b.style.borderColor = active ? '#34d399' : '';
  b.style.color = active ? '#047857' : '';
  b.onclick = onClick; return b;
}
function inject() {
  const root = document.getElementById('settings-view-container');
  if (!root || root.querySelector(`[${MARKER}]`)) return;
  const prefs = load(); applyCompact(prefs.compact);
  const card = document.createElement('section');
  card.setAttribute(MARKER, 'true');
  card.className = 'bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-2.5';
  const title = document.createElement('div'); title.className = 'flex items-center justify-between';
  const h = document.createElement('div'); h.className = 'font-black text-sm text-emerald-700 dark:text-emerald-400'; h.textContent = '⚡ إعدادات الكاشير الذكية';
  const badge = document.createElement('span'); badge.className = 'text-[9px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold'; badge.textContent = 'محسّنة للهاتف';
  title.append(h,badge); card.appendChild(title);
  const desc = document.createElement('p'); desc.className = 'text-[10px] text-slate-500 dark:text-slate-400'; desc.textContent = 'خيارات إضافية لا تغيّر بياناتك ولا تحذف أي وظيفة.'; card.appendChild(desc);
  const compact = button('نمط الكاشير السريع — تقليل المساحات لعرض فواتير أكثر', prefs.compact, () => { const p=load(); p.compact=!p.compact; save(p); applyCompact(p.compact); inject(); });
  const receipt = button('مشاركة واتساب — إيصال صغير 58mm بجودة خفيفة وسريعة', true, () => window.alert('مفعّل دائماً: صورة الإيصال صغيرة ومهيأة لواتساب والطابعة الحرارية الصغيرة.'));
  const open = button('فتح الملف بعد الحفظ — مفعّل', prefs.autoOpenSaved, () => { const p=load(); p.autoOpenSaved=!p.autoOpenSaved; save(p); inject(); });
  card.append(compact, receipt, open);
  const hint=document.createElement('div'); hint.className='rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2 text-[10px] text-slate-500 dark:text-slate-400'; hint.textContent='مكان الحفظ: Downloads / بقالة العزي للمواد الغذائية — الطابعة المفضلة: الحرارية الصغيرة.'; card.appendChild(hint);
  root.appendChild(card);
}
export function startSettingsEnhancer(){ if(typeof window==='undefined')return; inject(); window.setInterval(inject,1200); }
export function getAziziUiPreferences(): Prefs { return load(); }

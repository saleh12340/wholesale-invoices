import { InvoiceItem } from '../types';

export function normalizeArabic(str: string): string {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .replace(/[أإآء]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u0652]/g, '') // Remove Tashkeel (harakat)
    .trim();
}

export function getSmartMatches<T extends string>(candidates: T[], query: string): T[] {
  const normQuery = normalizeArabic(query);
  if (!candidates || !Array.isArray(candidates)) return [];

  return candidates
    .map((item) => {
      const normItem = normalizeArabic(item);
      let score = 0;

      if (!normQuery) {
        score = 1;
      } else if (normItem === normQuery) {
        score = 100;
      } else if (normItem.startsWith(normQuery)) {
        score = 80;
      } else if (normItem.split(' ').some((w) => w.startsWith(normQuery))) {
        score = 60;
      } else if (normItem.includes(normQuery)) {
        score = 40;
      }

      return { original: item, score };
    })
    .filter((res) => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((res) => res.original);
}

export function parseArabicNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;

  // Convert Eastern Arabic numerals (٠-٩ and ۰-۹) to standard digits
  const standard = String(val)
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
    .replace(/,/g, '')
    .replace(/،/g, '')
    .trim();

  const num = parseFloat(standard);
  return isNaN(num) || !isFinite(num) ? 0 : num;
}

export function formatCurrency(num: any, currency: string = 'ر.ي'): string {
  const parsed = parseArabicNumber(num);
  const formatted = parsed.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatNumber(num: any): string {
  if (num === undefined || num === null || num === '') return '0';
  const parsed = parseArabicNumber(num);
  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatUnitPrice(num: any): string {
  if (num === undefined || num === null || num === '') return '0';
  const parsed = parseArabicNumber(num);
  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function generateWhatsAppMessage(
  storeName: string,
  invNumber: number,
  customerName: string,
  dateStr: string,
  timeStr: string,
  items: InvoiceItem[],
  total: number,
  currency: string = 'ر.ي'
): string {
  let msg = `🛒 *${storeName}*\n`;
  msg += `🧾 *فاتورة رقم:* #${invNumber}\n`;
  msg += `👤 *العميل:* ${customerName || 'عميل نقدي'}\n`;
  msg += `📅 *التاريخ:* ${dateStr} ${timeStr}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n`;

  items.forEach((item, index) => {
    const qty = item.qty || 1;
    const unitPrice = qty > 0 ? (item.total / qty).toFixed(1) : '0';
    msg += `${index + 1}. *${item.name || 'صنف'}*\n`;
    msg += `   └ الكمية: ${qty} × ${unitPrice} = *${formatNumber(item.total)} ${currency}*\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *المبلغ الإجمالي:* *${formatNumber(total)} ${currency}*\n`;
  msg += `📦 *عدد الأصناف:* ${items.length}\n\n`;
  msg += `✨ شكراً لتعاملكم معنا، أهلاً وسهلاً بكم دائماً!`;

  return msg;
}

export const INITIAL_SUGGESTIONS = [
  "أرز شاهين 10 كيلو",
  "سكر السعيد 5 كيلو",
  "زيت عافية 1.5 لتر",
  "حليب مدهش قوطي",
  "دقيق الكويتي 5 كيلو",
  "معجون طماطم مدهش",
  "شاي ربيع 100 كيس",
  "شاي الكبوس فاخر",
  "شربات فيمتو 710 مل",
  "شوكولاتة جالاكسي",
  "جبن بوك كاسات",
  "تونا القبطان",
  "صابون تايد 1 كيلو",
  "بيض مائدة طبق",
  "مكرونة بيرفكتو 400 جم",
  "بسكويت ماري الأصلي",
  "عصير راني حبيبات",
  "مياه حدة كرتون"
];

export const INITIAL_PRICES: Record<string, number> = {
  "شاي ربيع 100 كيس": 1200,
  "شاي الكبوس فاخر": 1400,
  "أرز شاهين 10 كيلو": 18500,
  "سكر السعيد 5 كيلو": 8200,
  "زيت عافية 1.5 لتر": 4300,
  "حليب مدهش قوطي": 950,
  "دقيق الكويتي 5 كيلو": 3600,
  "معجون طماطم مدهش": 500,
  "تونا القبطان": 1100,
  "جبن بوك كاسات": 2400,
  "صابون تايد 1 كيلو": 2100,
  "بيض مائدة طبق": 3200
};

export const INITIAL_CUSTOMERS = [
  "عميل نقدي",
  "مطعم الفخامة",
  "سوپرماركت السلام",
  "بوفية الهناء",
  "محل الخير",
  "أبو محمد اليماني",
  "سوبر ماركت النور",
  "كافتيريا البركة"
];

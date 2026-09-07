import { Invoice } from '../types';
import { formatNumber } from './arabic';

export interface ThermalSettings {
  storeName: string;
  storeSubtitle: string;
  storePhone?: string;
  currency?: string;
  thermalWidth?: '58mm' | '80mm';
}

/**
 * Generate clean HTML matching the exact design in the user's thermal receipt screenshot
 */
export function generateReceiptHtml(invoice: Invoice, settings: ThermalSettings): string {
  const currency = settings.currency || 'ر.ي';
  const widthMm = settings.thermalWidth === '58mm' ? '54mm' : '76mm';
  const itemsCount = invoice.items.length;

  const itemsHtml = invoice.items
    .map((item, index) => {
      const qty = item.qty || 1;
      const unitPrice = qty > 0 ? (item.total / qty).toFixed(1) : '0';
      return `
        <div class="receipt-item">
          <div class="item-title">${index + 1}. ${item.name || 'صنف'}</div>
          <div class="item-row">
            <span>الكمية: ${qty} × ${unitPrice}</span>
            <span class="bold">${formatNumber(item.total)} ${currency}</span>
          </div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>فاتورة #${invoice.number}</title>
  <style>
    @page {
      size: ${settings.thermalWidth || '80mm'} auto;
      margin: 0mm !important;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${widthMm};
      max-width: ${widthMm};
      margin: 0 auto;
      padding: 4mm 1.5mm;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace, 'Cairo', Tahoma, sans-serif;
      font-size: 13px;
      line-height: 1.35;
      direction: rtl;
      text-align: right;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center {
      text-align: center;
    }
    .bold {
      font-weight: bold;
    }
    .store-name {
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 2px;
    }
    .store-sub {
      font-size: 11px;
      text-align: center;
      margin-bottom: 3px;
    }
    .store-phone {
      font-size: 11px;
      text-align: center;
      margin-bottom: 3px;
    }
    .divider {
      border-top: 1px dashed #000000;
      margin: 4px 0;
      height: 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin: 2px 0;
    }
    .receipt-item {
      padding: 3px 0;
      border-bottom: 1px dotted #888888;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .item-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 1px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: bold;
      margin: 4px 0;
    }
    .count-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin: 2px 0;
    }
    .footer-msg {
      text-align: center;
      font-size: 11px;
      margin-top: 6px;
      line-height: 1.4;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 2mm 1mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="store-name">${settings.storeName}</div>
  <div class="store-sub">${settings.storeSubtitle}</div>
  ${settings.storePhone ? `<div class="store-phone">هاتف: ${settings.storePhone}</div>` : ''}
  
  <div class="divider"></div>
  
  <div class="meta-row">
    <span>فاتورة #: <strong>${invoice.number}</strong></span>
    <span>${invoice.time} ${invoice.date}</span>
  </div>
  <div class="meta-row">
    <span>العميل: <strong>${invoice.customer || 'عميل نقدي'}</strong></span>
    <span>(${invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'})</span>
  </div>

  <div class="divider"></div>

  <div class="items-list">
    ${itemsHtml || '<div class="center">-- لا توجد أصناف --</div>'}
  </div>

  <div class="divider"></div>

  <div class="total-row">
    <span>الإجمالي الكلي:</span>
    <span>${formatNumber(invoice.total)} ${currency}</span>
  </div>

  <div class="count-row">
    <span>عدد الأصناف:</span>
    <span>${itemsCount}</span>
  </div>

  <div class="divider"></div>

  <div class="footer-msg">
    شكراً لزيارتكم ${settings.storeName}<br>
    يرجى الاحتفاظ بالإيصال
  </div>
</body>
</html>
  `;
}

/**
 * Generate ESC/POS Plain Text for Bluetooth Printers / RawBT
 */
export function generateEscPosPlainText(invoice: Invoice, settings: ThermalSettings): string {
  const currency = settings.currency || 'ر.ي';
  const width = settings.thermalWidth === '58mm' ? 32 : 40;
  const line = '-'.repeat(width);

  let text = '';
  text += centerText(settings.storeName, width) + '\n';
  text += centerText(settings.storeSubtitle, width) + '\n';
  if (settings.storePhone) {
    text += centerText(`هاتف: ${settings.storePhone}`, width) + '\n';
  }
  text += line + '\n';
  text += formatTwoColumns(`فاتورة #: ${invoice.number}`, `${invoice.time} ${invoice.date}`, width) + '\n';
  text += `العميل: ${invoice.customer || 'عميل نقدي'} (${invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'})\n`;
  text += line + '\n';

  invoice.items.forEach((item, idx) => {
    const qty = item.qty || 1;
    const unitPrice = qty > 0 ? (item.total / qty).toFixed(1) : '0';
    text += `${idx + 1}. ${item.name}\n`;
    text += formatTwoColumns(`الكمية: ${qty} x ${unitPrice}`, `${formatNumber(item.total)} ${currency}`, width) + '\n';
  });

  text += line + '\n';
  text += formatTwoColumns('الإجمالي الكلي:', `${formatNumber(invoice.total)} ${currency}`, width) + '\n';
  text += formatTwoColumns('عدد الأصناف:', `${invoice.items.length}`, width) + '\n';
  text += line + '\n';
  text += centerText(`شكراً لزيارتكم ${settings.storeName}`, width) + '\n';
  text += centerText('يرجى الاحتفاظ بالإيصال', width) + '\n\n\n';

  return text;
}

function centerText(str: string, width: number): string {
  if (str.length >= width) return str;
  const pad = Math.max(0, Math.floor((width - str.length) / 2));
  return ' '.repeat(pad) + str;
}

function formatTwoColumns(left: string, right: string, width: number): string {
  const totalLen = left.length + right.length;
  if (totalLen >= width) {
    return left + ' ' + right;
  }
  const spaces = ' '.repeat(width - totalLen);
  return left + spaces + right;
}

/**
 * 1. Direct Window Print Spooler
 * Uses window.print() directly with dedicated @media print CSS for thermal paper.
 * No popups or window.open required, preventing mobile browser blockers!
 */
export function printThermalReceiptDirect(
  invoice: Invoice,
  settings: ThermalSettings
): boolean {
  try {
    let container = document.getElementById('thermal-print-direct-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'thermal-print-direct-container';
      document.body.appendChild(container);
    }

    const htmlContent = generateReceiptHtml(invoice, settings);
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyInner = bodyMatch ? bodyMatch[1] : htmlContent;

    container.innerHTML = bodyInner;
    container.style.display = 'block';

    // Synchronously or with microtask trigger window.print
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        if (container) {
          container.innerHTML = '';
          container.style.display = 'none';
        }
      }, 1000);
    }, 50);

    return true;
  } catch (err) {
    console.error('Direct print error:', err);
    window.print();
    return false;
  }
}

/**
 * 2. Standalone window fallback for environments that prefer a separate window
 */
export function printThermalReceiptViaNewWindow(
  invoice: Invoice,
  settings: ThermalSettings
): boolean {
  try {
    const html = generateReceiptHtml(invoice, settings);
    const printWindow = window.open('', '_blank', 'width=450,height=700,menubar=no,toolbar=no,location=no');

    if (!printWindow) {
      return printThermalReceiptDirect(invoice, settings);
    }

    const interactiveHtml = html.replace(
      '<body>',
      `<body>
        <div class="no-print" style="margin-bottom: 12px; padding: 8px; background: #f1f5f9; border-radius: 8px; text-align: center;">
          <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 10px 20px; font-size: 15px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%; margin-bottom: 6px;">
            🖨️ اضغط هنا لطباعة الفاتورة
          </button>
          <button onclick="window.close()" style="background: #e2e8f0; color: #334155; border: none; padding: 6px 14px; font-size: 13px; border-radius: 6px; cursor: pointer; width: 100%;">
            إغلاق النافذة
          </button>
        </div>`
    );

    printWindow.document.open();
    printWindow.document.write(interactiveHtml);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.error('Print window error:', e);
      }
    }, 300);

    return true;
  } catch (err) {
    console.error('Error opening print window:', err);
    return printThermalReceiptDirect(invoice, settings);
  }
}

/**
 * 3. Unified Thermal Print dispatcher
 * Uses direct DOM print to reliably launch the Android/Desktop system print dialog without popup blocks.
 */
export async function printThermalReceipt(
  invoice: Invoice,
  settings: ThermalSettings
): Promise<boolean> {
  return printThermalReceiptDirect(invoice, settings);
}

/**
 * Print directly via Android Bluetooth ESC/POS apps (RawBT, ESC/POS Print Service)
 */
export function printViaRawBT(invoice: Invoice, settings: ThermalSettings): boolean {
  try {
    const plainText = generateEscPosPlainText(invoice, settings);
    // Base64 encode UTF-8 text for RawBT
    const utf8Bytes = new TextEncoder().encode(plainText);
    let binary = '';
    utf8Bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64 = window.btoa(binary);

    // RawBT URI schemes
    const rawbtUri = `rawbt:data:text/plain;base64,${base64}`;
    
    const link = document.createElement('a');
    link.href = rawbtUri;
    link.click();
    return true;
  } catch (err) {
    console.error('Error printing via RawBT:', err);
    return false;
  }
}

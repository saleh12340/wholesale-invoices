import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Invoice, CustomerAccount } from '../types';
import { renderReceiptToCanvas, ReceiptRenderOptions } from './receiptCanvas';
import { formatNumber } from './arabic';
import { saveFileToDownloads, requestStoragePermission } from './devicePermissions';

/**
 * 1. Export Invoice to PDF (Portable Document Format)
 * Renders the pixel-perfect thermal receipt canvas into a PDF file
 * and saves it directly to the device's Downloads directory.
 */
export async function exportInvoiceToPdf(
  invoice: Invoice,
  options: ReceiptRenderOptions,
  action: 'download' | 'share' = 'download'
): Promise<{ success: boolean; message: string }> {
  try {
    const canvas = renderReceiptToCanvas(invoice, options);
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate height in mm keeping 80mm width standard
    const targetWidthMm = 80;
    const targetHeightMm = Math.max(60, Math.round((canvasHeight / canvasWidth) * targetWidthMm));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [targetWidthMm, targetHeightMm],
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', 0, 0, targetWidthMm, targetHeightMm);

    const fileName = `فاتورة_${invoice.number}_${(invoice.customer || 'نقدي').replace(/\s+/g, '_')}.pdf`;
    const pdfBlob = pdf.output('blob');

    if (action === 'share' && typeof navigator !== 'undefined' && navigator.canShare) {
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `فاتورة #${invoice.number} - ${options.storeName || 'بقالة العزي'}`,
          files: [pdfFile],
        });
        return { success: true, message: 'تم فتح نافذة مشاركة ملف PDF بنجاح' };
      }
    }

    // Direct dynamic storage permission & real save to Downloads folder
    const saveRes = await saveFileToDownloads(pdfBlob, fileName, 'application/pdf');
    return saveRes;
  } catch (err) {
    console.error('PDF Export Error:', err);
    return { success: false, message: 'حدث خطأ أثناء تصدير ملف PDF' };
  }
}

/**
 * 2. Export Invoice to Excel (.xlsx / .xls)
 * Creates a structured, bilingual Arabic spreadsheet with all item details
 * and saves it directly to the device's Downloads directory.
 */
export async function exportInvoiceToExcel(
  invoice: Invoice,
  options: { storeName: string; currency?: string },
  action: 'download' | 'share' = 'download'
): Promise<{ success: boolean; message: string }> {
  try {
    const currency = options.currency || 'ر.ي';
    const rows = [
      [options.storeName || 'بقالة العزي', '', '', '', ''],
      [`فاتورة مبيعات رقم #${invoice.number}`, '', '', '', ''],
      ['التاريخ:', invoice.date, 'الوقت:', invoice.time || '', ''],
      ['العميل:', invoice.customer || 'عميل نقدي', 'طريقة الدفع:', invoice.paymentType === 'credit' ? 'آجل (ذمة)' : 'نقدي', ''],
      [''],
      ['م', 'اسم الصنف', 'الكمية', `سعر الوحدة (${currency})`, `الإجمالي (${currency})`],
      ...invoice.items.map((item, idx) => [
        idx + 1,
        item.name,
        item.qty,
        item.unitPrice || (item.qty > 0 ? Math.round((item.total / item.qty) * 100) / 100 : item.total),
        item.total,
      ]),
      [''],
      ['', '', '', 'إجمالي الفاتورة:', invoice.total],
      ['', '', '', 'العملة:', currency],
      [''],
      ['شكراً لتعاملكم معنا', '', '', '', ''],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    // RTL layout hint for Arabic spreadsheet
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'فاتورة المبيعات');

    const fileName = `فاتورة_${invoice.number}_${(invoice.customer || 'نقدي').replace(/\s+/g, '_')}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    if (action === 'share' && typeof navigator !== 'undefined' && navigator.canShare) {
      const excelFile = new File([excelBlob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      if (navigator.canShare({ files: [excelFile] })) {
        await navigator.share({
          title: `فاتورة #${invoice.number} (Excel) - ${options.storeName}`,
          files: [excelFile],
        });
        return { success: true, message: 'تمت مشاركة ملف Excel بنجاح' };
      }
    }

    // Direct dynamic storage permission & real save to Downloads folder
    const saveRes = await saveFileToDownloads(
      excelBlob,
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return saveRes;
  } catch (err) {
    console.error('Excel Export Error:', err);
    return { success: false, message: 'حدث خطأ أثناء تصدير ملف Excel' };
  }
}

/**
 * 3. Export Invoice to JPG Image
 */
export async function exportInvoiceToJpg(
  invoice: Invoice,
  options: ReceiptRenderOptions,
  action: 'download' | 'share' = 'download'
): Promise<{ success: boolean; message: string }> {
  try {
    const canvas = renderReceiptToCanvas(invoice, options);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.95)
    );
    if (!blob) return { success: false, message: 'فشل إنشاء صورة الفاتورة' };

    const fileName = `فاتورة_${invoice.number}_${(invoice.customer || 'نقدي').replace(/\s+/g, '_')}.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    if (action === 'share' && typeof navigator !== 'undefined' && navigator.canShare) {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `فاتورة #${invoice.number} - ${options.storeName}`,
          files: [file],
        });
        return { success: true, message: 'تم فتح نافذة مشاركة صورة الفاتورة' };
      }
    }

    if (action === 'download') {
      const saveRes = await saveFileToDownloads(blob, fileName, 'image/jpeg');
      return saveRes;
    }

    return { success: true, message: 'تم تجهيز صورة الفاتورة بنجاح' };
  } catch (err) {
    console.error('JPG Export Error:', err);
    return { success: false, message: 'تعذر تصدير صورة الفاتورة' };
  }
}

/**
 * 4. Automatic WhatsApp Sharing as an IMAGE (Not text!)
 * Directly generates the invoice image (JPG/PNG) and passes it to WhatsApp via Web Share.
 * If Web Share is not available, downloads image and opens WhatsApp chat with phone number.
 */
export async function shareInvoiceToWhatsAppAsImage(
  invoice: Invoice,
  options: ReceiptRenderOptions
): Promise<{ success: boolean; message: string }> {
  try {
    const canvas = renderReceiptToCanvas(invoice, options);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.95)
    );
    if (!blob) return { success: false, message: 'تعذر تجهيز صورة الفاتورة' };

    const fileName = `فاتورة_${invoice.number}_${(invoice.customer || 'نقدي').replace(/\s+/g, '_')}.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    // 1. Try Native Mobile Web Share API Level 2 (Directly shares image into WhatsApp!)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `فاتورة #${invoice.number} - ${options.storeName || 'بقالة العزي'}`,
          text: `فاتورة #${invoice.number} - المجموع: ${formatNumber(invoice.total)} ${options.currency || 'ر.ي'}`,
          files: [file],
        });
        return { success: true, message: 'تمت مشاركة صورة الفاتورة بنجاح' };
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          return { success: false, message: 'تم إلغاء المشاركة' };
        }
      }
    }

    // 2. Fallback: Download JPG image and open WhatsApp chat
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    // Also copy image to clipboard if supported
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const pngBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (pngBlob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        }
      } catch {}
    }

    // If customer has phone or not, open WhatsApp Web/App
    const phone = invoice.customerPhone ? invoice.customerPhone.replace(/[^0-9]/g, '') : '';
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(`فاتورة #${invoice.number} من ${options.storeName || 'بقالة العزي'}`)}`
      : `https://wa.me/?text=${encodeURIComponent(`فاتورة #${invoice.number} من ${options.storeName || 'بقالة العزي'}`)}`;

    window.open(waUrl, '_blank');
    return { success: true, message: 'تم تجهيز صورة الفاتورة وفتح واتساب لإرسالها كصورة' };
  } catch (err) {
    console.error('WhatsApp Share Image Error:', err);
    return { success: false, message: 'تعذر مشاركة الفاتورة عبر واتساب' };
  }
}

/**
 * 5. Export Customer Account Statement to PDF
 */
export async function exportCustomerStatementToPdf(
  customer: CustomerAccount,
  options: { storeName: string; currency?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const currency = options.currency || 'ر.ي';
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Create a styled canvas for the customer statement to preserve exact Arabic font rendering
    const canvas = document.createElement('canvas');
    const width = 800;
    const padding = 32;
    const headerHeight = 180;
    const rowHeight = 44;
    const totalHeight = headerHeight + Math.max(1, customer.transactions.length) * rowHeight + 160;

    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { success: false, message: 'فشل تهيئة محرك الرسم' };

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Header banner
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, width, 120);

    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.font = "bold 26px 'Cairo', Tahoma, sans-serif";
    ctx.fillText(options.storeName || 'بقالة العزي', width / 2, 45);

    ctx.font = "normal 18px 'Cairo', Tahoma, sans-serif";
    ctx.fillText(`كشف حساب العميل: ${customer.name}`, width / 2, 85);

    // Meta details
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'right';
    ctx.font = "bold 15px 'Cairo', Tahoma, sans-serif";
    const dateStr = new Date().toLocaleDateString('ar-YE');
    ctx.fillText(`تاريخ الكشف: ${dateStr}`, width - padding, 150);
    ctx.textAlign = 'left';
    ctx.fillText(`الرصيد الحالي: ${formatNumber(customer.balance)} ${currency}`, padding, 150);

    // Table headers
    let y = 185;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(padding, y, width - padding * 2, 36);

    ctx.fillStyle = '#0f172a';
    ctx.font = "bold 14px 'Cairo', Tahoma, sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText('التاريخ', width - padding - 10, y + 24);
    ctx.fillText('البيان / نوع العملية', width - padding - 180, y + 24);
    ctx.textAlign = 'left';
    ctx.fillText(`المبلغ (${currency})`, padding + 160, y + 24);
    ctx.fillText(`الرصيد بعدها (${currency})`, padding + 10, y + 24);
    y += 42;

    // Transaction rows
    ctx.font = "normal 13px 'Cairo', Tahoma, sans-serif";
    customer.transactions.forEach((tx, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(padding, y - 6, width - padding * 2, rowHeight);

      ctx.fillStyle = '#334155';
      ctx.textAlign = 'right';
      ctx.fillText(tx.date, width - padding - 10, y + 18);

      const typeTitle =
        tx.type === 'invoice_credit'
          ? `فاتورة مبيعات آجل #${tx.invoiceNumber || ''}`
          : tx.type === 'payment'
          ? 'سند قبض / سداد نقدي'
          : 'رصيد سابق';
      ctx.fillText(typeTitle, width - padding - 180, y + 18);

      ctx.textAlign = 'left';
      ctx.fillStyle = tx.amount > 0 ? '#dc2626' : '#16a34a';
      ctx.fillText(`${tx.amount > 0 ? '+' : ''}${formatNumber(tx.amount)}`, padding + 160, y + 18);

      ctx.fillStyle = '#0f172a';
      ctx.fillText(formatNumber(tx.balanceAfter), padding + 10, y + 18);

      y += rowHeight;
    });

    // Summary footer
    y += 20;
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(padding, y, width - padding * 2, 50);
    ctx.strokeStyle = '#86efac';
    ctx.strokeRect(padding, y, width - padding * 2, 50);

    ctx.fillStyle = '#166534';
    ctx.font = "bold 16px 'Cairo', Tahoma, sans-serif";
    ctx.textAlign = 'center';
    const finalBalanceMsg =
      customer.balance > 0
        ? `المبلغ المستحق على العميل: ${formatNumber(customer.balance)} ${currency}`
        : customer.balance < 0
        ? `رصيد دائن للعميل: ${formatNumber(Math.abs(customer.balance))} ${currency}`
        : 'الحساب خالص ومسدد بالكامل';
    ctx.fillText(finalBalanceMsg, width / 2, y + 32);

    // Convert to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdfWidth = 210;
    const pdfHeight = (totalHeight / width) * pdfWidth;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(297, pdfHeight));

    const fileName = `كشف_حساب_${customer.name.replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
    return { success: true, message: 'تم تحميل كشف الحساب بصيغة PDF بنجاح' };
  } catch (err) {
    console.error('Customer Statement PDF Error:', err);
    return { success: false, message: 'فشل تصدير كشف الحساب إلى PDF' };
  }
}

/**
 * 6. Export Customer Account Statement to Excel (.xlsx)
 */
export async function exportCustomerStatementToExcel(
  customer: CustomerAccount,
  options: { storeName: string; currency?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const currency = options.currency || 'ر.ي';
    const rows = [
      [options.storeName || 'بقالة العزي', '', '', '', ''],
      [`كشف حساب العميل: ${customer.name}`, '', '', '', ''],
      ['الهاتف:', customer.phone || 'غير مسجل', 'تاريخ الإصدار:', new Date().toLocaleDateString('ar-YE'), ''],
      ['الرصيد الحالي:', `${formatNumber(customer.balance)} ${currency}`, '', '', ''],
      [''],
      ['م', 'التاريخ', 'الوقت', 'البيان / نوع العملية', `المبلغ (${currency})`, `الرصيد بعدها (${currency})`],
      ...customer.transactions.map((tx, idx) => [
        idx + 1,
        tx.date,
        tx.time,
        tx.type === 'invoice_credit'
          ? `فاتورة آجل #${tx.invoiceNumber || ''}`
          : tx.type === 'payment'
          ? 'سداد نقدي'
          : 'رصيد سابق',
        tx.amount,
        tx.balanceAfter,
      ]),
      [''],
      ['', '', '', 'الرصيد النهائي المستحق:', customer.balance],
      ['', '', '', 'العملة:', currency],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 16 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف الحساب');

    const fileName = `كشف_حساب_${customer.name.replace(/\s+/g, '_')}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const saveRes = await saveFileToDownloads(
      excelBlob,
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return saveRes;
  } catch (err) {
    console.error('Customer Statement Excel Error:', err);
    return { success: false, message: 'فشل تصدير كشف الحساب إلى Excel' };
  }
}

/**
 * 7. Export Entire Invoices History to Excel (.xlsx)
 */
export async function exportAllHistoryToExcel(
  history: Invoice[],
  options: { storeName: string; currency?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const currency = options.currency || 'ر.ي';
    const totalSales = history.reduce((s, inv) => s + (inv.total || 0), 0);

    const rows = [
      [options.storeName || 'بقالة العزي', '', '', '', '', '', '', ''],
      ['سجل جميع الفواتير والمبيعات', '', '', '', '', '', '', ''],
      ['تاريخ التصدير:', new Date().toLocaleDateString('ar-YE'), 'إجمالي عدد الفواتير:', history.length, '', '', '', ''],
      ['إجمالي المبيعات المؤرشفة:', `${formatNumber(totalSales)} ${currency}`, '', '', '', '', '', ''],
      [''],
      ['رقم الفاتورة', 'التاريخ', 'الوقت', 'آخر تعديل', 'العميل', 'طريقة الدفع', 'عدد الأصناف', `المجموع (${currency})`],
      ...history.map((inv) => [
        `#${inv.number}`,
        inv.date,
        inv.time || '',
        inv.lastModified || 'لم يُعدّل',
        inv.customer || 'عميل نقدي',
        inv.paymentType === 'credit' ? 'آجل (ذمة)' : 'نقدي',
        inv.items.length,
        inv.total,
      ]),
      [''],
      ['', '', '', '', '', 'المجموع العام للمبيعات:', '', totalSales],
      ['', '', '', '', '', 'العملة:', '', currency],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 24 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل المبيعات');

    const fileName = `سجل_فواتير_${options.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const saveRes = await saveFileToDownloads(
      excelBlob,
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return saveRes;
  } catch (err) {
    console.error('History Excel Export Error:', err);
    return { success: false, message: 'فشل تصدير سجل الفواتير إلى Excel' };
  }
}

/**
 * 8. Export Sales Report (Daily, Monthly, Yearly) to Excel (.xlsx)
 * Includes Total Sales, Total Profits, Cash, Credit, Invoices breakdown, and Modification timestamps.
 */
export async function exportReportToExcel(
  reportData: {
    periodType: 'daily' | 'monthly' | 'yearly';
    periodLabel: string;
    totalSales: number;
    totalProfit: number;
    cashSales: number;
    creditSales: number;
    invoicesCount: number;
    invoices: Invoice[];
  },
  options: { storeName: string; currency?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const currency = options.currency || 'ر.ي';
    const periodTitle =
      reportData.periodType === 'daily'
        ? `تقرير المبيعات اليومي (${reportData.periodLabel})`
        : reportData.periodType === 'monthly'
        ? `تقرير المبيعات الشهري (${reportData.periodLabel})`
        : `تقرير المبيعات السنوي (${reportData.periodLabel})`;

    const rows = [
      [options.storeName || 'بقالة العزي', '', '', '', '', '', '', ''],
      [periodTitle, '', '', '', '', '', '', ''],
      ['تاريخ إنشاء التقرير:', new Date().toLocaleDateString('ar-YE') + ' ' + new Date().toLocaleTimeString('ar-YE'), '', '', '', '', '', ''],
      [''],
      ['ملخص الفترة:', '', '', '', '', '', '', ''],
      ['إجمالي المبيعات', `${formatNumber(reportData.totalSales)} ${currency}`, '', 'إجمالي الأرباح', `${formatNumber(reportData.totalProfit)} ${currency}`, '', '', ''],
      ['المبيعات النقدية', `${formatNumber(reportData.cashSales)} ${currency}`, '', 'المبيعات الآجلة (ذمم)', `${formatNumber(reportData.creditSales)} ${currency}`, '', '', ''],
      ['إجمالي عدد الفواتير', `${reportData.invoicesCount} فاتورة`, '', 'هامش الربح التقريبي', reportData.totalSales > 0 ? `${Math.round((reportData.totalProfit / reportData.totalSales) * 100)}%` : '0%', '', '', ''],
      [''],
      ['جدول تفاصيل الفواتير والعمليات:', '', '', '', '', '', '', ''],
      ['رقم الفاتورة', 'التاريخ والوقت', 'تاريخ ووقت آخر تعديل', 'اسم العميل', 'طريقة الدفع', 'عدد الأصناف', `المجموع (${currency})`, `الربح (${currency})`],
      ...reportData.invoices.map((inv) => {
        const invProfit = inv.profit !== undefined ? inv.profit : Math.round(inv.total * 0.18);
        return [
          `#${inv.number}`,
          `${inv.date} ${inv.time || ''}`,
          inv.lastModified || 'لم يُعدّل',
          inv.customer || 'عميل نقدي',
          inv.paymentType === 'credit' ? 'آجل' : 'نقدي',
          inv.items.length,
          inv.total,
          invProfit,
        ];
      }),
      [''],
      ['', '', '', '', 'المجموع الكلي للمبيعات:', '', reportData.totalSales, reportData.totalProfit],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير المبيعات والأرباح');

    const cleanLabel = reportData.periodLabel.replace(/[/\\?%*:|"<>]/g, '_');
    const fileName = `تقرير_${reportData.periodType}_${cleanLabel}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const saveRes = await saveFileToDownloads(
      excelBlob,
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return saveRes;
  } catch (err) {
    console.error('Report Excel Export Error:', err);
    return { success: false, message: 'حدث خطأ أثناء تصدير تقرير المبيعات إلى Excel' };
  }
}

/**
 * 9. Export Sales Report (Daily, Monthly, Yearly) to PDF
 */
export async function exportReportToPdf(
  reportData: {
    periodType: 'daily' | 'monthly' | 'yearly';
    periodLabel: string;
    totalSales: number;
    totalProfit: number;
    cashSales: number;
    creditSales: number;
    invoicesCount: number;
    invoices: Invoice[];
  },
  options: { storeName: string; currency?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const currency = options.currency || 'ر.ي';
    const canvas = document.createElement('canvas');
    const width = 800;
    const padding = 32;

    const rowHeight = 32;
    const headerHeight = 220;
    const itemsHeight = Math.max(100, reportData.invoices.length * rowHeight);
    const totalHeight = headerHeight + itemsHeight + 120;

    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Header Background banner
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, width, 85);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.storeName || 'بقالة العزي', width / 2, 38);

    const typeTitle =
      reportData.periodType === 'daily'
        ? `تقرير المبيعات والأرباح اليومي - ${reportData.periodLabel}`
        : reportData.periodType === 'monthly'
        ? `تقرير المبيعات والأرباح الشهري - ${reportData.periodLabel}`
        : `تقرير المبيعات والأرباح السنوي - ${reportData.periodLabel}`;

    ctx.font = 'bold 15px Cairo, sans-serif';
    ctx.fillText(typeTitle, width / 2, 68);

    // Metrics Cards
    ctx.textAlign = 'right';
    const metricsY = 105;

    // Card 1: Sales
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(padding, metricsY, 165, 80, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Cairo, sans-serif';
    ctx.fillText('إجمالي المبيعات', padding + 155, metricsY + 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.fillText(`${formatNumber(reportData.totalSales)} ${currency}`, padding + 155, metricsY + 58);

    // Card 2: Profit
    ctx.fillStyle = '#f0fdf4';
    ctx.strokeStyle = '#86efac';
    ctx.beginPath();
    ctx.roundRect(padding + 185, metricsY, 165, 80, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#166534';
    ctx.font = '12px Cairo, sans-serif';
    ctx.fillText('إجمالي الأرباح', padding + 185 + 155, metricsY + 26);
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.fillText(`${formatNumber(reportData.totalProfit)} ${currency}`, padding + 185 + 155, metricsY + 58);

    // Card 3: Cash
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(padding + 370, metricsY, 165, 80, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Cairo, sans-serif';
    ctx.fillText('المبيعات النقدية', padding + 370 + 155, metricsY + 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.fillText(`${formatNumber(reportData.cashSales)} ${currency}`, padding + 370 + 155, metricsY + 58);

    // Card 4: Credit
    ctx.fillStyle = '#fef2f2';
    ctx.strokeStyle = '#fca5a5';
    ctx.beginPath();
    ctx.roundRect(padding + 555, metricsY, 180, 80, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#991b1b';
    ctx.font = '12px Cairo, sans-serif';
    ctx.fillText('المبيعات الآجلة (ذمم)', padding + 555 + 170, metricsY + 26);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 16px Cairo, sans-serif';
    ctx.fillText(`${formatNumber(reportData.creditSales)} ${currency}`, padding + 555 + 170, metricsY + 58);

    // Table Header
    const tableTop = metricsY + 105;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(padding, tableTop, width - padding * 2, 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Cairo, sans-serif';
    ctx.fillText('رقم', width - padding - 15, tableTop + 22);
    ctx.fillText('العميل', width - padding - 85, tableTop + 22);
    ctx.fillText('التاريخ والوقت', width - padding - 230, tableTop + 22);
    ctx.fillText('آخر تعديل', width - padding - 360, tableTop + 22);
    ctx.fillText('الدفع', width - padding - 470, tableTop + 22);
    ctx.fillText(`المجموع (${currency})`, width - padding - 570, tableTop + 22);
    ctx.fillText(`الربح (${currency})`, width - padding - 670, tableTop + 22);

    // Rows
    let currentY = tableTop + 34;
    reportData.invoices.forEach((inv, index) => {
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(padding, currentY, width - padding * 2, rowHeight);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(padding, currentY + rowHeight);
      ctx.lineTo(width - padding, currentY + rowHeight);
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.font = '12px Cairo, sans-serif';
      ctx.fillText(`#${inv.number}`, width - padding - 15, currentY + 21);
      ctx.fillText((inv.customer || 'نقدي').slice(0, 16), width - padding - 85, currentY + 21);
      ctx.fillText(`${inv.date}`, width - padding - 230, currentY + 21);
      ctx.fillText(inv.lastModified ? inv.lastModified.slice(0, 14) : '—', width - padding - 360, currentY + 21);
      ctx.fillText(inv.paymentType === 'credit' ? 'آجل' : 'نقدي', width - padding - 470, currentY + 21);
      ctx.fillText(formatNumber(inv.total), width - padding - 570, currentY + 21);

      const invProf = inv.profit !== undefined ? inv.profit : Math.round(inv.total * 0.18);
      ctx.fillStyle = '#16a34a';
      ctx.fillText(formatNumber(invProf), width - padding - 670, currentY + 21);

      currentY += rowHeight;
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [width, totalHeight],
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, totalHeight);

    const cleanLabel = reportData.periodLabel.replace(/[/\\?%*:|"<>]/g, '_');
    const fileName = `تقرير_${reportData.periodType}_${cleanLabel}.pdf`;
    const pdfBlob = pdf.output('blob');

    const saveRes = await saveFileToDownloads(pdfBlob, fileName, 'application/pdf');
    return saveRes;
  } catch (err) {
    console.error('Report PDF Export Error:', err);
    return { success: false, message: 'حدث خطأ أثناء تصدير تقرير المبيعات إلى PDF' };
  }
}



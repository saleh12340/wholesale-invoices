import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Invoice, CustomerAccount } from '../types';
import { renderReceiptToCanvas, ReceiptRenderOptions } from './receiptCanvas';
import { formatNumber } from './arabic';

/**
 * 1. Export Invoice to PDF (Portable Document Format)
 * Renders the pixel-perfect thermal receipt canvas into a PDF file.
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

    if (action === 'share' && typeof navigator !== 'undefined' && navigator.canShare) {
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `فاتورة #${invoice.number} - ${options.storeName || 'بقالة العزي'}`,
          files: [pdfFile],
        });
        return { success: true, message: 'تم فتح نافذة مشاركة ملف PDF بنجاح' };
      }
    }

    // Default download
    pdf.save(fileName);
    return { success: true, message: 'تم حفظ ملف PDF على جهازك بنجاح' };
  } catch (err) {
    console.error('PDF Export Error:', err);
    return { success: false, message: 'حدث خطأ أثناء تصدير ملف PDF' };
  }
}

/**
 * 2. Export Invoice to Excel (.xlsx / .xls)
 * Creates a structured, bilingual Arabic spreadsheet with all item details.
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

    if (action === 'share' && typeof navigator !== 'undefined' && navigator.canShare) {
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
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

    XLSX.writeFile(workbook, fileName);
    return { success: true, message: 'تم تحميل ملف Excel بنجاح' };
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

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    return { success: true, message: 'تم حفظ صورة الفاتورة (JPG) في جهازك' };
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
    XLSX.writeFile(workbook, fileName);
    return { success: true, message: 'تم تحميل كشف الحساب بصيغة Excel بنجاح' };
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
      [options.storeName || 'بقالة العزي', '', '', '', '', '', ''],
      ['سجل جميع الفواتير والمبيعات', '', '', '', '', '', ''],
      ['تاريخ التصدير:', new Date().toLocaleDateString('ar-YE'), 'إجمالي عدد الفواتير:', history.length, '', '', ''],
      ['إجمالي المبيعات المؤرشفة:', `${formatNumber(totalSales)} ${currency}`, '', '', '', '', ''],
      [''],
      ['رقم الفاتورة', 'التاريخ', 'الوقت', 'العميل', 'طريقة الدفع', 'عدد الأصناف', `المجموع (${currency})`],
      ...history.map((inv) => [
        `#${inv.number}`,
        inv.date,
        inv.time || '',
        inv.customer || 'عميل نقدي',
        inv.paymentType === 'credit' ? 'آجل (ذمة)' : 'نقدي',
        inv.items.length,
        inv.total,
      ]),
      [''],
      ['', '', '', '', 'المجموع العام للمبيعات:', '', totalSales],
      ['', '', '', '', 'العملة:', '', currency],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 24 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل المبيعات');

    const fileName = `سجل_فواتير_${options.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    return { success: true, message: 'تم تصدير سجل الفواتير بالكامل إلى Excel بنجاح' };
  } catch (err) {
    console.error('History Excel Export Error:', err);
    return { success: false, message: 'فشل تصدير سجل الفواتير إلى Excel' };
  }
}


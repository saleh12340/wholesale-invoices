import { Invoice } from '../types';
import { formatNumber, formatUnitPrice } from './arabic';

export interface ReceiptRenderOptions {
  storeName: string;
  storeSubtitle: string;
  storePhone?: string;
  currency?: string;
  thermalWidth?: '58mm' | '80mm';
}

/**
 * Render the thermal receipt onto an HTML5 Canvas for high-resolution
 * printing, image download (PNG), and direct WhatsApp/Bluetooth sharing.
 */
export function renderReceiptToCanvas(
  invoice: Invoice,
  options: ReceiptRenderOptions
): HTMLCanvasElement {
  const is58mm = options.thermalWidth === '58mm';
  const width = is58mm ? 384 : 576; // standard POS thermal printer raster widths (203 DPI)
  const padding = is58mm ? 16 : 24;
  const contentWidth = width - padding * 2;
  const currency = options.currency || 'ر.ي';

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Measure required height dynamically
  const baseHeaderHeight = options.storePhone ? 160 : 135;
  const metaHeight = 70;
  const itemsHeight = Math.max(1, invoice.items.length) * 44;
  const totalsHeight = 100;
  const footerHeight = 85;
  const calculatedHeight = baseHeaderHeight + metaHeight + itemsHeight + totalsHeight + footerHeight + padding * 2;

  canvas.width = width;
  canvas.height = calculatedHeight;

  // Background: Pure White for Thermal Paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, calculatedHeight);

  // Styling Defaults
  ctx.fillStyle = '#000000';
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  let y = padding;

  // 1. Store Header
  ctx.font = `bold ${is58mm ? 22 : 28}px 'Cairo', Tahoma, Arial, sans-serif`;
  ctx.fillText(options.storeName || 'بقالة العزي', width / 2, y + (is58mm ? 22 : 28));
  y += is58mm ? 30 : 38;

  ctx.font = `normal ${is58mm ? 13 : 16}px 'Cairo', Tahoma, Arial, sans-serif`;
  ctx.fillStyle = '#333333';
  ctx.fillText(options.storeSubtitle || 'للمواد الغذائية والاستهلاكية', width / 2, y + 16);
  y += 26;

  if (options.storePhone) {
    ctx.font = `normal ${is58mm ? 12 : 15}px 'Cairo', Tahoma, Arial, sans-serif`;
    ctx.fillText(`هاتف: ${options.storePhone}`, width / 2, y + 14);
    y += 24;
  }

  // Dashed line
  drawDashedLine(ctx, padding, y, width - padding, y);
  y += 14;

  // 2. Metadata (Invoice #, Date, Customer)
  ctx.fillStyle = '#000000';
  const fontSizeMeta = is58mm ? 13 : 15;
  ctx.font = `bold ${fontSizeMeta}px 'Cairo', Tahoma, monospace, sans-serif`;

  // Row 1: Invoice # and Date/Time
  ctx.textAlign = 'right';
  ctx.fillText(`فاتورة #: ${invoice.number}`, width - padding, y + fontSizeMeta);
  ctx.textAlign = 'left';
  ctx.font = `normal ${fontSizeMeta - 1}px monospace, 'Cairo', sans-serif`;
  ctx.fillText(`${invoice.time || ''} ${invoice.date || ''}`, padding, y + fontSizeMeta);
  y += fontSizeMeta + 10;

  // Row 2: Customer Name and Payment Type
  ctx.textAlign = 'right';
  ctx.font = `normal ${fontSizeMeta}px 'Cairo', sans-serif`;
  const paymentLabel = invoice.paymentType === 'credit' ? 'آجل (ذمة)' : 'نقدي';
  ctx.fillText(`العميل: ${invoice.customer || 'عميل نقدي'} (${paymentLabel})`, width - padding, y + fontSizeMeta);
  y += fontSizeMeta + 12;

  // Dashed line
  drawDashedLine(ctx, padding, y, width - padding, y);
  y += 14;

  // 3. Items List
  if (invoice.items.length === 0) {
    ctx.textAlign = 'center';
    ctx.font = `normal ${fontSizeMeta}px 'Cairo', sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.fillText('-- لا توجد أصناف --', width / 2, y + 20);
    y += 35;
  } else {
    invoice.items.forEach((item, index) => {
      const qty = item.qty || 1;
      const unitPrice = formatUnitPrice(qty > 0 ? item.total / qty : 0);
      const totalStr = `${formatNumber(item.total)} ${currency}`;

      // Item Title: 1. اسم الصنف
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${is58mm ? 13 : 16}px 'Cairo', Tahoma, sans-serif`;
      const itemTitle = `${index + 1}. ${item.name || 'صنف'}`;
      ctx.fillText(itemTitle, width - padding, y + 16);

      // Sub row: الكمية × السعر (Left: الإجمالي)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#333333';
      ctx.font = `normal ${is58mm ? 12 : 14}px monospace, 'Cairo', sans-serif`;
      ctx.fillText(`الكمية: ${qty} × ${unitPrice}`, width - padding - 12, y + 34);

      // Item Total on the left
      ctx.textAlign = 'left';
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${is58mm ? 13 : 16}px monospace, 'Cairo', sans-serif`;
      ctx.fillText(totalStr, padding, y + 34);

      y += 44;

      // Subtle dotted separator between items
      if (index < invoice.items.length - 1) {
        drawDottedLine(ctx, padding + 10, y - 6, width - padding - 10, y - 6);
      }
    });
  }

  y += 6;
  // Dashed line
  drawDashedLine(ctx, padding, y, width - padding, y);
  y += 16;

  // 4. Totals Block
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${is58mm ? 17 : 21}px 'Cairo', Tahoma, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('الإجمالي الكلي:', width - padding, y + 16);

  ctx.textAlign = 'left';
  ctx.font = `bold ${is58mm ? 18 : 23}px monospace, 'Cairo', sans-serif`;
  ctx.fillText(`${formatNumber(invoice.total)} ${currency}`, padding, y + 16);
  y += 32;

  // Count of items
  ctx.font = `normal ${is58mm ? 13 : 15}px 'Cairo', sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('عدد الأصناف:', width - padding, y + 14);
  ctx.textAlign = 'left';
  ctx.font = `bold ${is58mm ? 13 : 15}px monospace, 'Cairo', sans-serif`;
  ctx.fillText(`${invoice.items.length}`, padding, y + 14);
  y += 24;

  // Dashed line
  drawDashedLine(ctx, padding, y, width - padding, y);
  y += 18;

  // 5. Footer Greetings
  ctx.textAlign = 'center';
  ctx.font = `normal ${is58mm ? 12 : 14}px 'Cairo', Tahoma, sans-serif`;
  ctx.fillStyle = '#444444';
  ctx.fillText(`شكراً لزيارتكم ${options.storeName || 'متجرنا'}`, width / 2, y + 14);
  y += 20;
  ctx.fillText('يرجى الاحتفاظ بالإيصال', width / 2, y + 14);

  return canvas;
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawDottedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  ctx.save();
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Download the receipt directly to device photos / gallery as a crisp PNG.
 * Perfect for opening in Bluetooth printer apps or archiving!
 */
export async function downloadReceiptImage(
  invoice: Invoice,
  options: ReceiptRenderOptions
): Promise<void> {
  const canvas = renderReceiptToCanvas(invoice, options);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `فاتورة_${invoice.number}_${invoice.customer || 'نقدي'}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share the receipt PNG directly via Android Web Share API.
 * The user can pick WhatsApp, Bluetooth Print, Gallery, Email, etc.
 */
export async function shareReceiptImage(
  invoice: Invoice,
  options: ReceiptRenderOptions
): Promise<boolean> {
  try {
    const canvas = renderReceiptToCanvas(invoice, options);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return false;

    const file = new File(
      [blob],
      `فاتورة_${invoice.number}.png`,
      { type: 'image/png' }
    );

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `فاتورة #${invoice.number} - ${options.storeName}`,
        text: `فاتورة #${invoice.number} بمبلغ ${formatNumber(invoice.total)} ${options.currency || 'ر.ي'}`,
        files: [file],
      });
      return true;
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Sharing failed:', err);
    }
  }
  return false;
}

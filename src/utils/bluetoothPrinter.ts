import { Invoice } from '../types';
import { ThermalSettings } from './thermalPrinter';
import { renderReceiptToCanvas } from './receiptCanvas';
import { requestBluetoothPermission } from './devicePermissions';

/**
 * Android APK: uses native Bluetooth Classic (SPP/RFCOMM) and prints the
 * receipt as a raster image. This avoids Web Bluetooth limitations and
 * preserves Arabic exactly because the printer receives pixels, not text.
 * Browser/PWA fallback remains available through Web Bluetooth.
 */
export async function printDirectWebBluetooth(invoice: Invoice, settings: ThermalSettings): Promise<{ success: boolean; message: string }> {
  try {
    const android = typeof window !== 'undefined' ? (window as any).Android : null;
    if (android?.printBluetoothImage) {
      const canvas = renderReceiptToCanvas(invoice, settings);
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1] || '';
      const width = settings.thermalWidth === '58mm' ? 384 : 576;
      const started = Boolean(android.printBluetoothImage(base64, width));
      if (!started) return { success: false, message: 'تعذر بدء خدمة الطباعة الحرارية.' };
      return { success: true, message: 'تم فتح اختيار الطابعة الحرارية. اختر الطابعة المقترنة وسيتم إرسال الفاتورة.' };
    }

    if (!('bluetooth' in navigator)) {
      return { success: false, message: 'الطباعة المباشرة غير متاحة في هذا المتصفح. استخدم تطبيق Android أو RawBT.' };
    }

    const permission = await requestBluetoothPermission();
    if (!permission.granted) return { success: false, message: permission.message };
    const device = permission.device || await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455','0000ff00-0000-1000-8000-00805f9b34fb'],
    });
    if (!device?.gatt) return { success: false, message: 'تعذر الاتصال بالطابعة الحرارية.' };
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let writeChar: any = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
      if (writeChar) break;
    }
    if (!writeChar) return { success: false, message: 'تم الاتصال بالطابعة ولكن لم يتم العثور على منفذ كتابة.' };
    const canvas = renderReceiptToCanvas(invoice, settings);
    const bytes = new Uint8Array(await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer());
    for (let i = 0; i < bytes.length; i += 128) {
      const chunk = bytes.slice(i, i + 128);
      if (writeChar.writeValueWithoutResponse) await writeChar.writeValueWithoutResponse(chunk); else await writeChar.writeValue(chunk);
    }
    setTimeout(() => { try { device.gatt.disconnect(); } catch {} }, 1500);
    return { success: true, message: `تم إرسال الفاتورة إلى ${device.name || 'الطابعة الحرارية'} بنجاح.` };
  } catch (err: any) {
    if (err?.name === 'NotFoundError' || err?.message?.includes('cancel')) return { success: false, message: 'تم إلغاء اختيار الطابعة.' };
    console.error('Bluetooth Print Error:', err);
    return { success: false, message: `خطأ في اتصال الطابعة: ${err?.message || 'فشل الإرسال'}` };
  }
}

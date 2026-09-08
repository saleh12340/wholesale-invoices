import { Invoice } from '../types';
import { generateEscPosPlainText, ThermalSettings } from './thermalPrinter';
import { requestBluetoothPermission } from './devicePermissions';

export async function printDirectWebBluetooth(invoice: Invoice, settings: ThermalSettings): Promise<{ success: boolean; message: string }> {
  if (!('bluetooth' in navigator)) return { success: false, message: 'متصفحك لا يدعم Web Bluetooth. استخدم RawBT أو طباعة النظام.' };

  const permission = await requestBluetoothPermission();
  if (!permission.granted) return { success: false, message: permission.message };

  try {
    const device = permission.device || await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ae30-0000-1000-8000-00805f9b34fb',
        '0000af30-0000-1000-8000-00805f9b34fb',
        '0000fee7-0000-1000-8000-00805f9b34fb',
        '0000ffff-0000-1000-8000-00805f9b34fb',
      ],
    });
    if (!device?.gatt) return { success: false, message: 'تعذر الاتصال بالطابعة الحرارية.' };
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let writeChar: any = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse) || null;
      if (writeChar) break;
    }
    if (!writeChar) return { success: false, message: 'تم الاتصال بالطابعة ولكن لم يتم العثور على منفذ كتابة.' };

    const plainText = generateEscPosPlainText(invoice, settings);
    const textBytes = new TextEncoder().encode(plainText);
    const initCmd = new Uint8Array([0x1b, 0x40]);
    const cutCmd = new Uint8Array([0x1d, 0x56, 0x41, 0x00]);
    const payload = new Uint8Array(initCmd.length + textBytes.length + cutCmd.length);
    payload.set(initCmd, 0); payload.set(textBytes, initCmd.length); payload.set(cutCmd, initCmd.length + textBytes.length);

    for (let i = 0; i < payload.length; i += 128) {
      const chunk = payload.slice(i, i + 128);
      if (writeChar.writeValueWithoutResponse) await writeChar.writeValueWithoutResponse(chunk);
      else await writeChar.writeValue(chunk);
    }
    setTimeout(() => { try { device.gatt.disconnect(); } catch {} }, 1500);
    return { success: true, message: `تم إرسال الفاتورة إلى ${device.name || 'الطابعة الحرارية'} بنجاح.` };
  } catch (err: any) {
    if (err?.name === 'NotFoundError' || err?.message?.includes('cancel')) return { success: false, message: 'تم إلغاء اختيار طابعة البلوتوث.' };
    console.error('Bluetooth Print Error:', err);
    return { success: false, message: `خطأ في اتصال طابعة البلوتوث: ${err?.message || 'فشل الإرسال'}` };
  }
}

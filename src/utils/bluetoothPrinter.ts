import { Invoice } from '../types';
import { generateEscPosPlainText, ThermalSettings } from './thermalPrinter';

/**
 * Web Bluetooth Direct Thermal Printing for Android Chrome & Desktop
 * Connects directly to Bluetooth POS printers without needing third-party apps.
 */
export async function printDirectWebBluetooth(
  invoice: Invoice,
  settings: ThermalSettings
): Promise<{ success: boolean; message: string }> {
  // Check if Web Bluetooth is supported in the current browser
  if (!('bluetooth' in navigator)) {
    return {
      success: false,
      message: 'متصفحك لا يدعم تقنية Web Bluetooth المباشرة. يرجى استخدام تطبيق RawBT أو حفظ الإيصال كصورة.',
    };
  }

  try {
    // Request nearby Bluetooth devices
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ae30-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device.gatt) {
      return { success: false, message: 'تعذر الاتصال بالبلوتوث: جهاز الطباعة غير متاح.' };
    }

    const server = await device.gatt.connect();

    // Search for a writable characteristic in all primary services
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const s of services) {
      const chars = await s.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          writeChar = c;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      return {
        success: false,
        message: 'تم الاتصال بالطابعة ولكن لم يتم العثور على منفذ كتابة البيانات.',
      };
    }

    // Generate ESC/POS text data
    const plainText = generateEscPosPlainText(invoice, settings);
    // Initialize ESC/POS (ESC @) + Text
    const encoder = new TextEncoder();
    const initCmd = new Uint8Array([0x1b, 0x40]); // ESC @ (initialize printer)
    const cutCmd = new Uint8Array([0x1d, 0x56, 0x41, 0x00]); // GS V A 0 (cut paper if supported)
    const textBytes = encoder.encode(plainText);

    // Combine
    const fullPayload = new Uint8Array(initCmd.length + textBytes.length + cutCmd.length);
    fullPayload.set(initCmd, 0);
    fullPayload.set(textBytes, initCmd.length);
    fullPayload.set(cutCmd, initCmd.length + textBytes.length);

    // Write in chunks (max 512 bytes per packet for BLE)
    const CHUNK_SIZE = 128;
    for (let i = 0; i < fullPayload.length; i += CHUNK_SIZE) {
      const chunk = fullPayload.slice(i, i + CHUNK_SIZE);
      if (writeChar.writeValueWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
    }

    // Disconnect after transmission
    setTimeout(() => {
      try {
        device.gatt.disconnect();
      } catch (e) {
        // ignore
      }
    }, 1500);

    return {
      success: true,
      message: `تم إرسال الفاتورة بنجاح إلى طابعة البلوتوث (${device.name || 'طابعة حرارية'})!`,
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
      return { success: false, message: 'تم إلغاء اختيار طابعة البلوتوث.' };
    }
    console.error('Bluetooth Print Error:', err);
    return {
      success: false,
      message: `خطأ في اتصال طابعة البلوتوث: ${err.message || 'فشل الإرسال'}`,
    };
  }
}

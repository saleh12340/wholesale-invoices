/** Native Android / WebView device permission and file storage helpers. */

export interface PermissionResult { granted: boolean; message: string; }
export interface FileSaveResult { success: boolean; message: string; path?: string; fileName: string; }

const getNativeBridge = () => (typeof window !== 'undefined' ? (window as any).Android : null);

export async function requestStoragePermission(): Promise<PermissionResult> {
  try {
    const android = getNativeBridge();
    if (android?.requestStoragePermission) {
      const granted = Boolean(android.requestStoragePermission());
      return granted
        ? { granted: true, message: 'تم السماح للتطبيق بحفظ الملفات في Downloads.' }
        : { granted: false, message: 'يرجى السماح للتطبيق بإذن التخزين ثم الضغط على التصدير مرة أخرى.' };
    }

    const cordova = (window as any).cordova;
    if (cordova?.plugins?.diagnostic?.requestExternalStorageAuthorization) {
      return await new Promise((resolve) => {
        cordova.plugins.diagnostic.requestExternalStorageAuthorization(
          (status: string) => resolve({ granted: status === 'GRANTED' || status === 'authorized', message: status === 'GRANTED' || status === 'authorized' ? 'تم منح إذن التخزين.' : 'تم رفض إذن التخزين.' }),
          () => resolve({ granted: false, message: 'تعذر طلب إذن التخزين.' })
        );
      });
    }

    // Modern browsers do not expose WRITE_EXTERNAL_STORAGE; the download attribute is the real browser download path.
    return { granted: true, message: 'سيتم استخدام مدير التنزيلات في المتصفح.' };
  } catch (err) {
    console.warn('Storage permission request failed:', err);
    return { granted: false, message: 'تعذر التحقق من إذن التخزين.' };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function saveFileToDownloads(blob: Blob, fileName: string, mimeType = 'application/octet-stream'): Promise<FileSaveResult> {
  const perm = await requestStoragePermission();
  if (!perm.granted) return { success: false, message: perm.message, fileName };

  const android = getNativeBridge();
  if (android?.saveFileToDownloads) {
    try {
      const base64 = await blobToBase64(blob);
      const saved = Boolean(android.saveFileToDownloads(base64, fileName, mimeType));
      if (saved) return { success: true, message: `تم حفظ الملف فعلياً في Downloads: ${fileName}`, path: `Downloads/${fileName}`, fileName };
      return { success: false, message: 'تعذر حفظ الملف في Downloads. تحقق من الإذن ثم أعد المحاولة.', fileName };
    } catch (err) {
      console.error('Native Downloads save failed:', err);
      return { success: false, message: 'فشل الحفظ في مجلد التنزيلات.', fileName };
    }
  }

  // Browser/PWA fallback: this triggers the platform's real download manager. No fake success message is returned.
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return { success: true, message: `تم إرسال الملف إلى مدير التنزيلات: ${fileName}`, path: `Downloads/${fileName}`, fileName };
  } catch (err) {
    console.error('Browser download failed:', err);
    return { success: false, message: `فشل تنزيل الملف: ${fileName}`, fileName };
  }
}

export async function requestBluetoothPermission(): Promise<{ granted: boolean; device?: any; message: string }> {
  try {
    const android = getNativeBridge();
    if (android?.requestBluetoothPermission) {
      const granted = Boolean(android.requestBluetoothPermission());
      if (!granted) return { granted: false, message: 'تم طلب إذن البلوتوث والأجهزة المجاورة. وافق على الإذن ثم اضغط زر الطابعة مرة أخرى.' };
    }

    if (!('bluetooth' in navigator)) {
      return { granted: false, message: 'Web Bluetooth غير متاح في هذا WebView. استخدم RawBT أو خدمة الطباعة في النظام.' };
    }

    const device = await (navigator as any).bluetooth.requestDevice({
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
    return device ? { granted: true, device, message: `تم اختيار الطابعة: ${device.name || 'طابعة حرارية'}` } : { granted: false, message: 'لم يتم اختيار طابعة.' };
  } catch (err: any) {
    if (err?.name === 'NotFoundError') return { granted: false, message: 'تم إلغاء اختيار الطابعة.' };
    if (err?.name === 'SecurityError') return { granted: false, message: 'يجب السماح بالبلوتوث والأجهزة المجاورة من إعدادات الهاتف.' };
    return { granted: false, message: `تعذر الاتصال بالبلوتوث: ${err?.message || 'خطأ غير معروف'}` };
  }
}

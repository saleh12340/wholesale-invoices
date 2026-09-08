export interface PermissionResult { granted: boolean; message: string; }
export interface FileSaveResult { success: boolean; message: string; path?: string; fileName: string; }

const getNativeBridge = () => (typeof window !== 'undefined' ? (window as any).Android : null);
const APP_DOWNLOAD_FOLDER = 'Downloads/بقالة العزي للمواد الغذائية';

export async function requestStoragePermission(): Promise<PermissionResult> {
  try {
    const android = getNativeBridge();
    if (android?.requestStoragePermission) {
      const granted = Boolean(android.requestStoragePermission());
      return granted ? { granted: true, message: 'تم السماح بحفظ الملفات.' } : { granted: false, message: 'يرجى السماح بإذن التخزين ثم إعادة المحاولة.' };
    }
    return { granted: true, message: 'سيتم استخدام مدير التنزيلات في المتصفح.' };
  } catch { return { granted: false, message: 'تعذر التحقق من إذن التخزين.' }; }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function offerOpenFile(fileName: string, mimeType: string, browserUrl?: string) {
  if (!window.confirm(`تم حفظ الملف بنجاح:\n${fileName}\n\nهل تريد فتح الملف الآن؟`)) return;
  try {
    const android = getNativeBridge();
    if (android?.openLastSavedFile) {
      if (!Boolean(android.openLastSavedFile(fileName, mimeType))) window.alert('تم الحفظ، لكن لا يوجد تطبيق مناسب لفتح الملف. يمكنك فتحه من مجلد التنزيلات.');
      return;
    }
    if (browserUrl) {
      const w = window.open(browserUrl, '_blank');
      if (!w) window.location.href = browserUrl;
    }
  } catch (e) { console.warn('Open saved file failed:', e); }
}

export async function saveFileToDownloads(blob: Blob, fileName: string, mimeType = 'application/octet-stream'): Promise<FileSaveResult> {
  const perm = await requestStoragePermission();
  if (!perm.granted) return { success: false, message: perm.message, fileName };
  const android = getNativeBridge();
  if (android?.saveFileToDownloads) {
    try {
      const saved = Boolean(android.saveFileToDownloads(await blobToBase64(blob), fileName, mimeType));
      if (!saved) return { success: false, message: 'تعذر حفظ الملف في مجلد التطبيق داخل Downloads.', fileName };
      await offerOpenFile(fileName, mimeType);
      return { success: true, message: `تم حفظ الملف في ${APP_DOWNLOAD_FOLDER}/${fileName}`, path: `${APP_DOWNLOAD_FOLDER}/${fileName}`, fileName };
    } catch (e) { console.error(e); return { success: false, message: 'فشل الحفظ في مجلد التنزيلات.', fileName }; }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    await offerOpenFile(fileName, mimeType, url);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { success: true, message: `تم إرسال الملف إلى مدير التنزيلات: ${fileName}`, path: `Downloads/${fileName}`, fileName };
  } catch (e) { console.error(e); return { success: false, message: `فشل تنزيل الملف: ${fileName}`, fileName }; }
}

export async function requestBluetoothPermission(): Promise<{ granted: boolean; device?: any; message: string }> {
  try {
    const android = getNativeBridge();
    if (android?.requestBluetoothPermission) {
      const granted = Boolean(android.requestBluetoothPermission());
      if (!granted) return { granted: false, message: 'جارٍ طلب إذن البلوتوث والأجهزة المجاورة.' };
    }
    if (!('bluetooth' in navigator)) return { granted: false, message: 'Web Bluetooth غير متاح في هذا المتصفح.' };
    const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455','0000ff00-0000-1000-8000-00805f9b34fb'] });
    return device ? { granted: true, device, message: `تم اختيار الطابعة: ${device.name || 'طابعة حرارية'}` } : { granted: false, message: 'لم يتم اختيار طابعة.' };
  } catch (err: any) {
    if (err?.name === 'NotFoundError') return { granted: false, message: 'تم إلغاء اختيار الطابعة.' };
    if (err?.name === 'SecurityError') return { granted: false, message: 'يجب السماح بالبلوتوث والأجهزة المجاورة من إعدادات الهاتف.' };
    return { granted: false, message: `تعذر الاتصال بالبلوتوث: ${err?.message || 'خطأ غير معروف'}` };
  }
}

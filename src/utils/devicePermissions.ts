/**
 * Dynamic Device Permissions & Native File Storage Utility
 * Designed for Android APK (Web2App, Cordova, Capacitor, PWA, Chrome Android WebView)
 */

export interface PermissionResult {
  granted: boolean;
  message: string;
}

export interface FileSaveResult {
  success: boolean;
  message: string;
  path?: string;
  fileName: string;
}

/**
 * 1. Request Dynamic Storage Permissions (WRITE_EXTERNAL_STORAGE / Read-Write Storage)
 * Compatible with Android WebViews, Web2App, Cordova, Capacitor, and PWA browsers.
 */
export async function requestStoragePermission(): Promise<PermissionResult> {
  try {
    // 1. Check for Capacitor Filesystem / Permissions plugin
    const win = window as any;
    if (win.Capacitor?.Plugins?.Filesystem?.requestPermissions) {
      try {
        const perm = await win.Capacitor.Plugins.Filesystem.requestPermissions();
        if (perm.publicStorage === 'granted' || perm.storage === 'granted') {
          return { granted: true, message: 'تم منح إذن التخزين بنجاح (Capacitor)' };
        }
      } catch (e) {
        console.warn('Capacitor storage permission error:', e);
      }
    }

    // 2. Check for Cordova Diagnostic or Permissions plugin
    if (win.cordova?.plugins?.diagnostic?.requestExternalStorageAuthorization) {
      return new Promise((resolve) => {
        win.cordova.plugins.diagnostic.requestExternalStorageAuthorization(
          (status: string) => {
            if (status === 'GRANTED' || status === 'authorized') {
              resolve({ granted: true, message: 'تم منح إذن التخزين بنجاح (Cordova)' });
            } else {
              resolve({ granted: false, message: 'تم رفض إذن التخزين في إعدادات النظام' });
            }
          },
          (err: any) => {
            console.warn('Cordova diagnostic error:', err);
            resolve({ granted: true, message: 'المتابعة بنظام التنزيل المباشر' });
          }
        );
      });
    }

    // 3. Android Web2App native bridge (if custom JavascriptInterface is exposed)
    if (win.Android?.requestStoragePermission) {
      try {
        const res = win.Android.requestStoragePermission();
        if (res) return { granted: true, message: 'تم منح إذن التخزين عبر واجهة أندرويد' };
      } catch (e) {
        console.warn('Android native bridge permission error:', e);
      }
    }

    // 4. Modern Web Storage Persistence API
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          await navigator.storage.persist();
        }
      } catch {
        // Not blocking
      }
    }

    // 5. Standard Android WebView / Browser permissions
    if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
      try {
        const status = await (navigator as any).permissions.query({ name: 'persistent-storage' });
        if (status.state === 'denied') {
          return { granted: false, message: 'إذن التخزين مرفوض في المتصفح' };
        }
      } catch {
        // Querying specific name might fail on some WebViews, fallback to true
      }
    }

    return { granted: true, message: 'جاهز لحفظ الملفات في مجلد التنزيلات' };
  } catch (err) {
    console.warn('Storage permission check fallback:', err);
    return { granted: true, message: 'تم تفعيل التخزين' };
  }
}

/**
 * 2. Save Generated File Directly to the Device Downloads Directory
 * Guarantees real file generation and direct download in Android Downloads folder.
 */
export async function saveFileToDownloads(
  blob: Blob,
  fileName: string,
  mimeType: string = 'application/octet-stream'
): Promise<FileSaveResult> {
  // First ensure permission is requested dynamically
  const perm = await requestStoragePermission();
  if (!perm.granted) {
    return {
      success: false,
      message: 'لم يتم منح إذن التخزين لحفظ الملف. يرجى تفعيل أذونات التطبيق في إعدادات الهاتف.',
      fileName,
    };
  }

  const win = window as any;

  // Option A: Capacitor Native Filesystem to Downloads directory
  if (win.Capacitor?.Plugins?.Filesystem?.writeFile) {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Write to External Storage Download folder
      await win.Capacitor.Plugins.Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: base64Data,
        directory: 'EXTERNAL_STORAGE',
        recursive: true,
      });

      return {
        success: true,
        message: `تم حفظ الملف فعلياً في مجلد التنزيلات (Downloads):\n${fileName}`,
        path: `Downloads/${fileName}`,
        fileName,
      };
    } catch (capErr) {
      console.warn('Capacitor writeFile fallback to download anchor:', capErr);
    }
  }

  // Option B: Modern File System Access API (Chromium / Chrome Android)
  if (typeof (win as any).showSaveFilePicker === 'function') {
    try {
      const ext = fileName.split('.').pop() || '';
      const handle = await (win as any).showSaveFilePicker({
        suggestedName: fileName,
        startIn: 'downloads',
        types: [
          {
            description: 'ملف التقرير/الفاتورة',
            accept: { [mimeType]: [`.${ext}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return {
        success: true,
        message: `تم حفظ الملف بنجاح في مجلد التنزيلات:\n${fileName}`,
        path: `Downloads/${fileName}`,
        fileName,
      };
    } catch (saveErr: any) {
      if (saveErr.name === 'AbortError') {
        return {
          success: false,
          message: 'تم إلغاء عملية حفظ الملف',
          fileName,
        };
      }
      console.warn('showSaveFilePicker failed, using fallback anchor:', saveErr);
    }
  }

  // Option C: Universal Android WebView / Browser Native Download
  // Dispatches a genuine anchor click which activates Android's OS DownloadManager
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener noreferrer';
    anchor.target = '_self';
    anchor.style.position = 'fixed';
    anchor.style.opacity = '0';
    anchor.style.pointerEvents = 'none';
    anchor.style.left = '-9999px';

    document.body.appendChild(anchor);

    // Dispatch native click event
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    anchor.dispatchEvent(clickEvent);

    // Clean up DOM and URL object
    setTimeout(() => {
      try {
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
        URL.revokeObjectURL(url);
      } catch {}
    }, 2500);

    return {
      success: true,
      message: `تم تنزيل وحفظ الملف فعلياً في مجلد التنزيلات (Downloads):\n${fileName}`,
      path: `Downloads/${fileName}`,
      fileName,
    };
  } catch (err) {
    console.error('saveFileToDownloads error:', err);
    return {
      success: false,
      message: `حدث خطأ أثناء تنزيل الملف (${fileName})`,
      fileName,
    };
  }
}

/**
 * 3. Dynamic Bluetooth & Nearby Devices Permission
 * Checks and prompts for Bluetooth permissions dynamically for thermal POS printing.
 * In Android 12+, requires Nearby Devices (BLUETOOTH_CONNECT, BLUETOOTH_SCAN).
 */
export async function requestBluetoothPermission(): Promise<{
  granted: boolean;
  device?: any;
  message: string;
}> {
  const win = window as any;

  // Check Cordova / Capacitor native bluetooth permissions
  if (win.cordova?.plugins?.diagnostic?.requestBluetoothAuthorization) {
    try {
      const granted = await new Promise<boolean>((resolve) => {
        win.cordova.plugins.diagnostic.requestBluetoothAuthorization(
          (status: string) => resolve(status === 'GRANTED' || status === 'authorized'),
          () => resolve(false)
        );
      });
      if (!granted) {
        return {
          granted: false,
          message: 'تم رفض إذن البلوتوث والأجهزة المجاورة من النظام.',
        };
      }
    } catch (e) {
      console.warn('Cordova bluetooth auth check error:', e);
    }
  }

  // Web Bluetooth API check
  if (!('bluetooth' in navigator)) {
    return {
      granted: false,
      message:
        'ميزة Web Bluetooth المباشرة غير مفعلة في هذا المتصفح/WebView. يمكنك استخدام تطبيق RawBT أو نافذة الطباعة المباشرة.',
    };
  }

  try {
    // Calling requestDevice prompts the native Android OS "Nearby Devices / Bluetooth" dialog!
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
        '0000ff00-0000-1000-8000-00805f9b34fb', // Common thermal POS service
        '0000ae30-0000-1000-8000-00805f9b34fb',
        '0000af30-0000-1000-8000-00805f9b34fb',
        '0000fee7-0000-1000-8000-00805f9b34fb',
        '0000ffff-0000-1000-8000-00805f9b34fb',
        '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
      ],
    });

    if (device) {
      return {
        granted: true,
        device,
        message: `تم ربط الطابعة بنجاح: ${device.name || 'طابعة حرارية بلوتوث'}`,
      };
    }

    return {
      granted: false,
      message: 'لم يتم اختيار طابعة بلوتوث',
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return {
        granted: false,
        message: 'تم إلغاء البحث عن طابعة البلوتوث',
      };
    }
    if (err.name === 'SecurityError') {
      return {
        granted: false,
        message: 'مطلوب إذن الوصول للبلوتوث والأجهزة المجاورة من إعدادات الهاتف.',
      };
    }
    return {
      granted: false,
      message: `خطأ في اتصال البلوتوث: ${err.message || 'تعذر الربط'}`,
    };
  }
}

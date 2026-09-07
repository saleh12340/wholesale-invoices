import React, { useState } from 'react';
import {
  Download,
  Upload,
  Volume2,
  VolumeX,
  Store,
  Printer,
  Smartphone,
  CheckCircle,
  HelpCircle,
  Database
} from 'lucide-react';
import { AppSettings } from '../types';
import { sound } from '../utils/audio';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDark?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  isDark = false,
}) => {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeSubtitle, setStoreSubtitle] = useState(settings.storeSubtitle);
  const [storePhone, setStorePhone] = useState(settings.storePhone);
  const [currency, setCurrency] = useState(settings.currency);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [thermalWidth, setThermalWidth] = useState<'58mm' | '80mm'>(settings.thermalWidth);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      storeName: storeName.trim() || 'بقالة العزي',
      storeSubtitle: storeSubtitle.trim() || 'للمواد الغذائية والاستهلاكية',
      storePhone: storePhone.trim(),
      currency: currency.trim() || 'ر.ي',
      soundEnabled,
      thermalWidth,
    });
    sound.playSuccess();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div id="settings-view-container" className="space-y-3.5 select-none text-xs">
      {/* Store Identity Settings */}
      <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
          <Store className="w-4 h-4" />
          <h2>بيانات المتجر وترويسة الفاتورة</h2>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              اسم البقالة / المتجر:
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              النشاط الفرعي / الوصف:
            </label>
            <input
              type="text"
              value={storeSubtitle}
              onChange={(e) => setStoreSubtitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                رقم الهاتف / التواصل:
              </label>
              <input
                type="text"
                placeholder="77xxxxxxx"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                رمز العملة:
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold outline-none"
              >
                <option value="ر.ي">ريال يمني (ر.ي)</option>
                <option value="ر.س">ريال سعودي (ر.س)</option>
                <option value="$">دولار ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Thermal Width */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" />
                <span>عرض الطابعة:</span>
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-700 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setThermalWidth('58mm')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    thermalWidth === '58mm'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setThermalWidth('80mm')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    thermalWidth === '80mm'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  80mm
                </button>
              </div>
            </div>

            {/* Sound Toggle */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>أصوات الكاشير:</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) sound.playBeep();
                }}
                className={`w-full py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                <span>{soundEnabled ? 'مفعّلة (نغمة الكاشير)' : 'صامت'}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1 shadow-xs"
          >
            {savedSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>تم حفظ التعديلات بنجاح!</span>
              </>
            ) : (
              <span>حفظ الإعدادات</span>
            )}
          </button>
        </form>
      </div>

      {/* Backup & Data Management */}
      <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
          <Database className="w-4 h-4" />
          <h2>النسخ الاحتياطي واستعادة البيانات</h2>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          يتم حفظ كافة الفواتير وقائمة العملاء والأسعار تلقائياً على جهازك دون الحاجة لإنترنت. يمكنك
          تصدير نسخة احتياطية كاملة ونقلها إلى أي هاتف أندرويد آخر.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            onClick={() => {
              sound.playTap();
              onExportBackup();
            }}
            className="py-2 px-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl font-bold transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة JSON</span>
          </button>

          {/* Import JSON */}
          <label className="py-2 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>استيراد نسخة</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Android PWA Install Instructions Card */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
          <Smartphone className="w-4 h-4 text-emerald-500" />
          <span>تثبيت التطبيق على هاتف أندرويد:</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          يمكنك تشغيل هذا التطبيق كتطبيق أندرويد حقيقي؛ افتح القائمة في متصفح كروم على هاتفك واختر
          <strong> "إضافة إلى الشاشة الرئيسية" (Install App)</strong> وسيعمل بكامل وظائفه حتى في وضع عدم الاتصال بالإنترنت.
        </p>
      </div>
    </div>
  );
};

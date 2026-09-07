import React from 'react';
import { ShoppingCart, Users, History, Boxes, Settings } from 'lucide-react';
import { ActiveTab } from '../types';
import { sound } from '../utils/audio';

interface AndroidNavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  historyCount: number;
  itemsCount: number;
  debtorsCount?: number;
  isDark?: boolean;
  onDeviceBack?: () => void;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  activeTab,
  onTabChange,
  historyCount,
  itemsCount,
  debtorsCount = 0,
  isDark = false,
  onDeviceBack,
}) => {
  const tabs = [
    {
      id: 'pos' as ActiveTab,
      label: 'الفاتورة',
      icon: ShoppingCart,
      badge: itemsCount > 0 ? itemsCount : undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'customers' as ActiveTab,
      label: 'العملاء',
      icon: Users,
      badge: debtorsCount > 0 ? debtorsCount : undefined,
      badgeColor: 'bg-red-500',
    },
    {
      id: 'history' as ActiveTab,
      label: 'السجل',
      icon: History,
      badge: historyCount > 0 ? historyCount : undefined,
      badgeColor: 'bg-blue-500',
    },
    {
      id: 'catalog' as ActiveTab,
      label: 'المنتجات',
      icon: Boxes,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'الضبط',
      icon: Settings,
    },
  ];

  return (
    <div className="no-print">
      {/* Material 3 Bottom Navigation Bar */}
      <nav
        id="android-bottom-navigation"
        className={`border-t px-2 py-1.5 flex items-center justify-around select-none transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-600 shadow-lg'
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => {
                sound.playTap();
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 relative ${
                isActive
                  ? isDark
                    ? 'text-emerald-400 font-bold'
                    : 'text-emerald-700 font-bold'
                  : 'hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {/* Material Pill indicator behind active icon */}
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-950/80 text-emerald-400 shadow-sm'
                      : 'bg-emerald-100 text-emerald-800 shadow-sm'
                    : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {tab.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-1 text-[10px] text-white font-bold px-1.5 py-0.2 rounded-full font-mono shadow-sm ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Android System 3-Key Navigation Bar (Back / Home / Recents) */}
      <div
        className={`py-1 px-8 flex items-center justify-between select-none transition-colors border-t ${
          isDark
            ? 'bg-slate-950 border-slate-900 text-slate-400'
            : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}
      >
        {/* Recents / Tasks Button (Left in RTL) */}
        <button
          id="btn-android-sys-recents"
          type="button"
          onClick={() => {
            sound.playTap();
            onTabChange(activeTab === 'history' ? 'pos' : 'history');
          }}
          title="المهام السابقة / السجل"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90 transition"
        >
          <div className="w-3.5 h-3.5 border-2 border-current rounded-xs"></div>
        </button>

        {/* Home Button (Center) */}
        <button
          id="btn-android-sys-home"
          type="button"
          onClick={() => {
            sound.playTap();
            onTabChange('pos');
          }}
          title="الشاشة الرئيسية (الفاتورة)"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90 transition"
        >
          <div className="w-4 h-4 rounded-full border-2 border-current"></div>
        </button>

        {/* Back / Exit Button (Right in RTL - simulates phone hardware back button) */}
        <button
          id="btn-android-sys-back"
          type="button"
          onClick={() => {
            if (onDeviceBack) onDeviceBack();
          }}
          title="زر الرجوع في الهاتف (اضغط مرتين للخروج من التطبيق)"
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-90 transition flex items-center justify-center"
        >
          {/* RTL Android back triangle pointing right or left */}
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M7 12l10-8v16z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

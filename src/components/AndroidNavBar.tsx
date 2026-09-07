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
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  activeTab,
  onTabChange,
  historyCount,
  itemsCount,
  debtorsCount = 0,
  isDark = false,
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

      {/* Android System Home / Back / Recents Indicator Pill */}
      <div
        className={`py-1.5 flex items-center justify-center select-none ${
          isDark ? 'bg-slate-950' : 'bg-slate-100'
        }`}
      >
        <div className="w-28 h-1 bg-slate-400/40 rounded-full"></div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal, Bell } from 'lucide-react';

interface AndroidStatusBarProps {
  isDark?: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ isDark = false }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="android-status-bar"
      className={`w-full px-5 py-2 flex items-center justify-between text-xs select-none transition-colors ${
        isDark ? 'bg-slate-900 text-slate-200' : 'bg-emerald-800 text-emerald-100'
      }`}
      dir="ltr"
    >
      {/* Clock on Left */}
      <div className="flex items-center gap-1.5 font-bold tracking-tight text-[13px] font-mono">
        <span>{time || '10:30'}</span>
        <span className="text-[10px] bg-emerald-700/60 text-emerald-200 px-1 py-0.2 rounded font-sans hidden sm:inline">
          صنعاء
        </span>
      </div>

      {/* Android Center Camera Punch Hole */}
      <div className="w-3.5 h-3.5 bg-black/90 rounded-full border border-slate-700/30 flex items-center justify-center shadow-inner">
        <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
      </div>

      {/* Right Icons: Network, Wifi, Battery */}
      <div className="flex items-center gap-2">
        <Bell className="w-3.5 h-3.5 text-emerald-300/80" />
        <span className="text-[10px] font-bold tracking-tighter font-mono">5G</span>
        <Signal className="w-3.5 h-3.5 text-emerald-200" />
        <Wifi className="w-3.5 h-3.5 text-emerald-200" />
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono font-bold">98%</span>
          <BatteryMedium className="w-4 h-4 text-emerald-300" />
        </div>
      </div>
    </div>
  );
};

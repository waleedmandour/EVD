'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Gauge, Battery, Zap, Search, Activity, Map, Wrench, Bluetooth, Settings } from 'lucide-react';

const TABS = [
  { id: 'dashboard', icon: Gauge },
  { id: 'battery', icon: Battery },
  { id: 'charging', icon: Zap },
  { id: 'diagnostics', icon: Search },
  { id: 'liveData', icon: Activity },
  { id: 'sessions', icon: Map },
  { id: 'maintenance', icon: Wrench },
  { id: 'device', icon: Bluetooth },
  { id: 'settings', icon: Settings },
] as const;

export default function BottomNav() {
  const { t } = useTranslation('common');
  const { activeTab, setActiveTab, settings } = useAppStore();
  const isRTL = settings.language === 'ar';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D1117]/95 backdrop-blur-md border-t border-white/5 pb-safe"
      role="tablist"
      aria-label={t('accessibility.tabBar')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-1">
        {TABS.map(({ id, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-label={t(`tabs.${id}`)}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center py-2 px-1 min-w-[44px] min-h-[48px] transition-colors duration-200 ${
                isActive
                  ? 'text-evdx-primary'
                  : 'text-evdx-text-secondary hover:text-evdx-text'
              }`}
            >
              <Icon
                size={20}
                className={isActive ? 'drop-shadow-[0_0_6px_rgba(0,210,255,0.5)]' : ''}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className={`text-[9px] mt-0.5 leading-tight ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {t(`tabs.${id}`)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

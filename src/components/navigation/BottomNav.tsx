'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Gauge, Battery, Zap, Search, Activity, Map, Wrench, Bluetooth, Settings, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRIMARY_TABS = [
  { id: 'dashboard', icon: Gauge, labelKey: 'dashboard' },
  { id: 'battery', icon: Battery, labelKey: 'battery' },
  { id: 'charging', icon: Zap, labelKey: 'charging' },
  { id: 'diagnostics', icon: Search, labelKey: 'diagnostics' },
  { id: 'liveData', icon: Activity, labelKey: 'liveData' },
];

const SECONDARY_TABS = [
  { id: 'sessions', icon: Map, labelKey: 'sessions' },
  { id: 'maintenance', icon: Wrench, labelKey: 'maintenance' },
  { id: 'device', icon: Bluetooth, labelKey: 'device' },
  { id: 'settings', icon: Settings, labelKey: 'settings' },
];

export default function BottomNav() {
  const { t } = useTranslation('common');
  const { activeTab, setActiveTab, settings } = useAppStore();
  const isRTL = settings.language === 'ar';
  const [showMore, setShowMore] = useState(false);

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    setShowMore(false);
  };

  const allTabs = [...PRIMARY_TABS, ...SECONDARY_TABS];
  const isActiveSecondary = SECONDARY_TABS.some(st => st.id === activeTab);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D1117]/95 backdrop-blur-md border-t border-white/5 pb-safe"
      role="tablist"
      aria-label={t('accessibility.tabBar')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-1">
        {PRIMARY_TABS.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-label={t(`tabs.${labelKey}`)}
              onClick={() => handleTabPress(id)}
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
                {t(`tabs.${labelKey}`)}
              </span>
            </button>
          );
        })}

        {/* More button that shows secondary tabs */}
        <div className="relative">
          <button
            role="tab"
            aria-selected={isActiveSecondary || showMore}
            aria-label="More tabs"
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center py-2 px-1 min-w-[44px] min-h-[48px] transition-colors duration-200 ${
              isActiveSecondary || showMore
                ? 'text-evdx-primary'
                : 'text-evdx-text-secondary hover:text-evdx-text'
            }`}
          >
            <MoreHorizontal
              size={20}
              strokeWidth={isActiveSecondary || showMore ? 2.5 : 1.5}
            />
            <span className={`text-[9px] mt-0.5 leading-tight ${isActiveSecondary ? 'font-semibold' : 'font-normal'}`}>
              {t('tabs.more') || 'More'}
            </span>
          </button>

          {/* Secondary tabs popup */}
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 mb-2 bg-[#1A2332] border border-white/10 rounded-xl shadow-xl overflow-hidden"
                style={{ minWidth: '160px' }}
              >
                {SECONDARY_TABS.map(({ id, icon: Icon, labelKey }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => handleTabPress(id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        isActive
                          ? 'bg-evdx-primary/10 text-evdx-primary'
                          : 'text-evdx-text-secondary hover:bg-white/5 hover:text-evdx-text'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{t(`tabs.${labelKey}`)}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Click-away overlay when more menu is open */}
      {showMore && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setShowMore(false)}
        />
      )}
    </nav>
  );
}

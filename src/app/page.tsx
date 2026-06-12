'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { simulator } from '@/lib/simulator';
import I18nProvider from '@/components/I18nProvider';
import BottomNav from '@/components/navigation/BottomNav';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import ConnectOverlay from '@/components/connection/ConnectOverlay';
import DashboardView from '@/components/tabs/DashboardView';
import BatteryView from '@/components/tabs/BatteryView';
import ChargingView from '@/components/tabs/ChargingView';
import DiagnosticsView from '@/components/tabs/DiagnosticsView';
import LiveDataView from '@/components/tabs/LiveDataView';
import SessionsView from '@/components/tabs/SessionsView';
import MaintenanceView from '@/components/tabs/MaintenanceView';
import DeviceView from '@/components/tabs/DeviceView';
import SettingsView from '@/components/tabs/SettingsView';
import VoiceAssistant from '@/components/voice/VoiceAssistant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Zap, Bluetooth } from 'lucide-react';

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: DashboardView,
  battery: BatteryView,
  charging: ChargingView,
  diagnostics: DiagnosticsView,
  liveData: LiveDataView,
  sessions: SessionsView,
  maintenance: MaintenanceView,
  device: DeviceView,
  settings: SettingsView,
};

export default function HomePage() {
  const {
    settings,
    showOnboarding,
    connectionStatus,
    connectionMode,
    activeTab,
    connectDemo,
    disconnect,
  } = useAppStore();
  const [showConnect, setShowConnect] = useState(false);
  const isRTL = settings.language === 'ar';

  // Sync RTL with language setting
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
  }, [settings.language, isRTL]);

  // Start/stop simulator based on demo mode
  useEffect(() => {
    if (connectionMode === 'demo' && connectionStatus === 'connected') {
      simulator.start();
    }
    return () => {
      simulator.stop();
    };
  }, [connectionMode, connectionStatus]);

  const isConnected = connectionStatus === 'connected';

  const handleConnectionToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      setShowConnect(true);
    }
  };

  // Show onboarding on first launch
  if (showOnboarding && !settings.onboardingComplete) {
    return <OnboardingFlow />;
  }

  const ActiveTabComponent = TAB_COMPONENTS[activeTab] || DashboardView;

  return (
    <I18nProvider>
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Top Status Bar */}
      <header className="sticky top-0 z-30 bg-[#0D1117]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-evdx-primary to-evdx-purple flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-evdx-text">EVDx</span>
            {connectionMode === 'demo' && (
              <Badge className="text-[10px] bg-evdx-primary/10 text-evdx-primary border-evdx-primary/20 px-1.5 py-0">
                DEMO
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  {connectionMode === 'bluetooth' ? (
                    <Bluetooth size={14} className="text-evdx-green" />
                  ) : connectionMode === 'wifi' ? (
                    <Wifi size={14} className="text-evdx-green" />
                  ) : (
                    <Zap size={14} className="text-evdx-primary" />
                  )}
                  <div className="w-2 h-2 rounded-full bg-evdx-green animate-pulse" />
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-evdx-text-secondary" />
                  <div className="w-2 h-2 rounded-full bg-evdx-critical" />
                </>
              )}
            </div>

            <Button
              onClick={handleConnectionToggle}
              size="sm"
              variant={isConnected ? 'outline' : 'default'}
              className={`h-7 text-xs rounded-lg ${
                isConnected
                  ? 'border-evdx-critical/30 text-evdx-critical hover:bg-evdx-critical/10'
                  : 'bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117]'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-3 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ActiveTabComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Voice Assistant */}
      <VoiceAssistant />

      {/* Connection Overlay */}
      <AnimatePresence>
        {showConnect && (
          <ConnectOverlay onClose={() => setShowConnect(false)} />
        )}
      </AnimatePresence>
    </div>
    </I18nProvider>
  );
}

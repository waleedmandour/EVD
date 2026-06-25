'use client';

import React, { useEffect, useState, Component, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { simulator } from '@/lib/simulator';
// BYD head-unit integration — landscape layout + native vehicle data.
// On non-BYD devices both are no-ops (BYDService.initialize() returns false,
// BYDLayoutManager only activates when window is wider than 800px AND in
// landscape orientation, which never happens on a phone).
import { bydLayoutManager } from '../../byd/BYDLayoutManager';
import { bydService } from '../../byd/BYDService';
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
import AIBatteryPredictor from '@/components/ai/AIBatteryPredictor';
import AISmartDTC from '@/components/ai/AISmartDTC';
import AIEcoCoach from '@/components/ai/AIEcoCoach';
import VoiceAssistant from '@/components/voice/VoiceAssistant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Zap, Bluetooth, ChevronDown, Activity, Map, Wrench, Brain, ScanSearch, Leaf } from 'lucide-react';

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
  aiBattery: AIBatteryPredictor,
  aiDtc: AISmartDTC,
  aiCoach: AIEcoCoach,
};

// ─── Error Boundary ──────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D1117] p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-evdx-critical/10 flex items-center justify-center mb-4">
            <Zap size={32} className="text-evdx-critical" />
          </div>
          <h2 className="text-lg font-bold text-evdx-text mb-2">Something went wrong</h2>
          <p className="text-sm text-evdx-text-secondary mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <Button
            onClick={() => {
                this.setState({ hasError: false, error: null });
                // Fix #8: window.location.reload() can fail on BYD DiLink's
                // Chromium 83 WebView, leaving a black screen. Use href
                // assignment instead which is more reliable.
                try {
                  window.location.href = window.location.pathname;
                } catch (e) {
                  console.error('Reload failed:', e);
                  // Last resort: force a full page load
                  window.location.reload();
                }
              }}
            className="bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117]"
          >
            Reload App
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Quick Menu for secondary tabs ───────────────────────────────────────────

function QuickMenu({ onSelect, onClose }: { onSelect: (tab: string) => void; onClose: () => void }) {
  const { t } = useTranslation('common');
  const { settings } = useAppStore();
  const isRTL = settings.language === 'ar';

  const secondaryTabs = [
    { id: 'liveData', icon: Activity, label: t('tabs.liveData') || 'Live Data' },
    { id: 'sessions', icon: Map, label: t('tabs.sessions') || 'Sessions' },
    { id: 'maintenance', icon: Wrench, label: t('tabs.maintenance') || 'Maintenance' },
    { id: 'device', icon: Bluetooth, label: t('tabs.device') || 'Device' },
    { id: 'aiBattery', icon: Brain, label: isRTL ? 'ذكاء البطارية' : 'AI Battery' },
    { id: 'aiDtc', icon: ScanSearch, label: isRTL ? 'ذكاء الأعطال' : 'AI DTC' },
    { id: 'aiCoach', icon: Leaf, label: isRTL ? 'مدرب القيادة' : 'AI Coach' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-16 left-2 right-2 z-50 bg-[#1A2332] border border-white/10 rounded-2xl shadow-2xl p-2 max-w-md mx-auto"
      >
        <div className="grid grid-cols-4 gap-1">
          {secondaryTabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => { onSelect(id); onClose(); }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Icon size={20} className="text-evdx-primary" />
              <span className="text-[10px] text-evdx-text-secondary leading-tight text-center">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const { t } = useTranslation('common');
  const {
    settings,
    showOnboarding,
    connectionStatus,
    connectionMode,
    activeTab,
    connectDemo,
    connectBYD,
    disconnect,
    setActiveTab,
  } = useAppStore();
  const [showConnect, setShowConnect] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const isRTL = settings.language === 'ar';

  // Sync RTL with language setting
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
  }, [settings.language, isRTL]);

  // ─── BYD head-unit integration ──────────────────────────────────────────────
  // 1) Start the landscape layout manager — it adds the `byd-landscape` class
  //    to <html> when window.innerWidth > 800 && landscape. On a phone this
  //    never fires; on a BYD head unit (1920x720) it activates the two-column
  //    layout defined in globals.css.
  // 2) Try to initialize the native BYD data bridge. On non-BYD devices
  //    BYDAutoPlugin.detect() returns isBYD=false and initialize() resolves
  //    false, so the app silently continues in BLE OBD-II mode. On a BYD head
  //    unit, bydService takes over live-data polling (see BYDService.ts).
  // 3) If initialization succeeds, AUTO-CONNECT in BYD mode and start polling
  //    so the dashboard, battery charts, and device info populate immediately
  //    without the user tapping "Connect". This is the right UX on a car head
  //    unit where there's no OBD-II adapter to pick from.
  // All calls are wrapped in try/catch — a failure here MUST NOT break the
  // phone experience.
  useEffect(() => {
    try { bydLayoutManager.startMonitoring(); } catch (e) { console.warn('[BYD] layout manager failed', e); }
    bydService.initialize().then(async (ok) => {
      console.log('[BYD] native mode ' + (ok ? 'ACTIVE' : 'inactive (non-BYD or unavailable)'));
      if (ok) {
        // Auto-connect in BYD mode — no user interaction required on a car head unit.
        try {
          await connectBYD();
          console.log('[BYD] auto-connected, polling started');
        } catch (e) {
          console.warn('[BYD] auto-connect failed', e);
        }
      }
    }).catch((e) => console.warn('[BYD] initialize failed', e));
    return () => {
      try { bydService.stopPolling(); } catch (e) { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/stop simulator based on demo mode
  useEffect(() => {
    if (connectionMode === 'demo' && connectionStatus === 'connected') {
      simulator.start();
    }
    return () => {
      simulator.stop();
    };
  }, [connectionMode, connectionStatus]);

  // Request permissions on first real connection attempt
  useEffect(() => {
    if (connectionMode && connectionMode !== 'demo' && connectionStatus === 'connecting') {
      import('@/lib/permissions').then(({ requestAllPermissions }) => {
        requestAllPermissions().catch(console.error);
      });
    }
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
    return (
      <ErrorBoundary>
        <OnboardingFlow />
      </ErrorBoundary>
    );
  }

  const ActiveTabComponent = TAB_COMPONENTS[activeTab] || DashboardView;

  return (
    <ErrorBoundary>
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
                  {isConnected ? (isRTL ? 'قطع' : 'Disconnect') : (isRTL ? 'اتصل' : 'Connect')}
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 max-w-md mx-auto w-full px-4 py-3 pb-20 overflow-y-auto">
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

          {/* More tabs quick menu trigger */}
          <button
            onClick={() => setShowQuickMenu(true)}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-8 h-4 bg-[#1A2332] border border-white/10 border-b-0 rounded-t-lg flex items-center justify-center hover:bg-[#1A2332]/80"
            aria-label="More tabs"
          >
            <ChevronDown size={12} className="text-evdx-text-secondary" />
          </button>

          {/* Quick Menu */}
          <AnimatePresence>
            {showQuickMenu && (
              <QuickMenu
                onSelect={setActiveTab}
                onClose={() => setShowQuickMenu(false)}
              />
            )}
          </AnimatePresence>

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
    </ErrorBoundary>
  );
}

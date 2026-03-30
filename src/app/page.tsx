'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ConnectOverlay } from '@/components/byd/ConnectOverlay';
import { Header, BottomNav } from '@/components/byd/Navigation';
import { DashboardView } from '@/components/byd/DashboardView';
import { BatteryView } from '@/components/byd/BatteryView';
import { ChargingView } from '@/components/byd/ChargingView';
import { DeviceView } from '@/components/byd/DeviceView';
import { DiagnosticsView } from '@/components/byd/DiagnosticsView';
import { SessionView } from '@/components/byd/SessionView';
import { ControlsView } from '@/components/byd/ControlsView';
import { stopSimulator } from '@/lib/simulator';
import { useVoice } from '@/hooks/use-voice';
import { Zap } from 'lucide-react';

function getInitialTab(): string {
  if (typeof window === 'undefined') return 'dashboard';
  return window.location.hash.replace('#', '') || 'dashboard';
}

function AppContent() {
  const { connectionStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const { enabled: voiceEnabled, speaking: voiceSpeaking, toggle: toggleVoice, narratePage } = useVoice();

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveTab(customEvent.detail);
    };
    window.addEventListener('tabchange', handler);
    return () => {
      window.removeEventListener('tabchange', handler);
      stopSimulator();
    };
  }, []);

  // Voice narration on tab change
  useEffect(() => {
    if (activeTab && connectionStatus === 'connected') {
      narratePage(activeTab);
    }
  }, [activeTab, connectionStatus, narratePage]);

  if (connectionStatus !== 'connected') {
    return <ConnectOverlay />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'battery': return <BatteryView />;
      case 'charging': return <ChargingView />;
      case 'device': return <DeviceView />;
      case 'diagnostics': return <DiagnosticsView />;
      case 'session': return <SessionView />;
      case 'controls': return <ControlsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col">
      <Header
        voiceEnabled={voiceEnabled}
        voiceSpeaking={voiceSpeaking}
        onToggleVoice={toggleVoice}
      />
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4 pb-24">
        {renderTab()}
      </main>
      <BottomNav />

      {/* Footer */}
      <footer className="pb-20">
        <div className="max-w-md mx-auto px-4 py-4 border-t border-slate-800/40">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-emerald-500/60" />
            </div>
            <span>Dr. Waleed Mandour</span>
            <span className="text-slate-700">·</span>
            <span className="text-emerald-600/60">created via GLM-5-Turbo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return <AppContentWithSW />;
}

function AppContentWithSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return <AppContent />;
}

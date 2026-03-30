'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ConnectOverlay } from '@/components/byd/ConnectOverlay';
import { Header, BottomNav } from '@/components/byd/Navigation';
import { DashboardView } from '@/components/byd/DashboardView';
import { BatteryView } from '@/components/byd/BatteryView';
import { DiagnosticsView } from '@/components/byd/DiagnosticsView';
import { TripView } from '@/components/byd/TripView';
import { ControlsView } from '@/components/byd/ControlsView';
import { stopSimulator } from '@/lib/simulator';

function getInitialTab(): string {
  if (typeof window === 'undefined') return 'dashboard';
  return window.location.hash.replace('#', '') || 'dashboard';
}

function AppContent() {
  const { connectionStatus, connectionMode } = useAppStore();
  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveTab(customEvent.detail);
    };
    window.addEventListener('tabchange', handler);

    // Cleanup simulator on unmount
    return () => {
      window.removeEventListener('tabchange', handler);
      stopSimulator();
    };
  }, []);

  if (connectionStatus !== 'connected') {
    return <ConnectOverlay />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'battery': return <BatteryView />;
      case 'diagnostics': return <DiagnosticsView />;
      case 'trip': return <TripView />;
      case 'controls': return <ControlsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <Header />
      <main className="max-w-md mx-auto px-4 pt-4 pb-24">
        {renderTab()}
      </main>
      <BottomNav />
    </div>
  );
}

export default function Home() {
  return <AppContentWithSW />;
}

function AppContentWithSW() {
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed - app still works without it
      });
    }
  }, []);

  return <AppContent />;
}

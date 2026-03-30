'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { DisconnectButton } from './ConnectOverlay';
import { Battery, Volume2, VolumeX, Plug } from 'lucide-react';

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0f1a]/95 backdrop-blur-lg border-t border-slate-800/50">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-0.5">
        <NavItem tab="dashboard" icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>} label="Dash" />
        <NavItem tab="battery" icon={<Battery className="w-5 h-5" />} label="Battery" />
        <NavItem tab="charging" icon={<Plug className="w-5 h-5" />} label="Charge" />
        <NavItem tab="device" icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6"/><path d="M9 15h6"/></svg>} label="Device" />
        <NavItem tab="diagnostics" icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2L3 7v13h6v-7h6v7h6V7l-6-5H9z"/></svg>} label="Diag" />
        <NavItem tab="session" icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="5" rx="1"/><path d="M12 13V9"/><rect x="6" y="9" width="12" height="4" rx="1"/><circle cx="12" cy="20" r="2"/><path d="M8 20h8"/></svg>} label="Session" />
        <NavItem tab="controls" icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>} label="Ctrl" />
      </div>
    </nav>
  );
}

function NavItem({ tab, icon, label }: { tab: string; icon: React.ReactNode; label: string }) {
  const [active, setActive] = React.useState('dashboard');

  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      setActive(hash);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const isActive = active === tab;

  return (
    <button
      onClick={() => {
        window.location.hash = tab;
        setActive(tab);
        window.dispatchEvent(new CustomEvent('tabchange', { detail: tab }));
      }}
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-[46px] ${
        isActive
          ? 'text-emerald-400'
          : 'text-slate-500 hover:text-slate-400'
      }`}
    >
      <div className="relative">
        {icon}
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
        )}
      </div>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

interface HeaderProps {
  voiceEnabled: boolean;
  voiceSpeaking: boolean;
  onToggleVoice: () => void;
}

export function Header({ voiceEnabled, voiceSpeaking, onToggleVoice }: HeaderProps) {
  const { connectionMode, connectionStatus, vehicleData } = useAppStore();

  return (
    <header className="sticky top-0 z-30 bg-[#0a0f1a]/90 backdrop-blur-lg border-b border-slate-800/50">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">EV Connect</h1>
            <span className="text-[10px] text-slate-500">BYD Yuan Plus</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Voice toggle */}
          <button
            onClick={onToggleVoice}
            className={`relative p-1.5 rounded-lg transition-all duration-200 ${
              voiceEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800/60 text-slate-500 border border-slate-700/30 hover:text-slate-400'
            }`}
            title={voiceEnabled ? 'Voice guide ON — tap to mute' : 'Voice guide OFF — tap to enable'}
          >
            {voiceEnabled && voiceSpeaking ? (
              <Volume2 className="w-4 h-4 animate-pulse" />
            ) : voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            {voiceEnabled && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-600'
            }`} />
            <span className="text-[10px] text-slate-500">
              {connectionMode === 'demo' ? 'DEMO' : connectionStatus === 'connected' ? (connectionMode === 'wifi' ? 'WiFi' : 'BT') : 'OFF'}
            </span>
          </div>

          {/* Battery icon */}
          <div className="flex items-center gap-1">
            <Battery className={`w-4 h-4 ${
              vehicleData.batterySOC < 20 ? 'text-red-400' : vehicleData.batterySOC < 40 ? 'text-amber-400' : 'text-emerald-400'
            }`} />
            <span className="text-xs text-white font-medium tabular-nums">
              {vehicleData.batterySOC.toFixed(0)}%
            </span>
          </div>

          <DisconnectButton />
        </div>
      </div>
    </header>
  );
}

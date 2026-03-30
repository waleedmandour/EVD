'use client';

import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { startSimulator, stopSimulator } from '@/lib/simulator';
import { Zap, Bluetooth, Play, Smartphone } from 'lucide-react';

export function ConnectOverlay() {
  const { connectionStatus, connectionMode, startDemoMode, stopDemoMode, connectDevice } = useAppStore();

  const handleDemoMode = useCallback(() => {
    startDemoMode();
    setTimeout(() => startSimulator(), 100);
  }, [startDemoMode]);

  const handleDisconnect = useCallback(() => {
    stopSimulator();
    stopDemoMode();
  }, [stopDemoMode]);

  if (connectionStatus === 'connected') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060a14]">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-md text-center">
        {/* Logo / Car icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
          <Zap className="w-10 h-10 text-emerald-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">EV Connect</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Real-time OBD-II diagnostics and monitoring for your BYD EV.
            Connect via Bluetooth or try the interactive demo.
          </p>
        </div>

        {/* Connection options */}
        <div className="w-full flex flex-col gap-3">
          {/* Bluetooth connect */}
          <button
            onClick={connectDevice}
            disabled={connectionStatus === 'connecting'}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Bluetooth className="w-5 h-5" />
            <span>{connectionStatus === 'connecting' ? 'Scanning for BLE adapters...' : 'Connect BLE OBD-II Adapter'}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-700/50" />
            <span className="text-xs text-slate-600 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>

          {/* Demo mode */}
          <button
            onClick={handleDemoMode}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-all duration-200"
          >
            <Play className="w-5 h-5 text-emerald-400" />
            <span>Launch Interactive Demo</span>
            <span className="ml-auto text-xs text-slate-500">No hardware needed</span>
          </button>
        </div>

        {/* Requirements */}
        <div className="flex flex-col gap-2 text-xs text-slate-500 w-full">
          <p className="text-slate-400 font-medium mb-1">Requirements:</p>
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
            <span>Chrome on Android with BLE-compatible ELM327 adapter (e.g., V1.5 BLE)</span>
          </div>
          <div className="flex items-start gap-2">
            <Bluetooth className="w-4 h-4 mt-0.5 shrink-0 text-slate-600" />
            <span>Adapter must support Nordic UART Service (NUS) GATT profile</span>
          </div>
        </div>

        {/* Error message */}
        {connectionStatus === 'error' && (
          <div className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            Bluetooth not available. Make sure you&apos;re using Chrome on Android, or try the Demo mode.
          </div>
        )}
      </div>
    </div>
  );
}

export function DisconnectButton() {
  const { connectionMode, stopDemoMode } = useAppStore();

  const handleDisconnect = useCallback(() => {
    stopSimulator();
    stopDemoMode();
  }, [stopDemoMode]);

  if (connectionMode !== 'demo') return null;

  return (
    <button
      onClick={handleDisconnect}
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
    >
      Exit Demo
    </button>
  );
}

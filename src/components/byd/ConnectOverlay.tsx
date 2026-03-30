'use client';

import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { startSimulator, stopSimulator } from '@/lib/simulator';
import { Zap, Bluetooth, Wifi, Play, Smartphone, Signal, Info, Cpu } from 'lucide-react';

export function ConnectOverlay() {
  const { connectionStatus, connectionMode, startDemoMode, stopDemoMode, connectBluetooth, connectWifi } = useAppStore();
  const [wifiIp, setWifiIp] = useState('192.168.0.10');
  const [wifiPort, setWifiPort] = useState('35000');
  const [showWifi, setShowWifi] = useState(false);

  const handleDemoMode = useCallback(() => {
    startDemoMode();
    setTimeout(() => startSimulator(), 100);
  }, [startDemoMode]);

  const handleDisconnect = useCallback(() => {
    stopSimulator();
    stopDemoMode();
  }, [stopDemoMode]);

  const handleWifiConnect = useCallback(async () => {
    const port = parseInt(wifiPort) || 35000;
    await connectWifi(wifiIp, port);
    if (connectionMode !== 'wifi') {
      // Fallback to demo if WiFi fails in this environment
      handleDemoMode();
    }
  }, [wifiIp, wifiPort, connectWifi, connectionMode, handleDemoMode]);

  if (connectionStatus === 'connected') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060a14]">
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 max-w-md text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
          <Zap className="w-10 h-10 text-emerald-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">EV Connect</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Real-time OBD-II diagnostics for BYD EVs.<br />
            Connect via Bluetooth, WiFi, or try the demo.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          {/* Bluetooth */}
          <button onClick={connectBluetooth} disabled={connectionStatus === 'connecting'}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all disabled:opacity-50">
            <Bluetooth className="w-5 h-5" />
            <span>Connect BLE Adapter</span>
            <span className="ml-auto text-[10px] text-emerald-200">ELM327 v1.5+</span>
          </button>

          {/* WiFi */}
          <button onClick={() => setShowWifi(!showWifi)}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/30 text-cyan-300 font-medium transition-all">
            <Wifi className="w-5 h-5" />
            <span>Connect WiFi Adapter</span>
            <Signal className="w-4 h-4 ml-auto text-cyan-500/60" />
          </button>

          {showWifi && (
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5" />
                <span>Connect your phone to the adapter&apos;s WiFi network first, then enter its IP below.</span>
              </div>
              <div className="flex gap-2">
                <input value={wifiIp} onChange={(e) => setWifiIp(e.target.value)}
                  placeholder="192.168.0.10" className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 text-white text-sm placeholder:text-slate-600 outline-none focus:border-cyan-500/50" />
                <input value={wifiPort} onChange={(e) => setWifiPort(e.target.value)} type="number"
                  placeholder="35000" className="w-24 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 text-white text-sm placeholder:text-slate-600 outline-none focus:border-cyan-500/50" />
              </div>
              <button onClick={handleWifiConnect}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors">
                Connect
              </button>
              <p className="text-[10px] text-slate-600">
                Common IPs: 192.168.0.10, 192.168.1.10 &middot; Port: 35000
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-700/50" />
            <span className="text-xs text-slate-600 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>

          {/* Demo */}
          <button onClick={handleDemoMode}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-all">
            <Play className="w-5 h-5 text-emerald-400" />
            <span>Launch Interactive Demo</span>
            <span className="ml-auto text-xs text-slate-500">No hardware</span>
          </button>
        </div>

        {/* Supported adapters */}
        <div className="flex flex-col gap-1.5 text-[11px] text-slate-500">
          <p className="text-slate-400 font-medium text-xs">Supported Adapters:</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span>ELM327 v1.5+ (BLE/WiFi)</span>
            <span>vLinker FS (BLE)</span>
            <span>Carista (BLE)</span>
            <span>ScanTool (WiFi)</span>
            <span>Konnwei (WiFi)</span>
          </div>
        </div>

        {connectionStatus === 'error' && (
          <div className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            Connection failed. Ensure Bluetooth/WiFi is enabled and adapter is powered on.
          </div>
        )}
      </div>
    </div>
  );
}

export function DisconnectButton() {
  const { connectionMode, stopDemoMode } = useAppStore();
  const handleDisconnect = useCallback(() => { stopSimulator(); stopDemoMode(); }, [stopDemoMode]);
  if (connectionMode !== 'demo') return null;
  return <button onClick={handleDisconnect} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Exit Demo</button>;
}

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { startSimulator, stopSimulator } from '@/lib/simulator';
import { checkBluetoothAvailability } from '@/lib/ble-connection';
import { Zap, Bluetooth, Wifi, Play, Signal, Info, Cpu, Star, AlertTriangle, Smartphone, ExternalLink, ShieldAlert } from 'lucide-react';

export function ConnectOverlay() {
  const {
    connectionStatus, connectionMode, startDemoMode, stopDemoMode,
    connectBluetooth, connectVgate, connectWifi,
    bluetoothAvailable, bluetoothUnavailableReason, checkBluetooth,
  } = useAppStore();
  const [wifiIp, setWifiIp] = useState('192.168.0.10');
  const [wifiPort, setWifiPort] = useState('35000');
  const [showWifi, setShowWifi] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Check Bluetooth availability on mount
  useEffect(() => {
    checkBluetooth();
  }, [checkBluetooth]);

  // Clear error when connection status changes
  useEffect(() => {
    if (connectionStatus !== 'error') {
      setErrorMessage('');
    }
    if (connectionStatus === 'connected') {
      setIsConnecting(false);
    }
    if (connectionStatus === 'error') {
      setIsConnecting(false);
    }
  }, [connectionStatus]);

  const handleDemoMode = useCallback(() => {
    startDemoMode();
    setTimeout(() => startSimulator(), 100);
  }, [startDemoMode]);

  const handleDisconnect = useCallback(() => {
    stopSimulator();
    stopDemoMode();
  }, [stopDemoMode]);

  const handleVgateConnect = useCallback(async () => {
    setErrorMessage('');
    setIsConnecting(true);
    try {
      await connectVgate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(msg || 'Failed to connect to vGate adapter. Ensure Bluetooth is on and the adapter is powered.');
      setIsConnecting(false);
    }
  }, [connectVgate]);

  const handleBLEConnect = useCallback(async () => {
    setErrorMessage('');
    if (!bluetoothAvailable) {
      setErrorMessage(bluetoothUnavailableReason);
      return;
    }
    setIsConnecting(true);
    try {
      await connectBluetooth();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(msg || 'Failed to connect. Ensure your BLE adapter is powered on and in range.');
      setIsConnecting(false);
    }
  }, [connectBluetooth, bluetoothAvailable, bluetoothUnavailableReason]);

  const handleWifiConnect = useCallback(async () => {
    setErrorMessage('');
    const port = parseInt(wifiPort) || 35000;

    // Check for HTTPS/mixed content warning
    const isSecureContext = window.location.protocol === 'https:';
    if (isSecureContext) {
      console.warn('[WiFi Connect] Page is served over HTTPS. ws:// connections to OBD adapters may be blocked by the browser.');
    }

    setIsConnecting(true);
    try {
      await connectWifi(wifiIp, port);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('mixed content') || msg.includes('insecure') || msg.includes('secure')) {
        setErrorMessage(
          'WiFi OBD connection blocked: This app is loaded over HTTPS, but OBD WiFi adapters ' +
          'only support insecure WebSocket (ws://). Please use a Bluetooth BLE adapter instead, ' +
          'or access this app via HTTP.'
        );
      } else {
        setErrorMessage(
          msg || `Could not connect to WiFi adapter at ${wifiIp}:${port}. Ensure your phone is ` +
          `connected to the adapter's WiFi network first (check WiFi settings for ELM327/WiFi_OBDII network).`
        );
      }
      setIsConnecting(false);
      return;
    }

    // If WiFi connection didn't succeed (still not in wifi mode), show error
    const state = useAppStore.getState();
    if (state.connectionMode !== 'wifi') {
      setErrorMessage(
        `Could not connect to WiFi adapter at ${wifiIp}:${port}. ` +
        (isSecureContext
          ? 'This app is served over HTTPS, which may block WebSocket connections to the adapter. Try using Bluetooth instead.'
          : `Ensure your phone is connected to the adapter's WiFi network first (check WiFi settings for ELM327/WiFi_OBDII network).`)
      );
      setIsConnecting(false);
    }
  }, [wifiIp, wifiPort, connectWifi]);

  // Show a connecting spinner
  const isDisabled = isConnecting || connectionStatus === 'connecting';

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

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 max-w-md text-center overflow-y-auto max-h-screen py-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
          <Zap className="w-10 h-10 text-emerald-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">EV Connect</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Real-time OBD-II diagnostics for BYD EVs.<br />
            Optimized for vGate iCar Pro BLE 4.0.
          </p>
        </div>

        {/* Bluetooth availability warning */}
        {!bluetoothAvailable && (
          <div className="w-full px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium text-amber-300 block mb-1">Bluetooth Not Available</span>
                <p className="text-[11px] text-amber-400/70 leading-relaxed">
                  {bluetoothUnavailableReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HTTPS / Mixed content warning for WiFi */}
        {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
          <div className="w-full px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium text-blue-300 block mb-1">WiFi Adapter Notice</span>
                <p className="text-[11px] text-blue-400/70 leading-relaxed">
                  This app is loaded over HTTPS. Browsers may block WebSocket connections to WiFi OBD
                  adapters (which use ws://, not wss://). If WiFi connection fails, please use a
                  Bluetooth BLE adapter instead — it works reliably from HTTPS.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-2.5">
          {/* vGate iCar Pro — Featured */}
          <button onClick={handleVgateConnect} disabled={isDisabled || !bluetoothAvailable}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium transition-all disabled:opacity-50 relative overflow-hidden">
            <div className="absolute top-2 right-3 flex items-center gap-1">
              <Star className="w-3 h-3 text-emerald-200" />
              <span className="text-[9px] text-emerald-200 font-semibold">RECOMMENDED</span>
            </div>
            <Bluetooth className="w-5 h-5" />
            <div className="text-left">
              <span className="block text-sm">vGate iCar Pro BLE 4.0</span>
              <span className="text-[10px] text-emerald-200">Ultra-low power · iOS & Android</span>
            </div>
            {isDisabled && connectionStatus === 'connecting' && connectionMode === null && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* Generic BLE */}
          <button onClick={handleBLEConnect} disabled={isDisabled || !bluetoothAvailable}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-emerald-600/60 hover:bg-emerald-500/60 text-white font-medium transition-all disabled:opacity-50">
            <Bluetooth className="w-5 h-5 text-emerald-200" />
            <span>Other BLE Adapter</span>
            <span className="ml-auto text-[10px] text-emerald-200/70">ELM327 / vLinker</span>
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
              <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-cyan-300 leading-relaxed">
                    <strong className="text-cyan-200">PWA WiFi Setup:</strong> When using this app as a PWA,
                    WiFi connectivity works normally. Go to your phone&apos;s WiFi settings, connect to the
                    adapter&apos;s network (e.g., &quot;ELM327&quot;, &quot;WiFi_OBDII&quot;), then return to this app
                    and enter the adapter&apos;s IP address below.
                  </p>
                </div>
              </div>
              {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
                <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-300 leading-relaxed">
                      <strong className="text-amber-200">HTTPS Limitation:</strong> This app is loaded over
                      HTTPS. Browsers may block insecure WebSocket (ws://) connections to OBD adapters.
                      If WiFi doesn&apos;t work, please use a Bluetooth BLE adapter instead.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input value={wifiIp} onChange={(e) => setWifiIp(e.target.value)}
                  placeholder="192.168.0.10" className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 text-white text-sm placeholder:text-slate-600 outline-none focus:border-cyan-500/50" />
                <input value={wifiPort} onChange={(e) => setWifiPort(e.target.value)} type="number"
                  placeholder="35000" className="w-24 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/30 text-white text-sm placeholder:text-slate-600 outline-none focus:border-cyan-500/50" />
              </div>
              <button onClick={handleWifiConnect} disabled={isDisabled}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {isDisabled ? 'Connecting...' : 'Connect'}
              </button>
              <p className="text-[10px] text-slate-600">
                Common IPs: 192.168.0.10, 192.168.1.10 · Port: 35000
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

        {/* Error message */}
        {(connectionStatus === 'error' || errorMessage) && (
          <div className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
            {errorMessage || 'Connection failed. Ensure Bluetooth/WiFi is enabled and adapter is powered on.'}
          </div>
        )}

        {/* Supported adapters */}
        <div className="flex flex-col gap-2 text-[11px] text-slate-500">
          <p className="text-slate-400 font-medium text-xs">Supported Adapters:</p>
          <div className="bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">vGate iCar Pro BLE 4.0</span>
              <span className="text-emerald-400/50 text-[9px]">BEST SUPPORT</span>
            </div>
            <span className="text-emerald-400/60">BLE 4.0 · CC2541 · Ultra-low power · Android · ELM327 v2.1</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span>ELM327 v1.5+ (BLE/WiFi)</span>
            <span>vLinker FS (BLE)</span>
            <span>Carista (BLE)</span>
            <span>ScanTool (WiFi)</span>
          </div>
        </div>

        {/* PWA compatibility note */}
        <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/20">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
            <div className="text-[11px] text-slate-500 leading-relaxed text-left">
              <p className="text-slate-400 font-medium mb-1">PWA Compatibility Note</p>
              <p><strong className="text-slate-400">Bluetooth BLE:</strong> Requires Chrome/Edge on Android or Chrome on Windows/macOS. iOS Safari does NOT support Web Bluetooth. The app must be served over HTTPS.</p>
              <p className="mt-1"><strong className="text-slate-400">WiFi:</strong> Works on all platforms. Connect your phone to the adapter&apos;s WiFi hotspot, then open the app. Note: you will lose internet access while connected to the adapter&apos;s WiFi.</p>
              <p className="mt-1"><strong className="text-slate-400">Troubleshooting:</strong> If your adapter isn&apos;t detected, ensure it&apos;s powered on (ignition key turned), Bluetooth is enabled, and the adapter is in pairing mode. For WiFi, verify you&apos;re connected to the adapter&apos;s network in your phone&apos;s WiFi settings.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DisconnectButton() {
  const { connectionMode, connectionStatus, stopDemoMode, disconnectDevice } = useAppStore();
  const handleDisconnect = useCallback(() => {
    stopSimulator();
    if (connectionMode === 'demo') {
      stopDemoMode();
    } else {
      disconnectDevice();
    }
  }, [stopDemoMode, disconnectDevice, connectionMode]);

  if (connectionStatus !== 'connected') return null;

  return <button onClick={handleDisconnect} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Disconnect</button>;
}

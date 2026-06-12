'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bluetooth, Wifi, Zap, Loader2, X } from 'lucide-react';
import vehiclesData from '@/data/vehicles.json';

interface ConnectOverlayProps {
  onClose: () => void;
}

export default function ConnectOverlay({ onClose }: ConnectOverlayProps) {
  const { t } = useTranslation('common');
  const { connectBluetooth, connectWifi, connectDemo, connectionStatus, updateSettings, settings } = useAppStore();
  const [mode, setMode] = useState<'select' | 'bluetooth' | 'wifi' | 'demo'>('select');
  const [wifiIp, setWifiIp] = useState(settings.wifiIp);
  const [wifiPort, setWifiPort] = useState(String(settings.wifiPort));
  const [demoBrand, setDemoBrand] = useState('');
  const [demoModel, setDemoModel] = useState('');
  const [scanning, setScanning] = useState(false);
  const [adapters] = useState([
    { name: 'OBDLink MX+', id: 'obdlink-mx+', type: 'bluetooth' },
    { name: 'Vgate iCar Pro', id: 'vgate-icar', type: 'bluetooth' },
    { name: 'ELM327 v1.5', id: 'elm327-15', type: 'bluetooth' },
  ]);

  const handleBluetoothConnect = async () => {
    setScanning(true);
    setTimeout(async () => {
      setScanning(false);
      await connectBluetooth();
      onClose();
    }, 2000);
  };

  const handleWifiConnect = async () => {
    await connectWifi(wifiIp, Number(wifiPort));
    updateSettings({ wifiIp, wifiPort: Number(wifiPort) });
    onClose();
  };

  const handleDemoConnect = () => {
    connectDemo();
    onClose();
  };

  const isConnecting = connectionStatus === 'connecting';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#0D1117]/95 backdrop-blur-md flex items-end sm:items-center justify-center"
    >
      <div className="w-full max-w-md mx-auto p-4">
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-evdx-text">{t('connect')}</h2>
              <button onClick={onClose} className="text-evdx-text-secondary hover:text-evdx-text">
                <X size={20} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {mode === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <button
                    onClick={() => setMode('bluetooth')}
                    className="w-full flex items-center gap-4 bg-[#0D1117] hover:bg-[#0D1117]/80 border border-white/5 rounded-xl p-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-evdx-primary/10 flex items-center justify-center">
                      <Bluetooth size={24} className="text-evdx-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-evdx-text font-medium">Bluetooth OBD</p>
                      <p className="text-xs text-evdx-text-secondary">Connect via Bluetooth adapter</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('wifi')}
                    className="w-full flex items-center gap-4 bg-[#0D1117] hover:bg-[#0D1117]/80 border border-white/5 rounded-xl p-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-evdx-purple/10 flex items-center justify-center">
                      <Wifi size={24} className="text-evdx-purple" />
                    </div>
                    <div className="text-left">
                      <p className="text-evdx-text font-medium">WiFi OBD</p>
                      <p className="text-xs text-evdx-text-secondary">Connect via WiFi ELM327</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('demo')}
                    className="w-full flex items-center gap-4 bg-[#0D1117] hover:bg-[#0D1117]/80 border border-white/5 rounded-xl p-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-evdx-green/10 flex items-center justify-center">
                      <Zap size={24} className="text-evdx-green" />
                    </div>
                    <div className="text-left">
                      <p className="text-evdx-text font-medium">{t('demo')}</p>
                      <p className="text-xs text-evdx-text-secondary">Try with simulated data</p>
                    </div>
                  </button>
                </motion.div>
              )}

              {mode === 'bluetooth' && (
                <motion.div
                  key="bluetooth"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <button onClick={() => setMode('select')} className="text-sm text-evdx-primary hover:underline">
                    ← Back
                  </button>

                  {scanning || isConnecting ? (
                    <div className="flex flex-col items-center py-8">
                      <Loader2 size={32} className="animate-spin text-evdx-primary mb-4" />
                      <p className="text-evdx-text-secondary">Scanning for adapters...</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {adapters.map((adapter) => (
                          <button
                            key={adapter.id}
                            onClick={handleBluetoothConnect}
                            className="w-full flex items-center gap-3 bg-[#0D1117] hover:bg-evdx-primary/5 border border-white/5 rounded-lg px-4 py-3 transition-colors"
                          >
                            <Bluetooth size={18} className="text-evdx-primary" />
                            <span className="text-sm text-evdx-text">{adapter.name}</span>
                          </button>
                        ))}
                      </div>
                      <Button
                        onClick={handleBluetoothConnect}
                        className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] h-11 rounded-xl"
                      >
                        Scan Again
                      </Button>
                    </>
                  )}
                </motion.div>
              )}

              {mode === 'wifi' && (
                <motion.div
                  key="wifi"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <button onClick={() => setMode('select')} className="text-sm text-evdx-primary hover:underline">
                    ← Back
                  </button>
                  <div>
                    <label className="text-sm text-evdx-text-secondary mb-1 block">IP Address</label>
                    <Input
                      value={wifiIp}
                      onChange={(e) => setWifiIp(e.target.value)}
                      placeholder="192.168.0.10"
                      className="bg-[#0D1117] border-white/10 text-evdx-text"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-evdx-text-secondary mb-1 block">Port</label>
                    <Input
                      value={wifiPort}
                      onChange={(e) => setWifiPort(e.target.value)}
                      placeholder="35000"
                      className="bg-[#0D1117] border-white/10 text-evdx-text"
                    />
                  </div>
                  <Button
                    onClick={handleWifiConnect}
                    disabled={isConnecting}
                    className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] h-11 rounded-xl"
                  >
                    {isConnecting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </Button>
                </motion.div>
              )}

              {mode === 'demo' && (
                <motion.div
                  key="demo"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <button onClick={() => setMode('select')} className="text-sm text-evdx-primary hover:underline">
                    ← Back
                  </button>
                  <div>
                    <label className="text-sm text-evdx-text-secondary mb-1 block">Brand</label>
                    <select
                      value={demoBrand}
                      onChange={(e) => setDemoBrand(e.target.value)}
                      className="w-full bg-[#0D1117] border border-white/10 rounded-lg px-4 py-2.5 text-evdx-text text-sm focus:outline-none focus:border-evdx-primary"
                    >
                      <option value="">Select brand</option>
                      {vehiclesData.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  {demoBrand && (
                    <div>
                      <label className="text-sm text-evdx-text-secondary mb-1 block">Model</label>
                      <select
                        value={demoModel}
                        onChange={(e) => setDemoModel(e.target.value)}
                        className="w-full bg-[#0D1117] border border-white/10 rounded-lg px-4 py-2.5 text-evdx-text text-sm focus:outline-none focus:border-evdx-primary"
                      >
                        <option value="">Select model</option>
                        {vehiclesData.find((b) => b.id === demoBrand)?.models.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button
                    onClick={handleDemoConnect}
                    className="w-full bg-evdx-green hover:bg-evdx-green/90 text-[#0D1117] font-semibold h-11 rounded-xl"
                  >
                    <Zap size={18} className="mr-2" />
                    Start Demo Mode
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

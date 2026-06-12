'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bluetooth, Wifi, Zap, Loader2, X, AlertCircle, RefreshCw } from 'lucide-react';
import vehiclesData from '@/data/vehicles.json';
import { Capacitor } from '@capacitor/core';
import type { ScannedDevice } from '@/lib/ble-service';

interface ConnectOverlayProps {
  onClose: () => void;
}

export default function ConnectOverlay({ onClose }: ConnectOverlayProps) {
  const { t } = useTranslation('common');
  const { connectBluetooth, connectWifi, connectDemo, connectionStatus, updateSettings, settings, updateDeviceInfo, setActiveVehicle } = useAppStore();
  const [mode, setMode] = useState<'select' | 'bluetooth' | 'wifi' | 'demo'>('select');
  const [wifiIp, setWifiIp] = useState(settings.wifiIp);
  const [wifiPort, setWifiPort] = useState(String(settings.wifiPort));
  const [demoBrand, setDemoBrand] = useState('');
  const [demoModel, setDemoModel] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [permissionError, setPermissionError] = useState('');
  const [connectingToDevice, setConnectingToDevice] = useState<string | null>(null);

  const handleBluetoothScan = useCallback(async () => {
    setScanning(true);
    setPermissionError('');
    setScannedDevices([]);

    try {
      // Request permissions first
      const { requestBlePermissions } = await import('@/lib/permissions');
      const permResult = await requestBlePermissions();

      if (!permResult.granted) {
        setPermissionError('Bluetooth and Location permissions are required. Please grant them in Settings.');
        setScanning(false);
        return;
      }

      // Use real BLE scanning
      const { bleService } = await import('@/lib/ble-service');
      await bleService.initialize();
      const devices = await bleService.scan(8000);
      setScannedDevices(devices);

      if (devices.length === 0) {
        setPermissionError('No OBD adapters found. Make sure your adapter is powered on and nearby.');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      setPermissionError(error?.message || 'Failed to scan. Please check Bluetooth is enabled.');
    } finally {
      setScanning(false);
    }
  }, []);

  const handleBluetoothConnect = useCallback(async (device: ScannedDevice) => {
    setConnectingToDevice(device.deviceId);
    setPermissionError('');

    try {
      const { bleService } = await import('@/lib/ble-service');
      const connected = await bleService.connect(device.deviceId, device.profile);

      if (connected) {
        // Update store
        updateDeviceInfo({
          name: device.name,
          type: 'bluetooth',
          adapterId: device.deviceId,
          signalStrength: device.rssi,
          quality: device.rssi > -50 ? 'excellent' : device.rssi > -70 ? 'good' : device.rssi > -85 ? 'fair' : 'poor',
        });

        // Set connection in store
        await connectBluetooth();

        // Start OBD polling
        bleService.startPolling((pid, value) => {
          // The store's parseOBDResponse handles PID data
        });

        onClose();
      } else {
        setPermissionError('Failed to connect to adapter.');
      }
    } catch (error: any) {
      setPermissionError(error?.message || 'Connection failed. Try again.');
    } finally {
      setConnectingToDevice(null);
    }
  }, [connectBluetooth, updateDeviceInfo, onClose]);

  const handleWifiConnect = async () => {
    updateSettings({ wifiIp, wifiPort: Number(wifiPort) });
    await connectWifi(wifiIp, Number(wifiPort));
    if (connectionStatus !== 'error') {
      onClose();
    }
  };

  const handleDemoConnect = () => {
    // Set the vehicle profile for demo mode
    if (demoBrand && demoModel) {
      const brand = vehiclesData.find(b => b.id === demoBrand);
      if (brand) {
        setActiveVehicle({
          id: `demo-${demoBrand}-${Date.now()}`,
          brand: brand.name,
          model: demoModel,
          year: new Date().getFullYear(),
          batteryCapacity: 60,
          maxChargePower: brand.chargingSpecs?.dcMax || 50,
        });
      }
    }
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
      <div className="w-full max-w-md mx-auto p-4 max-h-[85vh] overflow-y-auto">
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
                    onClick={() => {
                      setMode('bluetooth');
                      // Auto-start scan when entering bluetooth mode
                      setTimeout(() => handleBluetoothScan(), 300);
                    }}
                    className="w-full flex items-center gap-4 bg-[#0D1117] hover:bg-[#0D1117]/80 border border-white/5 rounded-xl p-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-evdx-primary/10 flex items-center justify-center">
                      <Bluetooth size={24} className="text-evdx-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-evdx-text font-medium">Bluetooth OBD</p>
                      <p className="text-xs text-evdx-text-secondary">Scan & connect BLE adapter</p>
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
                  <button onClick={() => { setMode('select'); setScannedDevices([]); }} className="text-sm text-evdx-primary hover:underline">
                    ← Back
                  </button>

                  {permissionError && (
                    <div className="flex items-start gap-2 bg-evdx-critical/10 border border-evdx-critical/20 rounded-lg p-3">
                      <AlertCircle size={16} className="text-evdx-critical shrink-0 mt-0.5" />
                      <p className="text-xs text-evdx-critical">{permissionError}</p>
                    </div>
                  )}

                  {scanning ? (
                    <div className="flex flex-col items-center py-8">
                      <Loader2 size={32} className="animate-spin text-evdx-primary mb-4" />
                      <p className="text-evdx-text-secondary text-sm">Scanning for OBD adapters...</p>
                      <p className="text-evdx-text-secondary text-xs mt-1">Ensure your adapter is powered on</p>
                    </div>
                  ) : (
                    <>
                      {scannedDevices.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-evdx-text-secondary mb-2">Found {scannedDevices.length} adapter(s):</p>
                          {scannedDevices.map((device) => (
                            <button
                              key={device.deviceId}
                              onClick={() => handleBluetoothConnect(device)}
                              disabled={connectingToDevice !== null}
                              className="w-full flex items-center gap-3 bg-[#0D1117] hover:bg-evdx-primary/5 border border-white/5 rounded-lg px-4 py-3 transition-colors disabled:opacity-50"
                            >
                              <Bluetooth size={18} className="text-evdx-primary" />
                              <div className="flex-1 text-left">
                                <span className="text-sm text-evdx-text block">{device.name}</span>
                                <span className="text-xs text-evdx-text-secondary">RSSI: {device.rssi} dBm</span>
                              </div>
                              {connectingToDevice === device.deviceId ? (
                                <Loader2 size={16} className="animate-spin text-evdx-primary" />
                              ) : null}
                              {device.profile && (
                                <span className="text-[10px] text-evdx-green bg-evdx-green/10 px-1.5 py-0.5 rounded">{device.profile.name}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Bluetooth size={32} className="text-evdx-text-secondary mx-auto mb-2" />
                          <p className="text-sm text-evdx-text-secondary">No adapters found</p>
                        </div>
                      )}
                      <Button
                        onClick={handleBluetoothScan}
                        disabled={scanning}
                        className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] h-11 rounded-xl"
                      >
                        <RefreshCw size={16} className="mr-2" />
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
                      onChange={(e) => { setDemoBrand(e.target.value); setDemoModel(''); }}
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

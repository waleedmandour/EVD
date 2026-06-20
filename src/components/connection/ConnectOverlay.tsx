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
  const { connectBluetooth, connectWifi, connectDemo, connectionStatus, updateSettings, settings, updateDeviceInfo, setActiveVehicle, setConnectionMode, setConnectionStatus } = useAppStore();
  const [mode, setMode] = useState<'select' | 'bluetooth' | 'wifi' | 'demo'>('select');
  const [wifiIp, setWifiIp] = useState(settings.wifiIp);
  const [wifiPort, setWifiPort] = useState(String(settings.wifiPort));
  const [demoBrand, setDemoBrand] = useState('');
  const [demoModel, setDemoModel] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [permissionError, setPermissionError] = useState('');
  const [connectingToDevice, setConnectingToDevice] = useState<string | null>(null);
  // Profile picker state — shown when auto-detection fails or when the user
  // taps "Try a different profile" after a "characteristics not found" error.
  // The user picks a profile from the list and we retry connect() with it.
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [profilePickerDevice, setProfilePickerDevice] = useState<ScannedDevice | null>(null);
  const [profilesList, setProfilesList] = useState<Array<{ name: string; serviceUUID: string; writeUUID: string; notifyUUID: string }>>([]);
  // Bonded (paired) devices — checked immediately when the user enters
  // Bluetooth mode, so they can "Quick Connect" without waiting for a scan.
  const [bondedDevices, setBondedDevices] = useState<ScannedDevice[]>([]);
  const [checkingBonded, setCheckingBonded] = useState(false);

  /**
   * Check Android's bonded (paired) BLE device list for OBD-like adapters.
   * Called automatically when the user enters Bluetooth mode — if bonded
   * devices are found, they appear at the top of the screen as "Quick Connect"
   * options, so the user can connect instantly without scanning.
   */
  const checkBondedDevices = useCallback(async () => {
    setCheckingBonded(true);
    try {
      const { requestBlePermissions } = await import('@/lib/permissions');
      const permResult = await requestBlePermissions();
      if (!permResult.granted) {
        setCheckingBonded(false);
        return;
      }
      const { bleService } = await import('@/lib/ble-service');
      await bleService.initialize();
      const bonded = await bleService.getBondedOBDDevices();
      setBondedDevices(bonded);
      if (bonded.length > 0) {
        console.log(`[ConnectOverlay] Found ${bonded.length} bonded OBD device(s) for quick connect`);
      }
    } catch (error) {
      console.warn('[ConnectOverlay] Bonded device check failed:', error);
    } finally {
      setCheckingBonded(false);
    }
  }, []);

  const handleBluetoothScan = useCallback(async () => {
    setScanning(true);
    setPermissionError('');
    setScannedDevices([]);

    try {
      // Request permissions first (handles Android 12+ BLE + location properly)
      const { requestBlePermissions } = await import('@/lib/permissions');
      const permResult = await requestBlePermissions();

      if (!permResult.granted) {
        const missingStr = permResult.missingPermissions.join(', ');
        setPermissionError(t('permissionsRequired', { missing: missingStr }));
        setScanning(false);
        return;
      }

      // Use real BLE scanning
      const { bleService } = await import('@/lib/ble-service');
      await bleService.initialize();
      const devices = await bleService.scan(8000);
      setScannedDevices(devices);

      if (devices.length === 0) {
        setPermissionError(t('noAdaptersFound'));
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      setPermissionError(error?.message || t('scanFailed'));
    } finally {
      setScanning(false);
    }
  }, [t]);

  const handleBluetoothConnect = useCallback(async (device: ScannedDevice, forcedProfile?: { name: string; serviceUUID: string; writeUUID: string; notifyUUID: string }) => {
    setConnectingToDevice(device.deviceId);
    setPermissionError('');
    setShowProfilePicker(false);
    // Set the store to 'connecting' so the WiFi/Bluetooth buttons disable
    // and a spinner shows. The previous implementation jumped straight from
    // 'disconnected' to 'connected' without ever showing the connecting state,
    // so users could tap Connect multiple times and spawn concurrent
    // bleService.connect() calls.
    setConnectionMode('bluetooth');
    setConnectionStatus('connecting');

    try {
      const { bleService, CharacteristicsNotFoundError, NoMatchingProfileError } = await import('@/lib/ble-service');
      const connected = await bleService.connect(device.deviceId, forcedProfile as any);

      if (connected) {
        // Get adapter identification info
        const adapterInfo = bleService.getAdapterInfo();

        // Update store with connection + adapter info
        updateDeviceInfo({
          name: device.name,
          type: 'bluetooth',
          adapterId: device.deviceId,
          signalStrength: device.rssi,
          quality: device.rssi > -50 ? 'excellent' : device.rssi > -70 ? 'good' : device.rssi > -85 ? 'fair' : 'poor',
          firmware: adapterInfo?.firmware || '',
          chipset: adapterInfo?.chipset || '',
          protocol: adapterInfo?.protocol || '',
          isClone: adapterInfo?.isClone || false,
          voltage: adapterInfo?.voltage || 0,
          vin: adapterInfo?.vin || '',
        });

        setConnectionStatus('connected');

        // Start OBD polling with store's parser
        bleService.startPolling((pid, value) => {
          useAppStore.getState().parseOBDResponse(value);
        });

        onClose();
      } else {
        setConnectionStatus('error');
        setPermissionError(t('connectFailed'));
      }
    } catch (error: any) {
      console.error('BLE connect error:', error);

      // v1.5.2: catch the typed errors specifically and show the profile
      // picker instead of just dumping the raw error.
      const { CharacteristicsNotFoundError, NoMatchingProfileError } = await import('@/lib/ble-service');
      if (error instanceof CharacteristicsNotFoundError || error instanceof NoMatchingProfileError) {
        console.warn('[ConnectOverlay] Profile detection failed, showing profile picker');
        setConnectionStatus('error');
        setProfilePickerDevice(device);
        // Load the list of all known profiles
        const { bleService } = await import('@/lib/ble-service');
        setProfilesList([...bleService.getAdapterProfiles()]);
        setShowProfilePicker(true);
        // Show a user-friendly error message explaining what happened
        setPermissionError(
          error instanceof CharacteristicsNotFoundError
            ? t('characteristicsNotFound', { profile: error.triedProfile })
            : t('noMatchingProfile')
        );
        return;
      }

      setConnectionStatus('error');
      setPermissionError(error?.message || t('connectFailed'));
    } finally {
      setConnectingToDevice(null);
    }
  }, [updateDeviceInfo, setConnectionMode, setConnectionStatus, onClose, t]);

  const handleWifiConnect = async () => {
    setPermissionError('');

    // Validate port — the previous implementation accepted any string
    // including "abc", "99999", "-5", and "" via Number(wifiPort).
    const portNum = Number(wifiPort);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      setPermissionError(t('invalidPort'));
      return;
    }
    // Basic IP/hostname validation. We allow dotted-quad IPv4 and DNS names.
    // This is intentionally permissive — we don't want to block legitimate
    // adapter hostnames like "obdlink.local".
    const ipOk = /^(\d{1,3}\.){3}\d{1,3}$/.test(wifiIp);
    const hostOk = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(wifiIp);
    if (!ipOk && !hostOk) {
      setPermissionError(t('invalidIp'));
      return;
    }

    updateSettings({ wifiIp, wifiPort: portNum });
    setConnectionMode('wifi');
    setConnectionStatus('connecting');

    try {
      const { bleService } = await import('@/lib/ble-service');
      const connected = await bleService.connectWifi(wifiIp, portNum);

      if (connected) {
        // Get adapter identification info
        const adapterInfo = bleService.getAdapterInfo();

        updateDeviceInfo({
          name: `WiFi ELM327 (${wifiIp})`,
          type: 'wifi',
          adapterId: `wifi-${wifiIp}:${wifiPort}`,
          firmware: adapterInfo?.firmware || '',
          chipset: adapterInfo?.chipset || '',
          protocol: adapterInfo?.protocol || '',
          isClone: adapterInfo?.isClone || false,
          voltage: adapterInfo?.voltage || 0,
          vin: adapterInfo?.vin || '',
          quality: 'good',
        });

        setConnectionStatus('connected');

        // Start OBD polling
        bleService.startPolling((pid, value) => {
          useAppStore.getState().parseOBDResponse(value);
        });

        onClose();
      } else {
        setConnectionStatus('error');
        setPermissionError(t('wifiConnectFailed'));
      }
    } catch (error: any) {
      console.error('WiFi connect error:', error);
      setConnectionStatus('error');
      setPermissionError(error?.message || t('wifiConnectFailed'));
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
                      // Check bonded (paired) devices first — if the user has
                      // already paired their OBD adapter, show it as a Quick
                      // Connect option before the scan even starts.
                      setTimeout(() => checkBondedDevices(), 100);
                      // Auto-start scan in parallel
                      setTimeout(() => handleBluetoothScan(), 300);
                    }}
                    className="w-full flex items-center gap-4 bg-[#0D1117] hover:bg-[#0D1117]/80 border border-white/5 rounded-xl p-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-evdx-primary/10 flex items-center justify-center">
                      <Bluetooth size={24} className="text-evdx-primary" />
                    </div>
                    <div className="text-start">
                      <p className="text-evdx-text font-medium">{t('bluetoothObd')}</p>
                      <p className="text-xs text-evdx-text-secondary">{t('bluetoothObdDesc')}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('wifi')}
                    className="w-full flex items-center gap-4 bg-[#0D1117] hover:bg-[#0D1117]/80 border border-white/5 rounded-xl p-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-evdx-purple/10 flex items-center justify-center">
                      <Wifi size={24} className="text-evdx-purple" />
                    </div>
                    <div className="text-start">
                      <p className="text-evdx-text font-medium">{t('wifiObd')}</p>
                      <p className="text-xs text-evdx-text-secondary">{t('wifiObdDesc')}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setMode('demo')}
                    className="w-full flex items-center gap-4 bg-[#0D1117] hover:bg-[#0D1117]/80 border border-white/5 rounded-xl p-4 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-evdx-green/10 flex items-center justify-center">
                      <Zap size={24} className="text-evdx-green" />
                    </div>
                    <div className="text-start">
                      <p className="text-evdx-text font-medium">{t('demo')}</p>
                      <p className="text-xs text-evdx-text-secondary">{t('demoDesc')}</p>
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
                    ← {t('back')}
                  </button>

                  {permissionError && (
                    <div className="flex items-start gap-2 bg-evdx-critical/10 border border-evdx-critical/20 rounded-lg p-3">
                      <AlertCircle size={16} className="text-evdx-critical shrink-0 mt-0.5" />
                      <p className="text-xs text-evdx-critical">{permissionError}</p>
                    </div>
                  )}

                  {/* Quick Connect: bonded (paired) devices — appears instantly,
                      before the scan finishes. The user can tap to connect
                      immediately without waiting for the 8-second scan. */}
                  {bondedDevices.length > 0 && !connectingToDevice && (
                    <div className="bg-evdx-green/5 border border-evdx-green/20 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-evdx-green" />
                        <p className="text-xs font-semibold text-evdx-green">{t('quickConnect')}</p>
                      </div>
                      {bondedDevices.map((device) => (
                        <button
                          key={device.deviceId}
                          onClick={() => device.isIOSMode ? null : handleBluetoothConnect(device)}
                          disabled={device.isIOSMode}
                          className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-colors disabled:opacity-50 ${
                            device.isIOSMode
                              ? 'bg-[#0D1117]/40 border border-evdx-critical/20 cursor-not-allowed'
                              : 'bg-[#0D1117] hover:bg-evdx-green/10 border border-evdx-green/30'
                          }`}
                        >
                          <Bluetooth size={18} className={device.isIOSMode ? 'text-evdx-critical' : 'text-evdx-green'} />
                          <div className="flex-1 text-start">
                            <span className="text-sm text-evdx-text block">{device.name}</span>
                            <span className="text-xs text-evdx-green">{t('pairedDevice')}</span>
                            {device.isIOSMode && <span className="text-xs text-evdx-critical block">{t('iosModeWarning')}</span>}
                          </div>
                          {!device.isIOSMode && device.profile && (
                            <span className="text-[10px] text-evdx-green bg-evdx-green/10 px-1.5 py-0.5 rounded">{device.profile.name}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {checkingBonded && !scanning && bondedDevices.length === 0 && (
                    <div className="flex items-center justify-center py-4 gap-2">
                      <Loader2 size={16} className="animate-spin text-evdx-primary" />
                      <p className="text-xs text-evdx-text-secondary">{t('checkingPaired')}</p>
                    </div>
                  )}

                  {scanning ? (
                    <div className="flex flex-col items-center py-8">
                      <Loader2 size={32} className="animate-spin text-evdx-primary mb-4" />
                      <p className="text-evdx-text-secondary text-sm">{t('scanningForAdapters')}</p>
                      <p className="text-evdx-text-secondary text-xs mt-1">{t('ensureAdapterPowered')}</p>
                    </div>
                  ) : (
                    <>
                      {scannedDevices.length > 0 ? (
                        <div className="space-y-2">
                          {scannedDevices.some(d => d.isOBDLike) && scannedDevices.some(d => !d.isOBDLike) && (
                            <p className="text-xs text-evdx-text-secondary mb-1">{t('obdAdaptersCount', { count: scannedDevices.filter(d => d.isOBDLike).length })} · {t('otherDevicesCount', { count: scannedDevices.filter(d => !d.isOBDLike).length })}</p>
                          )}
                          {!scannedDevices.some(d => d.isOBDLike) && scannedDevices.length > 0 && (
                            <p className="text-xs text-evdx-text-secondary mb-2">{t('foundDevicesSelect', { count: scannedDevices.length })}</p>
                          )}
                          {scannedDevices.some(d => d.isOBDLike) && !scannedDevices.some(d => !d.isOBDLike) && (
                            <p className="text-xs text-evdx-text-secondary mb-2">{t('foundObdAdapters', { count: scannedDevices.length })}</p>
                          )}
                          {scannedDevices.map((device, idx) => (
                            <React.Fragment key={device.deviceId}>
                              {/* Section separator between OBD-like and other devices */}
                              {idx > 0 && device.isOBDLike !== scannedDevices[idx - 1].isOBDLike && !device.isOBDLike && (
                                <div className="flex items-center gap-2 py-1">
                                  <div className="flex-1 h-px bg-white/10" />
                                  <span className="text-[10px] text-evdx-text-secondary">{t('otherBleDevices')}</span>
                                  <div className="flex-1 h-px bg-white/10" />
                                </div>
                              )}
                              <button
                                onClick={() => device.isIOSMode ? null : handleBluetoothConnect(device)}
                                disabled={connectingToDevice !== null || device.isIOSMode}
                                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-colors disabled:opacity-50 ${
                                  device.isIOSMode
                                    ? 'bg-[#0D1117]/40 border border-evdx-critical/20 cursor-not-allowed'
                                    : device.isOBDLike
                                    ? 'bg-[#0D1117] hover:bg-evdx-primary/5 border border-evdx-primary/20'
                                    : 'bg-[#0D1117]/60 hover:bg-evdx-primary/5 border border-white/5'
                                }`}
                              >
                                <Bluetooth size={18} className={device.isIOSMode ? 'text-evdx-critical' : device.isOBDLike ? 'text-evdx-primary' : 'text-evdx-text-secondary'} />
                                <div className="flex-1 text-start">
                                  <span className="text-sm text-evdx-text block">{device.name}</span>
                                  <span className="text-xs text-evdx-text-secondary">
                                    RSSI: {device.rssi} dBm
                                    {device.isUnknown && ` · ${t('nameUnavailable')}`}
                                    {device.isIOSMode && ` · ${t('iosModeWarning')}`}
                                  </span>
                                </div>
                                {connectingToDevice === device.deviceId ? (
                                  <Loader2 size={16} className="animate-spin text-evdx-primary" />
                                ) : null}
                                {device.isIOSMode && (
                                  <span className="text-[10px] text-evdx-critical bg-evdx-critical/10 px-1.5 py-0.5 rounded">{t('iosMode')}</span>
                                )}
                                {!device.isIOSMode && device.profile && (
                                  <span className="text-[10px] text-evdx-green bg-evdx-green/10 px-1.5 py-0.5 rounded">{device.profile.name}</span>
                                )}
                                {!device.isIOSMode && !device.isOBDLike && !device.isUnknown && (
                                  <span className="text-[10px] text-evdx-text-secondary bg-white/5 px-1.5 py-0.5 rounded">{t('ble')}</span>
                                )}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Bluetooth size={32} className="text-evdx-text-secondary mx-auto mb-2" />
                          <p className="text-sm text-evdx-text-secondary">{t('noAdaptersFound')}</p>
                        </div>
                      )}
                      <Button
                        onClick={handleBluetoothScan}
                        disabled={scanning}
                        className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] h-11 rounded-xl"
                      >
                        <RefreshCw size={16} className="mr-2" />
                        {t('scanAgain')}
                      </Button>

                      {/* v1.5.2: Profile picker — shown when auto-detection fails
                          with NoMatchingProfileError or when startNotifications
                          throws "characteristics not found". The user can manually
                          pick a profile from the list and retry the connection. */}
                      {showProfilePicker && profilePickerDevice && (
                        <div className="mt-4 p-4 bg-[#0D1117] border border-evdx-warning/30 rounded-xl space-y-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-evdx-warning shrink-0" />
                            <p className="text-sm font-semibold text-evdx-warning">
                              {t('profilePickerTitle')}
                            </p>
                          </div>
                          <p className="text-xs text-evdx-text-secondary leading-relaxed">
                            {t('profilePickerDescription')}
                          </p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {profilesList.map((profile) => (
                              <button
                                key={profile.name}
                                onClick={() => handleBluetoothConnect(profilePickerDevice, profile)}
                                disabled={connectingToDevice !== null}
                                className="w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-colors disabled:opacity-50 bg-[#1A2332] hover:bg-evdx-primary/5 border border-white/5 text-start"
                              >
                                <Bluetooth size={16} className="text-evdx-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-evdx-text block truncate">{profile.name}</span>
                                  <span className="text-[10px] text-evdx-text-secondary font-mono block truncate">
                                    {profile.serviceUUID.substring(0, 8)}…
                                  </span>
                                </div>
                                {connectingToDevice === profilePickerDevice.deviceId && (
                                  <Loader2 size={14} className="animate-spin text-evdx-primary" />
                                )}
                              </button>
                            ))}
                          </div>
                          <Button
                            onClick={() => {
                              setShowProfilePicker(false);
                              setProfilePickerDevice(null);
                              setPermissionError('');
                            }}
                            variant="outline"
                            className="w-full h-9 text-xs border-white/10 text-evdx-text-secondary"
                          >
                            {t('cancel', { ns: 'common' })}
                          </Button>
                        </div>
                      )}
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
                    ← {t('back')}
                  </button>
                  <div>
                    <label className="text-sm text-evdx-text-secondary mb-1 block">{t('ipAddress')}</label>
                    <Input
                      value={wifiIp}
                      onChange={(e) => setWifiIp(e.target.value)}
                      placeholder="192.168.0.10"
                      className="bg-[#0D1117] border-white/10 text-evdx-text"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-evdx-text-secondary mb-1 block">{t('port')}</label>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
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
                    {isConnecting ? t('connecting') : t('connect')}
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
                    ← {t('back')}
                  </button>
                  <div>
                    <label className="text-sm text-evdx-text-secondary mb-1 block">{t('brand')}</label>
                    <select
                      value={demoBrand}
                      onChange={(e) => { setDemoBrand(e.target.value); setDemoModel(''); }}
                      className="w-full bg-[#0D1117] border border-white/10 rounded-lg px-4 py-2.5 text-evdx-text text-sm focus:outline-none focus:border-evdx-primary"
                    >
                      <option value="">{t('selectBrand')}</option>
                      {vehiclesData.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  {demoBrand && (
                    <div>
                      <label className="text-sm text-evdx-text-secondary mb-1 block">{t('model')}</label>
                      <select
                        value={demoModel}
                        onChange={(e) => setDemoModel(e.target.value)}
                        className="w-full bg-[#0D1117] border border-white/10 rounded-lg px-4 py-2.5 text-evdx-text text-sm focus:outline-none focus:border-evdx-primary"
                      >
                        <option value="">{t('selectModel')}</option>
                        {vehiclesData.find((b) => b.id === demoBrand)?.models.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Button
                    onClick={handleDemoConnect}
                    disabled={!demoBrand || !demoModel}
                    className="w-full bg-evdx-green hover:bg-evdx-green/90 text-[#0D1117] font-semibold h-11 rounded-xl disabled:opacity-40"
                  >
                    <Zap size={18} className="mr-2" />
                    {t('startDemoMode')}
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

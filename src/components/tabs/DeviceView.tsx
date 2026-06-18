'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/shared/Gauges';
import { Bluetooth, Wifi, Zap, Signal, Clock, Cpu, Hash, Shield, CheckCircle2, XCircle, AlertTriangle, Info, Fingerprint } from 'lucide-react';

export default function DeviceView() {
  const { t } = useTranslation('common');
  const { deviceInfo, connectionStatus, connectionMode } = useAppStore();

  const isConnected = connectionStatus === 'connected';
  const isDemo = connectionMode === 'demo';

  const qualityColors: Record<string, string> = {
    excellent: '#00E676',
    good: '#00D2FF',
    fair: '#FFB300',
    poor: '#FF3D00',
  };

  const qualityColor = qualityColors[deviceInfo.quality] || '#78909C';

  const signalBars = (strength: number) => {
    const normalized = Math.min(Math.max((strength + 100) / 70, 0), 1);
    const bars = Math.ceil(normalized * 4);
    return [1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className={`w-1.5 rounded-full ${i <= bars ? '' : 'opacity-20'}`}
        style={{
          height: `${6 + i * 4}px`,
          backgroundColor: i <= bars ? qualityColor : '#78909C',
        }}
      />
    ));
  };

  const supportedAdapters = [
    { name: 'OBDLink MX+', type: 'Bluetooth', profile: '18F0/2AF0-2AF1', recommended: true },
    { name: 'OBDLink CX', type: 'Bluetooth', profile: '18F0/2AF0-2AF1', recommended: true },
    { name: 'Vgate iCar Pro', type: 'Bluetooth', profile: 'FFE0/FFE1', recommended: true },
    { name: 'vLinker MC+', type: 'Bluetooth', profile: 'Nordic NUS', recommended: true },
    { name: 'vLinker FS/BM+', type: 'Bluetooth', profile: 'Nordic NUS', recommended: false },
    { name: 'Veepeak OBDCheck BLE+', type: 'Bluetooth', profile: 'FFE0/FFE1/FFE2', recommended: false },
    { name: 'ELM327 v1.5', type: 'Bluetooth/WiFi', profile: 'FFE0/FFE1', recommended: false },
    { name: 'Carly Universal', type: 'Bluetooth', profile: 'FFE0/FFE1', recommended: false },
  ];

  return (
    <div className="space-y-4 pb-2">
      {/* Connection Status */}
      <Card className={`border-2 ${isConnected ? 'border-evdx-green/20' : 'border-evdx-critical/20'} bg-[#1A2332]`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              isConnected ? 'bg-evdx-green/10' : 'bg-evdx-critical/10'
            }`}>
              {isDemo ? (
                <Zap size={28} className="text-evdx-primary" />
              ) : connectionMode === 'bluetooth' ? (
                <Bluetooth size={28} className={isConnected ? 'text-evdx-green' : 'text-evdx-critical'} />
              ) : (
                <Wifi size={28} className={isConnected ? 'text-evdx-green' : 'text-evdx-critical'} />
              )}
            </div>
            <div>
              <p className="text-sm text-evdx-text-secondary">{t('connectionStatusLabel')}</p>
              <p className={`text-lg font-bold ${isConnected ? 'text-evdx-green' : 'text-evdx-critical'}`}>
                {t(`connectionStatus.${connectionStatus}`)}
              </p>
              <Badge variant="outline" className="text-xs mt-1 border-white/10 text-evdx-text-secondary">
                {isDemo ? 'Demo Mode' : connectionMode === 'bluetooth' ? 'Bluetooth' : 'WiFi'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adapter Info */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">Adapter Information</span>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Name', value: deviceInfo.name || (isDemo ? 'EVDx Simulator' : 'Not connected'), icon: Info },
              { label: 'Type', value: deviceInfo.type || (isDemo ? 'Virtual' : '—'), icon: Cpu },
              { label: 'Firmware', value: deviceInfo.firmware || (isDemo ? '1.0.0-sim' : '—'), icon: Hash },
              { label: 'Chipset', value: deviceInfo.chipset || (isDemo ? 'Simulated' : '—'), icon: Fingerprint },
              { label: 'Protocol', value: deviceInfo.protocol || (isDemo ? 'ISO 15765-4 CAN (11-bit, 500 kbaud)' : '—'), icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-evdx-text-secondary">
                  <Icon size={12} />
                  {label}
                </span>
                <span className="text-sm text-evdx-text font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Clone Detection Warning */}
          {deviceInfo.isClone && (
            <div className="bg-evdx-warning/10 border border-evdx-warning/20 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-evdx-warning" />
              <div>
                <span className="text-xs text-evdx-warning font-medium">PIC Clone Detected</span>
                <p className="text-[10px] text-evdx-text-secondary mt-0.5">
                  This adapter uses a clone ELM327 chip. Basic OBD-II functions work, but some advanced features may be unreliable.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal & Quality */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Signal size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">Connection Quality</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0D1117] rounded-lg p-3">
              <p className="text-xs text-evdx-text-secondary mb-2">Signal Strength</p>
              <div className="flex items-end gap-1 mb-1">
                {signalBars(deviceInfo.signalStrength ?? -50)}
              </div>
              <p className="text-sm font-medium text-evdx-text tabular-nums">
                {deviceInfo.signalStrength ?? -50} dBm
              </p>
            </div>

            <div className="bg-[#0D1117] rounded-lg p-3">
              <p className="text-xs text-evdx-text-secondary mb-2">Quality</p>
              <Badge
                className="text-sm font-semibold px-3 py-1"
                style={{
                  backgroundColor: `${qualityColor}15`,
                  color: qualityColor,
                  borderColor: `${qualityColor}30`,
                }}
              >
                {deviceInfo.quality}
              </Badge>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-evdx-text-secondary">
                <Clock size={10} />
                <span>{deviceInfo.responseTime ?? 45} ms</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VIN & Voltage */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3">
            <p className="text-xs text-evdx-text-secondary mb-1">VIN</p>
            <p className="text-sm font-mono text-evdx-text truncate" title={deviceInfo.vin || (isDemo ? 'WVGZZZ5NZK' : '')}>
              {deviceInfo.vin || (isDemo ? 'WVGZZZ5NZK' : '—')}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3">
            <p className="text-xs text-evdx-text-secondary mb-1">Adapter Voltage</p>
            <p className="text-lg font-bold text-evdx-text tabular-nums">
              <AnimatedNumber value={deviceInfo.voltage || 12.4} decimals={1} suffix=" V" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supported Adapters */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-evdx-text mb-3">Supported Adapters</p>
          <div className="space-y-2">
            {supportedAdapters.map((adapter) => (
              <div key={adapter.name} className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm text-evdx-text">{adapter.name}</p>
                  <p className="text-[10px] text-evdx-text-secondary">{adapter.type} · {adapter.profile}</p>
                </div>
                {adapter.recommended ? (
                  <Badge className="text-[10px] bg-evdx-green/10 text-evdx-green border-evdx-green/30">Recommended</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-evdx-text-secondary border-white/10">Compatible</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* v1.5.2: Firmware Update Information
          Documents the official firmware update path for each adapter brand.
          EVDx itself cannot update adapter firmware — that requires the
          manufacturer's proprietary tool. This section tells the user where
          to get the tool and how to use it. */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-evdx-primary" />
            <p className="text-sm font-medium text-evdx-text">Firmware Update Information</p>
          </div>
          <p className="text-xs text-evdx-text-secondary mb-3 leading-relaxed">
            EVDx cannot update adapter firmware directly — each manufacturer provides their own update tool. If you're experiencing connection issues (e.g. "characteristics not found"), a firmware update may resolve them. Below is the official update path for each supported adapter:
          </p>
          <div className="space-y-3">
            {[
              {
                brand: 'Vgate iCar Pro',
                status: 'No public tool',
                notes: 'Vgate does not publish a firmware update tool. Firmware is closed-source and can only be updated via the manufacturer\'s internal PC tool (not distributed publicly). If your iCar Pro is from 2023+ and shows "characteristics not found", it likely uses the FFF0 BLE profile — try the "vGate iCar Pro v3+ (FFF0)" profile in the profile picker instead of updating firmware.',
                color: 'warning',
              },
              {
                brand: 'OBDLink MX+ / CX',
                status: 'OBDLink App (Android/iOS)',
                notes: 'Download the official "OBDLink" app from Play Store or App Store. Connect your adapter via the app, and it will automatically check for and offer firmware updates. Updates typically take 2-5 minutes and require the adapter to remain powered on.',
                color: 'green',
              },
              {
                brand: 'vLinker MC+ / FS / BM+',
                status: 'vLinker App (Android)',
                notes: 'Download the "vLinker" app from Play Store. The app detects your adapter and offers firmware updates when available. vLinker releases firmware updates several times per year — keeping your adapter up-to-date improves compatibility with newer vehicles.',
                color: 'green',
              },
              {
                brand: 'Veepeak OBDCheck BLE+',
                status: 'No public tool',
                notes: 'Veepeak does not provide a public firmware update tool. Contact Veepeak support (support@veepeak.com) if you suspect a firmware issue. Most Veepeak adapters use standard FFE0/FFE1/FFE2 profiles that EVDx already supports.',
                color: 'warning',
              },
              {
                brand: 'Carly Universal',
                status: 'Carly App (Android/iOS)',
                notes: 'The Carly app handles firmware updates for Carly adapters. Note: Carly requires a paid subscription for most features, but firmware updates are free. Connect via the Carly app to check for updates.',
                color: 'green',
              },
              {
                brand: 'Generic ELM327 clones',
                status: 'No update path',
                notes: 'Generic ELM327 clones (typically PIC-based, sold as "ELM327 v1.5" or "v2.1") cannot be firmware-updated — they run masked ROM, not flash. If a clone doesn\'t work with EVDx, try a different profile from the profile picker, or replace it with a genuine adapter (OBDLink or vLinker recommended).',
                color: 'critical',
              },
            ].map((item) => (
              <div key={item.brand} className="bg-[#0D1117] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-evdx-text">{item.brand}</span>
                  <Badge
                    className="text-[10px]"
                    style={{
                      backgroundColor: item.color === 'green' ? 'rgba(0, 230, 118, 0.1)' : item.color === 'warning' ? 'rgba(255, 179, 0, 0.1)' : 'rgba(255, 61, 0, 0.1)',
                      color: item.color === 'green' ? '#00E676' : item.color === 'warning' ? '#FFB300' : '#FF3D00',
                      borderColor: item.color === 'green' ? 'rgba(0, 230, 118, 0.3)' : item.color === 'warning' ? 'rgba(255, 179, 0, 0.3)' : 'rgba(255, 61, 0, 0.3)',
                    }}
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-evdx-text-secondary leading-relaxed">{item.notes}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

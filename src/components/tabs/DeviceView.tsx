'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/shared/Gauges';
import { Bluetooth, Wifi, Zap, Signal, Clock, Cpu, Hash, Shield, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

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
    { name: 'OBDLink MX+', type: 'Bluetooth', recommended: true },
    { name: 'Vgate iCar Pro', type: 'Bluetooth', recommended: true },
    { name: 'ELM327 v1.5', type: 'Bluetooth/WiFi', recommended: false },
    { name: 'Veepeak OBDCheck', type: 'Bluetooth', recommended: false },
    { name: 'Carly Universal', type: 'Bluetooth', recommended: false },
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
              <p className="text-sm text-evdx-text-secondary">{t('connectionStatus')}</p>
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
              { label: 'Protocol', value: deviceInfo.protocol || (isDemo ? 'ISO 15765 (CAN)' : '—'), icon: Shield },
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
                {signalBars(deviceInfo.signalStrength || -50)}
              </div>
              <p className="text-sm font-medium text-evdx-text tabular-nums">
                {deviceInfo.signalStrength || -50} dBm
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
                <span>{deviceInfo.responseTime || 45} ms</span>
              </div>
            </div>
          </div>

          {/* Clone Detection */}
          {deviceInfo.isClone && (
            <div className="bg-evdx-warning/10 border border-evdx-warning/20 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-evdx-warning" />
              <span className="text-xs text-evdx-warning">Clone adapter detected. Some features may not work correctly.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIN & Voltage */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3">
            <p className="text-xs text-evdx-text-secondary mb-1">VIN</p>
            <p className="text-sm font-mono text-evdx-text truncate">
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
                  <p className="text-xs text-evdx-text-secondary">{adapter.type}</p>
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
    </div>
  );
}

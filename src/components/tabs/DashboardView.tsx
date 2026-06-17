'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { SpeedGauge, CircleGauge, MiniChart, TempBar, AnimatedNumber } from '@/components/shared/Gauges';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Battery, Thermometer, Gauge as GaugeIcon, AlertTriangle, Activity } from 'lucide-react';

export default function DashboardView() {
  const { t } = useTranslation('dashboard');
  const { vehicleData, speedHistory, powerHistory, chargingData, dtcs, connectionStatus } = useAppStore();
  const isConnected = connectionStatus === 'connected';

  const socColor = vehicleData.soc > 50 ? '#00E676' : vehicleData.soc > 20 ? '#FFB300' : '#FF3D00';
  const modeColors: Record<string, string> = {
    eco: '#00E676',
    normal: '#00D2FF',
    sport: '#FF3D00',
    snow: '#90CAF9',
    track: '#7B2FBE',
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Speed & SOC Row */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex flex-col items-center">
          <SpeedGauge speed={vehicleData.speed} maxSpeed={180} size={200} />
        </div>
        <div className="flex flex-col items-center">
          <CircleGauge
            value={vehicleData.soc}
            size={120}
            strokeWidth={8}
            color={socColor}
            unit="%"
            label={t('soc')}
          />
        </div>
      </div>

      {/* Drive Mode & Power */}
      <div className="flex items-center justify-between px-2">
        <Badge
          className="text-xs font-medium px-3 py-1"
          style={{
            backgroundColor: `${modeColors[vehicleData.mode] || '#00D2FF'}20`,
            color: modeColors[vehicleData.mode] || '#00D2FF',
            borderColor: `${modeColors[vehicleData.mode] || '#00D2FF'}30`,
          }}
        >
          {t('mode')}: {vehicleData.mode.toUpperCase()}
        </Badge>

        <div className="flex items-center gap-1.5">
          <Zap size={16} className={vehicleData.power > 0 ? 'text-evdx-primary' : 'text-evdx-green'} />
          <span className={`text-lg font-bold tabular-nums ${vehicleData.power > 0 ? 'text-evdx-primary' : 'text-evdx-green'}`}>
            <AnimatedNumber value={vehicleData.power} decimals={1} suffix=" kW" />
          </span>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1A2332] border-white/5 card-glow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-evdx-primary/10 flex items-center justify-center shrink-0">
              <GaugeIcon size={18} className="text-evdx-primary" />
            </div>
            <div>
              <p className="text-xs text-evdx-text-secondary">{t('range')}</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={vehicleData.range} decimals={0} suffix=" km" />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A2332] border-white/5 card-glow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-evdx-purple/10 flex items-center justify-center shrink-0">
              <Activity size={18} className="text-evdx-purple" />
            </div>
            <div>
              <p className="text-xs text-evdx-text-secondary">{t('voltage')}</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={vehicleData.voltage} decimals={1} suffix=" V" />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A2332] border-white/5 card-glow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-evdx-green/10 flex items-center justify-center shrink-0">
              <Battery size={18} className="text-evdx-green" />
            </div>
            <div>
              <p className="text-xs text-evdx-text-secondary">{t('current')}</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={vehicleData.current} decimals={1} suffix=" A" />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A2332] border-white/5 card-glow">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-evdx-warning/10 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-evdx-warning" />
            </div>
            <div>
              <p className="text-xs text-evdx-text-secondary">{t('rpm')}</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={vehicleData.rpm} decimals={0} />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Temperature Bars */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer size={16} className="text-evdx-warning" />
            <span className="text-sm font-medium text-evdx-text">{t('motorTemp')} & {t('batteryTemp')}</span>
          </div>
          <TempBar
            value={vehicleData.motorTemp}
            label={t('motorTemp')}
            warningThreshold={90}
            criticalThreshold={110}
          />
          <TempBar
            value={vehicleData.batteryTemp}
            label={t('batteryTemp')}
            warningThreshold={45}
            criticalThreshold={55}
          />
          <TempBar
            value={vehicleData.inverterTemp}
            label={t('inverterTemp')}
            warningThreshold={85}
            criticalThreshold={100}
          />
        </CardContent>
      </Card>

      {/* Mini Charts */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3">
            <p className="text-xs text-evdx-text-secondary mb-2">{t('vehicleSpeed')}</p>
            <MiniChart
              data={speedHistory.map((p) => p.value)}
              width={140}
              height={40}
              color="#00D2FF"
              fillColor="#00D2FF"
            />
          </CardContent>
        </Card>
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3">
            <p className="text-xs text-evdx-text-secondary mb-2">{t('gauges.powerMeter')}</p>
            <MiniChart
              data={powerHistory.map((p) => p.value)}
              width={140}
              height={40}
              color="#7B2FBE"
              fillColor="#7B2FBE"
            />
          </CardContent>
        </Card>
      </div>

      {/* Smart Alerts */}
      {dtcs.length > 0 && (
        <Card className="bg-[#1A2332] border-evdx-critical/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-evdx-critical" />
              <span className="text-sm font-medium text-evdx-critical">Active Alerts</span>
            </div>
            {dtcs.slice(0, 3).map((dtc) => (
              <div key={dtc.code} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-sm text-evdx-text font-mono">{dtc.code}</span>
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    color: dtc.severity === 'critical' ? '#FF3D00' : dtc.severity === 'high' ? '#FFB300' : '#00D2FF',
                    borderColor: dtc.severity === 'critical' ? '#FF3D0030' : dtc.severity === 'high' ? '#FFB30030' : '#00D2FF30',
                  }}
                >
                  {dtc.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Charging Indicator */}
      {chargingData.isCharging && (
        <Card className="bg-[#1A2332] border-evdx-green/20 animate-charging-pulse">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-evdx-green/20 flex items-center justify-center">
              <Zap size={20} className="text-evdx-green" />
            </div>
            <div>
              <p className="text-sm font-medium text-evdx-green">{t('chargingState')}</p>
              <p className="text-xs text-evdx-text-secondary">
                {chargingData.power.toFixed(1)} kW • {chargingData.chargeType.toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isConnected && (
        <div className="text-center py-8">
          <p className="text-evdx-text-secondary text-sm">{t('noData')}</p>
        </div>
      )}
    </div>
  );
}

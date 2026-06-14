'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { CircleGauge, AnimatedNumber } from '@/components/shared/Gauges';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Zap, Clock, DollarSign, Battery, Activity, ZapOff } from 'lucide-react';

export default function ChargingView() {
  const { t } = useTranslation('charging');
  const { vehicleData, chargingData, setChargingType } = useAppStore();

  const chargeTypes = [
    { id: 'dc_fast' as const, label: t('chargeType.dcFast'), icon: Zap, color: '#FF3D00', power: '~50-150 kW' },
    { id: 'ac_l2' as const, label: t('chargeType.acL2'), icon: Activity, color: '#00D2FF', power: '~7-22 kW' },
    { id: 'ac_l1' as const, label: t('chargeType.acL1'), icon: ZapOff, color: '#78909C', power: '~1.4-1.9 kW' },
  ];

  const chargeCurveData = chargingData.chargeCurve.map((p) => ({
    soc: `${p.soc}%`,
    power: p.power,
  }));

  // Generate cell voltage visualization data — memoized to prevent infinite re-renders
  const cellData = useMemo(() => {
    if (chargingData.cellVoltages.length > 0) {
      return chargingData.cellVoltages.map((v, i) => ({
        cell: `C${i + 1}`,
        voltage: v / 1000,
      }));
    }
    // Stable fallback data instead of Math.random() in render
    return Array.from({ length: 16 }, (_, i) => ({
      cell: `C${i + 1}`,
      voltage: 3.30 + (i * 0.003),  // Stable slight variation
    }));
  }, [chargingData.cellVoltages]);

  const minutes = Math.floor(chargingData.timeRemaining);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <div className="space-y-4 pb-2">
      {/* SOC with charging animation */}
      <div className="flex justify-center">
        <div className={`relative ${chargingData.isCharging ? 'animate-charging-pulse' : ''}`}>
          <CircleGauge
            value={vehicleData.soc}
            size={180}
            strokeWidth={14}
            color="#00E676"
            unit="%"
            label={chargingData.isCharging ? t('status.charging') : t('status.notCharging')}
          />
          {chargingData.isCharging && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-evdx-green flex items-center justify-center animate-pulse">
              <Zap size={14} className="text-[#0D1117]" />
            </div>
          )}
        </div>
      </div>

      {/* Charge Type Selector */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-3">
          <p className="text-xs text-evdx-text-secondary mb-2">{t('chargeType.label')}</p>
          <div className="grid grid-cols-3 gap-2">
            {chargeTypes.map((ct) => {
              const isActive = chargingData.chargeType === ct.id;
              return (
                <Button
                  key={ct.id}
                  onClick={() => setChargingType(ct.id)}
                  className={`flex flex-col items-center gap-1 h-auto py-2 px-1 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-white/10 border-2 text-evdx-text'
                      : 'bg-[#0D1117] border border-white/5 text-evdx-text-secondary hover:bg-white/5'
                  }`}
                  style={isActive ? { borderColor: ct.color } : undefined}
                >
                  <ct.icon size={18} style={{ color: ct.color }} />
                  <span className="font-medium">{ct.label.split(' ').slice(-1)[0]}</span>
                  <span className="text-[10px] opacity-60">{ct.power}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charging Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <Zap size={18} className="text-evdx-primary mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('power')}</p>
            <p className="text-xl font-bold text-evdx-text tabular-nums">
              <AnimatedNumber value={chargingData.power} decimals={1} suffix=" kW" />
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <Clock size={18} className="text-evdx-warning mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('timeRemaining')}</p>
            <p className="text-xl font-bold text-evdx-text tabular-nums">
              {hours > 0 ? `${hours}h ` : ''}{mins}m
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <Battery size={18} className="text-evdx-green mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('energyAdded')}</p>
            <p className="text-xl font-bold text-evdx-text tabular-nums">
              <AnimatedNumber value={chargingData.energyAdded} decimals={1} suffix=" kWh" />
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <Activity size={18} className="text-evdx-purple mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('efficiency')}</p>
            <p className="text-xl font-bold text-evdx-text tabular-nums">
              <AnimatedNumber value={chargingData.efficiency} decimals={0} suffix="%" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Voltage & Current */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-evdx-text-secondary">Voltage</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={chargingData.voltage} decimals={0} suffix=" V" />
              </p>
            </div>
            <div>
              <p className="text-xs text-evdx-text-secondary">Current</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={chargingData.current} decimals={1} suffix=" A" />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Calculator */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-evdx-green" />
            <span className="text-sm font-medium text-evdx-text">{t('cost')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">OMR</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={chargingData.costOmr} decimals={3} />
              </p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">USD</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={chargingData.costUsd} decimals={2} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cell Voltage Balance */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-evdx-text mb-3">{t('cellBalance')}</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cellData}>
                <XAxis dataKey="cell" tick={{ fontSize: 8, fill: '#78909C' }} />
                <YAxis domain={[3.0, 3.6]} tick={{ fontSize: 8, fill: '#78909C' }} width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A2332', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#00D2FF' }}
                  formatter={(value: number) => [`${value.toFixed(3)}V`, 'Voltage']}
                />
                <Bar dataKey="voltage" radius={[2, 2, 0, 0]}>
                  {cellData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.voltage < 3.28 ? '#FF3D00' : entry.voltage > 3.38 ? '#FFB300' : '#00E676'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charge Curve */}
      {chargeCurveData.length > 0 && (
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-evdx-text mb-3">{t('chargeCurve')}</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chargeCurveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2332" />
                  <XAxis dataKey="soc" tick={{ fontSize: 10, fill: '#78909C' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#78909C' }} width={30} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A2332', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="power" stroke="#00D2FF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

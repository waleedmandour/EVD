'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { CircleGauge, AnimatedNumber, TempBar } from '@/components/shared/Gauges';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Battery, Heart, Thermometer, Shield, Zap, Activity } from 'lucide-react';

export default function BatteryView() {
  const { t } = useTranslation('battery');
  const { vehicleData, batteryHistory, activeVehicle } = useAppStore();

  const sohColor = vehicleData.soh > 80 ? '#00E676' : vehicleData.soh > 70 ? '#FFB300' : vehicleData.soh > 60 ? '#FF9800' : '#FF3D00';
  const sohLabel = vehicleData.soh > 80 ? t('healthStatus.excellent') : vehicleData.soh > 70 ? t('healthStatus.good') : vehicleData.soh > 60 ? t('healthStatus.fair') : t('healthStatus.poor');

  const chartData = batteryHistory.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    soc: p.value,
  }));

  return (
    <div className="space-y-4 pb-2">
      {/* SOC Circle */}
      <div className="flex justify-center">
        <CircleGauge
          value={vehicleData.soc}
          size={180}
          strokeWidth={14}
          color={vehicleData.soc > 50 ? '#00E676' : vehicleData.soc > 20 ? '#FFB300' : '#FF3D00'}
          unit="%"
          label={t('stateOfCharge')}
        />
      </div>

      {/* SOH */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${sohColor}15` }}>
                <Heart size={24} style={{ color: sohColor }} />
              </div>
              <div>
                <p className="text-sm text-evdx-text-secondary">{t('stateOfHealth')}</p>
                <p className="text-2xl font-bold text-evdx-text">
                  <AnimatedNumber value={vehicleData.soh} decimals={0} suffix="%" />
                </p>
              </div>
            </div>
            <Badge
              className="text-xs font-medium px-3 py-1"
              style={{
                backgroundColor: `${sohColor}20`,
                color: sohColor,
                borderColor: `${sohColor}30`,
              }}
            >
              {sohLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pack Voltage & Current */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <Zap size={18} className="text-evdx-primary mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('packVoltage')}</p>
            <p className="text-xl font-bold text-evdx-text tabular-nums">
              <AnimatedNumber value={vehicleData.voltage} decimals={1} suffix=" V" />
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <Activity size={18} className="text-evdx-purple mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('packCurrent')}</p>
            <p className="text-xl font-bold text-evdx-text tabular-nums">
              <AnimatedNumber value={vehicleData.current} decimals={1} suffix=" A" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cell Voltage Info */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Battery size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">{t('cellVoltage')}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-evdx-text-secondary">{t('maxCell')}</p>
              <p className="text-sm font-bold text-evdx-green tabular-nums">
                {(vehicleData.cellMaxV / 1000).toFixed(3)} V
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-evdx-text-secondary">{t('minCell')}</p>
              <p className="text-sm font-bold text-evdx-warning tabular-nums">
                {(vehicleData.cellMinV / 1000).toFixed(3)} V
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-evdx-text-secondary">{t('cellDelta')}</p>
              <p className={`text-sm font-bold tabular-nums ${vehicleData.cellDeltaV > 50 ? 'text-evdx-critical' : vehicleData.cellDeltaV > 30 ? 'text-evdx-warning' : 'text-evdx-green'}`}>
                {vehicleData.cellDeltaV} mV
              </p>
            </div>
          </div>
          {/* Cell balance bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-evdx-text-secondary">
              <span>{t('balance')}</span>
              <span>{vehicleData.cellDeltaV < 20 ? 'Good' : vehicleData.cellDeltaV < 50 ? 'Fair' : 'Poor'}</span>
            </div>
            <div className="h-2 bg-[#0D1117] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(100 - (vehicleData.cellDeltaV / 2), 10)}%`,
                  backgroundColor: vehicleData.cellDeltaV < 20 ? '#00E676' : vehicleData.cellDeltaV < 50 ? '#FFB300' : '#FF3D00',
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battery Temperature */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Thermometer size={16} className="text-evdx-warning" />
            <span className="text-sm font-medium text-evdx-text">{t('thermalManagement')}</span>
          </div>
          <TempBar value={vehicleData.batteryTemp} label={t('cellTemperature')} warningThreshold={45} criticalThreshold={55} />
          <TempBar value={vehicleData.coolantInletTemp} label={t('coolantTemp')} warningThreshold={50} criticalThreshold={65} />
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="text-center bg-[#0D1117] rounded-lg p-2">
              <p className="text-xs text-evdx-text-secondary">BMS Status</p>
              <p className="text-sm font-medium text-evdx-primary capitalize">{vehicleData.bmsStatus}</p>
            </div>
            <div className="text-center bg-[#0D1117] rounded-lg p-2">
              <p className="text-xs text-evdx-text-secondary">{t('insulationResistance')}</p>
              <p className="text-sm font-medium text-evdx-green tabular-nums">{vehicleData.insulationResistance} kΩ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOC History Chart */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-evdx-text mb-3">{t('capacityChart')}</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2332" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#78909C' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#78909C' }} width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A2332', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#78909C' }}
                  itemStyle={{ color: '#00D2FF' }}
                />
                <Line type="monotone" dataKey="soc" stroke="#00D2FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Battery Specifications */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-evdx-purple" />
            <span className="text-sm font-medium text-evdx-text">Specifications</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-[#0D1117] rounded-lg p-2">
              <p className="text-xs text-evdx-text-secondary">{t('chemistry')}</p>
              <p className="text-evdx-text font-medium">{activeVehicle?.brand === 'BYD' ? 'LFP' : 'NMC'}</p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-2">
              <p className="text-xs text-evdx-text-secondary">{t('nominalCapacity')}</p>
              <p className="text-evdx-text font-medium">{activeVehicle?.batteryCapacity || 60} kWh</p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-2">
              <p className="text-xs text-evdx-text-secondary">{t('cellCount')}</p>
              <p className="text-evdx-text font-medium">~{Math.round(vehicleData.voltage / (vehicleData.cellMaxV / 1000))}</p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-2">
              <p className="text-xs text-evdx-text-secondary">{t('degradation')}</p>
              <p className={`font-medium ${vehicleData.soh > 90 ? 'text-evdx-green' : vehicleData.soh > 80 ? 'text-evdx-warning' : 'text-evdx-critical'}`}>
                {(100 - vehicleData.soh).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

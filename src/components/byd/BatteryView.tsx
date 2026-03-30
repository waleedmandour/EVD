'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { MiniChart } from './gauges';
import { Battery, Zap, Thermometer, Activity, TrendingUp, TrendingDown } from 'lucide-react';

export function BatteryView() {
  const { vehicleData, batteryHistory } = useAppStore();
  const v = vehicleData;

  const socData = batteryHistory.map((e) => e.soc);
  const voltageData = batteryHistory.map((e) => e.voltage);
  const tempData = batteryHistory.map((e) => e.temp);

  // Battery health indicators (simulated for demo)
  const healthData = [
    { label: 'State of Health (SOH)', value: '94.2%', status: 'good' as const },
    { label: 'Cell Balancing', value: 'Active', status: 'good' as const },
    { label: 'Insulation Resistance', value: '2.4 MOhm', status: 'good' as const },
    { label: 'Cycle Count', value: '312', status: 'good' as const },
    { label: 'Max Cell Voltage', value: '3.478V', status: 'good' as const },
    { label: 'Min Cell Voltage', value: '3.452V', status: 'good' as const },
    { label: 'Cell Voltage Delta', value: '26mV', status: 'good' as const },
  ];

  // Battery spec info
  const specs = [
    { label: 'Battery Type', value: 'BYD Blade (LFP)' },
    { label: 'Nominal Capacity', value: '60.48 kWh' },
    { label: 'Pack Voltage', value: `${v.batteryVoltage.toFixed(1)}V (nominal 384V)` },
    { label: 'Cell Count', value: '120S1P' },
    { label: 'Cell Chemistry', value: 'LiFePO4' },
    { label: 'Cooling', value: 'Liquid Cooled' },
  ];

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Big SOC display */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-5 border border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Battery className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">Battery State of Charge</span>
          </div>
          <span className={`text-3xl font-bold tabular-nums ${
            v.batterySOC < 20 ? 'text-red-400' : v.batterySOC < 40 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {v.batterySOC.toFixed(1)}%
          </span>
        </div>

        {/* SOC bar */}
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              v.batterySOC < 20 ? 'bg-red-400' : v.batterySOC < 40 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${v.batterySOC}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-600">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Zap className="w-4 h-4 text-violet-400" />}
          label="Pack Voltage"
          value={v.batteryVoltage.toFixed(1)}
          unit="V"
        />
        <MetricCard
          icon={<Activity className="w-4 h-4 text-cyan-400" />}
          label="Current"
          value={v.batteryCurrent.toFixed(1)}
          unit="A"
          subtext={v.batteryCurrent < 0 ? 'Charging' : 'Discharging'}
          subColor={v.batteryCurrent < 0 ? 'text-emerald-400' : 'text-amber-400'}
        />
        <MetricCard
          icon={<Thermometer className="w-4 h-4 text-orange-400" />}
          label="Pack Temp"
          value={v.batteryTemp.toFixed(1)}
          unit="°C"
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          label="Est. Range"
          value={Math.round(v.estimatedRange).toString()}
          unit="km"
        />
      </div>

      {/* SOC History chart */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-2 block">SOC History</span>
        <MiniChart data={socData} height={55} color="#34d399" fillColor="rgba(16,185,129,0.1)"
          maxVal={100} minVal={0} />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>{socData.length > 0 ? `${socData[0].toFixed(1)}%` : ''}</span>
          <span>{socData.length > 0 ? `${socData[socData.length - 1].toFixed(1)}%` : ''}</span>
        </div>
      </div>

      {/* Voltage History chart */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-2 block">Pack Voltage History</span>
        <MiniChart data={voltageData} height={55} color="#8b5cf6" fillColor="rgba(139,92,246,0.1)"
          maxVal={420} minVal={300} />
      </div>

      {/* Temperature History chart */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-2 block">Pack Temperature History</span>
        <MiniChart data={tempData} height={55} color="#f97316" fillColor="rgba(249,115,22,0.1)"
          maxVal={55} minVal={15} />
      </div>

      {/* Battery Health */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-3 block">Battery Health Diagnostics</span>
        <div className="flex flex-col gap-2">
          {healthData.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-700/20 last:border-0">
              <span className="text-xs text-slate-400">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white font-medium tabular-nums">{item.value}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Battery Specs */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-3 block">Battery Specifications</span>
        <div className="flex flex-col gap-2">
          {specs.map((spec, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-700/20 last:border-0">
              <span className="text-xs text-slate-400">{spec.label}</span>
              <span className="text-xs text-white">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, value, unit, subtext, subColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  subtext?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white tabular-nums">{value}</span>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      {subtext && (
        <span className={`text-[10px] mt-0.5 block ${subColor || 'text-slate-500'}`}>{subtext}</span>
      )}
    </div>
  );
}

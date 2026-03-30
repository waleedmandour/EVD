'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { SpeedGauge, GaugeCircle, StatusBadge, MiniChart } from './gauges';
import { SmartAlerts } from './SmartAlerts';
import {
  Battery, Zap, Thermometer, Gauge, Activity,
  MapPin, RotateCcw, Wind, Snowflake, ChevronRight,
} from 'lucide-react';

export function DashboardView() {
  const { vehicleData, speedHistory, powerHistory } = useAppStore();
  const v = vehicleData;

  const powerColor = v.batteryPower < -5
    ? 'text-emerald-400'  // regen
    : v.batteryPower > 30
      ? 'text-amber-400'   // high draw
      : 'text-white';      // normal

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Smart Alerts */}
      <SmartAlerts />

      {/* Speed Gauge - Hero */}
      <div className="flex justify-center pt-2">
        <SpeedGauge speed={v.speed} />
      </div>

      {/* Drive mode + status row */}
      <div className="flex items-center justify-center gap-2">
        <StatusBadge active label={`Drive: ${v.driveMode}`}
          activeColor="bg-blue-500/20 text-blue-400 border-blue-500/30" />
        <StatusBadge active={v.regenBraking} label="Regen" />
        <StatusBadge active={v.hvacActive} label="HVAC"
          activeColor="bg-cyan-500/20 text-cyan-400 border-cyan-500/30" />
      </div>

      {/* Main metrics row */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {/* Battery SOC */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/30 flex flex-col items-center relative">
          <GaugeCircle
            value={v.batterySOC}
            min={0} max={100}
            size={110} strokeWidth={8}
            colorClass={v.batterySOC < 20 ? 'stroke-red-400' : v.batterySOC < 40 ? 'stroke-amber-400' : 'stroke-emerald-400'}
            label="Battery" unit="%"
            decimals={1}
          />
        </div>

        {/* Power */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/30 flex flex-col items-center relative">
          <GaugeCircle
            value={Math.abs(v.batteryPower)}
            min={0} max={120}
            size={110} strokeWidth={8}
            colorClass={v.batteryPower < -5 ? 'stroke-cyan-400' : v.batteryPower > 30 ? 'stroke-amber-400' : 'stroke-violet-400'}
            label={v.batteryPower < -5 ? 'Regen Power' : 'Motor Power'}
            unit="kW"
            decimals={1}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 px-1">
        <StatCard icon={<MapPin className="w-3.5 h-3.5" />} label="Range" value={`${Math.round(v.estimatedRange)}`} unit="km" />
        <StatCard icon={<Gauge className="w-3.5 h-3.5" />} label="Motor" value={Math.round(v.rpm)} unit="RPM" />
        <StatCard icon={<Zap className="w-3.5 h-3.5" />} label="Voltage" value={v.batteryVoltage.toFixed(0)} unit="V" />
      </div>

      {/* Speed chart */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Speed Profile</span>
          <span className="text-xs text-slate-600">{speedHistory.length > 0 ? `${Math.round(speedHistory[speedHistory.length - 1])} km/h` : '--'}</span>
        </div>
        <MiniChart data={speedHistory} height={50} color="#34d399" fillColor="rgba(16,185,129,0.08)" />
      </div>

      {/* Power chart */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Power Flow</span>
          <span className={`text-xs font-medium ${powerColor}`}>
            {v.batteryPower >= 0 ? `${v.batteryPower.toFixed(1)} kW draw` : `${Math.abs(v.batteryPower).toFixed(1)} kW regen`}
          </span>
        </div>
        <MiniChart
          data={powerHistory}
          height={50}
          color="#8b5cf6"
          fillColor="rgba(139,92,246,0.08)"
          showZero
          maxVal={60}
          minVal={-40}
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>Regen</span>
          <span>0 kW</span>
          <span>Draw</span>
        </div>
      </div>

      {/* Temperatures */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-3 block">Temperatures</span>
        <div className="flex flex-col gap-2.5">
          <TempBar label="Motor" value={v.motorTemp} max={100} warn={75} critical={90} />
          <TempBar label="Battery Pack" value={v.batteryTemp} max={55} warn={42} critical={48} />
          <TempBar label="Cabin" value={v.cabinTemp} max={45} warn={35} critical={40} />
          <TempBar label="Ambient" value={v.ambientTemp} max={55} warn={45} critical={50} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="bg-slate-800/40 rounded-xl px-3 py-2.5 border border-slate-700/30 flex items-center gap-2.5">
      <div className="text-slate-500">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold text-white">{value}</span>
          <span className="text-[10px] text-slate-500">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function TempBar({ label, value, max, warn, critical }: { label: string; value: number; max: number; warn: number; critical: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = value >= critical
    ? 'bg-red-400'
    : value >= warn
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-slate-300 font-medium w-10 text-right tabular-nums">
        {value.toFixed(1)}&deg;C
      </span>
    </div>
  );
}

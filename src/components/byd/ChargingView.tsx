'use client';

import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { MiniChart } from './gauges';
import {
  Zap, Thermometer, Clock, Battery, Activity, TrendingUp,
  Plug, CircleDot, ChevronRight, RotateCcw, Play, Square,
} from 'lucide-react';
import {
  startChargingSimulator, stopChargingSimulator, isChargingSimRunning,
  startSimulator, stopSimulator,
} from '@/lib/simulator';
import type { ChargingType } from '@/lib/types';

const CHARGE_TYPES: { type: ChargingType; label: string; power: string; time: string; icon: string; desc: string }[] = [
  { type: 'dc_fast', label: 'DC Fast Charge', power: '60 kW', time: '~45 min to 80%', icon: '⚡', desc: 'CCS2 public fast charger' },
  { type: 'ac_l2', label: 'AC Level 2', power: '7.2 kW', time: '~9 hrs full', icon: '🔌', desc: 'Wallbox / public AC charger' },
  { type: 'ac_l1', label: 'AC Level 1', power: '1.8 kW', time: '~36 hrs full', icon: '🔌', desc: 'Standard household outlet' },
];

export function ChargingView() {
  const { vehicleData, chargingData, isChargingSim } = useAppStore();
  const c = chargingData;
  const v = vehicleData;
  const isCharging = c.isActive;

  const handleStartCharge = useCallback((type: ChargingType) => {
    if (isChargingSim) {
      stopChargingSimulator();
    }
    stopSimulator();
    startChargingSimulator(type, v.batterySOC);
  }, [v.batterySOC, isChargingSim]);

  const handleStopCharge = useCallback(() => {
    stopChargingSimulator();
    // Resume driving simulator
    setTimeout(() => startSimulator(), 200);
  }, []);

  const socPercent = v.batterySOC;
  const socColor = socPercent < 20 ? 'text-red-400' : socPercent < 40 ? 'text-amber-400' : 'text-emerald-400';
  const socBarColor = socPercent < 20 ? 'bg-red-400' : socPercent < 40 ? 'bg-amber-400' : 'bg-emerald-400';

  const chargeTypeLabel = c.type === 'dc_fast' ? 'DC Fast (CCS2)' : c.type === 'ac_l2' ? 'AC Level 2 (7.2kW)' : c.type === 'ac_l1' ? 'AC Level 1 (1.8kW)' : '';

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  };

  const costOMR = c.energyAdded * 0.05;
  const costUSD = c.energyAdded * 0.13;

  // Charging curve data
  const powerHistory = c.history.map(h => h.power);
  const socHistory = c.history.map(h => h.soc);
  const tempHistory = c.history.map(h => h.temp);

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className={`w-5 h-5 ${isCharging ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="text-sm font-medium text-slate-300">Charging Monitor</span>
        </div>
        {isCharging && (
          <button onClick={handleStopCharge}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs font-medium transition-colors">
            <Square className="w-3 h-3" />
            Stop
          </button>
        )}
      </div>

      {/* Hero: Large SOC + Charging Status */}
      <div className={`rounded-2xl p-5 border ${isCharging ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20' : 'bg-slate-800/40 border-slate-700/30'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">State of Charge</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-5xl font-bold tabular-nums ${socColor}`}>
                {socPercent.toFixed(1)}
              </span>
              <span className="text-xl text-slate-500">%</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isCharging ? (
              <>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">Charging</span>
                </div>
                <span className="text-[10px] text-slate-500">{chargeTypeLabel}</span>
              </>
            ) : (
              <span className="text-xs text-slate-500 px-2.5 py-1 rounded-full bg-slate-700/50 border border-slate-600/30">
                Not Charging
              </span>
            )}
          </div>
        </div>

        {/* SOC bar with charging animation */}
        <div className="relative h-4 bg-slate-700/50 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-700 ${socBarColor}`}
            style={{ width: `${socPercent}%` }}
          />
          {isCharging && (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" style={{ width: '50%', animation: 'shimmer 2s infinite' }} />
            </div>
          )}
          {/* SOC milestone markers */}
          {[20, 50, 80].map((mark) => (
            <div key={mark} className="absolute top-0 bottom-0 w-px bg-slate-600/40" style={{ left: `${mark}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>0%</span><span>20%</span><span>50%</span><span>80%</span><span>100%</span>
        </div>
      </div>

      {/* Charging metrics (visible when charging or has data) */}
      {isCharging && (
        <>
          {/* Power, Voltage, Current */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              icon={<Zap className="w-4 h-4 text-emerald-400" />}
              label="Power"
              value={c.power.toFixed(1)}
              unit="kW"
              bar={c.power / (c.type === 'dc_fast' ? 60 : c.type === 'ac_l2' ? 7.2 : 1.8)}
              barColor="bg-emerald-400"
            />
            <MetricCard
              icon={<Activity className="w-4 h-4 text-cyan-400" />}
              label="Voltage"
              value={c.voltage.toFixed(0)}
              unit="V"
              bar={c.voltage / 420}
              barColor="bg-cyan-400"
            />
            <MetricCard
              icon={<CircleDot className="w-4 h-4 text-violet-400" />}
              label="Current"
              value={c.current.toFixed(1)}
              unit="A"
              bar={c.current / 160}
              barColor="bg-violet-400"
            />
          </div>

          {/* Time & Energy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Time Remaining</span>
              </div>
              <span className="text-xl font-bold text-white tabular-nums">
                {c.estimatedMinutesLeft > 60
                  ? `${Math.floor(c.estimatedMinutesLeft / 60)}h ${String(c.estimatedMinutesLeft % 60).padStart(2, '0')}m`
                  : `${c.estimatedMinutesLeft}m`}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Elapsed: {formatTime(c.elapsedSeconds)}
              </span>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Energy Added</span>
              </div>
              <span className="text-xl font-bold text-emerald-400 tabular-nums">
                {c.energyAdded.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 ml-1">kWh</span>
              <div className="text-[10px] text-slate-500 mt-0.5">
                +{(socPercent - c.startedSOC).toFixed(1)}% · Eff: {c.chargeEfficiency}%
              </div>
            </div>
          </div>

          {/* Cost estimate */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">💰</span>
              <span className="text-xs text-slate-400 font-medium">Charge Session Cost</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <span className="text-lg font-bold text-white tabular-nums">{costOMR.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block">OMR</span>
                <span className="text-[9px] text-slate-600">(@ 0.050/kWh)</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white tabular-nums">{costUSD.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block">USD</span>
                <span className="text-[9px] text-slate-600">(@ $0.13/kWh)</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white tabular-nums">
                  {socPercent > 0 ? ((costOMR / socPercent) * 100).toFixed(3) : '0.000'}
                </span>
                <span className="text-[10px] text-slate-500 block">OMR/100%</span>
              </div>
            </div>
          </div>

          {/* Charging power curve */}
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Charging Power Curve</span>
              <span className="text-xs text-emerald-400 font-medium tabular-nums">{c.power.toFixed(1)} kW</span>
            </div>
            <MiniChart data={powerHistory} height={50} color="#34d399" fillColor="rgba(16,185,129,0.1)"
              maxVal={c.type === 'dc_fast' ? 65 : 8} minVal={0} />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>Start</span>
              <span>kW</span>
              <span>Full</span>
            </div>
          </div>

          {/* SOC during charge */}
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">SOC During Charge</span>
              <span className="text-xs text-slate-500 tabular-nums">{socPercent.toFixed(1)}%</span>
            </div>
            <MiniChart data={socHistory} height={45} color="#8b5cf6" fillColor="rgba(139,92,246,0.08)"
              maxVal={100} minVal={0} />
          </div>

          {/* Battery temp during charge */}
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Battery Temperature</span>
              <span className={`text-xs tabular-nums font-medium ${c.batteryTemp > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {c.batteryTemp.toFixed(1)}°C
              </span>
            </div>
            <MiniChart data={tempHistory} height={40} color="#f97316" fillColor="rgba(249,115,22,0.08)"
              maxVal={50} minVal={20} />
          </div>

          {/* Cell Balancing */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <span className="text-xs text-slate-400 font-medium mb-3 block">Cell Voltage Balance</span>
            <div className="grid grid-cols-3 gap-3">
              <CellStat label="Max Cell" value={c.cellMaxVoltage.toFixed(3)} unit="V" color="text-amber-400" />
              <CellStat label="Min Cell" value={c.cellMinVoltage.toFixed(3)} unit="V" color="text-cyan-400" />
              <CellStat label="Delta" value={c.cellDelta.toFixed(0)} unit="mV"
                color={c.cellDelta > 30 ? 'text-red-400' : c.cellDelta > 15 ? 'text-amber-400' : 'text-emerald-400'} />
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              LFP cell range: 2.50V (empty) → 3.65V (full). Delta &lt;20 mV indicates healthy balance.
            </p>
          </div>
        </>
      )}

      {/* Charge session summary (when stopped with data) */}
      {!isCharging && c.energyAdded > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
          <span className="text-xs text-slate-400 font-medium mb-3 block">Last Charge Session</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/20">
              <span className="text-[11px] text-slate-500">Energy Added</span>
              <span className="text-xs text-emerald-400 font-medium tabular-nums">{c.energyAdded.toFixed(2)} kWh</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/20">
              <span className="text-[11px] text-slate-500">Duration</span>
              <span className="text-xs text-white tabular-nums">{formatTime(c.elapsedSeconds)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/20">
              <span className="text-[11px] text-slate-500">SOC Range</span>
              <span className="text-xs text-white tabular-nums">{c.startedSOC.toFixed(1)}% → {socPercent.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-700/20">
              <span className="text-[11px] text-slate-500">Efficiency</span>
              <span className="text-xs text-white tabular-nums">{c.chargeEfficiency}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Charger selector (when not charging) */}
      {!isCharging && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400 font-medium">Start Charging Simulation</span>
          </div>
          <div className="flex flex-col gap-2">
            {CHARGE_TYPES.map((ct) => (
              <button
                key={ct.type}
                onClick={() => handleStartCharge(ct.type)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:bg-slate-800 hover:border-emerald-500/30 text-left transition-all group"
              >
                <span className="text-lg">{ct.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{ct.label}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{ct.power}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{ct.desc} · {ct.time}</span>
                </div>
                <Play className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BYD Yuan Plus charging specs */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/20">
        <span className="text-xs text-slate-400 font-medium mb-2 block">BYD Yuan Plus — Charging Specifications</span>
        <div className="flex flex-col gap-2 text-[11px] text-slate-500 leading-relaxed">
          <p><strong className="text-slate-400">DC Fast (CCS2):</strong> Up to 60 kW, 10–80% in ~38 minutes. Taper begins at ~78%. Max voltage 403V, max current 150A.</p>
          <p><strong className="text-slate-400">AC Level 2 (Type 2):</strong> Up to 7.2 kW (32A / 230V single-phase). 0–100% in ~8.5 hours. Ideal for overnight home charging.</p>
          <p><strong className="text-slate-400">AC Level 1:</strong> Up to 1.8 kW (10A / 180V). Emergency/slow charging only. 0–100% in ~34 hours.</p>
          <p><strong className="text-slate-400">Battery:</strong> 60.48 kWh BYD Blade Battery (LiFePO4). 120S1P configuration. Liquid thermal management with pre-conditioning support.</p>
          <p><strong className="text-slate-400">Charge Curve:</strong> LFP chemistry maintains constant current for most of the charge cycle, then tapers above ~78% SOC (DC) or ~92% (AC).</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, unit, bar, barColor }: {
  icon: React.ReactNode; label: string; value: string; unit: string;
  bar: number; barColor: string;
}) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-xl font-bold text-white tabular-nums">{value}</span>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.max(Math.min(bar * 100, 100), 0)}%` }} />
      </div>
    </div>
  );
}

function CellStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="text-center">
      <span className="text-[10px] text-slate-500 block">{label}</span>
      <div className="flex items-baseline justify-center gap-0.5">
        <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { MiniChart } from './gauges';
import {
  Leaf, Zap, Gauge, Footprints, BarChart3,
  Download, Trash2, CircleDot, TrendingUp, Activity,
} from 'lucide-react';

export function SessionView() {
  const { ecoScore, sessionLog, isLogging, setIsLogging, clearSessionLog,
    tripData, vehicleData } = useAppStore();

  const handleExportCSV = useCallback(() => {
    if (sessionLog.length === 0) return;
    const headers = ['Time', 'Speed(km/h)', 'RPM', 'SOC(%)', 'Voltage(V)', 'Current(A)',
      'Power(kW)', 'BattTemp(C)', 'MotorTemp(C)', 'Ambient(C)', 'Regen'];
    const rows = sessionLog.map((e) => [
      new Date(e.time).toISOString(),
      e.speed.toFixed(1), e.rpm, e.soc.toFixed(1), e.voltage.toFixed(1),
      e.current.toFixed(1), e.power.toFixed(1), e.batteryTemp.toFixed(1),
      e.motorTemp.toFixed(1), e.ambientTemp.toFixed(1), e.regenBraking ? '1' : '0',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evd-session-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionLog]);

  const ecoColor = (val: number) =>
    val >= 80 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Eco Driving Score */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-5 border border-slate-700/30 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Leaf className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Eco Driving Score</span>
        </div>
        <div className="relative w-32 h-32 mx-auto mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" className="stroke-slate-700/50" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none"
              className={ecoScore.overall >= 80 ? 'stroke-emerald-400' : ecoScore.overall >= 50 ? 'stroke-amber-400' : 'stroke-red-400'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(ecoScore.overall / 100) * 264} 264`}
              style={{ transition: 'stroke-dasharray 0.5s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold tabular-nums ${ecoColor(ecoScore.overall)}`}>
              {ecoScore.overall}
            </span>
            <span className="text-[10px] text-slate-500">/100</span>
          </div>
        </div>
        <span className={`text-sm font-medium ${ecoColor(ecoScore.overall)}`}>
          {ecoScore.overall >= 85 ? 'Excellent' : ecoScore.overall >= 70 ? 'Good' :
            ecoScore.overall >= 50 ? 'Average' : 'Needs Improvement'}
        </span>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreBar icon={<Zap className="w-3.5 h-3.5" />}
          label="Acceleration" score={ecoScore.acceleration} />
        <ScoreBar icon={<Activity className="w-3.5 h-3.5" />}
          label="Braking" score={ecoScore.braking} />
        <ScoreBar icon={<Gauge className="w-3.5 h-3.5" />}
          label="Speed" score={ecoScore.speed} />
        <ScoreBar icon={<BarChart3 className="w-3.5 h-3.5" />}
          label="Efficiency" score={ecoScore.efficiency} />
      </div>

      {/* Eco Score History */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-2 block">Score History</span>
        <MiniChart data={ecoScore.history} height={50}
          color="#34d399" fillColor="rgba(16,185,129,0.08)"
          maxVal={100} minVal={0} />
      </div>

      {/* Data Logger */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Session Data Logger</span>
          </div>
          <div className="flex items-center gap-2">
            {isLogging && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[10px] text-red-400">REC</span>
              </div>
            )}
            <span className="text-[10px] text-slate-600">
              {sessionLog.length} entries
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setIsLogging(!isLogging)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLogging
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
            }`}>
            {isLogging ? 'Stop Recording' : 'Start Recording'}
          </button>
          <button onClick={handleExportCSV} disabled={sessionLog.length === 0}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-700 transition-colors disabled:opacity-40">
            <span className="flex items-center justify-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </span>
          </button>
          {sessionLog.length > 0 && (
            <button onClick={clearSessionLog}
              className="py-2 px-3 rounded-lg text-sm font-medium bg-slate-700/50 text-red-400 border border-slate-600/30 hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {sessionLog.length > 0 && (
          <div className="mt-3 text-[10px] text-slate-600">
            Logging at ~2 Hz. Recording: {tripData.duration}s ·
            {tripData.distance.toFixed(2)} km · {sessionLog.length} data points
          </div>
        )}
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <LiveStat label="Speed" value={`${vehicleData.speed.toFixed(0)}`} unit="km/h"
          active={vehicleData.speed > 0} />
        <LiveStat label="Power" value={`${vehicleData.batteryPower.toFixed(1)}`} unit="kW"
          active={Math.abs(vehicleData.batteryPower) > 1}
          warn={vehicleData.batteryPower > 30} />
        <LiveStat label="SOC" value={`${vehicleData.batterySOC.toFixed(1)}`} unit="%"
          active low={vehicleData.batterySOC < 30} />
        <LiveStat label="Regen" value={vehicleData.regenBraking ? 'ON' : 'OFF'} unit=""
          active={vehicleData.regenBraking} accent />
        <LiveStat label="Mode" value={vehicleData.driveMode} unit="" />
        <LiveStat label="Temp" value={`${vehicleData.motorTemp.toFixed(1)}`} unit="°C"
          active={vehicleData.motorTemp > 50} warn={vehicleData.motorTemp > 75} />
      </div>

      {/* Driving Tips */}
      <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/20">
        <span className="text-xs text-slate-400 font-medium mb-2 block">Eco Driving Tips for BYD EVs</span>
        <div className="flex flex-col gap-2 text-[11px] text-slate-500 leading-relaxed">
          <TipRow icon="1" text="Use regen braking to recover energy. Lift off the accelerator smoothly and let the motor recapture kinetic energy." />
          <TipRow icon="2" text="In ECO mode, the BYD Yuan Plus limits motor output to 100 kW, extending range by ~8-12%." />
          <TipRow icon="3" text="Maintain 60-80 km/h on highways for optimal efficiency. Above 110 km/h, range drops significantly due to aerodynamic drag." />
          <TipRow icon="4" text="Pre-condition the cabin while plugged in to save battery energy for driving." />
          <TipRow icon="5" text="Keep tires at recommended pressure (2.5 bar) — under-inflated tires increase rolling resistance by 3-5%." />
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const barColor = score >= 80 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[10px] text-slate-500">{label}</span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${color}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function LiveStat({ label, value, unit, active, warn, accent }: {
  label: string; value: string; unit: string; active?: boolean; warn?: boolean; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl px-3 py-2.5 border transition-colors ${
      active
        ? accent ? 'bg-emerald-500/10 border-emerald-500/20'
          : warn ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-cyan-500/10 border-cyan-500/20'
        : 'bg-slate-800/40 border-slate-700/30'
    }`}>
      <span className="text-[10px] text-slate-500 block">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-sm font-bold tabular-nums ${
          active ? (accent ? 'text-emerald-400' : warn ? 'text-amber-400' : 'text-cyan-400') : 'text-white'
        }`}>{value}</span>
        {unit && <span className="text-[10px] text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

function TipRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}

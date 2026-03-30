'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { MapPin, Gauge, Zap, TrendingUp, TrendingDown, Clock, RotateCcw, Activity } from 'lucide-react';

export function TripView() {
  const { tripData, resetTrip, vehicleData } = useAppStore();
  const t = tripData;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  };

  const efficiencyRating = t.avgConsumption === 0 ? '--' :
    t.avgConsumption < 14 ? 'Excellent' :
      t.avgConsumption < 18 ? 'Good' :
        t.avgConsumption < 24 ? 'Average' : 'High';

  const ratingColor = t.avgConsumption === 0 ? 'text-slate-500' :
    t.avgConsumption < 14 ? 'text-emerald-400' :
      t.avgConsumption < 18 ? 'text-emerald-300' :
        t.avgConsumption < 24 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Trip Computer</span>
        </div>
        <button
          onClick={resetTrip}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Trip
        </button>
      </div>

      {/* Efficiency Rating */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-5 border border-slate-700/30 text-center">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Energy Efficiency</span>
        <div className="mt-2">
          <span className={`text-4xl font-bold tabular-nums ${ratingColor}`}>
            {t.avgConsumption > 0 ? t.avgConsumption.toFixed(1) : '--'}
          </span>
          <span className="text-lg text-slate-500 ml-1">Wh/km</span>
        </div>
        <div className="mt-2">
          <span className={`text-sm font-medium ${ratingColor}`}>{efficiencyRating}</span>
        </div>
        {/* Efficiency scale */}
        <div className="mt-4 flex gap-1 justify-center">
          {['Excellent', 'Good', 'Average', 'High'].map((label, i) => {
            const active = t.avgConsumption > 0 && (
              (i === 0 && t.avgConsumption < 14) ||
              (i === 1 && t.avgConsumption >= 14 && t.avgConsumption < 18) ||
              (i === 2 && t.avgConsumption >= 18 && t.avgConsumption < 24) ||
              (i === 3 && t.avgConsumption >= 24)
            );
            return (
              <div key={label} className={`px-2 py-1 rounded text-[9px] ${
                active
                  ? i < 2 ? 'bg-emerald-500/20 text-emerald-400' : i === 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                  : 'bg-slate-700/30 text-slate-600'
              }`}>
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Trip Stats */}
      <div className="grid grid-cols-2 gap-3">
        <TripStatCard
          icon={<MapPin className="w-4 h-4 text-blue-400" />}
          label="Distance"
          value={t.distance.toFixed(2)}
          unit="km"
        />
        <TripStatCard
          icon={<Clock className="w-4 h-4 text-slate-400" />}
          label="Duration"
          value={formatDuration(t.duration)}
          unit=""
        />
        <TripStatCard
          icon={<Gauge className="w-4 h-4 text-amber-400" />}
          label="Avg Speed"
          value={t.avgSpeed.toString()}
          unit="km/h"
          subtext={`Max: ${t.maxSpeed} km/h`}
        />
        <TripStatCard
          icon={<Zap className="w-4 h-4 text-violet-400" />}
          label="Energy Used"
          value={t.totalConsumption.toFixed(3)}
          unit="kWh"
        />
      </div>

      {/* Regen stats */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 font-medium">Regenerative Braking</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-cyan-400 tabular-nums">
              {t.regenEnergy.toFixed(3)}
            </span>
            <span className="text-sm text-slate-500 ml-1">kWh recovered</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500">
              {t.totalConsumption > 0
                ? `${((t.regenEnergy / t.totalConsumption) * 100).toFixed(1)}% of total`
                : '--'}
            </span>
          </div>
        </div>

        {/* Visual regen bar */}
        {t.totalConsumption > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min((t.regenEnergy / t.totalConsumption) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>0%</span>
              <span>Regen recovery ratio</span>
              <span>{((t.regenEnergy / t.totalConsumption) * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Cost Estimate */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">$</span>
          <span className="text-xs text-slate-400 font-medium">Trip Cost Estimate</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <span className="text-lg font-bold text-white tabular-nums">
              {t.totalConsumption > 0 ? (t.totalConsumption * 0.05).toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-500 block">Omani Rial</span>
            <span className="text-[9px] text-slate-600">(@ 0.05 OMR/kWh)</span>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-white tabular-nums">
              {t.totalConsumption > 0 ? (t.totalConsumption * 0.13).toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-500 block">USD</span>
            <span className="text-[9px] text-slate-600">(@ $0.13/kWh)</span>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-white tabular-nums">
              {t.distance > 0.01 ? ((t.totalConsumption * 0.05) / t.distance * 1000).toFixed(3) : '0.000'}
            </span>
            <span className="text-[10px] text-slate-500 block">OMR/100km</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TripStatCard({
  icon, label, value, unit, subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  subtext?: string;
}) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-white tabular-nums">{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {subtext && <span className="text-[10px] text-slate-500 mt-0.5 block">{subtext}</span>}
    </div>
  );
}

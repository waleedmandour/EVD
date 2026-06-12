'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { CircleGauge, AnimatedNumber } from '@/components/shared/Gauges';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Map, Zap, Leaf, DollarSign, TrendingUp, Play, Square, Timer, Gauge as GaugeIcon } from 'lucide-react';

export default function SessionsView() {
  const { t } = useTranslation('sessions');
  const { tripData, ecoScore, vehicleData, connectionStatus, isLogging, setIsLogging, resetTrip } = useAppStore();

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const costPerKwh = 0.021; // OMR
  const tripCostOmr = tripData.energyConsumed * costPerKwh;
  const tripCostUsd = tripCostOmr * 2.6;
  const iceCostPerKm = 0.05; // OMR approximate for ICE
  const evCostPerKm = tripData.distance > 0 ? tripCostOmr / tripData.distance : 0;
  const co2PerKm = 0.12; // kg CO2 per km for ICE
  const co2Saved = tripData.distance * co2PerKm;

  const scoreBreakdown = [
    { name: t('accelerationScore'), value: ecoScore.acceleration, color: '#00D2FF' },
    { name: t('brakingScore'), value: ecoScore.braking, color: '#00E676' },
    { name: t('cruisingScore'), value: ecoScore.speed, color: '#7B2FBE' },
    { name: t('efficiencyScore'), value: ecoScore.efficiency, color: '#FFB300' },
  ];

  const ecoHistoryData = ecoScore.history.map((score, i) => ({
    trip: `T${i + 1}`,
    score,
  }));

  return (
    <div className="space-y-4 pb-2">
      {/* Trip Logging Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            if (isLogging) {
              setIsLogging(false);
            } else {
              resetTrip();
              setIsLogging(true);
            }
          }}
          className={`flex-1 h-12 rounded-xl font-semibold ${
            isLogging
              ? 'bg-evdx-critical hover:bg-evdx-critical/90 text-white'
              : 'bg-evdx-green hover:bg-evdx-green/90 text-[#0D1117]'
          }`}
        >
          {isLogging ? (
            <>
              <Square size={18} className="mr-2" />
              Stop Trip
            </>
          ) : (
            <>
              <Play size={18} className="mr-2" />
              Start Trip
            </>
          )}
        </Button>
        {isLogging && (
          <div className="flex items-center gap-1 text-evdx-green animate-pulse">
            <div className="w-2 h-2 rounded-full bg-evdx-green" />
            <span className="text-xs font-medium">Recording</span>
          </div>
        )}
      </div>

      {/* Current Trip Summary */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Map size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">{t('currentTrip')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">{t('distance')}</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={tripData.distance} decimals={1} suffix=" km" />
              </p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">{t('avgSpeed')}</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={tripData.avgSpeed} decimals={0} suffix=" km/h" />
              </p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">{t('energyUsed')}</p>
              <p className="text-lg font-bold text-evdx-text tabular-nums">
                <AnimatedNumber value={tripData.energyConsumed} decimals={1} suffix=" kWh" />
              </p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">{t('energyRegenerated')}</p>
              <p className="text-lg font-bold text-evdx-green tabular-nums">
                <AnimatedNumber value={tripData.energyRegen} decimals={1} suffix=" kWh" />
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-evdx-text-secondary">
              <Timer size={12} />
              <span>{formatDuration(tripData.duration)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-evdx-text-secondary">
              <GaugeIcon size={12} />
              <span>Max: {tripData.maxSpeed.toFixed(0)} km/h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eco Score */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Leaf size={16} className="text-evdx-green" />
              <span className="text-sm font-medium text-evdx-text">{t('ecoScore')}</span>
            </div>
          </div>
          <div className="flex items-center justify-center mb-4">
            <CircleGauge
              value={ecoScore.overall}
              size={140}
              strokeWidth={12}
              color={ecoScore.overall > 70 ? '#00E676' : ecoScore.overall > 40 ? '#FFB300' : '#FF3D00'}
              unit="/100"
            />
          </div>

          {/* Score Breakdown */}
          <div className="space-y-2">
            {scoreBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs text-evdx-text-secondary w-24 shrink-0 truncate">{item.name}</span>
                <div className="flex-1 h-2 bg-[#0D1117] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums w-8 text-right" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eco Score History */}
      {ecoHistoryData.length > 0 && (
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-evdx-primary" />
              <span className="text-sm font-medium text-evdx-text">Eco Score History</span>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ecoHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2332" />
                  <XAxis dataKey="trip" tick={{ fontSize: 9, fill: '#78909C' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#78909C' }} width={25} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A2332', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#00E676' }}
                  />
                  <Bar dataKey="score" fill="#00E676" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Cost & Carbon */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <DollarSign size={18} className="text-evdx-green mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('costPerTrip')}</p>
            <p className="text-lg font-bold text-evdx-text tabular-nums">
              <AnimatedNumber value={tripCostOmr} decimals={3} suffix=" OMR" />
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-3 text-center">
            <Leaf size={18} className="text-evdx-green mx-auto mb-1" />
            <p className="text-xs text-evdx-text-secondary">{t('carbonSavings')}</p>
            <p className="text-lg font-bold text-evdx-green tabular-nums">
              <AnimatedNumber value={co2Saved} decimals={1} suffix=" kg" />
            </p>
            <p className="text-[10px] text-evdx-text-secondary">CO₂ vs ICE</p>
          </CardContent>
        </Card>
      </div>

      {/* EV vs ICE Comparison */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">{t('costComparison')}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-evdx-text-secondary">EV Cost</span>
              <span className="text-sm font-bold text-evdx-green">{evCostPerKm.toFixed(4)} OMR/km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-evdx-text-secondary">ICE Cost</span>
              <span className="text-sm font-bold text-evdx-critical">{iceCostPerKm.toFixed(3)} OMR/km</span>
            </div>
            <div className="h-2 bg-[#0D1117] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-evdx-green rounded-l-full"
                style={{ width: `${(evCostPerKm / iceCostPerKm) * 100}%` }}
              />
              <div className="h-full bg-evdx-critical rounded-r-full flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

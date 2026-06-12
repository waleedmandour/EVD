'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Download, Clock, Plus, X } from 'lucide-react';

interface ParameterOption {
  key: string;
  label: string;
  unit: string;
  color: string;
  getData: () => { value: number; history: { value: number; timestamp: number }[] };
}

export default function LiveDataView() {
  const { t } = useTranslation('dashboard');
  const { vehicleData, speedHistory, powerHistory, batteryHistory, temperatureHistory } = useAppStore();
  const [selectedParams, setSelectedParams] = useState<string[]>(['speed', 'soc', 'power']);
  const [timeWindow, setTimeWindow] = useState<'30s' | '5min' | '30min'>('30s');
  const [showParamPicker, setShowParamPicker] = useState(false);

  const parameters: ParameterOption[] = [
    { key: 'speed', label: t('speed'), unit: 'km/h', color: '#00D2FF', getData: () => ({ value: vehicleData.speed, history: speedHistory }) },
    { key: 'soc', label: t('soc'), unit: '%', color: '#00E676', getData: () => ({ value: vehicleData.soc, history: batteryHistory }) },
    { key: 'power', label: t('power'), unit: 'kW', color: '#7B2FBE', getData: () => ({ value: vehicleData.power, history: powerHistory }) },
    { key: 'voltage', label: t('voltage'), unit: 'V', color: '#FFB300', getData: () => ({ value: vehicleData.voltage, history: [] }) },
    { key: 'current', label: t('current'), unit: 'A', color: '#FF9800', getData: () => ({ value: vehicleData.current, history: [] }) },
    { key: 'motorTemp', label: t('motorTemp'), unit: '°C', color: '#FF3D00', getData: () => ({ value: vehicleData.motorTemp, history: temperatureHistory }) },
    { key: 'batteryTemp', label: t('batteryTemp'), unit: '°C', color: '#E91E63', getData: () => ({ value: vehicleData.batteryTemp, history: temperatureHistory }) },
    { key: 'range', label: t('range'), unit: 'km', color: '#00BCD4', getData: () => ({ value: vehicleData.range, history: [] }) },
  ];

  const toggleParam = (key: string) => {
    if (selectedParams.includes(key)) {
      if (selectedParams.length > 1) {
        setSelectedParams(selectedParams.filter((p) => p !== key));
      }
    } else if (selectedParams.length < 6) {
      setSelectedParams([...selectedParams, key]);
    }
  };

  const selectedParamList = parameters.filter((p) => selectedParams.includes(p.key));

  // Build chart data
  const chartData = (() => {
    const selected = selectedParamList;
    if (selected.length === 0) return [];

    // Use the first parameter's history as the time base
    const baseHistory = selected[0].getData().history;
    if (baseHistory.length === 0) {
      // Generate synthetic data points for demo
      return Array.from({ length: 20 }, (_, i) => {
        const point: Record<string, number | string> = {
          time: `${i}`,
        };
        selected.forEach((param) => {
          const data = param.getData();
          point[param.key] = data.value + (Math.random() - 0.5) * (data.value * 0.1 || 5);
        });
        return point;
      });
    }

    const maxPoints = timeWindow === '30s' ? 60 : timeWindow === '5min' ? 100 : 120;
    return baseHistory.slice(-maxPoints).map((p, i) => {
      const point: Record<string, number | string> = {
        time: new Date(p.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      };
      selected.forEach((param) => {
        const hist = param.getData().history;
        point[param.key] = hist[Math.min(i, hist.length - 1)]?.value ?? 0;
      });
      return point;
    });
  })();

  const exportCSV = () => {
    const headers = ['Time', ...selectedParamList.map((p) => `${p.label} (${p.unit})`)];
    const rows = chartData.map((row) => {
      const time = String(row.time);
      const values = selectedParamList.map((p) => String(row[p.key] ?? ''));
      return [time, ...values].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evdx-live-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Parameter Selector */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-evdx-text-secondary">Parameters (max 6)</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowParamPicker(!showParamPicker)}
              className="text-evdx-primary h-7 text-xs"
            >
              {showParamPicker ? 'Done' : <><Plus size={14} className="mr-1" /> Add</>}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selectedParamList.map((param) => (
              <Badge
                key={param.key}
                className="text-xs px-2 py-1 cursor-pointer"
                style={{
                  backgroundColor: `${param.color}15`,
                  color: param.color,
                  borderColor: `${param.color}30`,
                }}
                onClick={() => toggleParam(param.key)}
              >
                {param.label}
                <X size={10} className="ml-1" />
              </Badge>
            ))}
          </div>

          {showParamPicker && (
            <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-white/5">
              {parameters.map((param) => (
                <button
                  key={param.key}
                  onClick={() => toggleParam(param.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedParams.includes(param.key)
                      ? 'bg-white/10 text-evdx-text'
                      : 'bg-[#0D1117] text-evdx-text-secondary hover:bg-white/5'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: param.color }} />
                  {param.label}
                  <span className="text-evdx-text-secondary ml-auto">{param.unit}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Window Selector */}
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-evdx-text-secondary" />
        {(['30s', '5min', '30min'] as const).map((tw) => (
          <Button
            key={tw}
            size="sm"
            variant={timeWindow === tw ? 'default' : 'ghost'}
            onClick={() => setTimeWindow(tw)}
            className={`h-7 text-xs rounded-lg ${
              timeWindow === tw
                ? 'bg-evdx-primary text-[#0D1117]'
                : 'text-evdx-text-secondary hover:text-evdx-text'
            }`}
          >
            {tw}
          </Button>
        ))}
      </div>

      {/* Multi-line Chart */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2332" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: '#78909C' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 9, fill: '#78909C' }} width={35} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A2332',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {selectedParamList.map((param) => (
                  <Line
                    key={param.key}
                    type="monotone"
                    dataKey={param.key}
                    name={param.label}
                    stroke={param.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Current Values */}
      <div className="grid grid-cols-3 gap-2">
        {selectedParamList.map((param) => {
          const data = param.getData();
          return (
            <Card key={param.key} className="bg-[#1A2332] border-white/5">
              <CardContent className="p-2 text-center">
                <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: param.color }} />
                <p className="text-xs text-evdx-text-secondary">{param.label}</p>
                <p className="text-base font-bold text-evdx-text tabular-nums">
                  {data.value.toFixed(1)}
                  <span className="text-[10px] text-evdx-text-secondary ml-0.5">{param.unit}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Export Button */}
      <Button
        onClick={exportCSV}
        variant="outline"
        className="w-full border-white/10 text-evdx-text hover:bg-[#1A2332]"
      >
        <Download size={16} className="mr-2" />
        Export as CSV
      </Button>
    </div>
  );
}

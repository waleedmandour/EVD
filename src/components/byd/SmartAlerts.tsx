'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { AlertTriangle, Thermometer, Battery, Zap, Info, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  icon: React.ReactNode;
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
}

export function SmartAlerts() {
  const { vehicleData, dtcs } = useAppStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const newAlerts: Alert[] = [];
    const v = vehicleData;

    // Low battery warning
    if (v.batterySOC < 10 && v.batterySOC > 0) {
      newAlerts.push({
        id: 'soc-critical',
        type: 'danger',
        icon: <Battery className="w-4 h-4" />,
        title: 'Critical Battery',
        message: `Battery at ${v.batterySOC.toFixed(1)}%. Find a charging station immediately.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    } else if (v.batterySOC < 20) {
      newAlerts.push({
        id: 'soc-low',
        type: 'warning',
        icon: <Battery className="w-4 h-4" />,
        title: 'Low Battery',
        message: `Battery at ${v.batterySOC.toFixed(1)}%. Consider charging soon.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // High motor temperature
    if (v.motorTemp > 80) {
      newAlerts.push({
        id: 'motor-hot',
        type: 'danger',
        icon: <Thermometer className="w-4 h-4" />,
        title: 'Motor Overheating',
        message: `Motor temperature at ${v.motorTemp.toFixed(1)}°C. Reduce speed or stop to cool down.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    } else if (v.motorTemp > 65) {
      newAlerts.push({
        id: 'motor-warm',
        type: 'warning',
        icon: <Thermometer className="w-4 h-4" />,
        title: 'Motor Temperature Rising',
        message: `Motor at ${v.motorTemp.toFixed(1)}°C. Avoid sustained high-power driving.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // High battery temperature
    if (v.batteryTemp > 45) {
      newAlerts.push({
        id: 'batt-hot',
        type: 'danger',
        icon: <Thermometer className="w-4 h-4" />,
        title: 'Battery Pack Hot',
        message: `Battery temperature at ${v.batteryTemp.toFixed(1)}°C. Charging may be limited.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // High power draw
    if (v.batteryPower > 100) {
      newAlerts.push({
        id: 'power-high',
        type: 'warning',
        icon: <Zap className="w-4 h-4" />,
        title: 'High Power Draw',
        message: `Drawing ${v.batteryPower.toFixed(1)} kW. Range will decrease rapidly at this rate.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // DTC detected
    if (dtcs.length > 0) {
      const confirmed = dtcs.filter(d => d.status === 'confirmed');
      if (confirmed.length > 0) {
        newAlerts.push({
          id: 'dtc-active',
          type: 'warning',
          icon: <AlertTriangle className="w-4 h-4" />,
          title: 'Fault Code Detected',
          message: `${confirmed.length} confirmed DTC(s) found. Check the Diagnostics tab for details.`,
          timestamp: Date.now(),
        dismissed: false,
        });
      }
    }

    // Regen active (info)
    if (v.regenBraking) {
      newAlerts.push({
        id: 'regen-active',
        type: 'success',
        icon: <Zap className="w-4 h-4" />,
        title: 'Regen Braking Active',
        message: `Recovering energy at ${Math.abs(v.batteryPower).toFixed(1)} kW.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    // Range estimate (info)
    if (v.estimatedRange > 0 && v.estimatedRange < 50) {
      newAlerts.push({
        id: 'range-low',
        type: 'warning',
        icon: <Info className="w-4 h-4" />,
        title: 'Limited Range',
        message: `Estimated range: ${Math.round(v.estimatedRange)} km. Plan charging stops.`,
        timestamp: Date.now(),
        dismissed: false,
      });
    }

    setAlerts(newAlerts);
    setUnreadCount(newAlerts.filter(a => a.type === 'danger' || a.type === 'warning').length);
  }, [vehicleData, dtcs]);

  const activeAlerts = alerts.filter(a => !a.dismissed);

  return (
    <>
      {/* Alert Bell Button - positioned fixed top-right area */}
      {activeAlerts.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              activeAlerts.some(a => a.type === 'danger')
                ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'
                : activeAlerts.some(a => a.type === 'warning')
                  ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
                  : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/60'
            }`}
          >
            <div className="relative">
              <AlertCircle className={`w-4 h-4 ${
                activeAlerts.some(a => a.type === 'danger') ? 'text-red-400' :
                activeAlerts.some(a => a.type === 'warning') ? 'text-amber-400' : 'text-slate-400'
              }`} />
              {unreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">{unreadCount}</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <span className="text-xs text-slate-300 font-medium">
                {unreadCount} Active Alert{unreadCount !== 1 ? 's' : ''}
              </span>
              <p className="text-[10px] text-slate-500 truncate">
                {activeAlerts[0]?.title}
              </p>
            </div>
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 text-slate-500 transition-transform ${showPanel ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showPanel && (
            <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {activeAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const colorMap = {
    danger: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    info: 'bg-cyan-500/10 border-cyan-500/20',
    success: 'bg-emerald-500/10 border-emerald-500/20',
  };
  const iconColorMap = {
    danger: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-cyan-400',
    success: 'text-emerald-400',
  };

  return (
    <div className={`rounded-lg p-3 border ${colorMap[alert.type]}`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 ${iconColorMap[alert.type]}`}>
          {alert.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${
              alert.type === 'danger' ? 'text-red-300' :
              alert.type === 'warning' ? 'text-amber-300' :
              alert.type === 'success' ? 'text-emerald-300' : 'text-cyan-300'
            }`}>
              {alert.title}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{alert.message}</p>
        </div>
      </div>
    </div>
  );
}

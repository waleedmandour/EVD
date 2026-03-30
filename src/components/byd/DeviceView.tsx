'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { MiniChart } from './gauges';
import {
  Cpu, Wifi, Bluetooth, Signal, Activity, Clock, Radio,
  Fingerprint, Battery, Thermometer, CircleDot,
} from 'lucide-react';

export function DeviceView() {
  const { deviceInfo, connectionMode, ecoScore } = useAppStore();
  const d = deviceInfo;
  const timeSincePing = Date.now() - d.lastPing;
  const isOnline = timeSincePing < 5000;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Connection Status Hero */}
      <div className={`rounded-2xl p-4 border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isOnline ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}>
            {connectionMode === 'wifi'
              ? <Wifi className={`w-6 h-6 ${isOnline ? 'text-cyan-400' : 'text-amber-400'}`} />
              : connectionMode === 'bluetooth'
                ? <Bluetooth className={`w-6 h-6 ${isOnline ? 'text-blue-400' : 'text-amber-400'}`} />
                : <Cpu className="w-6 h-6 text-slate-400" />
            }
          </div>
          <div className="flex-1">
            <span className={`text-lg font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isOnline ? 'Online' : 'Idle'}
            </span>
            <p className="text-xs text-slate-500">
              {connectionMode === 'wifi' ? 'WiFi OBD-II' : connectionMode === 'bluetooth' ? 'Bluetooth BLE' : 'Demo Simulator'}
              {isOnline && ` · Last update ${Math.round(timeSincePing / 1000)}s ago`}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>
      </div>

      {/* Adapter Details */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">OBD-II Adapter</span>
        </div>
        <div className="flex flex-col gap-2">
          <DetailRow icon={<Fingerprint className="w-3.5 h-3.5 text-slate-500" />}
            label="Adapter Type" value={d.adapterType || '—'} />
          <DetailRow icon={<Radio className="w-3.5 h-3.5 text-slate-500" />}
            label="Firmware" value={d.firmwareVersion || '—'} />
          <DetailRow icon={<Activity className="w-3.5 h-3.5 text-slate-500" />}
            label="Protocol" value={d.protocol || '—'} />
          <DetailRow icon={<Battery className="w-3.5 h-3.5 text-slate-500" />}
            label="Adapter Voltage" value={d.voltage || '—'} />
        </div>
      </div>

      {/* Connection Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={<Signal className="w-4 h-4 text-cyan-400" />}
          label="Signal Strength" value={`${Math.round(d.signalStrength)}%`}
          color={d.signalStrength > 70 ? 'text-emerald-400' : d.signalStrength > 40 ? 'text-amber-400' : 'text-red-400'}
          bar={d.signalStrength / 100} barColor={d.signalStrength > 70 ? 'bg-emerald-400' : d.signalStrength > 40 ? 'bg-amber-400' : 'bg-red-400'} />
        <MetricCard icon={<Clock className="w-4 h-4 text-violet-400" />}
          label="Response Time" value={`${d.responseTime}ms`}
          color={d.responseTime < 30 ? 'text-emerald-400' : d.responseTime < 80 ? 'text-amber-400' : 'text-red-400'}
          bar={1 - Math.min(d.responseTime / 200, 1)} barColor={d.responseTime < 30 ? 'bg-emerald-400' : d.responseTime < 80 ? 'bg-amber-400' : 'bg-red-400'} />
      </div>

      {/* WiFi Details */}
      {connectionMode === 'wifi' && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400 font-medium">WiFi Connection</span>
          </div>
          <div className="flex flex-col gap-2">
            <DetailRow label="Adapter IP" value={d.wifiIp} />
            <DetailRow label="Port" value={d.wifiPort.toString()} />
            <DetailRow label="Encryption" value="None (OBD-II WiFi AP)" />
            <div className="bg-cyan-500/10 rounded-lg p-3 mt-1 border border-cyan-500/20">
              <p className="text-[11px] text-cyan-300 leading-relaxed">
                <strong className="text-cyan-200">WiFi Setup:</strong> Your phone connects directly to the
                adapter&apos;s WiFi hotspot. Disconnect from your regular WiFi and connect to the
                adapter&apos;s network (SSID: ELM327, WiFi_OBDII, etc.). The adapter acts as both
                the WiFi access point and the OBD-II interface.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Response Time History */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">Response Time History</span>
          <span className="text-xs text-slate-600">{d.responseTime}ms</span>
        </div>
        <MiniChart data={ecoScore.history.length > 0 ? ecoScore.history : []} height={45}
          color="#8b5cf6" fillColor="rgba(139,92,246,0.08)" maxVal={100} minVal={0} />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>0ms</span>
          <span>ms</span>
          <span>200ms</span>
        </div>
      </div>

      {/* Vehicle Identification */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Vehicle Identification</span>
        </div>
        <div className="flex flex-col gap-2">
          <DetailRow label="VIN" value={d.vin || '—'} mono />
          <DetailRow label="Vehicle" value="BYD Yuan Plus (Atto 3)" />
          <DetailRow label="Battery" value="60.48 kWh Blade (LFP)" />
          <DetailRow label="Motor" value="150 kW Permanent Magnet" />
          <DetailRow label="Drivetrain" value="FWD Single Motor" />
        </div>
      </div>

      {/* Firmware Update Section */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <CircleDot className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Adapter Firmware Check</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-800/60">
            <span className="text-xs text-slate-400">Current Firmware</span>
            <span className="text-xs text-white font-medium font-mono">{d.firmwareVersion || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-800/60">
            <span className="text-xs text-slate-400">Latest Known</span>
            <span className="text-xs text-emerald-400 font-medium font-mono">v2.1</span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-800/60">
            <span className="text-xs text-slate-400">Status</span>
            <span className={`text-xs font-medium ${
              d.firmwareVersion === 'v2.1' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {d.firmwareVersion === 'v2.1' ? 'Up to Date' : 'Check for Update'}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">
            Note: Firmware updates for ELM327 adapters are performed by the manufacturer.
            Visit the adapter&apos;s product page or contact the seller for update files.
            Some v1.5 clones may not support firmware updates.
          </p>
        </div>
      </div>

      {/* Adapter Compatibility Guide */}
      <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/20">
        <span className="text-xs text-slate-400 font-medium mb-2 block">Adapter Compatibility Notes</span>
        <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 leading-relaxed">
          <p><strong className="text-slate-400">BLE adapters:</strong> Require Android with Chrome. iOS does not support Web Bluetooth for OBD-II. ELM327 v1.5+ with Nordic UART Service (NUS) is recommended.</p>
          <p><strong className="text-slate-400">WiFi adapters:</strong> The phone connects to the adapter&apos;s WiFi hotspot. Works on both Android and iOS. Port 35000 is standard for most ELM327 WiFi devices.</p>
          <p><strong className="text-slate-400">KNOW YOUR ADAPTER:</strong> ELM327 clones vary in quality. Genuine adapters (v2.1+) are recommended for reliable CAN bus communication with BYD vehicles.</p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/20 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <span className={`text-xs text-white ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
    </div>
  );
}

function MetricCard({ icon, label, value, color, bar, barColor }: {
  icon: React.ReactNode; label: string; value: string;
  color: string; bar: number; barColor: string;
}) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.max(bar * 100, 0)}%` }} />
      </div>
    </div>
  );
}

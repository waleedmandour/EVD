'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getDemoDTCs, getDemoMonitorStatus } from '@/lib/simulator';
import { EV_MONITOR_TESTS, DTC_CODES } from '@/lib/types';
import type { DiagnosticTroubleCode } from '@/lib/types';
import {
  AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Shield, Info, Search,
} from 'lucide-react';

export function DiagnosticsView() {
  const { dtcs, setDTCs, clearDTCs, monitorStatus, setMonitorStatus, connectionMode } = useAppStore();
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    // Simulate scanning delay
    await new Promise((r) => setTimeout(r, 1500));
    if (connectionMode === 'demo') {
      setDTCs(getDemoDTCs());
      setMonitorStatus(getDemoMonitorStatus());
    }
    setIsScanning(false);
  };

  const handleClearDTCs = async () => {
    setIsScanning(true);
    await new Promise((r) => setTimeout(r, 800));
    clearDTCs();
    setIsScanning(false);
  };

  const milOn = dtcs.some((d) => d.milOn);
  const confirmedCount = dtcs.filter((d) => d.status === 'confirmed').length;
  const pendingCount = dtcs.filter((d) => d.status === 'pending').length;

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header with scan button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Vehicle Diagnostics</span>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* MIL Status */}
      <div className={`rounded-2xl p-4 border ${
        milOn
          ? 'bg-red-500/10 border-red-500/20'
          : 'bg-emerald-500/10 border-emerald-500/20'
      }`}>
        <div className="flex items-center gap-3">
          {milOn ? (
            <AlertTriangle className="w-6 h-6 text-red-400" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          )}
          <div>
            <span className={`text-sm font-medium ${milOn ? 'text-red-400' : 'text-emerald-400'}`}>
              {milOn ? 'Check Engine Light ON' : 'All Systems Clear'}
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              {milOn
                ? `${confirmedCount} confirmed + ${pendingCount} pending fault(s) detected`
                : 'No active fault codes detected'}
            </p>
          </div>
        </div>
      </div>

      {/* DTC List */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-medium">Diagnostic Trouble Codes</span>
          {dtcs.length > 0 && (
            <button
              onClick={handleClearDTCs}
              disabled={isScanning}
              className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/20 hover:border-red-500/40 transition-colors disabled:opacity-50"
            >
              Clear All Codes
            </button>
          )}
        </div>

        {dtcs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/30" />
            <span className="text-xs text-slate-500">
              {isScanning ? 'Scanning ECU...' : 'No codes found. Tap Scan to check.'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dtcs.map((dtc, i) => (
              <div
                key={i}
                className="rounded-lg p-3 border border-slate-700/30 bg-slate-800/60"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${
                      dtc.status === 'confirmed' ? 'text-red-400' : 'text-amber-400'
                    }`} />
                    <span className="text-sm font-mono font-bold text-white">{dtc.code}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    dtc.status === 'confirmed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {dtc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 ml-6">{dtc.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monitor Status */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-400 font-medium">Emission Monitor Readiness</span>
        </div>

        {Object.keys(monitorStatus).length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">
            Run a scan to check monitor status
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {EV_MONITOR_TESTS.map((test) => {
              const ready = monitorStatus[test.name] ?? false;
              return (
                <div key={test.name} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-slate-800/40">
                  {ready ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                  <div>
                    <span className="text-[11px] text-white">{test.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/20">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-slate-400">Note:</strong> OBD-II diagnostics read the vehicle&apos;s standard
          ECU self-test results. This covers powertrain, emissions, and safety system fault codes.
          For BYD-specific high-voltage system diagnostics, a proprietary service tool may be needed.
        </p>
      </div>
    </div>
  );
}

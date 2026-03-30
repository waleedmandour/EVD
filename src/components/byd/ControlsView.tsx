'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import {
  Power, AirVent, Move, Lock, Unlock,
  Wifi, ChevronRight, Info, AlertCircle, XCircle,
  Thermometer, Volume2, Lightbulb, Zap,
} from 'lucide-react';

interface ControlItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  available: boolean;
  reason?: string;
  danger?: boolean;
}

export function ControlsView() {
  const { vehicleData, connectionMode } = useAppStore();

  const controls: ControlItem[] = [
    {
      icon: <Power className="w-5 h-5" />,
      label: 'Start / Stop Motor',
      description: 'Remote engine start/stop via CAN bus command. Requires BYD proprietary protocol to send ignition control frames to the VCU (Vehicle Control Unit).',
      available: false,
      reason: 'Requires BYD proprietary CAN protocol (not available via standard OBD-II)',
      danger: true,
    },
    {
      icon: <Thermometer className="w-5 h-5" />,
      label: 'Air Conditioning Control',
      description: 'Control cabin temperature, fan speed, and AC mode. This requires sending commands to the HVAC ECU through BYD\'s encrypted diagnostic channel.',
      available: false,
      reason: 'Requires BYD proprietary HVAC protocol',
    },
    {
      icon: <Move className="w-5 h-5" />,
      label: 'Vehicle Movement (Park Assist)',
      description: 'Remote forward/backward movement in parking spaces. This requires torque commands to the motor controller and steering angle control.',
      available: false,
      reason: 'Critical safety system - requires BYD authenticated CAN bus access',
      danger: true,
    },
    {
      icon: <Lock className="w-5 h-5" />,
      label: 'Door Lock / Unlock',
      description: 'Central door locking/unlocking through body control module. Some generic OBD-II tools support this for select manufacturers.',
      available: false,
      reason: 'Requires manufacturer-specific security authentication',
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      label: 'Light Control',
      description: 'Headlights, fog lights, and interior lighting control through the BCM (Body Control Module).',
      available: false,
      reason: 'Requires BYD proprietary BCM protocol',
    },
    {
      icon: <Volume2 className="w-5 h-5" />,
      label: 'Horn Activation',
      description: 'Activate vehicle horn through the BCM. This is a safety-critical function.',
      available: false,
      reason: 'Safety-critical - requires authenticated access',
      danger: true,
    },
    {
      icon: <Wifi className="w-5 h-5" />,
      label: 'Send Raw CAN Command',
      description: 'Advanced mode: send a custom hex CAN frame directly to the ECU. Only for expert users who know BYD\'s protocol.',
      available: true,
      danger: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-medium text-slate-300">Vehicle Controls</span>
      </div>

      {/* Important notice */}
      <div className={`rounded-2xl p-4 border ${
        connectionMode === 'demo'
          ? 'bg-amber-500/10 border-amber-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${
            connectionMode === 'demo' ? 'text-amber-400' : 'text-red-400'
          }`} />
          <div>
            <span className={`text-sm font-medium ${
              connectionMode === 'demo' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {connectionMode === 'demo' ? 'Simulation Mode' : 'Standard OBD-II Limitation'}
            </span>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {connectionMode === 'demo'
                ? 'You are running in demo mode. Control commands shown here explain what would be needed for real vehicle control.'
                : 'Standard OBD-II is a diagnostic (read-only) protocol. Vehicle control commands require BYD\'s proprietary CAN bus protocol, which is encrypted and not publicly documented.'}
            </p>
          </div>
        </div>
      </div>

      {/* Why controls aren't available */}
      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <span className="text-xs text-slate-400 font-medium mb-3 block">Why Can\'t I Control My Car?</span>
        <div className="flex flex-col gap-3">
          <ExplanationStep
            number={1}
            title="OBD-II is Read-Only"
            description="The OBD-II standard (SAE J1979) defines diagnostic services only. It allows reading sensor data, freeze frames, and test results, but has no provision for actuator control."
          />
          <ExplanationStep
            number={2}
            title="BYD Uses Proprietary CAN Frames"
            description="BYD\'s vehicle control commands (ignition, HVAC, steering, braking) are sent through proprietary CAN bus frames that use manufacturer-specific message IDs and data formats. These are not documented publicly."
          />
          <ExplanationStep
            number={3}
            title="Security Authentication Required"
            description="Modern BYD vehicles use UDS (Unified Diagnostic Services) with security access levels (Seed/Key authentication) before allowing any control command. This prevents unauthorized access to safety-critical systems."
          />
          <ExplanationStep
            number={4}
            title="The Official BYD App"
            description="BYD\'s official smartphone app communicates through a telematics control unit (TCU) via encrypted cellular network, not through the OBD-II port. This is why the official app can control the car but OBD-II tools cannot."
          />
        </div>
      </div>

      {/* Control items */}
      <div className="flex flex-col gap-2">
        {controls.map((control, i) => (
          <ControlCard key={i} {...control} />
        ))}
      </div>

      {/* Alternative paths */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/20">
        <span className="text-xs text-slate-400 font-medium mb-2 block">Alternative Approaches</span>
        <div className="flex flex-col gap-2 text-[11px] text-slate-500 leading-relaxed">
          <p>
            <strong className="text-slate-400">BYD Official App:</strong> Use the official BYD app (DiLink) for remote start, AC pre-conditioning, and door controls. This works through BYD\'s cloud servers and does not require OBD-II.
          </p>
          <p>
            <strong className="text-slate-400">Aftermarket Integration:</strong> Platforms like Carlinkit or specialized import service providers may offer limited control features by reverse-engineering the BYD protocol. Contact BYD owner communities for current options.
          </p>
          <p>
            <strong className="text-slate-400">Research Community:</strong> The XDA Forums BYD DiLink development thread tracks ongoing efforts to document BYD\'s proprietary CAN protocol. This is a long-term community effort.
          </p>
        </div>
      </div>
    </div>
  );
}

function ControlCard({ icon, label, description, available, reason, danger }: ControlItem) {
  return (
    <div className={`rounded-xl p-4 border transition-colors ${
      danger
        ? 'bg-red-500/5 border-red-500/10 hover:border-red-500/20'
        : available
          ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20 cursor-pointer'
          : 'bg-slate-800/40 border-slate-700/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${
          danger
            ? 'bg-red-500/10 text-red-400'
            : available
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-slate-700/50 text-slate-500'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{label}</span>
            {!available ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">UNAVAILABLE</span>
            ) : danger ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">EXPERT ONLY</span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">AVAILABLE</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
          {reason && (
            <p className="text-[10px] text-slate-600 mt-1.5 italic">{reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ExplanationStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-slate-400">{number}</span>
      </div>
      <div>
        <span className="text-xs font-medium text-slate-300">{title}</span>
        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}

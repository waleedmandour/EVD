'use client';

import React, { useEffect, useRef } from 'react';

interface GaugeCircleProps {
  value: number;
  min: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  unit: string;
  colorClass?: string;
  decimals?: number;
  showTicks?: boolean;
}

export function GaugeCircle({
  value,
  min,
  max,
  size = 160,
  strokeWidth = 10,
  label,
  unit,
  colorClass = 'stroke-emerald-400',
  decimals = 0,
  showTicks = false,
}: GaugeCircleProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Math.max(min, Math.min(max, value));
  const progress = (safeValue - min) / (max - min);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-slate-700/50"
          strokeWidth={strokeWidth}
        />
        {/* Tick marks */}
        {showTicks && (
          <>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              const x1 = (size / 2) + Math.cos(angle) * (radius - 2);
              const y1 = (size / 2) + Math.sin(angle) * (radius - 2);
              const x2 = (size / 2) + Math.cos(angle) * (radius + strokeWidth / 2 - 1);
              const y2 = (size / 2) + Math.sin(angle) * (radius + strokeWidth / 2 - 1);
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  className="stroke-slate-600/40"
                  strokeWidth={1.5}
                />
              );
            })}
          </>
        )}
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={colorClass}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-white tabular-nums">
          {safeValue.toFixed(decimals)}
        </span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      <span className="text-xs text-slate-500 mt-1">{label}</span>
    </div>
  );
}

// Large speed gauge (semicircle style)
interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
}

export function SpeedGauge({ speed, maxSpeed = 180 }: SpeedGaugeProps) {
  const size = 220;
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  const progress = Math.min(speed / maxSpeed, 1);
  const currentAngle = startAngle + totalAngle * progress;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  }

  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const current = polarToCartesian(currentAngle);

  const arcPath = (s: { x: number; y: number }, e: { x: number; y: number }, largeArc: number) =>
    `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;

  const bgArc = arcPath(start, end, 1);
  const valueArc = progress > 0.005 ? arcPath(start, current, 0) : '';

  // Color based on speed
  let color = 'stroke-emerald-400';
  if (speed > 120) color = 'stroke-amber-400';
  if (speed > 150) color = 'stroke-red-400';

  return (
    <div className="flex flex-col items-center relative">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path d={bgArc} fill="none" className="stroke-slate-700/50" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Tick marks */}
        {Array.from({ length: 19 }).map((_, i) => {
          const tickAngle = startAngle + (i / 18) * totalAngle;
          const outerR = radius + strokeWidth / 2 + 2;
          const innerR = radius + strokeWidth / 2 - 4;
          const rad = (tickAngle * Math.PI) / 180;
          const x1 = center + innerR * Math.cos(rad);
          const y1 = center + innerR * Math.sin(rad);
          const x2 = center + outerR * Math.cos(rad);
          const y2 = center + outerR * Math.sin(rad);
          const labelR = radius - 8;
          const lx = center + labelR * Math.cos(rad);
          const ly = center + labelR * Math.sin(rad);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-slate-600/40" strokeWidth={i % 3 === 0 ? 2 : 1} />
              {i % 3 === 0 && (
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-slate-500" fontSize="9">
                  {Math.round((i / 18) * maxSpeed)}
                </text>
              )}
            </g>
          );
        })}
        {/* Value arc */}
        {valueArc && (
          <path d={valueArc} fill="none" className={color} strokeWidth={strokeWidth} strokeLinecap="round"
            style={{ transition: 'd 0.3s ease-out' }} />
        )}
        {/* Needle */}
        <line
          x1={center} y1={center}
          x2={current.x} y2={current.y}
          className="stroke-white"
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{ transition: 'all 0.3s ease-out' }}
        />
        <circle cx={center} cy={center} r={5} className="fill-white" />
        {/* Speed text */}
        <text x={center} y={center + 40} textAnchor="middle" className="fill-white" fontSize="36" fontWeight="bold">
          {Math.round(speed)}
        </text>
        <text x={center} y={center + 58} textAnchor="middle" className="fill-slate-400" fontSize="12">
          km/h
        </text>
      </svg>
    </div>
  );
}

// Small sparkline chart
interface MiniChartProps {
  data: number[];
  height?: number;
  color?: string;
  fillColor?: string;
  showZero?: boolean;
  label?: string;
  unit?: string;
  maxVal?: number;
  minVal?: number;
}

export function MiniChart({
  data,
  height = 60,
  color = '#34d399',
  fillColor = 'rgba(16, 185, 129, 0.1)',
  showZero = false,
  maxVal,
  minVal,
}: MiniChartProps) {
  const width = 280;
  const padding = 2;
  const chartH = height - padding * 2;

  if (data.length < 2) {
    return (
      <div className="text-slate-600 text-xs text-center py-2">
        Collecting data...
      </div>
    );
  }

  const actualMax = maxVal ?? Math.max(...data, 1);
  const actualMin = minVal ?? Math.min(...data, 0);
  const range = actualMax - actualMin || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const normalized = (val - actualMin) / range;
    const y = padding + chartH * (1 - normalized);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;

  // Fill area
  const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  // Zero line
  const zeroY = padding + chartH * (1 - (0 - actualMin) / range);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {showZero && actualMin < 0 && actualMax > 0 && (
        <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="#475569" strokeWidth={0.5} strokeDasharray="4,2" />
      )}
      <path d={fillPath} fill={fillColor} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

// Animated number display
interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({ value, decimals = 0, className = '' }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    prevRef.current = value;
    if (ref.current) {
      ref.current.textContent = value.toFixed(decimals);
    }
  }, [value, decimals]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value.toFixed(decimals)}
    </span>
  );
}

// Status badge
interface StatusBadgeProps {
  active: boolean;
  label: string;
  activeColor?: string;
}

export function StatusBadge({ active, label, activeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }: StatusBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
      active
        ? activeColor
        : 'bg-slate-700/50 text-slate-500 border-slate-600/30'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${active ? 'animate-pulse' : ''} ${
        active ? 'bg-emerald-400' : 'bg-slate-600'
      }`} />
      {label}
    </div>
  );
}

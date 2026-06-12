'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── AnimatedNumber ──────────────────────────────────────────────────────────

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function AnimatedNumber({ value, decimals = 0, className = '', suffix = '', prefix = '' }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [displayValue, value]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

// ─── SpeedGauge ──────────────────────────────────────────────────────────────

interface SpeedGaugeProps {
  speed: number;
  maxSpeed?: number;
  size?: number;
}

export function SpeedGauge({ speed, maxSpeed = 180, size = 220 }: SpeedGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 16;
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle;
  const clampedSpeed = Math.min(Math.max(speed, 0), maxSpeed);
  const speedAngle = startAngle + (clampedSpeed / maxSpeed) * totalAngle;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const needleEnd = polarToCartesian(speedAngle);
  const needleLength = radius - 20;

  const tickMarks = [];
  for (let i = 0; i <= maxSpeed; i += 20) {
    const angle = startAngle + (i / maxSpeed) * totalAngle;
    const outer = polarToCartesian(angle);
    const innerRadius = i % 60 === 0 ? radius - 14 : radius - 8;
    const inner = {
      x: cx + innerRadius * Math.cos((angle * Math.PI) / 180),
      y: cy + innerRadius * Math.sin((angle * Math.PI) / 180),
    };
    tickMarks.push({ outer, inner, value: i, major: i % 60 === 0 });
  }

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      {/* Background arc */}
      <path
        d={describeArc(startAngle, endAngle)}
        fill="none"
        stroke="#1A2332"
        strokeWidth="12"
        strokeLinecap="round"
      />

      {/* Speed arc */}
      <motion.path
        d={describeArc(startAngle, speedAngle)}
        fill="none"
        stroke={speed > 140 ? '#FF3D00' : speed > 100 ? '#FFB300' : '#00D2FF'}
        strokeWidth="12"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Tick marks */}
      {tickMarks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={tick.major ? '#78909C' : '#2A3342'}
            strokeWidth={tick.major ? 2 : 1}
          />
          {tick.major && (
            <text
              x={polarToCartesian(((tick.value / maxSpeed) * totalAngle + startAngle)).x}
              y={polarToCartesian(((tick.value / maxSpeed) * totalAngle + startAngle)).y + 14}
              textAnchor="middle"
              fill="#78909C"
              fontSize="10"
              fontFamily="var(--font-geist-sans)"
            >
              {tick.value}
            </text>
          )}
        </g>
      ))}

      {/* Needle */}
      <motion.line
        x1={cx}
        y1={cy}
        x2={cx + needleLength * Math.cos((speedAngle * Math.PI) / 180)}
        y2={cy + needleLength * Math.sin((speedAngle * Math.PI) / 180)}
        stroke="#FF3D00"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={5} fill="#00D2FF" />

      {/* Speed text */}
      <text x={cx} y={cy + 30} textAnchor="middle" fill="#E8EAF6" fontSize="28" fontWeight="bold" fontFamily="var(--font-geist-sans)">
        {Math.round(speed)}
      </text>
      <text x={cx} y={cy + 44} textAnchor="middle" fill="#78909C" fontSize="11" fontFamily="var(--font-geist-sans)">
        km/h
      </text>
    </svg>
  );
}

// ─── CircleGauge ─────────────────────────────────────────────────────────────

interface CircleGaugeProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  unit?: string;
  showValue?: boolean;
  children?: React.ReactNode;
}

export function CircleGauge({
  value,
  max = 100,
  size = 160,
  strokeWidth = 10,
  color = '#00D2FF',
  label,
  unit = '',
  showValue = true,
  children,
}: CircleGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - progress);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#1A2332"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className="text-2xl font-bold text-evdx-text">
            <AnimatedNumber value={value} decimals={value % 1 !== 0 ? 1 : 0} />
          </span>
        )}
        {unit && <span className="text-xs text-evdx-text-secondary mt-0.5">{unit}</span>}
        {label && <span className="text-xs text-evdx-text-secondary mt-0.5">{label}</span>}
        {children}
      </div>
    </div>
  );
}

// ─── MiniChart (Sparkline) ───────────────────────────────────────────────────

interface MiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
}

export function MiniChart({
  data,
  width = 120,
  height = 40,
  color = '#00D2FF',
  fillColor,
}: MiniChartProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * (width - 2 * padding),
    y: padding + (1 - (v - min) / range) * (height - 2 * padding),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {fillColor && (
        <path d={fillPath} fill={fillColor} opacity={0.15} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── TempBar ─────────────────────────────────────────────────────────────────

interface TempBarProps {
  value: number;
  max?: number;
  min?: number;
  label: string;
  unit?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export function TempBar({
  value,
  max = 120,
  min = 0,
  label,
  unit = '°C',
  warningThreshold = 80,
  criticalThreshold = 100,
}: TempBarProps) {
  const percent = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  const color = value >= criticalThreshold ? '#FF3D00' : value >= warningThreshold ? '#FFB300' : '#00E676';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-evdx-text-secondary w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#1A2332] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-14 text-right" style={{ color }}>
        {Math.round(value)}{unit}
      </span>
    </div>
  );
}

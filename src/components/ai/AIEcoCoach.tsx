'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Leaf, Gauge, Zap, Thermometer, TrendingUp, Award, Lightbulb, Car } from 'lucide-react';
import { CircleGauge } from '@/components/shared/Gauges';

interface CoachingTip {
  category: 'acceleration' | 'braking' | 'speed' | 'temperature' | 'charging';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  potentialSaving: string;
}

interface DrivingScore {
  overall: number;
  smoothness: number;
  efficiency: number;
  range: number;
  regen: number;
}

function analyzeDrivingStyle(
  vehicleData: {
    speed: number;
    power: number;
    soc: number;
    motorTemp: number;
    batteryTemp: number;
    acceleratorPedal: number;
    regenTorque: number;
    mode: string;
  },
  ecoScore: { overall: number; acceleration: number; braking: number; speed: number; efficiency: number },
  speedHistory: { value: number; timestamp: number }[]
): { score: DrivingScore; tips: CoachingTip[] } {
  const tips: CoachingTip[] = [];

  // ─── Analyze acceleration patterns ─────────────────────────────────────────
  const isAggressive = vehicleData.acceleratorPedal > 70;
  if (isAggressive) {
    tips.push({
      category: 'acceleration',
      icon: Zap,
      title: 'Smooth acceleration saves range',
      description: `Your accelerator position is at ${vehicleData.acceleratorPedal.toFixed(0)}%. Gradual acceleration can improve range by 10-15%. Try pressing the pedal gently and building speed progressively.`,
      impact: 'high',
      potentialSaving: '10-15% range',
    });
  }

  // ─── Analyze speed patterns ────────────────────────────────────────────────
  if (vehicleData.speed > 120) {
    tips.push({
      category: 'speed',
      icon: Gauge,
      title: 'High speed significantly reduces range',
      description: `At ${vehicleData.speed.toFixed(0)} km/h, aerodynamic drag increases exponentially. Reducing speed to 100 km/h could extend your range by 20-25%. Each 10 km/h reduction above 80 km/h saves roughly 8-10% energy.`,
      impact: 'high',
      potentialSaving: '20-25% range',
    });
  } else if (vehicleData.speed > 90 && vehicleData.speed <= 120) {
    tips.push({
      category: 'speed',
      icon: Gauge,
      title: 'Moderate speed optimization',
      description: `Cruising at ${vehicleData.speed.toFixed(0)} km/h is reasonable. The optimal EV cruising speed for range is 70-90 km/h. Consider reducing speed slightly on highway trips for better efficiency.`,
      impact: 'medium',
      potentialSaving: '5-10% range',
    });
  }

  // ─── Analyze braking / regen patterns ──────────────────────────────────────
  if (vehicleData.regenTorque > 0 && vehicleData.regenTorque < 20) {
    tips.push({
      category: 'braking',
      icon: Leaf,
      title: 'Maximize regenerative braking',
      description: 'Your regen level is low. Lift off the accelerator earlier when approaching stops to capture more kinetic energy. One-pedal driving can recover up to 30% of energy used in city driving.',
      impact: 'medium',
      potentialSaving: '5-15% range',
    });
  }

  // ─── Temperature management ────────────────────────────────────────────────
  if (vehicleData.batteryTemp > 35) {
    tips.push({
      category: 'temperature',
      icon: Thermometer,
      title: 'Battery temperature management',
      description: `Battery at ${vehicleData.batteryTemp.toFixed(0)}°C is warm. Park in shade when possible and pre-condition the cabin while plugged in. High temperatures accelerate battery degradation and reduce charging speed.`,
      impact: 'medium',
      potentialSaving: 'Longer battery life',
    });
  }

  // ─── SOC management ────────────────────────────────────────────────────────
  if (vehicleData.soc > 85) {
    tips.push({
      category: 'charging',
      icon: Zap,
      title: 'Daily charge limit optimization',
      description: `SOC is at ${vehicleData.soc.toFixed(0)}%. For daily use, charging to 80% extends battery life significantly. Reserve 100% charges for long trips only. This habit can reduce annual degradation by 30-50%.`,
      impact: 'high',
      potentialSaving: '30-50% less degradation',
    });
  } else if (vehicleData.soc < 15) {
    tips.push({
      category: 'charging',
      icon: Zap,
      title: 'Avoid deep discharge',
      description: `SOC is at ${vehicleData.soc.toFixed(0)}%. Regularly dropping below 10% stresses the battery. Try to charge when you reach 20% to maintain optimal cell health and prevent sudden power reduction.`,
      impact: 'high',
      potentialSaving: 'Battery longevity',
    });
  }

  // ─── Positive feedback when driving well ───────────────────────────────────
  if (tips.length === 0) {
    tips.push({
      category: 'efficiency',
      icon: Award,
      title: 'Excellent driving efficiency!',
      description: 'Your current driving style is optimal for range and battery health. Maintain smooth acceleration, moderate speeds, and keep SOC between 20-80% for best long-term results.',
      impact: 'low',
      potentialSaving: 'Already optimal',
    });
  }

  // ─── Calculate composite driving score ─────────────────────────────────────
  const smoothness = Math.min(100, ecoScore.acceleration * 0.6 + ecoScore.braking * 0.4);
  const efficiency = ecoScore.efficiency;
  const rangeScore = vehicleData.soc > 20 && vehicleData.soc < 80 ? 90 : vehicleData.soc > 10 ? 70 : 40;
  const regen = Math.min(100, vehicleData.regenTorque > 0 ? 60 + vehicleData.regenTorque * 0.5 : 40);

  const score: DrivingScore = {
    overall: Math.round((smoothness * 0.3 + efficiency * 0.3 + rangeScore * 0.2 + regen * 0.2)),
    smoothness: Math.round(smoothness),
    efficiency: Math.round(efficiency),
    range: Math.round(rangeScore),
    regen: Math.round(regen),
  };

  return { score, tips };
}

export default function AIEcoCoach() {
  const { t } = useTranslation('sessions');
  const { vehicleData, ecoScore, speedHistory, settings } = useAppStore();
  const isRTL = settings.language === 'ar';

  const { score, tips } = useMemo(() => {
    return analyzeDrivingStyle(vehicleData, ecoScore, speedHistory);
  }, [vehicleData, ecoScore, speedHistory]);

  const scoreColor = score.overall >= 80 ? '#00E676' : score.overall >= 60 ? '#00D2FF' : score.overall >= 40 ? '#FFB300' : '#FF3D00';

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-evdx-green/10 flex items-center justify-center">
          <Brain size={20} className="text-evdx-green" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-evdx-text">
            {isRTL ? 'مدرب القيادة الاقتصادية بالذكاء الاصطناعي' : 'AI Eco-Driving Coach'}
          </h2>
          <p className="text-xs text-evdx-text-secondary">
            {isRTL ? 'نصائح مخصصة لتحسين المدى وعمر البطارية' : 'Personalized tips for better range & battery life'}
          </p>
        </div>
      </div>

      {/* Eco Score Gauge */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-evdx-text-secondary mb-1">
                {isRTL ? 'درجة القيادة الاقتصادية' : 'Eco Driving Score'}
              </p>
              <span className="text-4xl font-black" style={{ color: scoreColor }}>{score.overall}</span>
              <span className="text-sm text-evdx-text-secondary">/100</span>
            </div>
            <CircleGauge value={score.overall} max={100} size={90} color={scoreColor} />
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[
              { label: isRTL ? 'النعومة' : 'Smoothness', value: score.smoothness, icon: Car, color: '#00D2FF' },
              { label: isRTL ? 'الكفاءة' : 'Efficiency', value: score.efficiency, icon: Zap, color: '#7B2FBE' },
              { label: isRTL ? 'إدارة المدى' : 'Range Mgmt', value: score.range, icon: Gauge, color: '#00E676' },
              { label: isRTL ? 'الفرملة المسترجعة' : 'Regen', value: score.regen, icon: Leaf, color: '#FFB300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-[#0D1117] rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} style={{ color }} />
                  <span className="text-[10px] text-evdx-text-secondary">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs font-medium text-evdx-text">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coaching Tips */}
      {tips.map((tip, i) => {
        const TipIcon = tip.icon;
        return (
          <Card key={i} className={`bg-[#1A2332] border-white/5 ${
            tip.impact === 'high' ? 'border-evdx-green/30' :
            tip.impact === 'medium' ? 'border-evdx-primary/20' : 'border-white/5'
          }`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  tip.impact === 'high' ? 'bg-evdx-green/10' :
                  tip.impact === 'medium' ? 'bg-evdx-primary/10' : 'bg-evdx-purple/10'
                }`}>
                  <TipIcon size={16} className={
                    tip.impact === 'high' ? 'text-evdx-green' :
                    tip.impact === 'medium' ? 'text-evdx-primary' : 'text-evdx-purple'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-evdx-text">{tip.title}</span>
                    <Badge className={`text-[9px] ${
                      tip.impact === 'high' ? 'bg-evdx-green/10 text-evdx-green' :
                      tip.impact === 'medium' ? 'bg-evdx-primary/10 text-evdx-primary' : 'bg-evdx-purple/10 text-evdx-purple'
                    }`}>
                      {tip.impact === 'high' ? (isRTL ? 'تأثير عالي' : 'HIGH') :
                       tip.impact === 'medium' ? (isRTL ? 'تأثير متوسط' : 'MED') : (isRTL ? 'منخفض' : 'LOW')}
                    </Badge>
                  </div>
                  <p className="text-xs text-evdx-text-secondary leading-relaxed">{tip.description}</p>
                </div>
              </div>

              {/* Potential Saving */}
              <div className="flex items-center gap-1.5 bg-[#0D1117] rounded-lg px-3 py-2">
                <TrendingUp size={12} className="text-evdx-green" />
                <span className="text-[10px] text-evdx-text-secondary">
                  {isRTL ? 'التوفير المحتمل' : 'Potential saving'}:
                </span>
                <span className="text-[10px] font-medium text-evdx-green">{tip.potentialSaving}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Current Drive Mode */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-evdx-warning" />
              <span className="text-sm text-evdx-text">
                {isRTL ? 'نمط القيادة الحالي' : 'Current Drive Mode'}
              </span>
            </div>
            <Badge className={`${
              vehicleData.mode === 'eco' ? 'bg-evdx-green/10 text-evdx-green' :
              vehicleData.mode === 'sport' ? 'bg-evdx-critical/10 text-evdx-critical' :
              'bg-evdx-primary/10 text-evdx-primary'
            }`}>
              {vehicleData.mode.toUpperCase()}
            </Badge>
          </div>
          {vehicleData.mode === 'sport' && (
            <p className="text-xs text-evdx-text-secondary mt-2">
              {isRTL
                ? 'نمط السباقة يستهلك طاقة أكثر بنسبة 20-30%. تحول إلى النمط الاقتصادي لتحسين المدى.'
                : 'Sport mode uses 20-30% more energy. Switch to Eco mode for better range.'}
            </p>
          )}
          {vehicleData.mode === 'eco' && (
            <p className="text-xs text-evdx-green mt-2">
              {isRTL ? 'أنت في أفضل نمط لتوفير الطاقة!' : 'You\'re in the optimal mode for energy savings!'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

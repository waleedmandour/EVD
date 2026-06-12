'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingDown, TrendingUp, Minus, AlertTriangle, Battery, Shield, Thermometer } from 'lucide-react';
import { CircleGauge } from '@/components/shared/Gauges';

interface PredictionResult {
  sohIn6Months: number;
  sohIn1Year: number;
  sohIn2Years: number;
  degradationRate: number; // % per year
  healthGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  riskFactors: string[];
  recommendations: string[];
  confidence: number; // 0-100
}

function predictBatteryHealth(
  currentSOH: number,
  batteryTemp: number,
  soc: number,
  chargingData: { isCharging: boolean; chargeType: string; power: number },
  batteryHistory: { value: number; timestamp: number }[]
): PredictionResult {
  // Base degradation: ~2% per year for EVs
  let annualDegradation = 2.0;

  // Temperature factor: higher temps = faster degradation
  if (batteryTemp > 40) annualDegradation += (batteryTemp - 40) * 0.15;
  if (batteryTemp > 50) annualDegradation += (batteryTemp - 50) * 0.3;

  // SOC factor: keeping SOC > 90% or < 10% accelerates degradation
  if (soc > 90) annualDegradation += (soc - 90) * 0.08;
  if (soc < 10) annualDegradation += (10 - soc) * 0.06;

  // Fast charging factor
  if (chargingData.isCharging && chargingData.chargeType === 'dc_fast') {
    annualDegradation += 0.5;
    if (chargingData.power > 100) annualDegradation += 0.3;
  }

  // Historical trend analysis
  if (batteryHistory.length > 20) {
    const recentPoints = batteryHistory.slice(-20);
    const avgSoc = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;
    if (avgSoc > 85) annualDegradation += 0.4; // chronic high SOC
    if (avgSoc < 15) annualDegradation += 0.3; // chronic low SOC
  }

  // Calculate predictions
  const sohIn6Months = Math.max(0, currentSOH - annualDegradation * 0.5);
  const sohIn1Year = Math.max(0, currentSOH - annualDegradation);
  const sohIn2Years = Math.max(0, currentSOH - annualDegradation * 2);

  // Health grade
  let healthGrade: PredictionResult['healthGrade'] = 'A';
  if (currentSOH >= 95) healthGrade = 'A+';
  else if (currentSOH >= 90) healthGrade = 'A';
  else if (currentSOH >= 80) healthGrade = 'B';
  else if (currentSOH >= 70) healthGrade = 'C';
  else if (currentSOH >= 60) healthGrade = 'D';
  else healthGrade = 'F';

  // Risk factors
  const riskFactors: string[] = [];
  if (batteryTemp > 40) riskFactors.push('High battery temperature');
  if (soc > 90 && !chargingData.isCharging) riskFactors.push('Sustained high SOC when idle');
  if (soc < 10) riskFactors.push('Deep discharge detected');
  if (annualDegradation > 4) riskFactors.push('Accelerated degradation rate');
  if (chargingData.isCharging && chargingData.chargeType === 'dc_fast' && soc > 80) riskFactors.push('DC fast charging above 80%');

  // Recommendations
  const recommendations: string[] = [];
  if (batteryTemp > 40) recommendations.push('Pre-condition battery before charging in hot climates');
  if (soc > 90) recommendations.push('Avoid keeping SOC above 90% for extended periods');
  if (soc < 15) recommendations.push('Charge before battery drops below 15%');
  if (chargingData.chargeType === 'dc_fast') recommendations.push('Limit DC fast charging to 80% SOC when possible');
  if (annualDegradation > 3.5) recommendations.push('Schedule a battery health diagnostic at your service center');
  if (recommendations.length === 0) recommendations.push('Your battery care habits are excellent!');

  // Confidence based on data quality
  const confidence = Math.min(95, 60 + batteryHistory.length * 0.5);

  return {
    sohIn6Months: Math.round(sohIn6Months * 10) / 10,
    sohIn1Year: Math.round(sohIn1Year * 10) / 10,
    sohIn2Years: Math.round(sohIn2Years * 10) / 10,
    degradationRate: Math.round(annualDegradation * 10) / 10,
    healthGrade,
    riskFactors,
    recommendations,
    confidence: Math.round(confidence),
  };
}

export default function AIBatteryPredictor() {
  const { t } = useTranslation('battery');
  const { vehicleData, chargingData, batteryHistory, settings } = useAppStore();
  const isRTL = settings.language === 'ar';

  const prediction = useMemo(() => {
    return predictBatteryHealth(
      vehicleData.soh,
      vehicleData.batteryTemp,
      vehicleData.soc,
      { isCharging: chargingData.isCharging, chargeType: chargingData.chargeType, power: chargingData.power },
      batteryHistory
    );
  }, [vehicleData.soh, vehicleData.batteryTemp, vehicleData.soc, chargingData, batteryHistory]);

  const gradeColor = prediction.healthGrade.startsWith('A') ? 'text-evdx-green' :
    prediction.healthGrade === 'B' ? 'text-evdx-primary' :
    prediction.healthGrade === 'C' ? 'text-evdx-warning' : 'text-evdx-critical';

  const TrendIcon = prediction.degradationRate <= 2 ? TrendingUp :
    prediction.degradationRate <= 4 ? Minus : TrendingDown;

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-evdx-purple/10 flex items-center justify-center">
          <Brain size={20} className="text-evdx-purple" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-evdx-text">
            {isRTL ? 'التنبؤ بصحة البطارية بالذكاء الاصطناعي' : 'AI Battery Health Predictor'}
          </h2>
          <p className="text-xs text-evdx-text-secondary">
            {isRTL ? 'تحليل أنماط التدهور والتوصيات المخصصة' : 'Degradation pattern analysis & personalized tips'}
          </p>
        </div>
      </div>

      {/* Current Health Grade */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-evdx-text-secondary mb-1">
                {isRTL ? 'تقييم الصحة الحالي' : 'Current Health Grade'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${gradeColor}`}>
                  {prediction.healthGrade}
                </span>
                <span className="text-sm text-evdx-text-secondary">SOH {vehicleData.soh.toFixed(0)}%</span>
              </div>
            </div>
            <CircleGauge value={vehicleData.soh} max={100} size={80} color="#00E676" />
          </div>
        </CardContent>
      </Card>

      {/* Degradation Forecast */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendIcon size={16} className={prediction.degradationRate <= 2 ? 'text-evdx-green' : prediction.degradationRate <= 4 ? 'text-evdx-warning' : 'text-evdx-critical'} />
            <span className="text-sm font-medium text-evdx-text">
              {isRTL ? 'توقعات التدهور' : 'Degradation Forecast'}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-bold text-evdx-text">{prediction.degradationRate}%</span>
            <span className="text-xs text-evdx-text-secondary">{isRTL ? 'في السنة' : '/ year'}</span>
          </div>

          <div className="space-y-2">
            {[
              { label: isRTL ? '٦ أشهر' : '6 Months', value: prediction.sohIn6Months, color: '#00D2FF' },
              { label: isRTL ? 'سنة' : '1 Year', value: prediction.sohIn1Year, color: '#7B2FBE' },
              { label: isRTL ? 'سنتان' : '2 Years', value: prediction.sohIn2Years, color: '#FFB300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
                <span className="text-sm text-evdx-text-secondary">{label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${value}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-evdx-text w-12 text-right">{value}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-evdx-text-secondary">
            <Shield size={12} />
            <span>{isRTL ? `ثقة التنبؤ: ${prediction.confidence}%` : `Prediction confidence: ${prediction.confidence}%`}</span>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors */}
      {prediction.riskFactors.length > 0 && (
        <Card className="bg-[#1A2332] border-evdx-warning/20">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-evdx-warning" />
              <span className="text-sm font-medium text-evdx-text">
                {isRTL ? 'عوامل الخطر المكتشفة' : 'Detected Risk Factors'}
              </span>
            </div>
            {prediction.riskFactors.map((factor, i) => (
              <div key={i} className="flex items-start gap-2 bg-evdx-warning/5 rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-evdx-warning mt-1.5 shrink-0" />
                <span className="text-sm text-evdx-text">{factor}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card className="bg-[#1A2332] border-evdx-green/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Battery size={16} className="text-evdx-green" />
            <span className="text-sm font-medium text-evdx-text">
              {isRTL ? 'توصيات الذكاء الاصطناعي' : 'AI Recommendations'}
            </span>
          </div>
          {prediction.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 bg-evdx-green/5 rounded-lg px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-evdx-green mt-1.5 shrink-0" />
              <span className="text-sm text-evdx-text">{rec}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Environmental Impact */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">
              {isRTL ? 'تأثير البيئة الحالية' : 'Current Environmental Impact'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">{isRTL ? 'حرارة البطارية' : 'Battery Temp'}</p>
              <p className={`text-lg font-bold ${
                vehicleData.batteryTemp > 40 ? 'text-evdx-critical' :
                vehicleData.batteryTemp > 30 ? 'text-evdx-warning' : 'text-evdx-green'
              }`}>{vehicleData.batteryTemp.toFixed(0)}°C</p>
            </div>
            <div className="bg-[#0D1117] rounded-lg p-3 text-center">
              <p className="text-xs text-evdx-text-secondary">{isRTL ? 'حالة الشحن' : 'SOC Level'}</p>
              <p className={`text-lg font-bold ${
                vehicleData.soc > 90 ? 'text-evdx-warning' :
                vehicleData.soc < 15 ? 'text-evdx-critical' : 'text-evdx-green'
              }`}>{vehicleData.soc.toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

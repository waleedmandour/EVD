'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, AlertTriangle, CheckCircle2, Info, Zap, Thermometer, Battery, Activity, ArrowRight } from 'lucide-react';

interface DTCAnalysis {
  rootCause: string;
  confidence: number;
  relatedCodes: string[];
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
  actionPlan: { step: string; priority: 'immediate' | 'soon' | 'scheduled' }[];
  estimatedCost: string;
  urgency: string;
}

function analyzeDTCs(
  dtcs: { code: string; description: string; severity: string; active: boolean; count: number }[],
  vehicleData: { soc: number; soh: number; batteryTemp: number; motorTemp: number; voltage: number; speed: number }
): DTCAnalysis[] {
  if (dtcs.length === 0) return [];

  const analyses: DTCAnalysis[] = [];

  // Group related DTCs by system
  const batteryCodes = dtcs.filter(d => d.code.startsWith('P0A') || d.code.startsWith('P0B'));
  const motorCodes = dtcs.filter(d => d.code.startsWith('P0C') || d.code.startsWith('P0D'));
  const chargingCodes = dtcs.filter(d => d.code.includes('P0AC') || d.code.includes('P0AE') || d.code.includes('P0B0') || d.code.includes('P0B1'));
  const bmsCodes = dtcs.filter(d => d.code.includes('P0AFA') || d.code.includes('P0AFB') || d.code.includes('P0AFC'));
  const otherCodes = dtcs.filter(d =>
    !batteryCodes.includes(d) && !motorCodes.includes(d) && !chargingCodes.includes(d) && !bmsCodes.includes(d)
  );

  // Analyze battery system codes
  if (batteryCodes.length > 0) {
    const hasInsulation = batteryCodes.some(d => d.code.includes('P0AA6') || d.code.includes('P0AA7'));
    const hasCellIssue = batteryCodes.some(d => d.code.includes('P0A80') || d.code.includes('P0A81'));
    const hasVoltage = batteryCodes.some(d => d.code.includes('P0A00') || d.code.includes('P0A01'));

    let rootCause = 'Battery system anomaly detected';
    let explanation = 'Multiple battery-related fault codes suggest an issue in the high-voltage battery system.';
    const actionPlan: DTCAnalysis['actionPlan'] = [];
    let severity: DTCAnalysis['severity'] = 'warning';
    let estimatedCost = '$100-500 (diagnostic)';
    let urgency = 'Schedule within 1 week';

    if (hasInsulation) {
      rootCause = 'High-voltage insulation degradation';
      explanation = 'Insulation resistance monitoring has detected a potential breakdown in the HV isolation. This is a safety-critical system that prevents electrical shock hazard. The BMS may limit vehicle performance as a protective measure.';
      severity = 'critical';
      urgency = 'Immediate — do not charge until inspected';
      estimatedCost = '$200-1,500 (repair)';
      actionPlan.push({ step: 'Stop charging immediately if currently connected', priority: 'immediate' });
      actionPlan.push({ step: 'Have HV insulation tested at certified EV service center', priority: 'immediate' });
      actionPlan.push({ step: 'Check for moisture intrusion in battery enclosure', priority: 'soon' });
    } else if (hasCellIssue) {
      rootCause = 'Battery cell imbalance or degradation';
      explanation = 'Individual cell monitoring has detected variance exceeding safe thresholds. Cell imbalance accelerates overall pack degradation and can reduce range significantly. This often correlates with battery age and thermal stress.';
      severity = 'warning';
      urgency = 'Schedule within 2 weeks';
      estimatedCost = '$500-3,000 (cell replacement if needed)';
      actionPlan.push({ step: 'Monitor range and charging behavior closely', priority: 'immediate' });
      actionPlan.push({ step: 'Schedule battery diagnostic with cell-level analysis', priority: 'soon' });
      actionPlan.push({ step: 'Avoid extreme temperatures and DC fast charging', priority: 'soon' });
    } else if (hasVoltage) {
      rootCause = 'Pack voltage out of specification';
      explanation = `Current pack voltage of ${vehicleData.voltage.toFixed(1)}V may be outside normal operating range. Combined with SOH of ${vehicleData.soh.toFixed(0)}%, this suggests the battery management system is compensating for voltage irregularity.`;
      severity = 'warning';
      actionPlan.push({ step: 'Monitor voltage during charge and discharge cycles', priority: 'soon' });
      actionPlan.push({ step: 'Full battery diagnostic recommended', priority: 'scheduled' });
    }

    if (vehicleData.batteryTemp > 45) {
      explanation += ` Battery temperature of ${vehicleData.batteryTemp.toFixed(0)}°C is elevated and may be contributing to the issue.`;
      actionPlan.push({ step: 'Allow battery to cool before driving or charging', priority: 'immediate' });
    }

    analyses.push({
      rootCause,
      confidence: batteryCodes.length > 1 ? 85 : 70,
      relatedCodes: batteryCodes.map(d => d.code),
      severity,
      explanation,
      actionPlan: actionPlan.length > 0 ? actionPlan : [{ step: 'Monitor and schedule diagnostic', priority: 'scheduled' }],
      estimatedCost,
      urgency,
    });
  }

  // Analyze motor system codes
  if (motorCodes.length > 0) {
    const hasOverTemp = motorCodes.some(d => d.code.includes('P0C7') || d.code.includes('P0C8'));
    const hasInverter = motorCodes.some(d => d.code.includes('P0C3') || d.code.includes('P0C4'));

    let rootCause = 'Electric motor system issue';
    let explanation = 'Motor or inverter-related fault codes detected.';
    let severity: DTCAnalysis['severity'] = 'warning';
    const actionPlan: DTCAnalysis['actionPlan'] = [];

    if (hasOverTemp) {
      rootCause = 'Motor or inverter thermal stress';
      explanation = `Motor temperature of ${vehicleData.motorTemp.toFixed(0)}°C suggests thermal management system may not be cooling effectively. Prolonged high-temperature operation can permanently damage motor windings or inverter semiconductors.`;
      severity = 'critical';
      actionPlan.push({ step: 'Reduce driving intensity immediately', priority: 'immediate' });
      actionPlan.push({ step: 'Check coolant level and pump operation', priority: 'soon' });
    } else if (hasInverter) {
      rootCause = 'Inverter performance degradation';
      explanation = 'Inverter fault codes may indicate failing power semiconductors or gate driver issues. This can cause reduced power output or unexpected shutdowns.';
      severity = 'warning';
      actionPlan.push({ step: 'Avoid high-power acceleration', priority: 'immediate' });
      actionPlan.push({ step: 'Schedule inverter diagnostic', priority: 'soon' });
    }

    analyses.push({
      rootCause,
      confidence: 75,
      relatedCodes: motorCodes.map(d => d.code),
      severity,
      explanation,
      actionPlan: actionPlan.length > 0 ? actionPlan : [{ step: 'Schedule motor system diagnostic', priority: 'scheduled' }],
      estimatedCost: hasInverter ? '$1,000-5,000' : '$200-1,000',
      urgency: severity === 'critical' ? 'Immediate' : 'Schedule within 1 week',
    });
  }

  // Analyze charging system codes
  if (chargingCodes.length > 0) {
    analyses.push({
      rootCause: 'Charging system malfunction',
      confidence: 70,
      relatedCodes: chargingCodes.map(d => d.code),
      severity: 'warning',
      explanation: 'On-board charger or DC charge port issues detected. The vehicle may charge slower than expected or refuse to charge. This could be due to a faulty charger, damaged charge port, or communication error with the charging station.',
      actionPlan: [
        { step: 'Try a different charging station', priority: 'immediate' },
        { step: 'Inspect charge port for damage or debris', priority: 'soon' },
        { step: 'Schedule charging system diagnostic', priority: 'soon' },
      ],
      estimatedCost: '$300-2,000',
      urgency: 'Schedule within 3 days',
    });
  }

  // Analyze BMS codes
  if (bmsCodes.length > 0) {
    analyses.push({
      rootCause: 'Battery Management System fault',
      confidence: 80,
      relatedCodes: bmsCodes.map(d => d.code),
      severity: 'critical',
      explanation: 'The BMS is reporting internal faults. This is the computer that manages cell balancing, thermal control, and safety interlocks. A BMS fault can affect all aspects of battery operation and should be investigated immediately.',
      actionPlan: [
        { step: 'Do not attempt to fast charge', priority: 'immediate' },
        { step: 'Monitor for sudden range drops', priority: 'immediate' },
        { step: 'Schedule BMS diagnostic at dealership or certified shop', priority: 'immediate' },
      ],
      estimatedCost: '$500-2,500',
      urgency: 'Immediate — within 24 hours',
    });
  }

  // Generic analysis for uncategorized codes
  if (otherCodes.length > 0) {
    const hasHighSeverity = otherCodes.some(d => d.severity === 'high' || d.severity === 'critical');
    analyses.push({
      rootCause: `${otherCodes.length} additional fault code(s) detected`,
      confidence: 50,
      relatedCodes: otherCodes.map(d => d.code),
      severity: hasHighSeverity ? 'critical' : 'info',
      explanation: `These codes may be standalone or related to other detected faults. Cross-system correlation analysis suggests ${hasHighSeverity ? 'some may require immediate attention' : 'they can likely be addressed during next service visit'}.`,
      actionPlan: [
        { step: 'Clear codes and monitor for recurrence', priority: 'soon' },
        { step: 'Schedule comprehensive vehicle diagnostic', priority: 'scheduled' },
      ],
      estimatedCost: 'Varies',
      urgency: hasHighSeverity ? 'Schedule within 3 days' : 'Next service visit',
    });
  }

  return analyses;
}

export default function AISmartDTC() {
  const { t } = useTranslation('diagnostics');
  const { dtcs, vehicleData, settings, milOn } = useAppStore();
  const isRTL = settings.language === 'ar';

  const analyses = useMemo(() => {
    return analyzeDTCs(dtcs, vehicleData);
  }, [dtcs, vehicleData]);

  const totalActive = dtcs.filter(d => d.active).length;

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-evdx-purple/10 flex items-center justify-center">
          <Brain size={20} className="text-evdx-purple" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-evdx-text">
            {isRTL ? 'محلل الأعطال الذكي' : 'AI Smart DTC Analyzer'}
          </h2>
          <p className="text-xs text-evdx-text-secondary">
            {isRTL ? 'تحليل السبب الجذري والتوصيات بالذكاء الاصطناعي' : 'AI root cause analysis & recommendations'}
          </p>
        </div>
      </div>

      {/* MIL Status */}
      <Card className={`bg-[#1A2332] border-white/5 ${milOn ? 'border-evdx-critical/30' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {milOn ? (
                <AlertTriangle size={20} className="text-evdx-critical" />
              ) : (
                <CheckCircle2 size={20} className="text-evdx-green" />
              )}
              <span className="text-sm font-medium text-evdx-text">
                {isRTL ? 'مصباح المحرك' : 'Check Engine Light'}
              </span>
            </div>
            <Badge className={milOn ? 'bg-evdx-critical/10 text-evdx-critical' : 'bg-evdx-green/10 text-evdx-green'}>
              {milOn ? (isRTL ? 'مضاء' : 'ON') : (isRTL ? ' مطفأ' : 'OFF')}
            </Badge>
          </div>
          {totalActive > 0 && (
            <p className="text-xs text-evdx-text-secondary mt-2">
              {isRTL ? `${totalActive} رمز عطل نشط من أصل ${dtcs.length}` : `${totalActive} active fault(s) of ${dtcs.length} total`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* No DTCs */}
      {dtcs.length === 0 && (
        <Card className="bg-[#1A2332] border-evdx-green/20">
          <CardContent className="p-6 text-center">
            <CheckCircle2 size={40} className="text-evdx-green mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-evdx-text mb-1">
              {isRTL ? 'لا توجد أعطال' : 'No Faults Detected'}
            </h3>
            <p className="text-sm text-evdx-text-secondary">
              {isRTL ? 'جميع الأنظمة تعمل بشكل طبيعي' : 'All systems operating normally'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analyses.map((analysis, i) => (
        <Card key={i} className={`bg-[#1A2332] border-white/5 ${
          analysis.severity === 'critical' ? 'border-evdx-critical/30' :
          analysis.severity === 'warning' ? 'border-evdx-warning/30' : 'border-evdx-primary/30'
        }`}>
          <CardContent className="p-4 space-y-3">
            {/* Root Cause */}
            <div className="flex items-start gap-2">
              <Search size={16} className={
                analysis.severity === 'critical' ? 'text-evdx-critical' :
                analysis.severity === 'warning' ? 'text-evdx-warning' : 'text-evdx-primary'
              } />
              <div>
                <p className="text-sm font-semibold text-evdx-text">{analysis.rootCause}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-[10px] ${
                    analysis.severity === 'critical' ? 'bg-evdx-critical/10 text-evdx-critical' :
                    analysis.severity === 'warning' ? 'bg-evdx-warning/10 text-evdx-warning' : 'bg-evdx-primary/10 text-evdx-primary'
                  }`}>
                    {analysis.severity.toUpperCase()}
                  </Badge>
                  <span className="text-[10px] text-evdx-text-secondary">
                    {isRTL ? 'ثقة' : 'Confidence'}: {analysis.confidence}%
                  </span>
                </div>
              </div>
            </div>

            {/* Related Codes */}
            <div className="flex flex-wrap gap-1">
              {analysis.relatedCodes.map(code => (
                <Badge key={code} className="text-[10px] bg-[#0D1117] text-evdx-text-secondary border-white/5">
                  {code}
                </Badge>
              ))}
            </div>

            {/* Explanation */}
            <div className="bg-[#0D1117] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-evdx-primary shrink-0 mt-0.5" />
                <p className="text-xs text-evdx-text leading-relaxed">{analysis.explanation}</p>
              </div>
            </div>

            {/* Action Plan */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-evdx-text">
                {isRTL ? 'خطة العمل' : 'Action Plan'}
              </p>
              {analysis.actionPlan.map((action, j) => (
                <div key={j} className="flex items-start gap-2 bg-[#0D1117] rounded-lg px-3 py-2">
                  <ArrowRight size={12} className={
                    action.priority === 'immediate' ? 'text-evdx-critical' :
                    action.priority === 'soon' ? 'text-evdx-warning' : 'text-evdx-primary'
                  } />
                  <div className="flex-1">
                    <span className="text-xs text-evdx-text">{action.step}</span>
                    <Badge className={`text-[9px] ml-1 ${
                      action.priority === 'immediate' ? 'bg-evdx-critical/10 text-evdx-critical' :
                      action.priority === 'soon' ? 'bg-evdx-warning/10 text-evdx-warning' : 'bg-evdx-primary/10 text-evdx-primary'
                    }`}>
                      {action.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost & Urgency */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-evdx-text-secondary">
                {isRTL ? 'التكلفة المقدرة' : 'Est. Cost'}: <span className="text-evdx-text">{analysis.estimatedCost}</span>
              </span>
              <span className={analysis.severity === 'critical' ? 'text-evdx-critical font-semibold' : 'text-evdx-text-secondary'}>
                {analysis.urgency}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Active DTC Codes List */}
      {dtcs.length > 0 && (
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-evdx-text mb-2">
              {isRTL ? 'جميع رموز الأعطال' : 'All Fault Codes'}
            </p>
            {dtcs.map((dtc, i) => (
              <div key={i} className="flex items-center justify-between bg-[#0D1117] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    dtc.severity === 'critical' ? 'bg-evdx-critical' :
                    dtc.severity === 'high' ? 'bg-evdx-warning' :
                    dtc.severity === 'medium' ? 'bg-evdx-primary' : 'bg-evdx-green'
                  }`} />
                  <span className="text-sm text-evdx-text font-mono">{dtc.code}</span>
                </div>
                <span className="text-xs text-evdx-text-secondary max-w-[60%] text-right truncate">{dtc.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

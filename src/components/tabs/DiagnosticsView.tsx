'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { getDTCByCode } from '@/lib/dtc-codes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AnimatedNumber } from '@/components/shared/Gauges';
import { Search, AlertTriangle, CheckCircle2, XCircle, ChevronDown, Loader2, Shield, FileDown } from 'lucide-react';
import { generateReport, downloadBlob, getReportFilename } from '@/lib/pdf/report-generator';

export default function DiagnosticsView() {
  const { t } = useTranslation('diagnostics');
  const { dtcs, milOn, monitorStatus, setDTCs, clearDTCs, setMilOn, connectionStatus, vehicleData, chargingData, tripData, ecoScore, activeVehicle, settings } = useAppStore();
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleGenerateReport = async () => {
    setGeneratingPDF(true);
    try {
      const blob = await generateReport({
        type: 'diagnostic_scan',
        vehicle: activeVehicle,
        vehicleData,
        chargingData,
        dtcs,
        tripData,
        ecoScore,
        language: settings.language,
      });
      downloadBlob(blob, getReportFilename('diagnostic_scan', activeVehicle));
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleScan = () => {
    if (connectionStatus !== 'connected') return;
    setScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          // Simulate finding some DTCs in demo mode
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const handleClearCodes = () => {
    clearDTCs();
  };

  const severityColors: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: '#00D2FF15', text: '#00D2FF', border: '#00D2FF30' },
    medium: { bg: '#FFB30015', text: '#FFB300', border: '#FFB30030' },
    high: { bg: '#FF980015', text: '#FF9800', border: '#FF980030' },
    critical: { bg: '#FF3D0015', text: '#FF3D00', border: '#FF3D0030' },
  };

  const monitors = [
    { key: 'catalyst', label: t('monitorsList.catalyst') },
    { key: 'heatedCatalyst', label: t('monitorsList.heatedCatalyst') },
    { key: 'evSystem', label: t('monitorsList.evap') },
    { key: 'o2Sensor', label: t('monitorsList.oxygenSensor') },
    { key: 'o2SensorHeater', label: t('monitorsList.heatedOxygen') },
    { key: 'egrSystem', label: t('monitorsList.egr') },
    { key: 'fuelSystem', label: t('monitorsList.fuelSystem') },
    { key: 'misfire', label: t('monitorsList.misfire') },
  ] as const;

  return (
    <div className="space-y-4 pb-2">
      {/* MIL Indicator */}
      <Card className={`border-2 ${milOn ? 'border-evdx-critical/30 bg-[#1A2332]' : 'border-evdx-green/20 bg-[#1A2332]'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {milOn ? (
                <div className="w-12 h-12 rounded-xl bg-evdx-critical/10 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-evdx-critical" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-evdx-green/10 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-evdx-green" />
                </div>
              )}
              <div>
                <p className="text-sm text-evdx-text-secondary">{t('milStatus')}</p>
                <p className={`text-lg font-bold ${milOn ? 'text-evdx-critical' : 'text-evdx-green'}`}>
                  {milOn ? t('milOn') : t('milOff')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-evdx-text-secondary">{t('dtcCount')}</p>
              <p className="text-2xl font-bold text-evdx-text">
                <AnimatedNumber value={dtcs.length} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Button */}
      <Button
        onClick={handleScan}
        disabled={scanning || connectionStatus !== 'connected'}
        className="w-full bg-evdx-primary hover:bg-evdx-primary/90 text-[#0D1117] font-semibold h-12 rounded-xl"
      >
        {scanning ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            {t('scanProgress', { progress: scanProgress })}
          </>
        ) : (
          <>
            <Search size={18} className="mr-2" />
            {t('fullScan')}
          </>
        )}
      </Button>

      {scanning && (
        <div className="w-full h-2 bg-[#1A2332] rounded-full overflow-hidden">
          <div
            className="h-full bg-evdx-primary rounded-full transition-all duration-200"
            style={{ width: `${scanProgress}%` }}
          />
        </div>
      )}

      {/* DTC List */}
      {dtcs.length > 0 && (
        <Card className="bg-[#1A2332] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-evdx-critical" />
                <span className="text-sm font-medium text-evdx-text">
                  {t('faultsFound', { count: dtcs.length })}
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-evdx-critical/30 text-evdx-critical hover:bg-evdx-critical/10 h-8 text-xs">
                    <XCircle size={14} className="mr-1" />
                    {t('clearCodes')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1A2332] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-evdx-text">{t('clearCodes')}</AlertDialogTitle>
                    <AlertDialogDescription className="text-evdx-text-secondary">
                      {t('clearConfirm')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-[#0D1117] text-evdx-text border-white/10">{t('cancel', { ns: 'common' })}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCodes} className="bg-evdx-critical text-white">{t('clearCodes')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Accordion type="multiple" className="space-y-2">
              {dtcs.map((dtc) => {
                const dtcInfo = getDTCByCode(dtc.code);
                const colors = severityColors[dtc.severity] || severityColors.low;
                return (
                  <AccordionItem key={dtc.code} value={dtc.code} className="border-white/5 rounded-lg overflow-hidden">
                    <AccordionTrigger className="hover:no-underline hover:bg-white/5 px-3 py-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-mono text-evdx-text">{dtc.code}</span>
                        <Badge
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                          }}
                        >
                          {dtc.severity}
                        </Badge>
                        {!dtc.active && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-evdx-text-secondary border-white/10">
                            {t('codeType.history')}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <p className="text-sm text-evdx-text mb-2">
                        {dtcInfo?.title || dtc.description}
                      </p>
                      {dtcInfo && (
                        <>
                          <p className="text-xs text-evdx-text-secondary mb-2">{dtcInfo.description}</p>
                          {dtcInfo.causes.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-evdx-warning mb-1">{t('possibleCauses')}:</p>
                              <ul className="list-disc list-inside text-xs text-evdx-text-secondary space-y-0.5">
                                {dtcInfo.causes.slice(0, 3).map((cause, i) => (
                                  <li key={i}>{cause}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {dtcInfo.actions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-evdx-green mb-1">{t('suggestedFixes')}:</p>
                              <ul className="list-disc list-inside text-xs text-evdx-text-secondary space-y-0.5">
                                {dtcInfo.actions.slice(0, 3).map((action, i) => (
                                  <li key={i}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-evdx-text-secondary">
                        <span>{t('occurrenceCount')}: {dtc.count}</span>
                        <span>{new Date(dtc.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {dtcs.length === 0 && !scanning && (
        <Card className="bg-[#1A2332] border-evdx-green/20">
          <CardContent className="p-6 text-center">
            <CheckCircle2 size={40} className="text-evdx-green mx-auto mb-3" />
            <p className="text-sm font-medium text-evdx-green">{t('noFaults')}</p>
          </CardContent>
        </Card>
      )}

      {/* Monitor Readiness Grid */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-evdx-primary" />
            <span className="text-sm font-medium text-evdx-text">{t('readiness')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {monitors.map(({ key, label }) => {
              const complete = monitorStatus[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-[#0D1117] rounded-lg px-3 py-2"
                >
                  {complete ? (
                    <CheckCircle2 size={14} className="text-evdx-green shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-evdx-critical shrink-0" />
                  )}
                  <span className="text-xs text-evdx-text-secondary truncate">{label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending & Permanent sections */}
      <Card className="bg-[#1A2332] border-white/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-evdx-text-secondary mb-1">{t('pending')}</p>
              <p className="text-sm text-evdx-text">{t('noPendingCodes')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-evdx-text-secondary mb-1">{t('permanent')}</p>
              <p className="text-sm text-evdx-text">{t('noPermanentCodes')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Report */}
      <Button
        onClick={handleGenerateReport}
        disabled={generatingPDF}
        variant="outline"
        className="w-full border-evdx-primary/30 text-evdx-primary hover:bg-evdx-primary/10 h-11 rounded-xl"
      >
        <FileDown size={16} className="mr-2" />
        {generatingPDF ? 'Generating...' : t('generateReport', { defaultValue: 'Generate Diagnostic Report' })}
      </Button>
    </div>
  );
}

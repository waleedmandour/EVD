/**
 * EVDx — PDF Report Generator
 *
 * Generates battery health, diagnostic, and trip summary reports
 * as downloadable PDF files entirely on-device using jsPDF.
 *
 * No cloud, no server, no external API calls.
 */

import type { VehicleData, ChargingData, DTCEvent, TripData, EcoScore, VehicleProfile } from '../types';
import { APP_VERSION } from '../version';

// ─── Report Types ─────────────────────────────────────────────────────────────

export type ReportType = 'battery_health' | 'diagnostic_scan' | 'trip_summary' | 'full_vehicle';

export interface ReportOptions {
  type: ReportType;
  vehicle: VehicleProfile | null;
  vehicleData: VehicleData;
  chargingData: ChargingData;
  dtcs: DTCEvent[];
  tripData: TripData;
  ecoScore: EcoScore;
  language: 'en' | 'ar';
  ownerName?: string;
}

// ─── Color Constants ──────────────────────────────────────────────────────────

const COLORS = {
  primary: [0, 210, 255] as const,      // #00D2FF
  dark: [13, 17, 23] as const,           // #0D1117
  surface: [26, 35, 50] as const,        // #1A2332
  text: [232, 234, 246] as const,        // #E8EAF6
  textSecondary: [120, 144, 156] as const, // #78909C
  green: [0, 230, 118] as const,         // #00E676
  warning: [255, 179, 0] as const,       // #FFB300
  critical: [255, 61, 0] as const,       // #FF3D00
  purple: [123, 47, 190] as const,       // #7B2FBE
  white: [255, 255, 255] as const,
};

// ─── Dynamic Import Helper ────────────────────────────────────────────────────

let jsPDFModule: typeof import('jspdf') | null = null;

async function getJsPDF() {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule;
}

// ─── Main Report Generator ────────────────────────────────────────────────────

export async function generateReport(options: ReportOptions): Promise<Blob> {
  const { jsPDF } = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const isRTL = options.language === 'ar';
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = 0;

  // ─── Helper Functions ────────────────────────────────────────────────────────

  const setColor = (color: readonly [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const setFillColor = (color: readonly [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2]);
  };

  const setDrawColor = (color: readonly [number, number, number]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
  };

  const addHeader = () => {
    // Dark header bar
    setFillColor(COLORS.dark);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Accent line
    setFillColor(COLORS.primary);
    doc.rect(0, 40, pageWidth, 2, 'F');

    // Logo / App name
    setColor(COLORS.primary);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EVDx', margin, 18);

    // Subtitle
    setColor(COLORS.textSecondary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Universal EV Diagnostics Pro', margin, 25);

    // Report type
    const reportTitles: Record<ReportType, string> = {
      battery_health: 'Battery Health Report',
      diagnostic_scan: 'Diagnostic Scan Report',
      trip_summary: 'Trip Summary Report',
      full_vehicle: 'Full Vehicle Report',
    };
    setColor(COLORS.white);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitles[options.type], margin, 34);

    // Date
    setColor(COLORS.textSecondary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(dateStr, pageWidth - margin, 18, { align: 'right' });

    y = 50;
  };

  const addVehicleInfo = () => {
    if (!options.vehicle) return;

    // Section title
    setColor(COLORS.primary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Vehicle Information', margin, y);
    y += 2;

    setFillColor(COLORS.primary);
    doc.rect(margin, y, contentWidth, 0.5, 'F');
    y += 5;

    const vehicle = options.vehicle;
    const info: [string, string][] = [
      ['Brand', vehicle.brand],
      ['Model', vehicle.model],
      ['Year', String(vehicle.year)],
      ['Battery Capacity', `${vehicle.batteryCapacity} kWh`],
      ['Max Charge Power', `${vehicle.maxChargePower} kW`],
      ...(vehicle.vin ? [['VIN', vehicle.vin] as [string, string]] : []),
      ...(vehicle.nickname ? [['Nickname', vehicle.nickname] as [string, string]] : []),
    ];

    doc.setFontSize(9);
    info.forEach(([label, value]) => {
      setColor(COLORS.textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text(`${label}:`, margin, y);
      setColor(COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.text(value, margin + 40, y);
      y += 5;
    });

    y += 5;
  };

  const addSectionTitle = (title: string) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    setColor(COLORS.primary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 2;

    setFillColor(COLORS.primary);
    doc.rect(margin, y, contentWidth, 0.5, 'F');
    y += 5;
  };

  const addMetric = (label: string, value: string, unit?: string, status?: 'good' | 'warning' | 'critical') => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(9);

    // Label
    setColor(COLORS.textSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 2, y);

    // Value
    const statusColor = status === 'critical' ? COLORS.critical : status === 'warning' ? COLORS.warning : status === 'good' ? COLORS.green : COLORS.text;
    setColor(statusColor);
    doc.setFont('helvetica', 'bold');
    const displayValue = unit ? `${value} ${unit}` : value;
    doc.text(displayValue, pageWidth - margin - 2, y, { align: 'right' });

    y += 5;
  };

  const addKVRow = (label: string, value: string) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(9);
    setColor(COLORS.textSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 2, y);
    setColor(COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 60, y);
    y += 5;
  };

  const addDivider = () => {
    setDrawColor(COLORS.surface);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer bar
      setFillColor(COLORS.dark);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

      setFillColor(COLORS.primary);
      doc.rect(0, pageHeight - 12, pageWidth, 0.5, 'F');

      setColor(COLORS.textSecondary);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('EVDx — Universal EV Diagnostics Pro | Dr. Waleed Mandour', margin, pageHeight - 4);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
    }
  };

  // ─── Build Report ────────────────────────────────────────────────────────────

  // Set dark background for all pages
  const addDarkBackground = () => {
    setFillColor(COLORS.dark);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  // Page 1 - start
  addDarkBackground();
  addHeader();
  addVehicleInfo();

  // ─── Battery Health Section ──────────────────────────────────────────────────

  if (options.type === 'battery_health' || options.type === 'full_vehicle') {
    addSectionTitle('Battery Health');

    const socStatus = options.vehicleData.soc > 50 ? 'good' : options.vehicleData.soc > 20 ? 'warning' : 'critical';
    const sohStatus = options.vehicleData.soh > 80 ? 'good' : options.vehicleData.soh > 60 ? 'warning' : 'critical';

    addMetric('State of Charge (SOC)', `${options.vehicleData.soc.toFixed(1)}%`, undefined, socStatus);
    addMetric('State of Health (SOH)', `${options.vehicleData.soh.toFixed(1)}%`, undefined, sohStatus);
    addMetric('Pack Voltage', options.vehicleData.voltage.toFixed(1), 'V');
    addMetric('Pack Current', options.vehicleData.current.toFixed(1), 'A');
    addMetric('Battery Temperature', options.vehicleData.batteryTemp.toFixed(1), '°C',
      options.vehicleData.batteryTemp > 45 ? 'critical' : options.vehicleData.batteryTemp > 35 ? 'warning' : 'good');
    addMetric('Range Remaining', options.vehicleData.range.toFixed(0), 'km');
    addMetric('Insulation Resistance', options.vehicleData.insulationResistance.toFixed(0), 'kOhm');

    y += 3;
    addDivider();

    addSectionTitle('Cell Voltage Analysis');
    addMetric('Max Cell Voltage', (options.vehicleData.cellMaxV / 1000).toFixed(3), 'V');
    addMetric('Min Cell Voltage', (options.vehicleData.cellMinV / 1000).toFixed(3), 'V');
    addMetric('Cell Delta (Imbalance)', options.vehicleData.cellDeltaV.toFixed(0), 'mV',
      options.vehicleData.cellDeltaV > 50 ? 'critical' : options.vehicleData.cellDeltaV > 30 ? 'warning' : 'good');

    const balanceQuality = options.vehicleData.cellDeltaV < 20 ? 'Good' : options.vehicleData.cellDeltaV < 50 ? 'Fair' : 'Poor';
    addMetric('Cell Balance Quality', balanceQuality);

    y += 3;
    addDivider();

    addSectionTitle('Thermal Management');
    addMetric('Cell Temperature', options.vehicleData.batteryTemp.toFixed(1), '°C');
    addMetric('Coolant Inlet Temp', options.vehicleData.coolantInletTemp.toFixed(1), '°C');
    addMetric('Coolant Outlet Temp', options.vehicleData.coolantOutletTemp.toFixed(1), '°C');
    addMetric('Motor Temperature', options.vehicleData.motorTemp.toFixed(1), '°C',
      options.vehicleData.motorTemp > 90 ? 'critical' : options.vehicleData.motorTemp > 75 ? 'warning' : 'good');
    addMetric('Inverter Temperature', options.vehicleData.inverterTemp.toFixed(1), '°C',
      options.vehicleData.inverterTemp > 85 ? 'critical' : options.vehicleData.inverterTemp > 70 ? 'warning' : 'good');
    addMetric('BMS Status', options.vehicleData.bmsStatus);
    addMetric('DC-DC Converter', options.vehicleData.dcdcStatus ? 'Active' : 'Inactive');
    addMetric('Aux Battery Voltage', options.vehicleData.auxBatteryV.toFixed(1), 'V',
      options.vehicleData.auxBatteryV < 11.5 ? 'critical' : options.vehicleData.auxBatteryV < 12.0 ? 'warning' : 'good');
  }

  // ─── Diagnostic Scan Section ────────────────────────────────────────────────

  if (options.type === 'diagnostic_scan' || options.type === 'full_vehicle') {
    if (options.type === 'diagnostic_scan') {
      addSectionTitle('Diagnostic Scan Results');
    } else {
      addSectionTitle('Diagnostic Scan');
    }

    addMetric('MIL Status', options.dtcs.length > 0 ? 'ON' : 'OFF', undefined,
      options.dtcs.length > 0 ? 'critical' : 'good');
    addMetric('Total DTCs Found', String(options.dtcs.length));
    addMetric('Active DTCs', String(options.dtcs.filter(d => d.active).length), undefined,
      options.dtcs.some(d => d.active) ? 'critical' : 'good');
    addMetric('Historical DTCs', String(options.dtcs.filter(d => !d.active).length));

    if (options.dtcs.length > 0) {
      y += 3;
      addSectionTitle('DTC Details');

      options.dtcs.forEach((dtc, idx) => {
        if (y > 260) {
          doc.addPage();
          addDarkBackground();
          y = 20;
        }

        const severityColor = dtc.severity === 'critical' ? COLORS.critical
          : dtc.severity === 'high' ? COLORS.warning
          : dtc.severity === 'medium' ? COLORS.warning
          : COLORS.primary;

        setColor(severityColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${dtc.code}`, margin + 2, y);

        setColor(COLORS.text);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(dtc.description, margin + 30, y);

        setColor(COLORS.textSecondary);
        doc.setFontSize(8);
        const statusText = dtc.active ? 'ACTIVE' : 'HISTORY';
        doc.text(`[${dtc.severity.toUpperCase()}] [${statusText}] Count: ${dtc.count}`, margin + 30, y + 4);

        y += 10;
      });
    } else {
      y += 3;
      setColor(COLORS.green);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('No diagnostic trouble codes found — Vehicle systems OK', margin + 2, y);
      y += 8;
    }
  }

  // ─── Charging Session Section ───────────────────────────────────────────────

  if (options.type === 'full_vehicle') {
    addSectionTitle('Charging Status');
    addMetric('Charging Status', options.chargingData.isCharging ? 'Charging' : 'Not Charging',
      undefined, options.chargingData.isCharging ? 'good' : undefined);
    addMetric('Charge Type', options.chargingData.chargeType.toUpperCase());
    if (options.chargingData.isCharging) {
      addMetric('Charge Power', options.chargingData.power.toFixed(1), 'kW');
      addMetric('Energy Added', options.chargingData.energyAdded.toFixed(1), 'kWh');
      addMetric('Time Remaining', `${Math.floor(options.chargingData.timeRemaining)} min`);
      addMetric('Efficiency', options.chargingData.efficiency.toFixed(0), '%');
      addMetric('Estimated Cost (OMR)', options.chargingData.costOmr.toFixed(3));
    }
  }

  // ─── Trip Summary Section ───────────────────────────────────────────────────

  if (options.type === 'trip_summary' || options.type === 'full_vehicle') {
    addSectionTitle('Trip Summary');
    addMetric('Distance', options.tripData.distance.toFixed(1), 'km');
    addMetric('Average Speed', options.tripData.avgSpeed.toFixed(0), 'km/h');
    addMetric('Max Speed', options.tripData.maxSpeed.toFixed(0), 'km/h');
    addMetric('Energy Consumed', options.tripData.energyConsumed.toFixed(1), 'kWh');
    addMetric('Energy Regenerated', options.tripData.energyRegen.toFixed(1), 'kWh');
    addMetric('Duration', `${Math.floor(options.tripData.duration / 60)} min`);
    addMetric('Eco Score', options.ecoScore.overall.toFixed(0), '/100',
      options.ecoScore.overall > 70 ? 'good' : options.ecoScore.overall > 40 ? 'warning' : 'critical');

    y += 3;
    addKVRow('Acceleration Score', `${options.ecoScore.acceleration}/100`);
    addKVRow('Braking Score', `${options.ecoScore.braking}/100`);
    addKVRow('Cruising Score', `${options.ecoScore.speed}/100`);
    addKVRow('Efficiency Score', `${options.ecoScore.efficiency}/100`);
  }

  // ─── Disclaimer ─────────────────────────────────────────────────────────────

  if (y > 240) {
    doc.addPage();
    addDarkBackground();
    y = 20;
  }

  y += 5;
  addDivider();
  setColor(COLORS.textSecondary);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This report is generated by EVDx for informational purposes only. It does not constitute a professional vehicle inspection.',
    margin,
    y,
    { maxWidth: contentWidth }
  );
  y += 4;
  doc.text(
    'All data is collected on-device. No data has been transmitted to any external server. Zero telemetry. Zero cloud.',
    margin,
    y,
    { maxWidth: contentWidth }
  );
  y += 4;
  doc.text(
    `EVDx v${APP_VERSION} — By Dr. Waleed Mandour — ${new Date().getFullYear()}`,
    margin,
    y,
    { maxWidth: contentWidth }
  );

  addFooter();

  return doc.output('blob');
}

// ─── Convenience: Download Helper ─────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getReportFilename(type: ReportType, vehicle?: VehicleProfile | null): string {
  const brand = vehicle?.brand || 'unknown';
  const model = vehicle?.model || 'vehicle';
  const date = new Date().toISOString().split('T')[0];
  return `EVDx_${type}_${brand}_${model}_${date}.pdf`;
}

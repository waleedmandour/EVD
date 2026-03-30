// ─── TypeScript Types ───────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConnectionMode = 'bluetooth' | 'demo' | null;

export interface VehicleData {
  speed: number;           // km/h
  rpm: number;             // motor RPM
  batterySOC: number;      // percentage 0-100
  batteryVoltage: number;  // V (pack voltage ~350-400V for BYD Blade)
  batteryCurrent: number;  // A (positive = discharge, negative = charge)
  batteryPower: number;    // kW (positive = discharge, negative = regen/charge)
  batteryTemp: number;     // °C
  motorTemp: number;       // °C
  cabinTemp: number;       // °C
  ambientTemp: number;     // °C
  estimatedRange: number;  // km
  odometer: number;        // km
  isCharging: boolean;
  chargingPower: number;   // kW
  hvacActive: boolean;
  regenBraking: boolean;
  driveMode: string;       // ECO, NORMAL, SPORT
}

export interface DiagnosticTroubleCode {
  code: string;
  description: string;
  status: 'confirmed' | 'pending' | 'permanent';
  milOn: boolean;
}

export interface TripData {
  distance: number;        // km
  avgSpeed: number;        // km/h
  maxSpeed: number;        // km/h
  avgConsumption: number;  // Wh/km
  totalConsumption: number; // kWh
  regenEnergy: number;     // kWh recovered
  duration: number;        // seconds
  startedAt: Date | null;
}

export interface BatteryHistoryEntry {
  time: number;  // timestamp
  soc: number;
  voltage: number;
  temp: number;
}

// ─── OBD-II Command Definitions ─────────────────────────────────────

export interface OBDCommand {
  mode: string;
  pid: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  bytes: number;
  decode: (buffer: DataView) => number;
}

const formulaA256 = (buffer: DataView, factor: number, offset: number) =>
  ((buffer.getUint8(0) * 256 + buffer.getUint8(1)) * factor + offset);

const formulaA = (buffer: DataView, factor: number, offset: number) =>
  (buffer.getUint8(0) * factor + offset);

export const OBD_COMMANDS: Record<string, OBDCommand> = {
  rpm: {
    mode: '01', pid: '0C', description: 'Engine/Motor RPM',
    unit: 'rpm', min: 0, max: 16000, bytes: 2,
    decode: (b) => ((b.getUint8(0) * 256 + b.getUint8(1)) / 4),
  },
  speed: {
    mode: '01', pid: '0D', description: 'Vehicle Speed',
    unit: 'km/h', min: 0, max: 255, bytes: 1,
    decode: (b) => b.getUint8(0),
  },
  coolantTemp: {
    mode: '01', pid: '05', description: 'Engine Coolant Temp',
    unit: '°C', min: -40, max: 215, bytes: 1,
    decode: (b) => b.getUint8(0) - 40,
  },
  intakeTemp: {
    mode: '01', pid: '0F', description: 'Intake Air Temperature',
    unit: '°C', min: -40, max: 215, bytes: 1,
    decode: (b) => b.getUint8(0) - 40,
  },
  mafRate: {
    mode: '01', pid: '10', description: 'MAF Air Flow Rate',
    unit: 'g/s', min: 0, max: 655.35, bytes: 2,
    decode: (b) => ((b.getUint8(0) * 256 + b.getUint8(1)) / 100),
  },
  controlVoltage: {
    mode: '01', pid: '42', description: 'Control Module Voltage',
    unit: 'V', min: 0, max: 65.535, bytes: 2,
    decode: (b) => ((b.getUint8(0) * 256 + b.getUint8(1)) / 1000),
  },
  engineLoad: {
    mode: '01', pid: '04', description: 'Calculated Engine Load',
    unit: '%', min: 0, max: 100, bytes: 1,
    decode: (b) => (b.getUint8(0) * 100 / 255),
  },
  throttlePos: {
    mode: '01', pid: '11', description: 'Throttle Position',
    unit: '%', min: 0, max: 100, bytes: 1,
    decode: (b) => (b.getUint8(0) * 100 / 255),
  },
  ambientTemp: {
    mode: '01', pid: '46', description: 'Ambient Air Temperature',
    unit: '°C', min: -40, max: 215, bytes: 1,
    decode: (b) => b.getUint8(0) - 40,
  },
  fuelPressure: {
    mode: '01', pid: '0A', description: 'Fuel Pressure',
    unit: 'kPa', min: 0, max: 765, bytes: 1,
    decode: (b) => (b.getUint8(0) * 3),
  },
  timingAdvance: {
    mode: '01', pid: '0E', description: 'Timing Advance',
    unit: '°', min: -64, max: 63.5, bytes: 1,
    decode: (b) => (b.getUint8(0) / 2 - 64),
  },
  driverTorque: {
    mode: '01', pid: '61', description: 'Driver Demand Torque',
    unit: '%', min: -125, max: 125, bytes: 1,
    decode: (b) => (b.getUint8(0) - 125),
  },
  actualTorque: {
    mode: '01', pid: '62', description: 'Actual Engine Torque',
    unit: '%', min: -125, max: 125, bytes: 1,
    decode: (b) => (b.getUint8(0) - 125),
  },
  engineRefTorque: {
    mode: '01', pid: '4C', description: 'Engine Reference Torque',
    unit: 'Nm', min: 0, max: 65535, bytes: 2,
    decode: (b) => (b.getUint8(0) * 256 + b.getUint8(1)),
  },
};

export const ELM_INIT_COMMANDS = [
  'ATZ',       // Reset
  'ATE0',      // Echo off
  'ATL0',      // Linefeeds off
  'ATH1',      // Headers on
  'ATS0',      // Spaces off
  'ATSP6',     // Protocol: ISO 15765-4 CAN (11 bit, 500 kbaud)
  'ATDP',      // Describe protocol
  'ATRV',      // Read voltage
];

export const DTC_CODES: Record<string, string> = {
  P0A00: 'Drive Motor Inverter Temperature Circuit Open',
  P0A01: 'Drive Motor Inverter Temperature Circuit Range/Performance',
  P0A02: 'Drive Motor Inverter Temperature Circuit Low',
  P0A03: 'Drive Motor Inverter Temperature Circuit High',
  P0A04: 'Drive Motor Inverter Temperature Circuit Intermittent',
  P0A80: 'Drive Motor Inverter Performance',
  P0A81: 'Drive Motor Inverter Temperature Too High',
  P0A82: 'Drive Motor Inverter Temperature Too Low',
  P0BBD: 'Hybrid Battery Pack Voltage Too Low',
  P0BBE: 'Hybrid Battery Pack Voltage Too High',
  P0C00: 'Drive Motor Phase U Current Circuit/Open',
  P0C01: 'Drive Motor Phase U Current Low',
  P0C02: 'Drive Motor Phase U Current High',
  P0C03: 'Drive Motor Phase V Current Circuit/Open',
  P0C04: 'Drive Motor Phase V Current Low',
  P0C05: 'Drive Motor Phase V Current High',
  P0C06: 'Drive Motor Phase W Current Circuit/Open',
  P0C07: 'Drive Motor Phase W Current Low',
  P0C08: 'Drive Motor Phase W Current High',
  P0D00: 'High Voltage System Interlock Circuit/Open',
  P0D01: 'High Voltage System Interlock Circuit Low',
  P0D02: 'High Voltage System Interlock Circuit High',
  P1A00: 'Drive Motor A Control Module',
  P1A01: 'Drive Motor A Control Module Range/Performance',
  P1A02: 'Drive Motor A Control Module Circuit Low',
  P1A03: 'Drive Motor A Control Module Circuit High',
  P1A0B: 'Drive Motor A Torque Calibration Not Learned',
  P1A0C: 'Drive Motor A Torque Calibration Not Complete',
  C0300: 'Torque Control Module Unplugged',
  U0100: 'Lost Communication with ECM/PCM A',
  U0101: 'Lost Communication with TCM',
  U0140: 'Lost Communication with Body Control Module',
  U0151: 'Lost Communication with BCM',
};

export const EV_MONITOR_TESTS = [
  { name: 'Catalyst Monitor', description: 'Catalyst system efficiency' },
  { name: 'Heated Catalyst', description: 'Heated catalyst system' },
  { name: 'EV System', description: 'Electric drive system' },
  { name: 'O2 Sensor', description: 'Oxygen sensor heater' },
  { name: 'O2 Sensor Heater', description: 'O2 sensor heater circuit' },
  { name: 'EGR System', description: 'Exhaust gas recirculation' },
  { name: 'Fuel System', description: 'Fuel system monitoring' },
  { name: 'Misfire', description: 'Cylinder misfire detection' },
];

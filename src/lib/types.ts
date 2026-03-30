// ─── TypeScript Types ───────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConnectionMode = 'bluetooth' | 'wifi' | 'demo' | null;

export interface VehicleData {
  speed: number;
  rpm: number;
  batterySOC: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryPower: number;
  batteryTemp: number;
  motorTemp: number;
  cabinTemp: number;
  ambientTemp: number;
  estimatedRange: number;
  odometer: number;
  isCharging: boolean;
  chargingPower: number;
  hvacActive: boolean;
  regenBraking: boolean;
  driveMode: string;
}

export interface DiagnosticTroubleCode {
  code: string;
  description: string;
  status: 'confirmed' | 'pending' | 'permanent';
  milOn: boolean;
}

export interface TripData {
  distance: number;
  avgSpeed: number;
  maxSpeed: number;
  avgConsumption: number;
  totalConsumption: number;
  regenEnergy: number;
  duration: number;
  startedAt: Date | null;
}

export interface BatteryHistoryEntry {
  time: number;
  soc: number;
  voltage: number;
  temp: number;
}

// ─── OBD-II Device Info ────────────────────────────────────────────

export interface DeviceInfo {
  adapterType: string;        // e.g., "ELM327", "vLinker", "Carista"
  firmwareVersion: string;    // e.g., "v2.1", "v4.5.4"
  protocol: string;           // e.g., "ISO 15765-4 CAN (11 bit, 500 kbaud)"
  voltage: string;            // e.g., "12.8V"
  adapterVoltage: number;     // numeric
  supportedPIDs: number[];     // list of PIDs the adapter confirmed
  vin: string;                // Vehicle Identification Number
  connectionType: 'bluetooth' | 'wifi';
  wifiIp: string;             // IP address for WiFi adapters
  wifiPort: number;           // Port for WiFi adapters
  lastPing: number;           // timestamp of last successful comm
  signalStrength: number;     // 0-100 signal quality estimate
  responseTime: number;       // ms average response time
}

// ─── Session Data Logger ──────────────────────────────────────────

export interface SessionLogEntry {
  time: number;
  speed: number;
  rpm: number;
  soc: number;
  voltage: number;
  current: number;
  power: number;
  batteryTemp: number;
  motorTemp: number;
  ambientTemp: number;
  regenBraking: boolean;
}

// ─── Eco Driving Score ────────────────────────────────────────────

export interface EcoScore {
  overall: number;       // 0-100
  acceleration: number;  // 0-100
  braking: number;       // 0-100
  speed: number;         // 0-100
  efficiency: number;    // 0-100
  history: number[];     // last 60 readings
}

// ─── Freeze Frame ─────────────────────────────────────────────────

export interface FreezeFrame {
  dtcCode: string;
  timestamp: number;
  data: Partial<VehicleData>;
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
};

export const ELM_INIT_COMMANDS = [
  'ATZ',       // Reset — returns version string
  'ATE0',      // Echo off
  'ATL0',      // Linefeeds off
  'ATH1',      // Headers on
  'ATS0',      // Spaces off
  'ATSP6',     // Protocol: ISO 15765-4 CAN (11 bit, 500 kbaud)
  'ATDP',      // Describe protocol
  'ATRV',      // Read voltage
  'AT@1',      // Device name / description
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

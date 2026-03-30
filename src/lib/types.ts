// ─── TypeScript Types ───────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConnectionMode = 'bluetooth' | 'wifi' | 'demo' | null;
export type ChargingType = 'off' | 'ac_l1' | 'ac_l2' | 'dc_fast';

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

// ─── Charging Data ──────────────────────────────────────────────────

export interface ChargingData {
  isActive: boolean;
  type: ChargingType;
  power: number;              // kW currently being delivered
  voltage: number;            // V from charger
  current: number;            // A from charger
  startedSOC: number;         // SOC when charging began
  energyAdded: number;        // kWh added so far
  elapsedSeconds: number;     // seconds since charge start
  estimatedMinutesLeft: number;
  chargeEfficiency: number;   // 0-100%
  batteryTemp: number;        // °C during charge
  cabinPreconditioning: boolean;
  cellMaxVoltage: number;     // V (highest cell)
  cellMinVoltage: number;     // V (lowest cell)
  cellDelta: number;          // mV difference
  chargerName: string;
  connectorType: string;      // CCS2 / Type 2 / GB/T
  history: ChargingHistoryPoint[];
}

export interface ChargingHistoryPoint {
  time: number;
  soc: number;
  power: number;
  voltage: number;
  current: number;
  temp: number;
}

// ─── OBD-II Device Info ────────────────────────────────────────────

export interface DeviceInfo {
  adapterType: string;
  firmwareVersion: string;
  protocol: string;
  voltage: string;
  adapterVoltage: number;
  supportedPIDs: number[];
  vin: string;
  connectionType: 'bluetooth' | 'wifi';
  wifiIp: string;
  wifiPort: number;
  lastPing: number;
  signalStrength: number;
  responseTime: number;
  // vGate iCar Pro specific
  chipset: string;
  bleVersion: string;
  deviceId: string;
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
  overall: number;
  acceleration: number;
  braking: number;
  speed: number;
  efficiency: number;
  history: number[];
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

// ─── vGate iCar Pro BLE 4.0 Constants ─────────────────────────────

export const VGATE_ICAR_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
export const VGATE_ICAR_WRITE_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
export const VGATE_ICAR_NOTIFY_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb';
export const NORDIC_UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NORDIC_UART_RX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const NORDIC_UART_TX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

export const VGATE_INIT_COMMANDS = [
  'ATZ',       // Reset
  'ATE0',      // Echo off
  'ATL0',      // Linefeeds off
  'ATH1',      // Headers on
  'ATS0',      // Spaces off
  'ATSTFF',    // Adaptive timing to fast
  'ATSP6',     // Protocol: ISO 15765-4 CAN (11 bit, 500 kbaud)
  'ATDP',      // Describe protocol
  'ATRV',      // Read vehicle voltage
  'AT@1',      // Device description
  'ATI',       // Identify (vGate returns chip info)
  'AT@2',      // Device hardware version
  'ATPPSV',    // Set voltage to V (power save)
];

export const VGATE_ADAPTER_INFO = {
  name: 'vGate iCar Pro BLE 4.0',
  manufacturer: 'vGate Technology',
  chipset: 'CC2541 / nRF51822',
  bleVersion: 'Bluetooth 4.0 Low Energy',
  maxBaudRate: '500 kbaud',
  supportedProtocols: ['ISO 15765-4 CAN (11/29 bit)', 'ISO 9141-2', 'KWP2000', 'SAE J1850 PWM/VPW'],
  features: [
    'Ultra-low power BLE 4.0',
    'iOS & Android compatible',
    'ELM327 v2.1 command set',
    'Auto sleep / wake on ignition',
    'Adaptive timing control',
    'CCS2 / Type 2 charge monitoring',
    'Multi-protocol auto-detect',
  ],
};

export const ELM_INIT_COMMANDS = [
  'ATZ',
  'ATE0',
  'ATL0',
  'ATH1',
  'ATS0',
  'ATSP6',
  'ATDP',
  'ATRV',
  'AT@1',
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

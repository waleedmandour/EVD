/**
 * EVDx – Core Type Definitions
 *
 * All shared types, enums, and default constants used across the
 * Zustand store, simulator engine, and UI components.
 */

// ─── Connection ───────────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConnectionMode = 'bluetooth' | 'wifi' | 'demo' | null;

// ─── Vehicle Data ─────────────────────────────────────────────────────────────

export type DriveMode = 'eco' | 'normal' | 'sport' | 'snow' | 'track';
export type BMSStatus = 'normal' | 'charging' | 'discharging' | 'fault' | 'balancing' | 'idle';

export interface VehicleData {
  speed: number;               // km/h
  rpm: number;                 // motor RPM
  soc: number;                 // state of charge %
  soh: number;                 // state of health %
  voltage: number;             // pack voltage V
  current: number;             // pack current A (negative = charging)
  power: number;               // instantaneous kW
  motorTemp: number;           // °C
  batteryTemp: number;         // °C
  inverterTemp: number;        // °C
  range: number;               // km remaining
  odometer: number;            // km total
  mode: DriveMode;
  auxBatteryV: number;         // 12V battery voltage
  insulationResistance: number; // kOhm
  cellMaxV: number;            // mV
  cellMinV: number;            // mV
  cellDeltaV: number;          // mV (max - min)
  acceleratorPedal: number;    // 0-100 %
  torqueDemand: number;        // Nm
  torqueActual: number;        // Nm
  regenTorque: number;         // Nm
  dcdcStatus: boolean;         // DC-DC converter active
  chargingStatus: boolean;     // vehicle is charging
  bmsStatus: BMSStatus;
  coolantInletTemp: number;    // °C
  coolantOutletTemp: number;   // °C
  ambientTemp: number;         // °C
}

// ─── Charging ─────────────────────────────────────────────────────────────────

export type ChargingType = 'dc_fast' | 'ac_l2' | 'ac_l1';

export interface ChargeCurvePoint {
  soc: number;
  power: number;
}

export interface ChargingData {
  isCharging: boolean;
  chargeType: ChargingType;
  power: number;               // kW
  voltage: number;             // V
  current: number;             // A
  energyAdded: number;         // kWh
  startSoc: number;            // %
  targetSoc: number;           // %
  timeRemaining: number;       // minutes
  efficiency: number;          // %
  costOmr: number;             // OMR
  costUsd: number;             // USD
  cellVoltages: number[];      // per-cell mV
  chargeCurve: ChargeCurvePoint[];
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────

export type DTCSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DTCEvent {
  code: string;
  description: string;
  severity: DTCSeverity;
  timestamp: number;
  active: boolean;
  count: number;
}

export interface MonitorStatus {
  catalyst: boolean;
  heatedCatalyst: boolean;
  evSystem: boolean;
  o2Sensor: boolean;
  o2SensorHeater: boolean;
  egrSystem: boolean;
  fuelSystem: boolean;
  misfire: boolean;
}

// ─── Trip & Eco ───────────────────────────────────────────────────────────────

export interface TripData {
  distance: number;            // km
  avgSpeed: number;            // km/h
  maxSpeed: number;            // km/h
  energyConsumed: number;      // kWh
  energyRegen: number;         // kWh
  duration: number;            // seconds
  startSoc: number;            // %
  endSoc: number;              // %
  startTime: number;           // ms epoch
}

export interface EcoScore {
  overall: number;             // 0-100
  acceleration: number;        // 0-100
  braking: number;             // 0-100
  speed: number;               // 0-100
  efficiency: number;          // 0-100
  history: number[];           // rolling array of overall scores
}

// ─── Device ───────────────────────────────────────────────────────────────────

export type DeviceQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface DeviceInfo {
  name: string;
  type: string;
  firmware: string;
  protocol: string;
  voltage: number;
  chipset: string;
  bleVersion: string;
  vin: string;
  signalStrength: number;      // dBm
  responseTime: number;        // ms
  adapterId: string;
  quality: DeviceQuality;
  isClone: boolean;
}

// ─── History & Logging ────────────────────────────────────────────────────────

export interface HistoryPoint {
  value: number;
  timestamp: number;
}

export type SessionLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SessionLogEntry {
  timestamp: number;
  level: SessionLogLevel;
  message: string;
  data?: Record<string, unknown>;
}

// ─── Vehicle Profile ──────────────────────────────────────────────────────────

export interface CustomPID {
  pid: string;
  name: string;
  mode: string;
  bytes: number;
  formula: string;
  unit: string;
  min: number;
  max: number;
}

export interface ChargingSpecs {
  dcMax: number;
  acMax: number;
  port: string;
}

export interface ECUAddresses {
  BMS: string;
  MCU: string;
  OBC: string;
}

export interface VehicleBrandData {
  id: string;
  name: string;
  models: string[];
  batteryChemistry: string;
  obdProfile: string;
  customPIDs: CustomPID[];
  dtcPrefix: string[];
  chargingSpecs: ChargingSpecs;
  ecuAddresses: ECUAddresses;
  protocol: string;
}

export interface VehicleProfile {
  id: string;
  brand: string;
  model: string;
  year: number;
  batteryCapacity: number;     // kWh
  maxChargePower: number;      // kW
  vin?: string;
  nickname?: string;
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export type MaintenanceType = 'tire_rotation' | 'brake_inspection' | 'coolant_flush' | 'cabin_filter' | 'battery_health' | 'software_update' | 'other';

export interface MaintenanceEntry {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  description: string;
  date: number;                // ms epoch
  odometer: number;            // km
  cost: number;                // OMR
  notes: string;
  nextDueOdometer?: number;    // km
  nextDueDate?: number;        // ms epoch
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type DistanceUnit = 'km' | 'miles';
export type Language = 'en' | 'ar';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
  temperatureUnit: TemperatureUnit;
  distanceUnit: DistanceUnit;
  language: Language;
  theme: ThemeMode;
  onboardingComplete: boolean;
  autoConnect: boolean;
  demoMode: boolean;
  refreshRate: number;         // ms
  maxHistoryPoints: number;
  loggingEnabled: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  voiceAssistant: boolean;
  dataSharing: boolean;
  wifiIp: string;
  wifiPort: number;
  currency: 'OMR' | 'USD';
  electricityCostPerKwh: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  temperatureUnit: 'celsius',
  distanceUnit: 'km',
  language: 'en',
  theme: 'system',
  onboardingComplete: false,
  autoConnect: false,
  demoMode: false,
  refreshRate: 500,
  maxHistoryPoints: 120,
  loggingEnabled: false,
  notifications: true,
  soundEnabled: true,
  voiceAssistant: false,
  dataSharing: false,
  wifiIp: '192.168.0.10',
  wifiPort: 35000,
  currency: 'OMR',
  electricityCostPerKwh: 0.021, // OMR per kWh (approximate Oman rate)
};

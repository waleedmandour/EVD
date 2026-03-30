import { create } from 'zustand';
import type {
  VehicleData, ConnectionStatus, ConnectionMode, DiagnosticTroubleCode,
  TripData, BatteryHistoryEntry, DeviceInfo, EcoScore, SessionLogEntry,
  ChargingData, ChargingType,
} from './types';
import {
  VGATE_ADAPTER_INFO,
  VGATE_ICAR_SERVICE_UUID,
  NORDIC_UART_SERVICE_UUID,
} from './types';

export interface AppState {
  // Connection
  connectionStatus: ConnectionStatus;
  connectionMode: ConnectionMode;
  connectBluetooth: () => Promise<void>;
  connectVgate: () => Promise<void>;
  connectWifi: (ip: string, port: number) => Promise<void>;
  disconnectDevice: () => void;
  startDemoMode: () => void;
  stopDemoMode: () => void;

  // Live Vehicle Data
  vehicleData: VehicleData;
  updateVehicleData: (data: Partial<VehicleData>) => void;

  // Charging
  chargingData: ChargingData;
  updateChargingData: (data: Partial<ChargingData>) => void;
  setChargingType: (type: ChargingType) => void;
  isChargingSim: boolean;
  setIsChargingSim: (v: boolean) => void;

  // Battery History
  batteryHistory: BatteryHistoryEntry[];
  addBatteryHistory: (entry: BatteryHistoryEntry) => void;
  clearBatteryHistory: () => void;

  // Speed / Power History
  speedHistory: number[];
  addSpeedHistory: (speed: number) => void;
  powerHistory: number[];
  addPowerHistory: (power: number) => void;

  // Diagnostics
  dtcs: DiagnosticTroubleCode[];
  setDTCs: (codes: DiagnosticTroubleCode[]) => void;
  clearDTCs: () => void;
  monitorStatus: Record<string, boolean>;
  setMonitorStatus: (status: Record<string, boolean>) => void;

  // Trip
  tripData: TripData;
  resetTrip: () => void;

  // Device Info
  deviceInfo: DeviceInfo;
  setDeviceInfo: (info: Partial<DeviceInfo>) => void;

  // Eco Score
  ecoScore: EcoScore;
  updateEcoScore: (score: Partial<EcoScore>) => void;

  // Session Logger
  sessionLog: SessionLogEntry[];
  addSessionLog: (entry: SessionLogEntry) => void;
  clearSessionLog: () => void;
  isLogging: boolean;
  setIsLogging: (v: boolean) => void;
}

const defaultVehicleData: VehicleData = {
  speed: 0, rpm: 0, batterySOC: 78, batteryVoltage: 395.2,
  batteryCurrent: 0, batteryPower: 0, batteryTemp: 32, motorTemp: 38,
  cabinTemp: 26, ambientTemp: 35, estimatedRange: 0, odometer: 45230,
  isCharging: false, chargingPower: 0, hvacActive: false,
  regenBraking: false, driveMode: 'ECO',
};

const defaultChargingData: ChargingData = {
  isActive: false,
  type: 'off',
  power: 0,
  voltage: 0,
  current: 0,
  startedSOC: 0,
  energyAdded: 0,
  elapsedSeconds: 0,
  estimatedMinutesLeft: 0,
  chargeEfficiency: 0,
  batteryTemp: 32,
  cabinPreconditioning: false,
  cellMaxVoltage: 0,
  cellMinVoltage: 0,
  cellDelta: 0,
  chargerName: '',
  connectorType: 'CCS2',
  history: [],
};

const defaultTripData: TripData = {
  distance: 0, avgSpeed: 0, maxSpeed: 0, avgConsumption: 0,
  totalConsumption: 0, regenEnergy: 0, duration: 0, startedAt: null,
};

const defaultDeviceInfo: DeviceInfo = {
  adapterType: '', firmwareVersion: '', protocol: '',
  voltage: '', adapterVoltage: 0, supportedPIDs: [],
  vin: '', connectionType: 'bluetooth', wifiIp: '192.168.0.10',
  wifiPort: 35000, lastPing: 0, signalStrength: 0, responseTime: 0,
  chipset: '', bleVersion: '', deviceId: '',
};

const defaultEcoScore: EcoScore = {
  overall: 0, acceleration: 0, braking: 0, speed: 0, efficiency: 0, history: [],
};

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Connection ──────────────────────────────────────────────────
  connectionStatus: 'disconnected' as ConnectionStatus,
  connectionMode: null as ConnectionMode,

  // vGate iCar Pro BLE 4.0 — dedicated connection
  connectVgate: async () => {
    set({ connectionStatus: 'connecting' });
    try {
      if (!navigator.bluetooth) {
        set({ connectionStatus: 'error', connectionMode: null });
        return;
      }
      // vGate iCar Pro advertises the FFE0 service; also accept NUS
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [VGATE_ICAR_SERVICE_UUID] },
        ],
        optionalServices: [
          NORDIC_UART_SERVICE_UUID,
          'battery_service',
        ],
      });

      const deviceId = device.id?.substring(0, 12) || 'unknown';

      set({
        connectionStatus: 'connected',
        connectionMode: 'bluetooth',
        deviceInfo: {
          ...get().deviceInfo,
          adapterType: VGATE_ADAPTER_INFO.name,
          firmwareVersion: 'v2.3',
          protocol: 'ISO 15765-4 CAN (11 bit, 500 kbaud)',
          chipset: VGATE_ADAPTER_INFO.chipset,
          bleVersion: VGATE_ADAPTER_INFO.bleVersion,
          deviceId,
          connectionType: 'bluetooth',
          signalStrength: 95,
          responseTime: 12,
          lastPing: Date.now(),
        },
      });
    } catch {
      set({ connectionStatus: 'disconnected', connectionMode: null });
    }
  },

  // Generic BLE connection (ELM327, vLinker, Carista, etc.)
  connectBluetooth: async () => {
    set({ connectionStatus: 'connecting' });
    try {
      if (!navigator.bluetooth) {
        set({ connectionStatus: 'error', connectionMode: null });
        return;
      }
      await navigator.bluetooth.requestDevice({
        filters: [{ services: [NORDIC_UART_SERVICE_UUID] }],
        optionalServices: ['battery_service', VGATE_ICAR_SERVICE_UUID],
      });

      // Check if it's a vGate by optional services
      const info = get().deviceInfo;
      set({
        connectionStatus: 'connected',
        connectionMode: 'bluetooth',
        deviceInfo: { ...info, connectionType: 'bluetooth' },
      });
    } catch {
      set({ connectionStatus: 'disconnected', connectionMode: null });
    }
  },

  connectWifi: async (ip: string, port: number) => {
    set({ connectionStatus: 'connecting' });
    try {
      const responseTime = Math.round(Math.random() * 30 + 10);
      set({
        connectionStatus: 'connected',
        connectionMode: 'wifi',
        deviceInfo: {
          ...get().deviceInfo,
          connectionType: 'wifi',
          wifiIp: ip,
          wifiPort: port,
          signalStrength: Math.round(Math.random() * 20 + 75),
          responseTime,
          lastPing: Date.now(),
        },
      });
    } catch {
      set({ connectionStatus: 'error', connectionMode: null });
    }
  },

  disconnectDevice: () => {
    set({ connectionStatus: 'disconnected', connectionMode: null });
  },

  startDemoMode: () => {
    set({
      connectionStatus: 'connected',
      connectionMode: 'demo',
      vehicleData: { ...defaultVehicleData },
      batteryHistory: [], speedHistory: [], powerHistory: [],
      tripData: { ...defaultTripData, startedAt: new Date() },
      deviceInfo: {
        ...defaultDeviceInfo,
        adapterType: 'vGate iCar Pro BLE 4.0 (Simulated)',
        firmwareVersion: 'v2.3',
        protocol: 'ISO 15765-4 CAN (11 bit, 500 kbaud)',
        voltage: '12.8V',
        adapterVoltage: 12.8,
        chipset: VGATE_ADAPTER_INFO.chipset,
        bleVersion: VGATE_ADAPTER_INFO.bleVersion,
        deviceId: 'A4C138F2B001',
        vin: 'LGWEF5A5XNR123456',
        supportedPIDs: [0x04, 0x05, 0x0C, 0x0D, 0x0F, 0x11, 0x42, 0x46, 0x61, 0x62],
        lastPing: Date.now(),
        signalStrength: 95,
        responseTime: 11,
      },
      ecoScore: { ...defaultEcoScore },
      sessionLog: [],
      chargingData: { ...defaultChargingData },
      isChargingSim: false,
    });
  },

  stopDemoMode: () => {
    set({
      connectionStatus: 'disconnected', connectionMode: null,
      vehicleData: { ...defaultVehicleData },
    });
  },

  // ─── Vehicle Data ────────────────────────────────────────────────
  vehicleData: { ...defaultVehicleData },
  updateVehicleData: (data) =>
    set((s) => ({ vehicleData: { ...s.vehicleData, ...data } })),

  // ─── Charging ────────────────────────────────────────────────────
  chargingData: { ...defaultChargingData },
  updateChargingData: (data) =>
    set((s) => ({
      chargingData: { ...s.chargingData, ...data },
    })),
  setChargingType: (type) =>
    set((s) => ({
      chargingData: { ...s.chargingData, type },
    })),
  isChargingSim: false,
  setIsChargingSim: (v) => set({ isChargingSim: v }),

  // ─── Histories ───────────────────────────────────────────────────
  batteryHistory: [],
  addBatteryHistory: (entry) =>
    set((s) => ({ batteryHistory: [...s.batteryHistory.slice(-119), entry] })),
  clearBatteryHistory: () => set({ batteryHistory: [] }),

  speedHistory: [],
  addSpeedHistory: (speed) =>
    set((s) => ({ speedHistory: [...s.speedHistory.slice(-59), speed] })),
  powerHistory: [],
  addPowerHistory: (power) =>
    set((s) => ({ powerHistory: [...s.powerHistory.slice(-59), power] })),

  // ─── Diagnostics ─────────────────────────────────────────────────
  dtcs: [],
  setDTCs: (codes) => set({ dtcs: codes }),
  clearDTCs: () => set({ dtcs: [] }),
  monitorStatus: {},
  setMonitorStatus: (status) => set({ monitorStatus: status }),

  // ─── Trip ────────────────────────────────────────────────────────
  tripData: { ...defaultTripData },
  resetTrip: () => set({ tripData: { ...defaultTripData, startedAt: new Date() } }),

  // ─── Device Info ─────────────────────────────────────────────────
  deviceInfo: { ...defaultDeviceInfo },
  setDeviceInfo: (info) =>
    set((s) => ({ deviceInfo: { ...s.deviceInfo, ...info } })),

  // ─── Eco Score ───────────────────────────────────────────────────
  ecoScore: { ...defaultEcoScore },
  updateEcoScore: (score) =>
    set((s) => ({
      ecoScore: {
        ...s.ecoScore,
        ...score,
        history: [...(score.history ?? s.ecoScore.history).slice(-59)],
      },
    })),

  // ─── Session Logger ───────────────────────────────────────────────
  sessionLog: [],
  addSessionLog: (entry) =>
    set((s) => ({ sessionLog: [...s.sessionLog, entry] })),
  clearSessionLog: () => set({ sessionLog: [] }),
  isLogging: false,
  setIsLogging: (v) => set({ isLogging: v }),
}));

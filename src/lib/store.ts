import { create } from 'zustand';
import type {
  VehicleData,
  ConnectionStatus,
  DiagnosticTroubleCode,
  TripData,
  BatteryHistoryEntry,
  ConnectionMode,
} from './types';

export interface AppState {
  // Connection
  connectionStatus: ConnectionStatus;
  connectionMode: ConnectionMode;
  connectDevice: () => Promise<void>;
  disconnectDevice: () => void;
  startDemoMode: () => void;
  stopDemoMode: () => void;

  // Live Vehicle Data
  vehicleData: VehicleData;
  updateVehicleData: (data: Partial<VehicleData>) => void;

  // Battery History
  batteryHistory: BatteryHistoryEntry[];
  addBatteryHistory: (entry: BatteryHistoryEntry) => void;
  clearBatteryHistory: () => void;

  // Speed History
  speedHistory: number[];
  addSpeedHistory: (speed: number) => void;
  clearSpeedHistory: () => void;

  // Power History
  powerHistory: number[];
  addPowerHistory: (power: number) => void;
  clearPowerHistory: () => void;

  // Diagnostics
  dtcs: DiagnosticTroubleCode[];
  setDTCs: (codes: DiagnosticTroubleCode[]) => void;
  clearDTCs: () => void;
  monitorStatus: Record<string, boolean>;
  setMonitorStatus: (status: Record<string, boolean>) => void;

  // Trip
  tripData: TripData;
  resetTrip: () => void;

  // Vehicle Info
  vin: string;
  setVin: (vin: string) => void;
  protocol: string;
  setProtocol: (protocol: string) => void;
  elmVersion: string;
  setElmVersion: (version: string) => void;
}

const defaultVehicleData: VehicleData = {
  speed: 0,
  rpm: 0,
  batterySOC: 78,
  batteryVoltage: 395.2,
  batteryCurrent: 0,
  batteryPower: 0,
  batteryTemp: 32,
  motorTemp: 38,
  cabinTemp: 26,
  ambientTemp: 35,
  estimatedRange: 0,
  odometer: 45230,
  isCharging: false,
  chargingPower: 0,
  hvacActive: false,
  regenBraking: false,
  driveMode: 'ECO',
};

const defaultTripData: TripData = {
  distance: 0,
  avgSpeed: 0,
  maxSpeed: 0,
  avgConsumption: 0,
  totalConsumption: 0,
  regenEnergy: 0,
  duration: 0,
  startedAt: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Connection
  connectionStatus: 'disconnected',
  connectionMode: null,
  connectDevice: async () => {
    set({ connectionStatus: 'connecting' });
    try {
      if (!navigator.bluetooth) {
        set({ connectionStatus: 'error', connectionMode: null });
        return;
      }
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] }],
        optionalServices: ['battery_service'],
      });
      // Connection will be established in a service
      set({ connectionStatus: 'connected', connectionMode: 'bluetooth' });
    } catch {
      set({ connectionStatus: 'disconnected', connectionMode: null });
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
      batteryHistory: [],
      speedHistory: [],
      powerHistory: [],
      tripData: { ...defaultTripData, startedAt: new Date() },
    });
  },
  stopDemoMode: () => {
    set({
      connectionStatus: 'disconnected',
      connectionMode: null,
      vehicleData: { ...defaultVehicleData },
    });
  },

  // Live Vehicle Data
  vehicleData: { ...defaultVehicleData },
  updateVehicleData: (data) =>
    set((state) => ({
      vehicleData: { ...state.vehicleData, ...data },
    })),

  // Battery History
  batteryHistory: [],
  addBatteryHistory: (entry) =>
    set((state) => ({
      batteryHistory: [...state.batteryHistory.slice(-119), entry],
    })),
  clearBatteryHistory: () => set({ batteryHistory: [] }),

  // Speed History
  speedHistory: [],
  addSpeedHistory: (speed) =>
    set((state) => ({
      speedHistory: [...state.speedHistory.slice(-59), speed],
    })),
  clearSpeedHistory: () => set({ speedHistory: [] }),

  // Power History
  powerHistory: [],
  addPowerHistory: (power) =>
    set((state) => ({
      powerHistory: [...state.powerHistory.slice(-59), power],
    })),
  clearPowerHistory: () => set({ powerHistory: [] }),

  // Diagnostics
  dtcs: [],
  setDTCs: (codes) => set({ dtcs: codes }),
  clearDTCs: () => set({ dtcs: [] }),
  monitorStatus: {},
  setMonitorStatus: (status) => set({ monitorStatus: status }),

  // Trip
  tripData: { ...defaultTripData },
  resetTrip: () =>
    set({ tripData: { ...defaultTripData, startedAt: new Date() } }),

  // Vehicle Info
  vin: 'LGWEF5A5XNR123456',
  setVin: (vin) => set({ vin }),
  protocol: '',
  setProtocol: (protocol) => set({ protocol }),
  elmVersion: '',
  setElmVersion: (version) => set({ elmVersion }),
}));

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  VehicleData,
  ChargingData,
  DTCEvent,
  MonitorStatus,
  TripData,
  EcoScore,
  DeviceInfo,
  AppSettings,
  HistoryPoint,
  SessionLogEntry,
  ConnectionStatus,
  ConnectionMode,
  VehicleProfile,
  MaintenanceEntry,
} from './types';
import { DEFAULT_SETTINGS } from './types';

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // Connection
  connectionStatus: ConnectionStatus;
  connectionMode: ConnectionMode;
  bluetoothAvailable: boolean;

  // Vehicle
  activeVehicle: VehicleProfile | null;
  vehicleData: VehicleData;
  chargingData: ChargingData;

  // Histories (for charting)
  batteryHistory: HistoryPoint[];
  speedHistory: HistoryPoint[];
  powerHistory: HistoryPoint[];
  temperatureHistory: HistoryPoint[];

  // Diagnostics
  dtcs: DTCEvent[];
  monitorStatus: MonitorStatus;
  milOn: boolean;

  // Trip & Eco
  tripData: TripData;
  ecoScore: EcoScore;

  // Device
  deviceInfo: DeviceInfo;

  // Session log
  sessionLog: SessionLogEntry[];
  isLogging: boolean;

  // Settings (persisted)
  settings: AppSettings;

  // Onboarding
  onboardingStep: string;
  showOnboarding: boolean;

  // Vehicles list
  vehicles: VehicleProfile[];

  // Maintenance
  maintenanceEntries: MaintenanceEntry[];

  // Active tab
  activeTab: string;

  // Voice
  voiceListening: boolean;

  // ─── Actions ────────────────────────────────────────────────────────────────

  // Connection
  setConnectionStatus: (status: ConnectionStatus) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  setBluetoothAvailable: (available: boolean) => void;
  connectBluetooth: () => Promise<void>;
  connectWifi: (ip: string, port: number) => Promise<void>;
  connectDemo: () => void;
  disconnect: () => void;

  // Vehicle
  setActiveVehicle: (vehicle: VehicleProfile | null) => void;
  updateVehicleData: (data: Partial<VehicleData>) => void;
  updateChargingData: (data: Partial<ChargingData>) => void;
  setChargingType: (type: 'dc_fast' | 'ac_l2' | 'ac_l1') => void;

  // History
  addBatteryHistory: (point: HistoryPoint) => void;
  addSpeedHistory: (point: HistoryPoint) => void;
  addPowerHistory: (point: HistoryPoint) => void;
  addTemperatureHistory: (point: HistoryPoint) => void;
  clearHistories: () => void;

  // Diagnostics
  setDTCs: (dtcs: DTCEvent[]) => void;
  addDTC: (dtc: DTCEvent) => void;
  clearDTCs: () => void;
  setMonitorStatus: (status: MonitorStatus) => void;
  setMilOn: (on: boolean) => void;

  // Trip
  updateTripData: (data: Partial<TripData>) => void;
  resetTrip: () => void;
  updateEcoScore: (score: Partial<EcoScore>) => void;

  // Device
  updateDeviceInfo: (info: Partial<DeviceInfo>) => void;

  // Session log
  addSessionLog: (entry: SessionLogEntry) => void;
  clearSessionLog: () => void;
  setIsLogging: (logging: boolean) => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Onboarding
  setOnboardingStep: (step: string) => void;
  setShowOnboarding: (show: boolean) => void;
  completeOnboarding: () => void;

  // Vehicles
  addVehicle: (vehicle: VehicleProfile) => void;
  removeVehicle: (id: string) => void;

  // Maintenance
  addMaintenanceEntry: (entry: MaintenanceEntry) => void;
  removeMaintenanceEntry: (id: string) => void;

  // Tab & voice
  setActiveTab: (tab: string) => void;
  setVoiceListening: (listening: boolean) => void;

  // OBD response parser
  parseOBDResponse: (response: string) => void;
}

// ─── Default Values ───────────────────────────────────────────────────────────

const defaultVehicleData: VehicleData = {
  speed: 0,
  rpm: 0,
  soc: 0,
  soh: 100,
  voltage: 0,
  current: 0,
  power: 0,
  motorTemp: 0,
  batteryTemp: 0,
  inverterTemp: 0,
  range: 0,
  odometer: 0,
  mode: 'normal',
  auxBatteryV: 12.4,
  insulationResistance: 999,
  cellMaxV: 3300,
  cellMinV: 3280,
  cellDeltaV: 20,
  acceleratorPedal: 0,
  torqueDemand: 0,
  torqueActual: 0,
  regenTorque: 0,
  dcdcStatus: true,
  chargingStatus: false,
  bmsStatus: 'normal',
  coolantInletTemp: 25,
  coolantOutletTemp: 28,
  ambientTemp: 25,
};

const defaultChargingData: ChargingData = {
  isCharging: false,
  chargeType: 'dc_fast',
  power: 0,
  voltage: 0,
  current: 0,
  energyAdded: 0,
  startSoc: 0,
  targetSoc: 80,
  timeRemaining: 0,
  efficiency: 90,
  costOmr: 0,
  costUsd: 0,
  cellVoltages: [],
  chargeCurve: [],
};

const defaultMonitorStatus: MonitorStatus = {
  catalyst: true,
  heatedCatalyst: true,
  evSystem: true,
  o2Sensor: true,
  o2SensorHeater: true,
  egrSystem: true,
  fuelSystem: true,
  misfire: true,
};

const defaultTripData: TripData = {
  distance: 0,
  avgSpeed: 0,
  maxSpeed: 0,
  energyConsumed: 0,
  energyRegen: 0,
  duration: 0,
  startSoc: 0,
  endSoc: 0,
  startTime: 0,
};

const defaultEcoScore: EcoScore = {
  overall: 0,
  acceleration: 0,
  braking: 0,
  speed: 0,
  efficiency: 0,
  history: [],
};

const defaultDeviceInfo: DeviceInfo = {
  name: '',
  type: '',
  firmware: '',
  protocol: '',
  voltage: 0,
  chipset: '',
  bleVersion: '',
  vin: '',
  signalStrength: 0,
  responseTime: 0,
  adapterId: '',
  quality: 'good',
  isClone: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial State ────────────────────────────────────────────────────────

      // Connection
      connectionStatus: 'disconnected',
      connectionMode: null,
      bluetoothAvailable: false,

      // Vehicle
      activeVehicle: null,
      vehicleData: defaultVehicleData,
      chargingData: defaultChargingData,

      // Histories
      batteryHistory: [],
      speedHistory: [],
      powerHistory: [],
      temperatureHistory: [],

      // Diagnostics
      dtcs: [],
      monitorStatus: defaultMonitorStatus,
      milOn: false,

      // Trip & Eco
      tripData: defaultTripData,
      ecoScore: defaultEcoScore,

      // Device
      deviceInfo: defaultDeviceInfo,

      // Session log
      sessionLog: [],
      isLogging: false,

      // Settings
      settings: DEFAULT_SETTINGS,

      // Onboarding
      onboardingStep: 'splash',
      showOnboarding: true,

      // Vehicles
      vehicles: [],

      // Maintenance
      maintenanceEntries: [],

      // Tab & voice
      activeTab: 'dashboard',
      voiceListening: false,

      // ── Connection Actions ───────────────────────────────────────────────────

      setConnectionStatus: (status) => set({ connectionStatus: status }),

      setConnectionMode: (mode) => set({ connectionMode: mode }),

      setBluetoothAvailable: (available) => set({ bluetoothAvailable: available }),

      connectBluetooth: async () => {
        set({ connectionStatus: 'connecting', connectionMode: 'bluetooth' });
        try {
          // Real BLE connection via Capacitor plugin
          const { bleService } = await import('./ble-service');
          await bleService.initialize();
          const devices = await bleService.scan(8000);
          if (devices.length === 0) {
            set({ connectionStatus: 'error' });
            return;
          }
          // Auto-connect to first found adapter
          const device = devices[0];
          const connected = await bleService.connect(device.deviceId, device.profile);
          if (connected) {
            set({ connectionStatus: 'connected' });
            // Start polling OBD data
            bleService.startPolling((pid, value) => {
              get().parseOBDResponse(value);
            });
          } else {
            set({ connectionStatus: 'error' });
          }
        } catch {
          set({ connectionStatus: 'error' });
        }
      },

      connectWifi: async (_ip: string, _port: number) => {
        set({ connectionStatus: 'connecting', connectionMode: 'wifi' });
        try {
          // WiFi ELM327 connection via WebSocket
          // The app has no INTERNET permission, but WiFi direct connections
          // to local ELM327 adapters work without internet
          const ws = new WebSocket(`ws://${_ip}:${_port}`);
          ws.onopen = () => {
            set({ connectionStatus: 'connected' });
          };
          ws.onerror = () => {
            set({ connectionStatus: 'error' });
          };
          ws.onmessage = (event) => {
            get().parseOBDResponse(String(event.data));
          };
        } catch {
          set({ connectionStatus: 'error' });
        }
      },

      connectDemo: () => {
        set({ connectionStatus: 'connected', connectionMode: 'demo' });
      },

      disconnect: async () => {
        // Disconnect BLE if connected
        try {
          const { bleService } = await import('./ble-service');
          if (bleService.isConnected()) {
            bleService.stopPolling();
            await bleService.disconnect();
          }
        } catch {}
        set({
          connectionStatus: 'disconnected',
          connectionMode: null,
          vehicleData: defaultVehicleData,
          chargingData: { ...defaultChargingData },
          dtcs: [],
          milOn: false,
          deviceInfo: defaultDeviceInfo,
          isLogging: false,
        });
      },

      // ── Vehicle Actions ──────────────────────────────────────────────────────

      setActiveVehicle: (vehicle) => set({ activeVehicle: vehicle }),

      updateVehicleData: (data) =>
        set((s) => ({ vehicleData: { ...s.vehicleData, ...data } })),

      updateChargingData: (data) =>
        set((s) => ({ chargingData: { ...s.chargingData, ...data } })),

      setChargingType: (type) =>
        set((s) => ({ chargingData: { ...s.chargingData, chargeType: type } })),

      // ── History Actions ──────────────────────────────────────────────────────

      /** Keep the last 120 points (≈ 1 minute at 500 ms) */
      addBatteryHistory: (point) =>
        set((s) => ({
          batteryHistory: [...s.batteryHistory.slice(-119), point],
        })),

      addSpeedHistory: (point) =>
        set((s) => ({
          speedHistory: [...s.speedHistory.slice(-119), point],
        })),

      addPowerHistory: (point) =>
        set((s) => ({
          powerHistory: [...s.powerHistory.slice(-119), point],
        })),

      /** Temperature is sampled less often – keep 60 points */
      addTemperatureHistory: (point) =>
        set((s) => ({
          temperatureHistory: [...s.temperatureHistory.slice(-59), point],
        })),

      clearHistories: () =>
        set({
          batteryHistory: [],
          speedHistory: [],
          powerHistory: [],
          temperatureHistory: [],
        }),

      // ── Diagnostic Actions ───────────────────────────────────────────────────

      setDTCs: (dtcs) => set({ dtcs }),

      addDTC: (dtc) => set((s) => ({ dtcs: [...s.dtcs, dtc] })),

      clearDTCs: () => set({ dtcs: [], milOn: false }),

      setMonitorStatus: (status) => set({ monitorStatus: status }),

      setMilOn: (on) => set({ milOn: on }),

      // ── Trip & Eco Actions ───────────────────────────────────────────────────

      updateTripData: (data) =>
        set((s) => ({ tripData: { ...s.tripData, ...data } })),

      resetTrip: () =>
        set({ tripData: { ...defaultTripData, startTime: Date.now() } }),

      updateEcoScore: (score) =>
        set((s) => ({
          ecoScore: {
            ...s.ecoScore,
            ...score,
            history: [
              ...s.ecoScore.history.slice(-99),
              score.overall ?? s.ecoScore.overall,
            ],
          },
        })),

      // ── Device Actions ───────────────────────────────────────────────────────

      updateDeviceInfo: (info) =>
        set((s) => ({ deviceInfo: { ...s.deviceInfo, ...info } })),

      // ── Session Log Actions ──────────────────────────────────────────────────

      /** Keep the last 3 600 entries (≈ 30 minutes at 500 ms) */
      addSessionLog: (entry) =>
        set((s) => ({
          sessionLog: [...s.sessionLog.slice(-3599), entry],
        })),

      clearSessionLog: () => set({ sessionLog: [] }),

      setIsLogging: (logging) => set({ isLogging: logging }),

      // ── Settings Actions ─────────────────────────────────────────────────────

      updateSettings: (settings) =>
        set((s) => ({ settings: { ...s.settings, ...settings } })),

      // ── Onboarding Actions ───────────────────────────────────────────────────

      setOnboardingStep: (step) => set({ onboardingStep: step }),

      setShowOnboarding: (show) => set({ showOnboarding: show }),

      completeOnboarding: () =>
        set((s) => ({
          showOnboarding: false,
          onboardingStep: 'done',
          settings: { ...s.settings, onboardingComplete: true },
        })),

      // ── Vehicle List Actions ─────────────────────────────────────────────────

      addVehicle: (vehicle) =>
        set((s) => ({ vehicles: [...s.vehicles, vehicle] })),

      removeVehicle: (id) =>
        set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),

      // ── Maintenance Actions ──────────────────────────────────────────────────

      addMaintenanceEntry: (entry) =>
        set((s) => ({
          maintenanceEntries: [...s.maintenanceEntries, entry],
        })),

      removeMaintenanceEntry: (id) =>
        set((s) => ({
          maintenanceEntries: s.maintenanceEntries.filter((e) => e.id !== id),
        })),

      // ── Tab & Voice ─────────────────────────────────────────────────────────

      setActiveTab: (tab) => set({ activeTab: tab }),

      setVoiceListening: (listening) => set({ voiceListening: listening }),

      // ── OBD-II Response Parser ──────────────────────────────────────────────

      /**
       * Parse a raw OBD-II hex response string and update the store.
       *
       * Handles standard Mode 01 (PID 01-FF) responses in the format:
       *   `41 XX YY ZZ ...`
       * where XX = PID, YY-ZZ = data bytes.
       */
      parseOBDResponse: (response: string) => {
        const state = get();
        const clean = response.replace(/\s/g, '');

        // Mode 01 responses: "41 XX YY..."
        if (clean.startsWith('41')) {
          const pid = clean.substring(2, 4).toUpperCase();
          const dataBytes = clean.substring(4);

          switch (pid) {
            // PID 0D – Vehicle speed (km/h)
            case '0D': {
              const speed = parseInt(dataBytes, 16) || 0;
              state.updateVehicleData({ speed });
              state.addSpeedHistory({ value: speed, timestamp: Date.now() });
              break;
            }

            // PID 0C – Engine RPM (for EVs: motor RPM)
            case '0C': {
              const a = parseInt(dataBytes.substring(0, 2), 16) || 0;
              const b = parseInt(dataBytes.substring(2, 4), 16) || 0;
              state.updateVehicleData({ rpm: (a * 256 + b) / 4 });
              break;
            }

            // PID 05 – Coolant temperature (used as motor temp for EVs)
            case '05': {
              const temp = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 40;
              state.updateVehicleData({ motorTemp: temp });
              break;
            }

            // PID 42 – Control module voltage
            case '42': {
              const a = parseInt(dataBytes.substring(0, 2), 16) || 0;
              const b = parseInt(dataBytes.substring(2, 4), 16) || 0;
              state.updateVehicleData({ voltage: (a * 256 + b) / 1000 });
              break;
            }

            // PID 04 – Calculated engine load (accelerator proxy)
            case '04': {
              const load = ((parseInt(dataBytes.substring(0, 2), 16) || 0) * 100) / 255;
              state.updateVehicleData({ acceleratorPedal: load });
              break;
            }

            // PID 46 – Ambient air temperature
            case '46': {
              const amb = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 40;
              state.updateVehicleData({ ambientTemp: amb });
              break;
            }

            // PID 0F – Intake air temperature (used as inverter temp proxy)
            case '0F': {
              const intake = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 40;
              state.updateVehicleData({ inverterTemp: intake });
              break;
            }

            // PID 61 – Driver demanded torque (%)
            case '61': {
              const torque = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 125;
              state.updateVehicleData({ torqueDemand: torque });
              break;
            }

            // PID 62 – Actual motor torque (%)
            case '62': {
              const actual = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 125;
              state.updateVehicleData({ torqueActual: actual });
              break;
            }

            // PID 11 – Throttle position
            case '11': {
              const throttle = ((parseInt(dataBytes.substring(0, 2), 16) || 0) * 100) / 255;
              state.updateVehicleData({ acceleratorPedal: throttle });
              break;
            }
          }
        }
      },
    }),
    {
      name: 'evdx-store',
      /** Only persist these fields to localStorage */
      partialize: (state) => ({
        settings: state.settings,
        vehicles: state.vehicles,
        maintenanceEntries: state.maintenanceEntries,
        activeVehicle: state.activeVehicle,
        showOnboarding: state.showOnboarding,
        onboardingStep: state.onboardingStep,
      }),
    }
  )
);

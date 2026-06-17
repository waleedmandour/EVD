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

// Module-scoped rate-limit map for session logging of OBD responses.
// Keyed by PID label (e.g. "PID 0D") → last log timestamp. This prevents the
// session log from flooding at the 500ms polling rate; one entry per PID per
// 2 seconds is plenty for trip replay/debugging.
const lastLoggedPidTs: Record<string, number> = {};

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

            // Update device info from adapter identification
            const adapterInfo = bleService.getAdapterInfo();
            if (adapterInfo) {
              get().updateDeviceInfo({
                name: device.name,
                type: 'bluetooth',
                adapterId: device.deviceId,
                signalStrength: device.rssi,
                quality: device.rssi > -50 ? 'excellent' : device.rssi > -70 ? 'good' : device.rssi > -85 ? 'fair' : 'poor',
                firmware: adapterInfo.firmware,
                chipset: adapterInfo.chipset,
                protocol: adapterInfo.protocol,
                isClone: adapterInfo.isClone,
                voltage: adapterInfo.voltage,
                vin: adapterInfo.vin,
              });
            }

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
          // WiFi ELM327 connection — uses bleService.connectWifi which
          // handles WebSocket setup + full AT command initialization
          // Default: IP 192.168.0.10, Port 35000 (standard ELM327 WiFi)
          const { bleService } = await import('./ble-service');
          const connected = await bleService.connectWifi(_ip, _port);

          if (connected) {
            set({ connectionStatus: 'connected' });

            // Update device info from adapter identification
            const adapterInfo = bleService.getAdapterInfo();
            if (adapterInfo) {
              get().updateDeviceInfo({
                name: `WiFi ELM327 (${_ip})`,
                type: 'wifi',
                adapterId: `wifi-${_ip}:${_port}`,
                firmware: adapterInfo.firmware,
                chipset: adapterInfo.chipset,
                protocol: adapterInfo.protocol,
                isClone: adapterInfo.isClone,
                voltage: adapterInfo.voltage,
                vin: adapterInfo.vin,
                quality: 'good',
              });
            }

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
      /**
       * Parse a raw OBD-II hex response string and update the store.
       *
       * Handles SAE J1979 standard responses:
       * - Mode 01 (41 XX): Show current data — real-time vehicle parameters
       * - Mode 03 (43): Stored DTCs
       * - Mode 07 (47): Pending DTCs
       * - Mode 04 (44): Clear DTCs confirmation
       * - Mode 09 (49): Vehicle information (VIN, etc.)
       *
       * Response format: [Mode+40] [PID] [Data bytes]
       * E.g., "41 0D 50" = Mode 01 PID 0D, speed = 0x50 = 80 km/h
       *
       * References: SAE J1979-2016, Wikipedia OBD-II PIDs
       */
      parseOBDResponse: (response: string) => {
        if (!response || response === 'UNABLE TO CONNECT' || response === 'BUS ERROR' || response === 'NO DATA') {
          // Log OBD protocol errors to the session log when logging is active,
          // so users can see why their adapter isn't responding during a trip.
          if (response && get().isLogging) {
            get().addSessionLog({
              timestamp: Date.now(),
              level: 'warn',
              message: `OBD: ${response}`,
            });
          }
          return;
        }

        const state = get();
        const clean = response.replace(/\s/g, '');

        if (clean.length < 4) return;

        const modeResponse = clean.substring(0, 2).toUpperCase();

        // Log raw OBD responses to the session log when logging is active.
        // This was previously only done by the simulator (in demo mode), so
        // real BLE/WiFi trips had empty session logs. We log here too so the
        // "Start Trip" button actually captures data when connected to a real
        // adapter. We sample at most one entry per 2 seconds per PID to avoid
        // flooding the log at the 500ms polling rate.
        if (get().isLogging) {
          const pidLabel = modeResponse === '41' ? `PID ${clean.substring(2, 4)}` : `Mode ${modeResponse}`;
          // Simple rate limit: keep last log timestamp per pid in a module-scoped map
          const now = Date.now();
          const last = lastLoggedPidTs[pidLabel] || 0;
          if (now - last >= 2000) {
            lastLoggedPidTs[pidLabel] = now;
            get().addSessionLog({
              timestamp: now,
              level: 'info',
              message: `OBD ${pidLabel}: ${clean.substring(0, 24)}${clean.length > 24 ? '…' : ''}`,
            });
          }
        }

        // ── Mode 01 (41): Show current data ──────────────────────────────────
        if (modeResponse === '41') {
          const pid = clean.substring(2, 4).toUpperCase();
          const dataBytes = clean.substring(4);

          switch (pid) {
            // PID 00 – Supported PIDs [01-20]
            case '00': break;  // Handled by ble-service detectSupportedPIDs()

            // PID 01 – Monitor status since DTCs cleared
            // Bit 7 of byte A = MIL on/off, bytes A-B = DTC count
            case '01': {
              const byteA = parseInt(dataBytes.substring(0, 2), 16) || 0;
              const milOn = (byteA & 0x80) !== 0;
              const dtcCount = byteA & 0x7F;
              state.setMilOn(milOn);
              if (dtcCount > 0 && state.dtcs.length === 0) {
                // Trigger DTC read when MIL is on and we don't have codes yet
                // This is done async, not in the parser
              }
              break;
            }

            // PID 04 – Calculated engine load (%)
            case '04': {
              const load = ((parseInt(dataBytes.substring(0, 2), 16) || 0) * 100) / 255;
              state.updateVehicleData({ acceleratorPedal: load });
              break;
            }

            // PID 05 – Coolant temperature (°C) — used as motor temp for EVs
            case '05': {
              const temp = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 40;
              state.updateVehicleData({ motorTemp: temp });
              state.addTemperatureHistory({ value: temp, timestamp: Date.now() });
              break;
            }

            // PID 0C – Engine RPM (for EVs: motor RPM)
            // Formula: (A * 256 + B) / 4
            case '0C': {
              const a = parseInt(dataBytes.substring(0, 2), 16) || 0;
              const b = parseInt(dataBytes.substring(2, 4), 16) || 0;
              state.updateVehicleData({ rpm: (a * 256 + b) / 4 });
              break;
            }

            // PID 0D – Vehicle speed (km/h)
            case '0D': {
              const speed = parseInt(dataBytes, 16) || 0;
              state.updateVehicleData({ speed });
              state.addSpeedHistory({ value: speed, timestamp: Date.now() });
              break;
            }

            // PID 0F – Intake air temperature (°C) — used as inverter temp proxy for EVs
            case '0F': {
              const intake = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 40;
              state.updateVehicleData({ inverterTemp: intake });
              break;
            }

            // PID 11 – Throttle position (%)
            case '11': {
              const throttle = ((parseInt(dataBytes.substring(0, 2), 16) || 0) * 100) / 255;
              state.updateVehicleData({ acceleratorPedal: throttle });
              break;
            }

            // PID 2F – Fuel tank level input (%) — SOC proxy for some EVs
            case '2F': {
              const soc = ((parseInt(dataBytes.substring(0, 2), 16) || 0) * 100) / 255;
              state.updateVehicleData({ soc: Math.round(soc) });
              state.addBatteryHistory({ value: soc, timestamp: Date.now() });
              break;
            }

            // PID 42 – Control module voltage (V)
            // Formula: (A * 256 + B) / 1000
            case '42': {
              const a = parseInt(dataBytes.substring(0, 2), 16) || 0;
              const b = parseInt(dataBytes.substring(2, 4), 16) || 0;
              const voltage = (a * 256 + b) / 1000;
              state.updateVehicleData({ voltage });
              break;
            }

            // PID 46 – Ambient air temperature (°C)
            case '46': {
              const amb = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 40;
              state.updateVehicleData({ ambientTemp: amb });
              break;
            }

            // PID 61 – Driver demanded torque (%)
            // Formula: A - 125 (range: -125 to +125)
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

            // PID 63 – Engine reference torque (%)
            case '63': {
              const ref = (parseInt(dataBytes.substring(0, 2), 16) || 0) - 125;
              // Could be used for torque calculations
              break;
            }

            // PID A6 – Odometer (km) — available on some vehicles
            case 'A6': {
              if (dataBytes.length >= 8) {
                const a = parseInt(dataBytes.substring(0, 2), 16) || 0;
                const b = parseInt(dataBytes.substring(2, 4), 16) || 0;
                const c = parseInt(dataBytes.substring(4, 6), 16) || 0;
                const d = parseInt(dataBytes.substring(6, 8), 16) || 0;
                const odometer = (a * 16777216 + b * 65536 + c * 256 + d) / 10;
                state.updateVehicleData({ odometer });
              }
              break;
            }
          }
        }
        // ── Mode 03 (43): Stored DTCs ────────────────────────────────────────
        else if (modeResponse === '43') {
          // Mode 03 response: 43 [count_byte] [DTC1_hi][DTC1_lo] [DTC2_hi][DTC2_lo] ...
          // Skip mode byte (43) + count byte (2 hex chars)
          const data = clean.substring(4);
          const dtcs: DTCEvent[] = [];
          for (let i = 0; i < data.length; i += 4) {
            if (i + 4 > data.length) break;
            const byte1 = parseInt(data.substring(i, i + 2), 16);
            const byte2 = parseInt(data.substring(i + 2, i + 4), 16);
            if (byte1 === 0 && byte2 === 0) continue;

            // First nibble encodes both type letter AND first digit (0-3)
            // 0x0P = P0, 0x1P = P1, 0x2P = P2, 0x3P = P3
            // 0x4P = C0, 0x5P = C1, 0x6P = C2, 0x7P = C3
            // 0x8P = B0, 0x9P = B1, 0xAP = B2, 0xBP = B3
            // 0xCP = U0, 0xDP = U1, 0xEP = U2, 0xFP = U3
            const highNibble = (byte1 >> 4) & 0xF;
            const typeMap: Record<number, string> = {
              0: 'P', 1: 'P', 2: 'P', 3: 'P',
              4: 'C', 5: 'C', 6: 'C', 7: 'C',
              8: 'B', 9: 'B', 0xA: 'B', 0xB: 'B',
              0xC: 'U', 0xD: 'U', 0xE: 'U', 0xF: 'U',
            };
            const type = typeMap[highNibble] || 'P';
            const firstDigit = highNibble % 4;
            const code = `${type}${firstDigit}${(byte1 & 0x0F).toString(16).toUpperCase()}${byte2.toString(16).toUpperCase().padStart(2, '0')}`;

            dtcs.push({
              code,
              description: '',  // Will be looked up from dtc-codes.ts
              severity: code.startsWith('P0') || code.startsWith('C0') || code.startsWith('B0') || code.startsWith('U0') ? 'critical' : code.startsWith('P1') || code.startsWith('P2') ? 'high' : 'medium',
              timestamp: Date.now(),
              active: true,
              count: 1,
            });
          }
          if (dtcs.length > 0) {
            state.setDTCs(dtcs);
          }
        }
        // ── Mode 07 (47): Pending DTCs ───────────────────────────────────────
        else if (modeResponse === '47') {
          // Mode 07 response: 47 [DTC1_hi][DTC1_lo] [DTC2_hi][DTC2_lo] ... (no count byte)
          const data = clean.substring(2);
          for (let i = 0; i < data.length; i += 4) {
            if (i + 4 > data.length) break;
            const byte1 = parseInt(data.substring(i, i + 2), 16);
            const byte2 = parseInt(data.substring(i + 2, i + 4), 16);
            if (byte1 === 0 && byte2 === 0) continue;

            const highNibble = (byte1 >> 4) & 0xF;
            const typeMap: Record<number, string> = {
              0: 'P', 1: 'P', 2: 'P', 3: 'P',
              4: 'C', 5: 'C', 6: 'C', 7: 'C',
              8: 'B', 9: 'B', 0xA: 'B', 0xB: 'B',
              0xC: 'U', 0xD: 'U', 0xE: 'U', 0xF: 'U',
            };
            const type = typeMap[highNibble] || 'P';
            const firstDigit = highNibble % 4;
            const code = `${type}${firstDigit}${(byte1 & 0x0F).toString(16).toUpperCase()}${byte2.toString(16).toUpperCase().padStart(2, '0')}`;

            state.addDTC({
              code,
              description: '',
              severity: 'medium',  // Pending codes are less severe
              timestamp: Date.now(),
              active: false,
              count: 1,
            });
          }
        }
        // ── Mode 09 (49): Vehicle information ─────────────────────────────────
        else if (modeResponse === '49') {
          const pid = clean.substring(2, 4).toUpperCase();
          // PID 02 – VIN
          if (pid === '02') {
            // Multi-frame safe VIN parsing: each "49 02 NN" frame has a 2-hex-digit
            // sequence counter (NN) immediately after the PID. The previous code
            // started at offset 6 (skipping one counter) but didn't handle
            // subsequent frames, so multi-frame VIN responses were corrupted by
            // embedded counter digits ('1','2','3') that survived the VIN filter.
            const vinBytes: number[] = [];
            let cursor = 0;
            while (cursor < clean.length) {
              const frameStart = clean.indexOf('4902', cursor);
              if (frameStart === -1) break;
              const dataStart = frameStart + 6;  // skip "4902" + 2-char counter
              let nextFrame = clean.indexOf('4902', dataStart);
              if (nextFrame === -1) nextFrame = clean.length;
              for (let i = dataStart; i + 2 <= nextFrame; i += 2) {
                const byte = parseInt(clean.substring(i, i + 2), 16);
                if (!isNaN(byte)) vinBytes.push(byte);
              }
              cursor = nextFrame;
            }
            let vin = '';
            for (const byte of vinBytes) {
              if (byte >= 0x20 && byte <= 0x7E) {
                vin += String.fromCharCode(byte);
              }
            }
            vin = vin.replace(/[^A-HJ-NPR-Z0-9]/g, '');
            if (vin.length >= 10) {
              state.updateDeviceInfo({ vin: vin.substring(0, 17) });
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

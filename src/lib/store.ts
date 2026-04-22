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
  VGATE_INIT_COMMANDS,
} from './types';
import {
  checkBluetoothAvailability,
  checkBluetoothAvailabilityAsync,
  requestVGateDevice,
  requestGenericBLEDevice,
  connectGATT,
  disconnect as bleDisconnect,
  isBLEConnected,
  initializeAdapter as bleInitialize,
} from './ble-connection';
import {
  connectWiFi as wifiConnect,
  disconnect as wifiDisconnect,
  isWiFiConnected,
  sendCommand as wifiSendCommand,
} from './wifi-connection';
import {
  startPolling,
  stopPolling,
  initializeWiFiAdapter,
  WIFI_INIT_COMMANDS,
} from './obd-polling';
import { OBD_COMMANDS } from './types';

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
  bluetoothAvailable: boolean;
  bluetoothUnavailableReason: string;
  checkBluetooth: () => void;

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
  setTripData: (data: Partial<TripData>) => void;

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
  bluetoothAvailable: true,
  bluetoothUnavailableReason: '',

  checkBluetooth: () => {
    // Use async check for more reliable availability detection
    const syncResult = checkBluetoothAvailability();
    if (!syncResult.available) {
      set({
        bluetoothAvailable: false,
        bluetoothUnavailableReason: syncResult.reason || '',
      });
      return;
    }

    // Immediately set available, then refine with async check
    set({ bluetoothAvailable: true, bluetoothUnavailableReason: '' });

    // Run async check in background for more accurate result
    checkBluetoothAvailabilityAsync().then(asyncResult => {
      if (!asyncResult.available) {
        set({
          bluetoothAvailable: false,
          bluetoothUnavailableReason: asyncResult.reason || '',
        });
      }
    });
  },

  // vGate iCar Pro BLE 4.0 — dedicated connection
  connectVgate: async () => {
    set({ connectionStatus: 'connecting' });

    try {
      // Check Web Bluetooth availability (async for accuracy)
      const avail = await checkBluetoothAvailabilityAsync();
      if (!avail.available) {
        set({
          connectionStatus: 'error',
          connectionMode: null,
          bluetoothAvailable: false,
          bluetoothUnavailableReason: avail.reason || 'Web Bluetooth not available',
        });
        return;
      }

      // Request the BLE device from user
      const device = await requestVGateDevice();
      if (!device) {
        set({ connectionStatus: 'disconnected', connectionMode: null });
        return;
      }

      const deviceId = device.id?.substring(0, 12) || 'unknown';

      // Connect to GATT server and set up characteristics
      const bleInfo = await connectGATT(device, {
        onData: (data) => {
          // Process real OBD-II data from the adapter
          processOBDResponse(data, get, set);
        },
        onDisconnected: () => {
          stopPolling();
          set({ connectionStatus: 'disconnected', connectionMode: null });
        },
        onError: (error) => {
          console.error('[BLE Error]', error);
          stopPolling();
          set({ connectionStatus: 'error' });
        },
        onStatusChange: (status) => {
          console.log('[BLE]', status);
        },
      });

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

      // Initialize the adapter with BYD-specific commands
      const initSuccess = await bleInitialize(VGATE_INIT_COMMANDS, (cmd, resp) => {
        console.log(`[OBD Init] ${cmd} → ${resp}`);
      }, 300); // 300ms delay between commands (was 200ms — too fast)

      if (!initSuccess) {
        console.warn('[OBD Init] Some init commands failed, but continuing...');
      }

      // ─── FIX: Start OBD-II data polling ─────────────────────────
      // This is the critical missing piece — without this, no live
      // vehicle data would ever appear even though the adapter is connected.
      console.log('[connectVgate] Starting OBD-II data polling');
      startPolling(250);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[connectVgate]', msg);
      set({
        connectionStatus: 'error',
        connectionMode: null,
      });
    }
  },

  // Generic BLE connection (ELM327, vLinker, Carista, etc.)
  connectBluetooth: async () => {
    set({ connectionStatus: 'connecting' });

    try {
      const avail = await checkBluetoothAvailabilityAsync();
      if (!avail.available) {
        set({
          connectionStatus: 'error',
          connectionMode: null,
          bluetoothAvailable: false,
          bluetoothUnavailableReason: avail.reason || 'Web Bluetooth not available',
        });
        return;
      }

      const device = await requestGenericBLEDevice();
      if (!device) {
        set({ connectionStatus: 'disconnected', connectionMode: null });
        return;
      }

      const deviceId = device.id?.substring(0, 12) || 'unknown';

      const bleInfo = await connectGATT(device, {
        onData: (data) => {
          processOBDResponse(data, get, set);
        },
        onDisconnected: () => {
          stopPolling();
          set({ connectionStatus: 'disconnected', connectionMode: null });
        },
        onError: (error) => {
          console.error('[BLE Error]', error);
          stopPolling();
          set({ connectionStatus: 'error' });
        },
        onStatusChange: (status) => {
          console.log('[BLE]', status);
        },
      });

      const isNUS = bleInfo.serviceType === 'nus';
      const adapterName = isNUS
        ? (device.name || 'Generic BLE OBD-II')
        : 'Unknown BLE Adapter';

      set({
        connectionStatus: 'connected',
        connectionMode: 'bluetooth',
        deviceInfo: {
          ...get().deviceInfo,
          adapterType: adapterName,
          protocol: 'ISO 15765-4 CAN',
          deviceId,
          connectionType: 'bluetooth',
          signalStrength: 85,
          responseTime: 15,
          lastPing: Date.now(),
        },
      });

      // Initialize adapter with generic ELM327 commands
      const initSuccess = await bleInitialize(VGATE_INIT_COMMANDS, (cmd, resp) => {
        console.log(`[OBD Init] ${cmd} → ${resp}`);
      }, 300);

      if (!initSuccess) {
        console.warn('[OBD Init] Some init commands failed, but continuing...');
      }

      // ─── FIX: Start OBD-II data polling ─────────────────────────
      console.log('[connectBluetooth] Starting OBD-II data polling');
      startPolling(250);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[connectBluetooth]', msg);
      set({
        connectionStatus: 'error',
        connectionMode: null,
      });
    }
  },

  // WiFi connection via WebSocket to OBD-II adapter
  connectWifi: async (ip: string, port: number) => {
    set({ connectionStatus: 'connecting' });

    try {
      const info = await wifiConnect(ip, port, {
        onData: (data) => {
          processOBDResponse(data, get, set);
        },
        onDisconnected: () => {
          stopPolling();
          set({ connectionStatus: 'disconnected', connectionMode: null });
        },
        onError: (error) => {
          console.error('[WiFi Error]', error);
          stopPolling();
          set({ connectionStatus: 'error', connectionMode: null });
        },
        onStatusChange: (status) => {
          console.log('[WiFi]', status);
        },
        onConnected: () => {
          set({
            connectionStatus: 'connected',
            connectionMode: 'wifi',
          });
        },
      });

      set({
        connectionStatus: 'connected',
        connectionMode: 'wifi',
        deviceInfo: {
          ...get().deviceInfo,
          connectionType: 'wifi',
          wifiIp: ip,
          wifiPort: port,
          signalStrength: 90,
          responseTime: 20,
          lastPing: Date.now(),
        },
      });

      // ─── FIX: Initialize WiFi adapter with ELM327 commands ──────
      // Previously, WiFi connection succeeded but the adapter was never
      // initialized with AT commands, so it couldn't process OBD queries.
      console.log('[connectWifi] Initializing WiFi OBD-II adapter');
      const initSuccess = await initializeWiFiAdapter(ip, port);

      if (initSuccess) {
        // ─── FIX: Start OBD-II data polling ───────────────────────
        console.log('[connectWifi] Starting OBD-II data polling');
        startPolling(300); // WiFi may need slightly longer interval
      } else {
        console.warn('[connectWifi] Adapter initialization failed, starting polling anyway');
        startPolling(300);
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[connectWifi]', msg);
      set({
        connectionStatus: 'error',
        connectionMode: null,
      });
    }
  },

  disconnectDevice: () => {
    stopPolling();
    bleDisconnect();
    wifiDisconnect();
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
    stopPolling();
    bleDisconnect();
    wifiDisconnect();
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
  setTripData: (data) => set((s) => ({ tripData: { ...s.tripData, ...data } })),

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

// ─── OBD-II Response Parser ──────────────────────────────────────
// Processes raw OBD-II responses from BLE/WiFi adapter and updates vehicle state.
// Supports standard SAE J1979 PID responses.

/**
 * Process a raw OBD-II response string from the adapter.
 * Parses the hex data and updates the vehicle data in the store.
 *
 * Handles standard responses in the format: "41 XX YY [YY...]"
 * where 41 = response to mode 01, XX = PID, YY... = data bytes
 */
function processOBDResponse(
  raw: string,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '>' || trimmed.length < 4) return;

  console.log('[OBD Response]', trimmed);

  try {
    // Try to parse as standard OBD-II response: "41 XX YY [YY...]"
    // 41 = response to mode 01, XX = PID, YY... = data bytes
    // Some adapters include spaces, some don't (ATH0 vs ATH1)
    const match = trimmed.match(/^41\s*([0-9A-Fa-f]{2})\s*([0-9A-Fa-f\s]+)$/i);
    if (match) {
      const pid = match[1].toUpperCase();
      const hexData = match[2].replace(/\s+/g, '');
      const bytes = new Uint8Array(hexData.match(/.{2}/g)?.map((b) => parseInt(b, 16)) || []);

      if (bytes.length >= 1) {
        const buffer = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        parsePIDData(pid, buffer, get, set);
      }
    }

    // Parse voltage response from ATRV command: "12.8V"
    if (trimmed.match(/^\d+\.\d+V$/)) {
      const voltage = parseFloat(trimmed);
      set((s) => ({
        deviceInfo: {
          ...s.deviceInfo,
          voltage: trimmed,
          adapterVoltage: voltage,
        },
      }));
    }

    // Parse protocol description from ATDP
    if (trimmed.includes('ISO 15765') || trimmed.includes('CAN')) {
      set((s) => ({
        deviceInfo: {
          ...s.deviceInfo,
          protocol: trimmed,
        },
      }));
    }

    // Parse ELM327 version from ATI response (e.g., "ELM327 v2.1")
    if (trimmed.toUpperCase().startsWith('ELM327')) {
      set((s) => ({
        deviceInfo: {
          ...s.deviceInfo,
          firmwareVersion: trimmed,
        },
      }));
    }

    // Parse "OK" responses from AT commands
    if (trimmed.toUpperCase() === 'OK') {
      // Adapter acknowledged a command — nothing to update
    }

    // Update last ping time on any successful data
    set((s) => ({
      deviceInfo: {
        ...s.deviceInfo,
        lastPing: Date.now(),
      },
    }));
  } catch (error) {
    console.warn('[OBD Parse Error]', error, trimmed);
  }
}

/**
 * Parse data for a specific PID and update vehicle data.
 */
function parsePIDData(
  pid: string,
  buffer: DataView,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void
) {
  const store = get();

  switch (pid) {
    case '0D': // Vehicle Speed
      if (buffer.byteLength >= 1) {
        const speed = buffer.getUint8(0);
        store.updateVehicleData({ speed });

        // Update trip data
        const trip = { ...store.tripData };
        if (speed > trip.maxSpeed) trip.maxSpeed = speed;
        set((s) => ({ tripData: { ...s.tripData, maxSpeed: trip.maxSpeed } }));
      }
      break;

    case '0C': // Engine/Motor RPM
      if (buffer.byteLength >= 2) {
        const rpm = ((buffer.getUint8(0) * 256 + buffer.getUint8(1)) / 4);
        store.updateVehicleData({ rpm: Math.round(rpm) });
      }
      break;

    case '05': // Engine Coolant Temp (Motor Temp for EV)
      if (buffer.byteLength >= 1) {
        store.updateVehicleData({ motorTemp: buffer.getUint8(0) - 40 });
      }
      break;

    case '0F': // Intake Air Temp (Ambient)
      if (buffer.byteLength >= 1) {
        store.updateVehicleData({ ambientTemp: buffer.getUint8(0) - 40 });
      }
      break;

    case '42': // Control Module Voltage (Battery Voltage)
      if (buffer.byteLength >= 2) {
        const voltage = ((buffer.getUint8(0) * 256 + buffer.getUint8(1)) / 1000);
        store.updateVehicleData({ batteryVoltage: Math.round(voltage * 10) / 10 });
      }
      break;

    case '04': // Calculated Engine Load
      if (buffer.byteLength >= 1) {
        const load = (buffer.getUint8(0) * 100 / 255);
        // Use load to estimate power
        const power = load * 150 * 0.7; // 150kW motor * efficiency
        store.updateVehicleData({ batteryPower: Math.round(power * 10) / 10 });
      }
      break;

    case '11': // Throttle Position
      // Not directly used for EV dashboard but logged
      break;

    case '46': // Ambient Air Temperature (alternative)
      if (buffer.byteLength >= 1) {
        store.updateVehicleData({ ambientTemp: buffer.getUint8(0) - 40 });
      }
      break;

    case '61': // Driver Demand Torque
      if (buffer.byteLength >= 1) {
        const torque = buffer.getUint8(0) - 125;
        store.updateVehicleData({ regenBraking: torque < -5 });
      }
      break;

    case '62': // Actual Engine Torque
      // Logged for diagnostics
      break;

    default:
      console.log(`[OBD] Unhandled PID: ${pid}`);
      break;
  }
}

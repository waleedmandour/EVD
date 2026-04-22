// ─── OBD-II PID Polling Engine ────────────────────────────────────
// After BLE/WiFi connection and adapter initialization, this module
// continuously polls the vehicle's ECU for real-time data by sending
// standard SAE J1979 Mode 01 PID requests.
//
// Without this polling loop, the adapter connects and initializes but
// never actually queries the vehicle — resulting in zero live data.

import { sendCommand as bleSendCommand, isBLEConnected } from './ble-connection';
import { sendCommand as wifiSendCommand, isWiFiConnected } from './wifi-connection';
import { useAppStore } from './store';
import type { ConnectionMode } from './types';

// ─── PID Poll Configuration ──────────────────────────────────────
// Priority-ordered list of PIDs to poll.
// Critical PIDs (speed, SOC, voltage) are polled more frequently
// by repeating them in the cycle.

const FAST_PIDS = [
  '010D', // Vehicle Speed (km/h)
  '010C', // Engine/Motor RPM
  '0142', // Control Module Voltage
  '0104', // Calculated Engine Load → power estimate
];

const SLOW_PIDS = [
  '0105', // Engine Coolant Temp (Motor Temp for EV)
  '010F', // Intake Air Temp (Ambient)
  '0146', // Ambient Air Temperature
  '0161', // Driver Demand Torque
  '0162', // Actual Engine Torque
  '0111', // Throttle Position
];

// Full polling cycle: fast PIDs repeated every 3rd cycle, slow PIDs once
// This gives ~3x more frequent updates for critical data
function buildPollCycle(): string[] {
  const cycle: string[] = [];
  for (let i = 0; i < 3; i++) {
    cycle.push(...FAST_PIDS);
    // Interleave one slow PID per fast batch
    if (i < SLOW_PIDS.length) {
      cycle.push(SLOW_PIDS[i]);
    }
  }
  // Remaining slow PIDs
  for (let i = 3; i < SLOW_PIDS.length; i++) {
    cycle.push(SLOW_PIDS[i]);
  }
  return cycle;
}

const POLL_CYCLE = buildPollCycle();

// ─── Polling State ───────────────────────────────────────────────
let pollTimer: ReturnType<typeof setInterval> | null = null;
let currentPidIndex = 0;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10;

// ─── ELM327 Init Commands for WiFi Adapters ──────────────────────
// These are sent after WiFi WebSocket connection to configure the adapter.
export const WIFI_INIT_COMMANDS = [
  'ATZ',       // Reset adapter
  'ATE0',      // Echo off
  'ATL0',      // Linefeeds off
  'ATH0',      // Headers off (cleaner responses)
  'ATS0',      // Spaces off (more compact)
  'ATSTFF',    // Adaptive timing to fast
  'ATSP6',     // Protocol: ISO 15765-4 CAN (11 bit, 500 kbaud)
  'ATDP',      // Describe current protocol
  'ATRV',      // Read voltage
  'AT@1',      // Device description
];

/**
 * Start the OBD-II polling loop.
 * Sends one PID request per interval, cycling through all PIDs.
 * Responses are handled asynchronously by the BLE/WiFi notification handlers
 * which feed into processOBDResponse in the store.
 */
export function startPolling(intervalMs: number = 250) {
  if (pollTimer) return; // Already running

  currentPidIndex = 0;
  consecutiveErrors = 0;

  console.log('[OBD Poll] Starting polling loop');

  pollTimer = setInterval(() => {
    const store = useAppStore.getState();
    const mode = store.connectionMode;

    // Don't poll in demo mode (simulator handles data)
    if (mode === 'demo' || mode === null) {
      stopPolling();
      return;
    }

    // Check connection health
    const connected = mode === 'bluetooth'
      ? isBLEConnected()
      : mode === 'wifi'
        ? isWiFiConnected()
        : false;

    if (!connected) {
      console.warn('[OBD Poll] Connection lost, stopping polling');
      stopPolling();
      store.disconnectDevice();
      return;
    }

    // Get next PID to query
    const pid = POLL_CYCLE[currentPidIndex % POLL_CYCLE.length];
    currentPidIndex++;

    // Send the PID request
    try {
      if (mode === 'bluetooth') {
        bleSendCommand(pid);
      } else if (mode === 'wifi') {
        wifiSendCommand(pid);
      }
      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors++;
      console.warn(`[OBD Poll] Send failed (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('[OBD Poll] Too many consecutive errors, stopping polling');
        stopPolling();
        store.disconnectDevice();
      }
    }
  }, intervalMs);
}

/**
 * Stop the OBD-II polling loop.
 */
export function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  currentPidIndex = 0;
  consecutiveErrors = 0;
  console.log('[OBD Poll] Stopped polling');
}

/**
 * Check if the polling loop is currently running.
 */
export function isPolling(): boolean {
  return pollTimer !== null;
}

/**
 * Initialize the WiFi OBD-II adapter after WebSocket connection.
 * Sends ELM327 AT commands to configure the adapter, then starts polling.
 */
export async function initializeWiFiAdapter(ip: string, port: number): Promise<boolean> {
  const store = useAppStore.getState();
  store.setDeviceInfo({ ...store.deviceInfo, lastPing: Date.now() });

  console.log('[OBD WiFi] Initializing adapter...');

  for (const cmd of WIFI_INIT_COMMANDS) {
    try {
      wifiSendCommand(cmd);

      // ATZ needs more time
      const waitMs = cmd.toUpperCase() === 'ATZ' ? 3000 : 500;
      await new Promise(resolve => setTimeout(resolve, waitMs));

      console.log(`[OBD WiFi Init] ${cmd} → sent`);
    } catch (error) {
      console.error(`[OBD WiFi Init] ${cmd} → error:`, error);
      return false;
    }
  }

  console.log('[OBD WiFi] Adapter initialized successfully');
  return true;
}

/**
 * Initialize the BLE OBD-II adapter and start polling.
 * Called after GATT connection is established.
 *
 * Note: BLE adapter initialization (AT commands) is handled by the
 * store's connectVgate/connectBluetooth actions using bleInitialize().
 * This function just starts the data polling loop afterward.
 */
export async function initializeBLEAdapter(): Promise<boolean> {
  console.log('[OBD BLE] Starting data polling after init');
  startPolling(250);
  return true;
}

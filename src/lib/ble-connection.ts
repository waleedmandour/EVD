// ─── Web Bluetooth BLE Connection Manager ─────────────────────────
// Handles real GATT connection, service discovery, characteristic
// read/write, and notification subscription for OBD-II BLE adapters.
//
// Supported adapters:
//   - vGate iCar Pro BLE 4.0 (FFE0 service)
//   - Generic ELM327 BLE with Nordic UART Service (NUS)
//   - vLinker FS, Carista, and other NUS-based adapters

import {
  VGATE_ICAR_SERVICE_UUID,
  VGATE_ICAR_WRITE_UUID,
  VGATE_ICAR_NOTIFY_UUID,
  NORDIC_UART_SERVICE_UUID,
  NORDIC_UART_RX_UUID,
  NORDIC_UART_TX_UUID,
} from './types';

export interface BLEConnectionCallbacks {
  onData: (data: string) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
  onStatusChange: (status: string) => void;
}

export interface BLEDeviceInfo {
  id: string;
  name?: string;
  serviceType: 'vgate' | 'nus' | 'unknown';
}

let bleDevice: BluetoothDevice | null = null;
let bleServer: BluetoothRemoteGATTServer | null = null;
let writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let notifyCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let isConnected = false;
let callbacks: BLEConnectionCallbacks | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ─── BLE Response Buffer ──────────────────────────────────────────
// ELM327 responses arrive in fragmented BLE notifications.
// We must buffer them until we see a complete line (delimited by \r or >).
let bleMessageBuffer = '';

/**
 * Check if Web Bluetooth API is available in the current browser/context.
 * Returns an object with availability status and a human-readable reason if unavailable.
 */
export function checkBluetoothAvailability(): { available: boolean; reason?: string } {
  if (typeof navigator === 'undefined') {
    return { available: false, reason: 'Running in server environment' };
  }

  if (!navigator.bluetooth) {
    // Check if we're in a PWA context
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return {
        available: false,
        reason: 'Web Bluetooth is not available in this PWA. Ensure: 1) Your browser supports Web Bluetooth (Chrome/Edge on Android, Chrome on Windows/macOS), 2) The app is served over HTTPS, 3) Bluetooth is enabled in device settings. iOS Safari does NOT support Web Bluetooth.',
      };
    }

    return {
      available: false,
      reason: 'Web Bluetooth API is not supported by this browser. Please use Chrome, Edge, or Opera on Android, or Chrome on desktop. iOS is not supported.',
    };
  }

  return { available: true };
}

/**
 * Async Bluetooth availability check using the official getAvailability() API.
 * This is more reliable than just checking navigator.bluetooth existence.
 * Falls back to sync check if getAvailability() is not supported.
 */
export async function checkBluetoothAvailabilityAsync(): Promise<{ available: boolean; reason?: string }> {
  const syncCheck = checkBluetoothAvailability();
  if (!syncCheck.available) return syncCheck;

  // Try the async availability check (Chrome 87+)
  if (typeof navigator.bluetooth?.getAvailability === 'function') {
    try {
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        return {
          available: false,
          reason: 'Bluetooth adapter is not available on this device. Ensure Bluetooth is turned on in your device settings.',
        };
      }
    } catch {
      // getAvailability() not supported in this context, fall through
    }
  }

  return { available: true };
}

/**
 * Request a BLE device from the user with vGate iCar Pro specific filters.
 */
export async function requestVGateDevice(): Promise<BluetoothDevice | null> {
  const avail = checkBluetoothAvailability();
  if (!avail.available) {
    throw new Error(avail.reason);
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [VGATE_ICAR_SERVICE_UUID] },
      ],
      optionalServices: [
        NORDIC_UART_SERVICE_UUID,
        'battery_service',
      ],
    });

    bleDevice = device;
    return device;
  } catch (error) {
    if ((error as DOMException).name === 'NotFoundError') {
      throw new Error('No device selected. Please choose a vGate iCar Pro adapter from the list.');
    }
    throw error;
  }
}

/**
 * Request a generic BLE device (ELM327, vLinker, Carista, etc.)
 */
export async function requestGenericBLEDevice(): Promise<BluetoothDevice | null> {
  const avail = checkBluetoothAvailability();
  if (!avail.available) {
    throw new Error(avail.reason);
  }

  try {
    // Try NUS first, then accept any BLE device
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [NORDIC_UART_SERVICE_UUID] }],
      optionalServices: ['battery_service', VGATE_ICAR_SERVICE_UUID],
    });

    bleDevice = device;
    return device;
  } catch (error) {
    if ((error as DOMException).name === 'NotFoundError') {
      throw new Error('No device selected. Please ensure your BLE adapter is powered on and in pairing mode.');
    }
    // If NUS filter fails, try with acceptAllDevices
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [NORDIC_UART_SERVICE_UUID, VGATE_ICAR_SERVICE_UUID, 'battery_service'],
      });

      bleDevice = device;
      return device;
    } catch {
      throw new Error('Could not find a compatible BLE adapter. Ensure the device is powered on and within range.');
    }
  }
}

/**
 * Connect to a BLE device's GATT server and discover services/characteristics.
 * This establishes the full connection pipeline: GATT → Service → Characteristics → Notifications.
 */
export async function connectGATT(
  device: BluetoothDevice,
  cb: BLEConnectionCallbacks
): Promise<BLEDeviceInfo> {
  callbacks = cb;
  cb.onStatusChange('Connecting to device...');

  // Disconnect any existing connection
  if (isConnected) {
    await disconnect();
  }

  bleDevice = device;
  bleMessageBuffer = '';

  // Null check for GATT server
  if (!device.gatt) {
    const errMsg = 'GATT server not available on this device. The adapter may not support BLE GATT. Try a different adapter or ensure Bluetooth is enabled.';
    cb.onError(errMsg);
    throw new Error(errMsg);
  }

  // Listen for disconnection events
  device.addEventListener('gattserverdisconnected', handleDisconnection);

  try {
    // Connect to the GATT server
    bleServer = await device.gatt.connect();
    isConnected = true;
    cb.onStatusChange('GATT connected, discovering services...');

    // Determine service type and get characteristics
    let serviceType: 'vgate' | 'nus' | 'unknown' = 'unknown';

    try {
      // Try vGate service first (FFE0)
      const vgateService = await bleServer.getPrimaryService(VGATE_ICAR_SERVICE_UUID);
      writeCharacteristic = await vgateService.getCharacteristic(VGATE_ICAR_WRITE_UUID);
      notifyCharacteristic = await vgateService.getCharacteristic(VGATE_ICAR_NOTIFY_UUID);
      serviceType = 'vgate';
    } catch {
      // Fall back to Nordic UART Service (NUS)
      try {
        const nusService = await bleServer.getPrimaryService(NORDIC_UART_SERVICE_UUID);

        // ─── FIX: NUS characteristic mapping ───────────────────────
        // Per the Nordic UART Service specification:
        //   - RX Characteristic (6e400003): Client WRITES to this to send data TO the device
        //   - TX Characteristic (6e400002): Client SUBSCRIBES to notifications to receive data FROM device
        // Previously these were swapped, causing all NUS-based adapters to fail.
        writeCharacteristic = await nusService.getCharacteristic(NORDIC_UART_RX_UUID);  // 6e400003 — client writes here
        notifyCharacteristic = await nusService.getCharacteristic(NORDIC_UART_TX_UUID); // 6e400002 — client subscribes here
        serviceType = 'nus';
      } catch {
        throw new Error('Could not find vGate or Nordic UART Service on this device. The adapter may not be compatible.');
      }
    }

    // Subscribe to notifications from the device
    if (notifyCharacteristic) {
      await notifyCharacteristic.startNotifications();
      notifyCharacteristic.addEventListener('characteristicvaluechanged', handleNotification);
    }

    cb.onStatusChange('Connected! Initializing OBD-II adapter...');

    const deviceId = device.id?.substring(0, 12) || 'unknown';

    return {
      id: deviceId,
      name: device.name || undefined,
      serviceType,
    };
  } catch (error) {
    isConnected = false;
    const errMsg = error instanceof Error ? error.message : 'Failed to connect to GATT server';

    // Common error explanations
    if (errMsg.includes('User cancelled') || errMsg.includes('NotFoundError')) {
      cb.onError('Connection cancelled by user.');
    } else if (errMsg.includes('Device not found') || errMsg.includes('not found')) {
      cb.onError('Device not found. Ensure the adapter is powered on and within Bluetooth range.');
    } else if (errMsg.includes('GATT') || errMsg.includes('connect')) {
      cb.onError(`GATT connection failed: ${errMsg}. Try turning Bluetooth off and on, then reconnect.`);
    } else {
      cb.onError(errMsg);
    }

    throw new Error(errMsg);
  }
}

/**
 * Send an OBD-II command string to the BLE adapter.
 * Commands are sent as UTF-8 text encoded bytes.
 */
export async function sendCommand(command: string): Promise<void> {
  if (!writeCharacteristic || !isConnected) {
    throw new Error('Not connected to BLE device');
  }

  // Ensure command ends with carriage return (ELM327 standard)
  const cmd = command.endsWith('\r') ? command : command + '\r';
  const encoder = new TextEncoder();
  const data = encoder.encode(cmd);

  try {
    await writeCharacteristic.writeValueWithoutResponse(data);
  } catch {
    // Some older adapters require write with response
    try {
      await writeCharacteristic.writeValueWithResponse(data);
    } catch (error) {
      throw new Error(`Failed to send command "${command}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Send ELM327 initialization commands to set up the adapter.
 * Uses adaptive delays: ATZ (reset) gets a longer delay, other commands get shorter.
 * Waits for the response buffer to accumulate data between commands.
 */
export async function initializeAdapter(
  commands: string[],
  onInitResponse: (cmd: string, response: string) => void,
  delayMs: number = 300
): Promise<boolean> {
  for (const cmd of commands) {
    try {
      await sendCommand(cmd);

      // ATZ (reset) needs significantly more time — up to 3 seconds
      // Other AT commands need 300-500ms
      const waitTime = cmd.toUpperCase().startsWith('ATZ') ? 3000 : delayMs;
      await sleep(waitTime);

      // Read whatever the adapter sent back (from the buffer)
      const response = bleMessageBuffer.trim();
      bleMessageBuffer = '';

      onInitResponse(cmd, response || 'sent');
    } catch (error) {
      onInitResponse(cmd, `error: ${error instanceof Error ? error.message : 'failed'}`);
      return false;
    }
  }
  return true;
}

/**
 * Handle incoming notifications from the BLE device.
 * Buffers fragmented responses and forwards complete lines to callbacks.
 *
 * ELM327 responses are terminated by \r (carriage return) or > (ready prompt).
 * A single BLE notification may contain a partial response, a complete response,
 * or even multiple responses. We must buffer and split properly.
 */
function handleNotification(event: Event) {
  const target = event.target as BluetoothRemoteGATTCharacteristic;
  if (!target || !target.value) return;

  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(target.value);

  // Accumulate in buffer
  bleMessageBuffer += text;

  // Process complete lines from the buffer
  // ELM327 uses \r as line separator and > as ready prompt
  while (bleMessageBuffer.length > 0) {
    // Check for ready prompt first
    const promptIdx = bleMessageBuffer.indexOf('>');
    if (promptIdx !== -1) {
      // Everything before '>' is a complete response
      const before = bleMessageBuffer.substring(0, promptIdx).trim();
      const after = bleMessageBuffer.substring(promptIdx + 1);

      if (before && callbacks?.onData) {
        // Split on \r in case there are multiple lines
        const lines = before.split('\r');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            callbacks.onData(trimmed);
          }
        }
      }

      bleMessageBuffer = after;
      continue;
    }

    // Check for \r delimiter (line complete, but more may follow)
    const crIdx = bleMessageBuffer.indexOf('\r');
    if (crIdx !== -1) {
      const line = bleMessageBuffer.substring(0, crIdx).trim();
      bleMessageBuffer = bleMessageBuffer.substring(crIdx + 1);

      if (line && callbacks?.onData) {
        callbacks.onData(line);
      }
      continue;
    }

    // No delimiter found — partial response, keep buffering
    // Safety: if buffer grows too large without a delimiter, flush it
    // (prevents memory leak from garbage data)
    if (bleMessageBuffer.length > 512) {
      const trimmed = bleMessageBuffer.trim();
      if (trimmed && callbacks?.onData) {
        callbacks.onData(trimmed);
      }
      bleMessageBuffer = '';
    }

    break;
  }
}

/**
 * Handle GATT server disconnection.
 * Attempts automatic reconnection once after 2 seconds.
 */
function handleDisconnection() {
  isConnected = false;
  writeCharacteristic = null;
  notifyCharacteristic = null;
  bleMessageBuffer = '';

  if (callbacks?.onDisconnected) {
    callbacks.onDisconnected();
  }

  // Attempt auto-reconnect once
  if (bleDevice && !reconnectTimer) {
    callbacks?.onStatusChange('Device disconnected. Attempting to reconnect...');
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      try {
        if (callbacks && bleDevice) {
          await connectGATT(bleDevice, callbacks);
          callbacks.onStatusChange('Reconnected successfully!');
        }
      } catch {
        callbacks?.onError('Auto-reconnect failed. Please tap Connect to try again.');
      }
    }, 2000);
  }
}

/**
 * Disconnect from the BLE device and clean up resources.
 */
export async function disconnect(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (notifyCharacteristic) {
    try {
      await notifyCharacteristic.stopNotifications();
      notifyCharacteristic.removeEventListener('characteristicvaluechanged', handleNotification);
    } catch {
      // Characteristic may already be disconnected
    }
    notifyCharacteristic = null;
  }

  writeCharacteristic = null;

  if (bleServer?.connected) {
    bleServer.disconnect();
  }

  bleServer = null;
  isConnected = false;
  bleMessageBuffer = '';

  if (bleDevice) {
    bleDevice.removeEventListener('gattserverdisconnected', handleDisconnection);
    bleDevice = null;
  }
}

export function isBLEConnected(): boolean {
  return isConnected;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

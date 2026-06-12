/**
 * EVDx — Real BLE OBD Connection Service
 *
 * Uses @capacitor-community/bluetooth-le for native Android BLE.
 * Handles scanning, connecting, reading/writing OBD-II commands via ELM327.
 *
 * Preserves vGate iCar Pro FFE0 UUID profile and ELM327 AT command sequences.
 */

import { Capacitor } from '@capacitor/core';
import { requestBlePermissions } from './permissions';

// ─── OBD Adapter BLE Profiles ─────────────────────────────────────────────────

export interface BLEAdapterProfile {
  name: string;
  serviceUUID: string;
  writeUUID: string;
  notifyUUID: string;
}

// Known adapter profiles
const ADAPTER_PROFILES: BLEAdapterProfile[] = [
  {
    name: 'vGate iCar Pro',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  },
  {
    name: 'OBDLink MX+',
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    writeUUID: '00002af0-0000-1000-8000-00805f9b34fb',
    notifyUUID: '00002af1-0000-1000-8000-00805f9b34fb',
  },
  {
    name: 'vLinker MC+',
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    writeUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notifyUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  },
  {
    name: 'ELM327 Generic',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  },
];

// ─── ELM327 AT Command Sequences ──────────────────────────────────────────────

const ELM327_INIT_COMMANDS = [
  'ATZ',       // Reset
  'ATE0',      // Echo off
  'ATL0',      // Linefeeds off
  'ATS0',      // Spaces off
  'ATH0',      // Headers off
  'ATSP0',     // Auto protocol
  'ATI',       // Identify
  'ATDP',      // Describe protocol
];

// ─── Scanned Device ───────────────────────────────────────────────────────────

export interface ScannedDevice {
  deviceId: string;
  name: string;
  rssi: number;
  profile?: BLEAdapterProfile;
}

// ─── BLE Service ──────────────────────────────────────────────────────────────

class BLEService {
  private connectedDeviceId: string | null = null;
  private activeProfile: BLEAdapterProfile | null = null;
  private commandQueue: string[] = [];
  private isProcessing = false;
  private responseBuffer = '';
  private responseResolve: ((value: string) => void) | null = null;
  private notifyCallback: ((data: string) => void) | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private BluetoothLe: any = null;

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[BLE] Not a native platform — BLE unavailable');
      return;
    }

    try {
      const bleModule = await import('@capacitor-community/bluetooth-le');
      this.BluetoothLe = bleModule.BluetoothLe;

      // Request permissions first
      const permResult = await requestBlePermissions();
      if (!permResult.granted) {
        throw new Error('BLE permissions not granted');
      }

      // Initialize the plugin
      await this.BluetoothLe.initialize();
      console.log('[BLE] Initialized successfully');
    } catch (error) {
      console.error('[BLE] Initialization failed:', error);
      throw error;
    }
  }

  async scan(timeoutMs = 10000): Promise<ScannedDevice[]> {
    if (!this.BluetoothLe) {
      await this.initialize();
    }

    const devices: ScannedDevice[] = [];

    try {
      await this.BluetoothLe.requestLEScan({}, (result: any) => {
        const device = result.device;
        if (!device) return;

        const name = device.name || device.localName || '';
        const deviceId = device.deviceId;

        // Skip duplicates
        if (devices.some(d => d.deviceId === deviceId)) return;

        // Try to match a known adapter profile
        const profile = this.matchProfile(name, deviceId);

        // Only include devices that look like OBD adapters
        const isOBDLike = profile ||
          name.toLowerCase().includes('obd') ||
          name.toLowerCase().includes('elm') ||
          name.toLowerCase().includes('vlink') ||
          name.toLowerCase().includes('icar') ||
          name.toLowerCase().includes('vgate') ||
          name.toLowerCase().includes('carly') ||
          name.toLowerCase().includes('veepeak') ||
          deviceId.startsWith(''); // Include all for now, let user choose

        if (isOBDLike || name) {
          devices.push({
            deviceId,
            name: name || `Unknown (${deviceId.substring(0, 8)})`,
            rssi: result.rssi || -100,
            profile,
          });
        }
      });

      // Wait for scan duration
      await new Promise(resolve => setTimeout(resolve, timeoutMs));
      await this.BluetoothLe.stopLEScan();
    } catch (error) {
      console.error('[BLE] Scan error:', error);
      try {
        await this.BluetoothLe.stopLEScan();
      } catch {}
    }

    return devices.sort((a, b) => b.rssi - a.rssi);
  }

  async connect(deviceId: string, profile?: BLEAdapterProfile): Promise<boolean> {
    if (!this.BluetoothLe) return false;

    try {
      await this.BluetoothLe.connect({ deviceId });
      this.connectedDeviceId = deviceId;
      this.activeProfile = profile || this.detectProfile(deviceId);

      console.log('[BLE] Connected to', deviceId);

      // Set up notification listener
      if (this.activeProfile) {
        await this.BluetoothLe.startNotifications({
          deviceId,
          service: this.activeProfile.serviceUUID,
          characteristic: this.activeProfile.notifyUUID,
        }, (value: any) => {
          const data = this.decodeValue(value);
          this.handleNotification(data);
        });
      }

      // Initialize ELM327
      await this.initializeELM327();

      return true;
    } catch (error) {
      console.error('[BLE] Connection error:', error);
      this.connectedDeviceId = null;
      this.activeProfile = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.BluetoothLe || !this.connectedDeviceId) return;

    try {
      if (this.activeProfile) {
        await this.BluetoothLe.stopNotifications({
          deviceId: this.connectedDeviceId,
          service: this.activeProfile.serviceUUID,
          characteristic: this.activeProfile.notifyUUID,
        });
      }
      await this.BluetoothLe.disconnect({ deviceId: this.connectedDeviceId });
    } catch (error) {
      console.error('[BLE] Disconnect error:', error);
    } finally {
      this.connectedDeviceId = null;
      this.activeProfile = null;
      this.stopPolling();
    }
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.BluetoothLe || !this.connectedDeviceId || !this.activeProfile) {
      return '';
    }

    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseResolve = null;
        resolve('');
      }, 3000);

      this.responseResolve = (data: string) => {
        clearTimeout(timeout);
        resolve(data);
      };

      try {
        const encoded = this.encodeValue(command + '\r');
        await this.BluetoothLe.write({
          deviceId: this.connectedDeviceId!,
          service: this.activeProfile!.serviceUUID,
          characteristic: this.activeProfile!.writeUUID,
          value: encoded,
        });
      } catch (error) {
        clearTimeout(timeout);
        this.responseResolve = null;
        reject(error);
      }
    });
  }

  // ─── OBD Polling ──────────────────────────────────────────────────────────

  startPolling(
    onData: (pid: string, value: string) => void,
    intervalMs = 500
  ): void {
    this.stopPolling();

    const pids = [
      '010D', // Speed
      '010C', // RPM
      '0105', // Coolant/Motor temp
      '0142', // Control module voltage
      '0104', // Engine load
      '0146', // Ambient temp
      '010F', // Intake air temp
      '0111', // Throttle position
    ];

    let pidIndex = 0;
    this.notifyCallback = onData;

    this.pollingInterval = setInterval(async () => {
      if (!this.connectedDeviceId) return;

      try {
        const pid = pids[pidIndex % pids.length];
        const response = await this.sendCommand(pid);
        if (response) {
          onData(pid, response);
        }
        pidIndex++;
      } catch (error) {
        console.error('[BLE] Polling error:', error);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.notifyCallback = null;
  }

  isConnected(): boolean {
    return this.connectedDeviceId !== null;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private matchProfile(name: string, _deviceId: string): BLEAdapterProfile | undefined {
    const lower = name.toLowerCase();
    if (lower.includes('icar') || lower.includes('vgate')) return ADAPTER_PROFILES[0];
    if (lower.includes('obdlink') || lower.includes('mx+')) return ADAPTER_PROFILES[1];
    if (lower.includes('vlink')) return ADAPTER_PROFILES[2];
    return undefined;
  }

  private detectProfile(_deviceId: string): BLEAdapterProfile {
    // Default to vGate iCar Pro profile (most common)
    return ADAPTER_PROFILES[0];
  }

  private async initializeELM327(): Promise<void> {
    for (const cmd of ELM327_INIT_COMMANDS) {
      try {
        await this.sendCommand(cmd);
        await new Promise(r => setTimeout(r, 200)); // Small delay between init commands
      } catch {
        // Continue even if some init commands fail
      }
    }
    console.log('[BLE] ELM327 initialized');
  }

  private handleNotification(data: string): void {
    this.responseBuffer += data;

    // Check for complete response (ELM327 ends with '>' prompt)
    if (this.responseBuffer.includes('>')) {
      const response = this.responseBuffer.replace('>', '').trim();
      this.responseBuffer = '';

      if (this.responseResolve) {
        this.responseResolve(response);
        this.responseResolve = null;
      }
    }
  }

  private encodeValue(str: string): string {
    // Convert string to hex for BLE write
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
  }

  private decodeValue(value: any): string {
    if (typeof value === 'string') {
      // Value is already hex string
      let str = '';
      for (let i = 0; i < value.length; i += 2) {
        const code = parseInt(value.substring(i, i + 2), 16);
        if (!isNaN(code)) str += String.fromCharCode(code);
      }
      return str;
    }
    return String(value);
  }
}

// Singleton
export const bleService = new BLEService();

/**
 * EVDx — Real BLE OBD Connection Service
 *
 * Uses @capacitor-community/bluetooth-le BleClient for native Android BLE.
 * Handles scanning, connecting, reading/writing OBD-II commands via ELM327.
 *
 * IMPORTANT: Must use BleClient (not BluetoothLe) for requestLEScan and
 * startNotifications, because the low-level BluetoothLe plugin does NOT
 * accept callbacks. BleClient wraps the listener pattern automatically.
 *
 * Preserves vGate iCar Pro FFE0 UUID profile and ELM327 AT command sequences.
 */

import { Capacitor } from '@capacitor/core';
import { BleClient, type BleDevice, type dataViewToHexString } from '@capacitor-community/bluetooth-le';
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
  private responseBuffer = '';
  private responseResolve: ((value: string) => void) | null = null;
  private notifyCallback: ((data: string) => void) | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('[BLE] Not a native platform — BLE unavailable');
      return;
    }

    try {
      // Request permissions first
      const permResult = await requestBlePermissions();
      if (!permResult.granted) {
        throw new Error('BLE permissions not granted');
      }

      // Initialize BleClient — must pass androidNeverForLocation: true
      // because AndroidManifest declares BLUETOOTH_SCAN with neverForLocation
      await BleClient.initialize({ androidNeverForLocation: true });
      this.initialized = true;
      console.log('[BLE] BleClient initialized successfully');
    } catch (error) {
      console.error('[BLE] Initialization failed:', error);
      throw error;
    }
  }

  async scan(timeoutMs = 10000): Promise<ScannedDevice[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const devices: ScannedDevice[] = [];
    const seenIds = new Set<string>();

    try {
      // BleClient.requestLEScan accepts a callback correctly
      await BleClient.requestLEScan({}, (result: { device: BleDevice; rssi?: number; localName?: string }) => {
        const device = result.device;
        if (!device) return;

        const name = device.name || result.localName || '';
        const deviceId = device.deviceId;

        // Skip duplicates
        if (seenIds.has(deviceId)) return;
        seenIds.add(deviceId);

        // Try to match a known adapter profile
        const profile = this.matchProfile(name, deviceId);

        // Only include devices that look like OBD adapters or have names
        const isOBDLike = profile ||
          name.toLowerCase().includes('obd') ||
          name.toLowerCase().includes('elm') ||
          name.toLowerCase().includes('vlink') ||
          name.toLowerCase().includes('icar') ||
          name.toLowerCase().includes('vgate') ||
          name.toLowerCase().includes('carly') ||
          name.toLowerCase().includes('veepeak');

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
      await BleClient.stopLEScan();
    } catch (error) {
      console.error('[BLE] Scan error:', error);
      try {
        await BleClient.stopLEScan();
      } catch {}
    }

    return devices.sort((a, b) => b.rssi - a.rssi);
  }

  async connect(deviceId: string, profile?: BLEAdapterProfile): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      await BleClient.connect(deviceId);
      this.connectedDeviceId = deviceId;
      this.activeProfile = profile || this.detectProfile(deviceId);

      console.log('[BLE] Connected to', deviceId);

      // Set up notification listener using BleClient (accepts callback correctly)
      if (this.activeProfile) {
        await BleClient.startNotifications(
          deviceId,
          this.activeProfile.serviceUUID,
          this.activeProfile.notifyUUID,
          (value: DataView) => {
            const data = this.decodeDataView(value);
            this.handleNotification(data);
          }
        );
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
    if (!this.initialized || !this.connectedDeviceId) return;

    try {
      if (this.activeProfile) {
        await BleClient.stopNotifications(
          this.connectedDeviceId,
          this.activeProfile.serviceUUID,
          this.activeProfile.notifyUUID
        );
      }
      await BleClient.disconnect(this.connectedDeviceId);
    } catch (error) {
      console.error('[BLE] Disconnect error:', error);
    } finally {
      this.connectedDeviceId = null;
      this.activeProfile = null;
      this.stopPolling();
    }
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.initialized || !this.connectedDeviceId || !this.activeProfile) {
      return '';
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseResolve = null;
        resolve('');
      }, 3000);

      this.responseResolve = (data: string) => {
        clearTimeout(timeout);
        resolve(data);
      };

      // Encode command string to DataView for BleClient.write
      const encoded = this.encodeCommand(command + '\r');
      BleClient.write(
        this.connectedDeviceId!,
        this.activeProfile!.serviceUUID,
        this.activeProfile!.writeUUID,
        encoded
      ).catch((error: unknown) => {
        clearTimeout(timeout);
        this.responseResolve = null;
        reject(error);
      });
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

  /**
   * Encode a string command to DataView for BleClient.write()
   * BleClient.write expects a DataView, not a hex string
   */
  private encodeCommand(str: string): DataView {
    const buffer = new ArrayBuffer(str.length);
    const view = new DataView(buffer);
    for (let i = 0; i < str.length; i++) {
      view.setUint8(i, str.charCodeAt(i));
    }
    return view;
  }

  /**
   * Decode a DataView from BLE notification to string
   */
  private decodeDataView(value: DataView): string {
    let str = '';
    for (let i = 0; i < value.byteLength; i++) {
      str += String.fromCharCode(value.getUint8(i));
    }
    return str;
  }
}

// Singleton
export const bleService = new BLEService();

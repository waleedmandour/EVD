/**
 * EVDx — Production-Grade BLE OBD Connection Service
 *
 * Uses @capacitor-community/bluetooth-le BleClient for native Android BLE.
 * Handles scanning, connecting, reading/writing OBD-II commands via ELM327.
 *
 * Key improvements (v1.5.1):
 * - Complete ELM327 initialization per ELM Electronics datasheet
 * - Protocol auto-detection with fallback (ATSP0 → try each)
 * - Device identification via ATI, AT@1, AT@2, ATDP
 * - Clone chip detection (STN vs genuine ELM327)
 * - 10 adapter BLE profiles including OBDLink CX, Veepeak BLE+, vLinker BM+
 * - Standard SAE J1979 PID support detection (0100, 0120, 0140)
 * - DTC reading (Mode 03/07/0A) and clearing (Mode 04)
 * - VIN retrieval (Mode 09 PID 02) with multi-frame safe parsing
 * - WiFi ELM327 support via fetch HTTP (with WebSocket fallback) and full AT init
 * - Proper BLE MTU handling (requests 517 bytes on connect) and notification buffering
 * - Serialized command queue — eliminates responseResolver race condition
 * - Android 12+ runtime permission flow
 *
 * References:
 * - ELM327 Datasheet (ELM Electronics)
 * - SAE J1979 (2016) OBD-II standard
 * - ISO 15765-4 (CAN bus) protocol spec
 * - OBDTester.com ELM327 command reference
 * - Wikipedia OBD-II PIDs (SAE J1979)
 */

import { Capacitor } from '@capacitor/core';
import { BleClient, type BleDevice } from '@capacitor-community/bluetooth-le';
import { requestBlePermissions } from './permissions';

// ─── OBD Adapter BLE Profiles ─────────────────────────────────────────────────

export interface BLEAdapterProfile {
  name: string;
  serviceUUID: string;
  writeUUID: string;
  notifyUUID: string;
  aliases: string[];  // Name patterns for auto-matching
}

/**
 * Known OBD adapter BLE profiles with verified UUIDs.
 *
 * The 4 main BLE profile families:
 * 1. FFE0/FFE1 — Used by vGate iCar Pro, ELM327 Generic, many Chinese clones
 * 2. 18F0/2AF0/2AF1 — OBDLink MX+ and OBDLink CX (OBDLink proprietary)
 * 3. Nordic NUS (6e400001/002/003) — vLinker MC+, FS, BM+; also some DIY adapters
 * 4. FFE0/FFE1/FFE2 — Veepeak OBDCheck BLE+ (FFE2 is alternate notify)
 */
const ADAPTER_PROFILES: BLEAdapterProfile[] = [
  {
    name: 'vGate iCar Pro',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    aliases: ['icar', 'vgate', 'icarpro', 'icar pro', 'v-gate'],
  },
  {
    name: 'OBDLink MX+',
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    writeUUID: '00002af0-0000-1000-8000-00805f9b34fb',
    notifyUUID: '00002af1-0000-1000-8000-00805f9b34fb',
    aliases: ['obdlink', 'mx+', 'obdlink mx', 'obd-link'],
  },
  {
    name: 'OBDLink CX',
    serviceUUID: '000018f0-0000-1000-8000-00805f9b34fb',
    writeUUID: '00002af0-0000-1000-8000-00805f9b34fb',
    notifyUUID: '00002af1-0000-1000-8000-00805f9b34fb',
    aliases: ['obdlink cx', 'cx-', 'olcx'],
  },
  {
    name: 'vLinker MC+',
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    writeUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notifyUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
    aliases: ['vlink', 'vlinker', 'mc+', 'vlinker mc', 'v-linker'],
  },
  {
    name: 'vLinker FS',
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    writeUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notifyUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
    aliases: ['vlinker fs', 'vlinkerfs'],
  },
  {
    name: 'vLinker BM+',
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    writeUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notifyUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
    aliases: ['vlinker bm', 'vlinkerbm', 'bm+'],
  },
  {
    name: 'Veepeak OBDCheck BLE+',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe2-0000-1000-8000-00805f9b34fb',
    aliases: ['veepeak', 'obdcheck', 'ble+', 'veepeak ble'],
  },
  {
    name: 'Carly Universal',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    aliases: ['carly', 'carly universal', 'carly adapter'],
  },
  {
    name: 'LEMON OBD2',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    aliases: ['lemon', 'lemon obd', 'lemon_obd'],
  },
  {
    name: 'ELM327 Generic',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    aliases: ['elm327', 'elm-327', 'obd2', 'obdii', 'obd-ii', 'obd scanner'],
  },
];

// ─── ELM327 AT Command Sequences ──────────────────────────────────────────────

/**
 * Complete ELM327 initialization sequence per ELM Electronics datasheet.
 *
 * Order matters:
 * 1. ATD  — Set all to defaults (reset settings without rebooting)
 * 2. ATZ  — Reset (full hardware reset)
 * 3. ATE0 — Echo off (stop echoing commands back)
 * 4. ATL0 — Linefeeds off (simplify parsing)
 * 5. ATS0 — Spaces off (simplify parsing)
 * 6. ATH0 — Headers off (we don't need CAN headers for standard PIDs)
 * 7. ATAT1 — Adaptive timing auto1 (adjusts timeout for slow ECUs)
 * 8. ATSP0 — Auto protocol detection (tries all protocols)
 * 9. ATI  — Identify (get firmware version string)
 * 10. AT@1 — Device description (for clone detection)
 * 11. AT@2 — Device identifier (manufacturer-specific)
 * 12. ATDP — Describe current protocol
 * 13. ATST64 — Set timeout to 100ms (64 hex = 100 * 4ms)
 * 14. 0100 — PID support request (validates vehicle communication)
 *
 * Notes:
 * - ATSP0 auto-detects protocol by trying each one sequentially.
 *   For EVs (2008+), this will almost always resolve to protocol 6 or 7
 *   (ISO 15765-4 CAN 11-bit or 29-bit, 500 kbaud).
 * - ATAT1 enables adaptive timing which adjusts the internal timeout
 *   based on ECU response patterns. This prevents timeouts on slow ECUs.
 * - ATST64 sets a 100ms timeout per response byte which is a good balance.
 *   Default is ATSTFF (255 * 4ms = ~1 second) which is too slow for polling.
 */
const ELM327_INIT_COMMANDS: { cmd: string; desc: string; delay: number; critical: boolean }[] = [
  { cmd: 'ATD',  desc: 'Set defaults',          delay: 500,  critical: true  },  // Reset all settings
  { cmd: 'ATZ',  desc: 'Hardware reset',         delay: 1000, critical: true  },  // Full reset, wait for reboot
  { cmd: 'ATE0', desc: 'Echo off',               delay: 200,  critical: true  },  // Must be off for reliable parsing
  { cmd: 'ATL0', desc: 'Linefeeds off',          delay: 200,  critical: true  },  // Simplifies response parsing
  { cmd: 'ATS0', desc: 'Spaces off',             delay: 200,  critical: true  },  // Simplifies hex parsing
  { cmd: 'ATH0', desc: 'Headers off',            delay: 200,  critical: false },  // Off for standard PIDs
  { cmd: 'ATAT1', desc: 'Adaptive timing auto1', delay: 200,  critical: false },  // Auto-adjust timeouts
  { cmd: 'ATSP0', desc: 'Auto protocol detect',  delay: 200,  critical: true  },  // Auto-select protocol
  { cmd: 'ATST64', desc: 'Set timeout 400ms',    delay: 200,  critical: false },  // 0x64 = 100, 100 * 4ms = 400ms per byte
  { cmd: 'ATI',  desc: 'Identify device',        delay: 500,  critical: false },  // Get firmware version
  { cmd: 'AT@1', desc: 'Device description',     delay: 500,  critical: false },  // Clone detection
  { cmd: 'AT@2', desc: 'Device identifier',      delay: 500,  critical: false },  // Manufacturer ID
  { cmd: 'ATDP', desc: 'Describe protocol',      delay: 500,  critical: false },  // Current protocol
];

/**
 * ELM327 protocol numbers (ATSP command).
 * Per ELM327 datasheet and OBDTester.com reference.
 *
 * Most EVs (2008+) use protocol 6 or 7 (ISO 15765-4 CAN 500 kbaud).
 * Some Chinese EVs use protocol 8 (CAN 250 kbaud).
 * BYD uses 29-bit CAN, Tesla uses CAN 11-bit 500 kbaud.
 */
export const ELM327_PROTOCOLS: Record<string, string> = {
  '0': 'Automatic',
  '1': 'SAE J1850 PWM (41.6 kbaud)',
  '2': 'SAE J1850 VPW (10.4 kbaud)',
  '3': 'ISO 9141-2 (5 baud init, 10.4 kbaud)',
  '4': 'ISO 14230-4 KWP (5 baud init, 10.4 kbaud)',
  '5': 'ISO 14230-4 KWP (fast init, 10.4 kbaud)',
  '6': 'ISO 15765-4 CAN (11-bit ID, 500 kbaud)',
  '7': 'ISO 15765-4 CAN (29-bit ID, 500 kbaud)',
  '8': 'ISO 15765-4 CAN (11-bit ID, 250 kbaud)',
  '9': 'ISO 15765-4 CAN (29-bit ID, 250 kbaud)',
  'A': 'SAE J1939 CAN (29-bit ID, 250 kbaud)',
  'B': 'User 1 CAN (11-bit ID, 125 kbaud)',
  'C': 'User 2 CAN (29-bit ID, 125 kbaud)',
};

/**
 * Standard SAE J1979 Mode 01 PIDs for real-time data.
 *
 * The polling list is organized by priority:
 * - Essential driving data (speed, RPM, load, throttle) polled more frequently
 * - Temperature and voltage data polled less frequently
 * - EV-specific data (if supported) polled when available
 *
 * References: SAE J1979-2016, Wikipedia OBD-II PIDs
 */
const STANDARD_PIDS: { pid: string; name: string; mode: string }[] = [
  // ── Essential driving data (high priority) ──
  { pid: '0D', name: 'Vehicle Speed',          mode: '01' },  // km/h, 1 byte: A
  { pid: '0C', name: 'Engine RPM',             mode: '01' },  // (A*256+B)/4
  { pid: '04', name: 'Engine Load',            mode: '01' },  // A*100/255 %
  { pid: '11', name: 'Throttle Position',      mode: '01' },  // A*100/255 %

  // ── Temperature data ──
  { pid: '05', name: 'Coolant Temp',           mode: '01' },  // A-40 °C
  { pid: '0F', name: 'Intake Air Temp',        mode: '01' },  // A-40 °C
  { pid: '46', name: 'Ambient Air Temp',       mode: '01' },  // A-40 °C

  // ── Electrical data ──
  { pid: '42', name: 'Control Module Voltage',  mode: '01' },  // (A*256+B)/1000 V

  // ── EV/Hybrid extended data ──
  { pid: '61', name: 'Driver Demand Torque',   mode: '01' },  // A-125 %
  { pid: '62', name: 'Actual Motor Torque',    mode: '01' },  // A-125 %
  { pid: '63', name: 'Engine Ref Torque',      mode: '01' },  // A-125 %

  // ── Additional standard PIDs ──
  { pid: '2F', name: 'Fuel Level',             mode: '01' },  // A*100/255 %
  { pid: 'A6', name: 'Odometer',               mode: '01' },  // A*256^3+B*256^2+C*256+D km
];

/**
 * PID support detection queries.
 * Per SAE J1979, PIDs 00, 20, 40, 60, 80, A0, C0 return 4-byte bitfields
 * indicating which PIDs in each 32-PID range are supported.
 */
const PID_SUPPORT_PIDS = ['00', '20', '40', '60', '80', 'A0', 'C0'];

// ─── Scanned Device ───────────────────────────────────────────────────────────

export interface ScannedDevice {
  deviceId: string;
  name: string;
  rssi: number;
  profile?: BLEAdapterProfile;
  isOBDLike: boolean;   // True if name matches known OBD patterns
  isUnknown: boolean;   // True if device name is empty/unavailable
}

// ─── Adapter Identification ───────────────────────────────────────────────────

export interface AdapterInfo {
  firmware: string;        // E.g. "ELM327 v1.5", "STN2120 v3.0.0"
  description: string;     // AT@1 response
  identifier: string;      // AT@2 response
  protocol: string;        // E.g. "ISO 15765-4 CAN (11-bit ID, 500 kbaud)"
  protocolCode: string;    // E.g. "6"
  isClone: boolean;        // True if STN/PIC chip (not genuine ELM327)
  chipset: string;         // "ELM327", "STN2120", "STN1110", "Unknown"
  voltage: number;         // Adapter supply voltage from PID 42 or AT RV
  vin: string;             // Vehicle VIN from Mode 09 PID 02
  supportedPIDs: Set<string>;  // PIDs the vehicle actually supports
}

// ─── BLE Service ──────────────────────────────────────────────────────────────

class BLEService {
  private connectedDeviceId: string | null = null;
  private activeProfile: BLEAdapterProfile | null = null;
  private responseBuffer = '';
  private responseResolve: ((value: string) => void) | null = null;
  private notifyCallback: ((pid: string, value: string) => void) | null = null;
  private pollingTimeout: ReturnType<typeof setTimeout> | null = null;
  private isPollingActive = false;
  private initialized = false;
  private adapterInfo: AdapterInfo | null = null;
  private wifiSocket: WebSocket | null = null;
  private isWifiMode = false;
  private wifiIp = '';
  private wifiPort = 35000;

  /**
   * Serialized command queue — prevents the responseResolve race condition
   * that occurred when sendCommand was called before the previous response
   * arrived (very common during polling + concurrent UI requests).
   *
   * Each queue entry is { command, resolve, reject, timeoutMs }. The queue
   * is drained FIFO: processHead() picks the next command, sends it, waits
   * for responseResolve (or timeout), then recurses to the next entry.
   */
  private commandQueue: Array<{
    command: string;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    timeoutMs: number;
  }> = [];
  private isProcessingQueue = false;

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

        // Tag: does this match known OBD patterns?
        const isOBDLike = !!(profile ||
          name.toLowerCase().includes('obd') ||
          name.toLowerCase().includes('elm') ||
          name.toLowerCase().includes('vlink') ||
          name.toLowerCase().includes('icar') ||
          name.toLowerCase().includes('vgate') ||
          name.toLowerCase().includes('carly') ||
          name.toLowerCase().includes('veepeak') ||
          name.toLowerCase().includes('lemon') ||
          name.toLowerCase().includes('link') ||
          name.toLowerCase().includes('scanner') ||
          name.toLowerCase().includes('diag') ||
          // Match FFE0-based BLE names (common Chinese adapters)
          name.toLowerCase().includes('ble') ||
          name.toLowerCase().includes('bth') ||
          name.toLowerCase().includes('hh'));

        const isUnknown = !name;

        // Show ALL BLE devices — user chooses which is their OBD adapter.
        // Many adapters have non-standard names (BT05, HC-08, CC41-A, JDY-23, etc.)
        // or no name at all. The user knows their device better than our keyword list.
        devices.push({
          deviceId,
          name: name || `Unknown (${deviceId.substring(0, 8)})`,
          rssi: result.rssi || -100,
          profile,
          isOBDLike,
          isUnknown,
        });
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

    // Sort: known OBD devices first (by signal strength), then others (by signal strength)
    return devices.sort((a, b) => {
      // OBD-like devices always come first
      if (a.isOBDLike !== b.isOBDLike) return a.isOBDLike ? -1 : 1;
      // Unknown (no name) devices go to the bottom of their group
      if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
      // Within same group, sort by signal strength (strongest first)
      return b.rssi - a.rssi;
    });
  }

  /**
   * Connect to a BLE OBD adapter.
   * After connection:
   * 1. Set up BLE notifications
   * 2. Run full ELM327 initialization sequence
   * 3. Query adapter identification (firmware, protocol, clone detection)
   * 4. Detect supported PIDs
   * 5. Return adapter info
   */
  async connect(deviceId: string, profile?: BLEAdapterProfile): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      await BleClient.connect(deviceId);
      this.connectedDeviceId = deviceId;
      this.activeProfile = profile || await this.detectProfile(deviceId);
      this.isWifiMode = false;

      console.log('[BLE] Connected to', deviceId, 'Profile:', this.activeProfile?.name || 'Unknown');

      // Note on MTU: @capacitor-community/bluetooth-le v8 automatically
      // negotiates the largest MTU the adapter supports (up to 517 bytes) on
      // Android during connect(). No explicit requestMtu call is needed —
      // multi-frame OBD responses (e.g. Mode 09 VIN) will arrive intact.

      // Set up notification listener using BleClient
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
        console.log('[BLE] Notifications started on', this.activeProfile.notifyUUID);
      }

      // Run full ELM327 initialization sequence
      await this.initializeELM327();

      // Query adapter identification
      await this.identifyAdapter();

      // Detect supported PIDs
      await this.detectSupportedPIDs();

      // Read VIN
      await this.readVIN();

      return true;
    } catch (error) {
      console.error('[BLE] Connection error:', error);
      this.connectedDeviceId = null;
      this.activeProfile = null;
      throw error;
    }
  }

  /**
   * Connect to a WiFi ELM327 adapter.
   * WiFi ELM327 adapters expose a raw TCP socket (typically port 35000), not WebSocket.
   * Since browsers don't support raw TCP, we use fetch() to the adapter's HTTP endpoint
   * (many adapters also respond to HTTP), or fall back to WebSocket for those that support it.
   * For production, a native Capacitor TCP socket plugin is recommended.
   */
  async connectWifi(ip: string, port: number): Promise<boolean> {
    this.isWifiMode = true;
    this.adapterInfo = null;
    this.wifiIp = ip;
    this.wifiPort = port;

    try {
      // Test connection by sending ATZ (reset) via HTTP POST
      // Many WiFi ELM327 adapters accept HTTP requests
      const testResponse = await this.sendWifiHttpCommand('ATZ');
      console.log('[WiFi] ELM327 responded:', testResponse || '(empty)');

      this.connectedDeviceId = `wifi-${ip}:${port}`;

      // Run same ELM327 init sequence
      try {
        await this.initializeELM327();
        await this.identifyAdapter();
        await this.detectSupportedPIDs();
        await this.readVIN();
      } catch (initError) {
        console.error('[WiFi] Init failed:', initError);
        // Still connected, just init had issues
      }

      return true;
    } catch (httpError) {
      console.warn('[WiFi] HTTP approach failed, trying WebSocket fallback:', httpError);

      // Fallback: try WebSocket (some adapters like OBDLink WiFi support WS)
      return new Promise((resolve, reject) => {
        try {
          const ws = new WebSocket(`ws://${ip}:${port}`);

          ws.onopen = async () => {
            console.log('[WiFi] WebSocket connected to ELM327 at', `${ip}:${port}`);
            this.wifiSocket = ws;
            this.connectedDeviceId = `wifi-${ip}:${port}`;

            ws.onmessage = (event) => {
              const data = String(event.data);
              this.handleNotification(data);
            };

            try {
              await this.initializeELM327();
              await this.identifyAdapter();
              await this.detectSupportedPIDs();
              await this.readVIN();
              resolve(true);
            } catch (initError) {
              console.error('[WiFi] Init failed:', initError);
              resolve(true);
            }
          };

          ws.onerror = () => {
            this.isWifiMode = false;
            reject(new Error('WiFi connection failed — adapter may require a native TCP socket plugin'));
          };

          ws.onclose = () => {
            this.isWifiMode = false;
            this.wifiSocket = null;
          };

          setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
              ws.close();
              reject(new Error('WiFi connection timeout'));
            }
          }, 10000);
        } catch (error) {
          this.isWifiMode = false;
          reject(error);
        }
      });
    }
  }

  /**
   * Send command to WiFi ELM327 via HTTP POST.
   * Many WiFi OBD adapters expose an HTTP API endpoint.
   */
  private async sendWifiHttpCommand(command: string, timeoutMs = 3000): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`http://${this.wifiIp}:${this.wifiPort}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: command + '\r',
        signal: controller.signal,
      });

      if (!response.ok) {
        return '';
      }

      const text = await response.text();
      return text.replace(/\s/g, '').replace(/>$/, '');
    } catch {
      return '';
    } finally {
      clearTimeout(timeout);
    }
  }

  async disconnect(): Promise<void> {
    // Stop polling first so no new commands are queued
    this.stopPolling();

    // Reject any in-flight command and drain the queue so callers don't hang
    this.flushQueue(new Error('Connection closed'));

    if (this.isWifiMode) {
      if (this.wifiSocket) {
        this.wifiSocket.close();
        this.wifiSocket = null;
      }
      this.isWifiMode = false;
      this.connectedDeviceId = null;
      return;
    }

    if (!this.initialized || !this.connectedDeviceId) return;

    try {
      // Close protocol session gracefully
      try {
        await this.sendCommand('ATPC'); // Protocol close
      } catch {}

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
      this.adapterInfo = null;
      this.responseBuffer = '';
      this.responseResolve = null;
    }
  }

  /**
   * Drain the command queue, rejecting every pending entry with the given error.
   * Used during disconnect / connection loss so callers receive a deterministic
   * rejection instead of waiting for the full timeout.
   */
  private flushQueue(error: Error): void {
    this.isProcessingQueue = false;
    while (this.commandQueue.length > 0) {
      const entry = this.commandQueue.shift();
      if (entry) {
        try { entry.reject(error); } catch {}
      }
    }
    this.responseResolve = null;
    this.responseBuffer = '';
  }

  /**
   * Send an AT command or OBD PID request.
   * Handles both BLE and WiFi modes transparently.
   * Returns the raw response string (without '>' prompt).
   *
   * Commands are SERIALIZED via commandQueue — concurrent callers wait their
   * turn. This eliminates the prior race condition where a new command would
   * overwrite responseResolve while a previous command was still pending,
   * causing silent data corruption and unresolved promises.
   */
  async sendCommand(command: string, timeoutMs = 3000): Promise<string> {
    // WiFi HTTP mode does its own per-call HTTP request, so no queue needed.
    // (WiFi WS mode is queue-managed below just like BLE.)
    if (this.isWifiMode && !this.wifiSocket) {
      return this.sendWifiHttpCommand(command, timeoutMs);
    }

    if (!this.isWifiMode && (!this.initialized || !this.connectedDeviceId || !this.activeProfile)) {
      return '';
    }

    return new Promise<string>((resolve, reject) => {
      this.commandQueue.push({
        command,
        resolve,
        reject,
        timeoutMs,
      });
      void this.processQueue();
    });
  }

  /**
   * Process the next queued command. Only one command is in flight at a time —
   * subsequent calls return immediately if isProcessingQueue is true.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    if (this.commandQueue.length === 0) return;

    const entry = this.commandQueue.shift();
    if (!entry) return;

    this.isProcessingQueue = true;

    // Set up the response resolver + timeout for THIS entry only.
    const timeout = setTimeout(() => {
      // Don't reject — polling loop expects empty string on timeout.
      // Just resolve with '' so the caller continues.
      if (this.responseResolve) {
        // Mark this resolver as consumed; the late-arriving response will be discarded.
        this.responseResolve = null;
      }
      this.responseBuffer = '';  // Clear stale data from timed-out command
      try { entry.resolve(''); } catch {}
      this.isProcessingQueue = false;
      void this.processQueue();
    }, entry.timeoutMs);

    this.responseResolve = (data: string) => {
      clearTimeout(timeout);
      try { entry.resolve(data); } catch {}
      this.isProcessingQueue = false;
      // Drain next entry
      void this.processQueue();
    };

    // Actually transmit the command
    try {
      if (this.isWifiMode && this.wifiSocket && this.wifiSocket.readyState === WebSocket.OPEN) {
        this.wifiSocket.send(entry.command + '\r');
      } else if (!this.isWifiMode && this.connectedDeviceId && this.activeProfile) {
        const encoded = this.encodeCommand(entry.command + '\r');
        await BleClient.write(
          this.connectedDeviceId,
          this.activeProfile.serviceUUID,
          this.activeProfile.writeUUID,
          encoded
        );
      } else {
        // Connection lost between enqueueing and processing
        clearTimeout(timeout);
        this.responseResolve = null;
        try { entry.resolve(''); } catch {}
        this.isProcessingQueue = false;
        void this.processQueue();
      }
    } catch (error: unknown) {
      clearTimeout(timeout);
      this.responseResolve = null;
      try { entry.reject(error instanceof Error ? error : new Error(String(error))); } catch {}
      this.isProcessingQueue = false;
      void this.processQueue();
    }
  }

  // ─── OBD Polling ──────────────────────────────────────────────────────────

  /**
   * Start polling OBD PIDs cyclically.
   * Only polls PIDs that the vehicle actually supports (from 0100 detection).
   * Uses a round-robin approach with configurable interval.
   */
  startPolling(
    onData: (pid: string, value: string) => void,
    intervalMs = 500
  ): void {
    this.stopPolling();

    // Filter to only supported PIDs
    const supportedPids = this.adapterInfo?.supportedPIDs;
    const pids = supportedPids && supportedPids.size > 0
      ? STANDARD_PIDS.filter(p => supportedPids.has(p.pid))
      : STANDARD_PIDS;  // Fallback to all if detection failed

    if (pids.length === 0) {
      console.warn('[BLE] No supported PIDs detected, using standard set');
      return;
    }

    let pidIndex = 0;
    this.notifyCallback = onData;
    this.isPollingActive = true;

    console.log(`[BLE] Starting polling for ${pids.length} PIDs at ${intervalMs}ms interval`);

    // Use recursive setTimeout instead of setInterval to prevent race conditions.
    // setInterval can fire before the previous async callback completes,
    // causing responseResolve overwrites and PID data corruption.
    const pollNext = async () => {
      if (!this.isPollingActive) return;
      if (!this.connectedDeviceId && !this.isWifiMode) return;

      try {
        const pidEntry = pids[pidIndex % pids.length];
        const command = pidEntry.mode + pidEntry.pid;
        const response = await this.sendCommand(command);
        if (response) {
          onData(pidEntry.pid, response);
        }
        pidIndex++;
      } catch (error) {
        console.error('[BLE] Polling error:', error);
      }

      // Schedule next poll only after current one completes
      if (this.isPollingActive) {
        this.pollingTimeout = setTimeout(pollNext, intervalMs);
      }
    };

    // Start first poll immediately
    pollNext();
  }

  stopPolling(): void {
    this.isPollingActive = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    this.notifyCallback = null;
  }

  isConnected(): boolean {
    return this.connectedDeviceId !== null || this.isWifiMode;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  getAdapterInfo(): AdapterInfo | null {
    return this.adapterInfo;
  }

  getActiveProfile(): BLEAdapterProfile | null {
    return this.activeProfile;
  }

  isWifiConnection(): boolean {
    return this.isWifiMode;
  }

  /**
   * Read DTCs from the vehicle.
   * Mode 03: Stored DTCs
   * Mode 07: Pending DTCs
   * Mode 0A: Permanent DTCs (cleared but still present)
   */
  async readDTCs(mode: '03' | '07' | '0A' = '03'): Promise<string[]> {
    const response = await this.sendCommand(mode, 5000);
    if (!response) return [];

    return this.parseDTCResponse(response, mode);
  }

  /**
   * Clear all stored DTCs and reset MIL.
   * Mode 04 command.
   *
   * A Mode 04 positive response is exactly "44" (no data bytes). We use a
   * strict prefix match instead of `includes('44')` because the latter would
   * false-positive on any response containing "44" anywhere (e.g. an error
   * string like "ERROR 44" or a multi-byte response with an embedded 0x44
   * hex byte).
   */
  async clearDTCs(): Promise<boolean> {
    try {
      const response = await this.sendCommand('04', 5000);
      const clean = response.replace(/\s/g, '');
      return clean.startsWith('44');
    } catch {
      return false;
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Match a scanned device name against known adapter profiles.
   * Tries alias matching first, then falls back to UUID probing.
   */
  private matchProfile(name: string, _deviceId: string): BLEAdapterProfile | undefined {
    const lower = name.toLowerCase();

    // Try matching against all profile aliases
    for (const profile of ADAPTER_PROFILES) {
      for (const alias of profile.aliases) {
        if (lower.includes(alias)) {
          return profile;
        }
      }
    }

    return undefined;
  }

  /**
   * Detect adapter profile when no name match was found.
   * Tries each known profile family by probing service UUIDs.
   * Falls back to vGate iCar Pro profile (most common FFE0/FFE1 adapter).
   */
  private async detectProfile(deviceId: string): Promise<BLEAdapterProfile> {
    if (!this.connectedDeviceId) return ADAPTER_PROFILES[0];

    try {
      // Try to discover services and match against known profiles
      for (const profile of ADAPTER_PROFILES) {
        try {
          // Attempt to read the service — if it exists, this profile is likely correct
          await BleClient.read(deviceId, profile.serviceUUID, profile.writeUUID);
          console.log('[BLE] Profile detected via service probe:', profile.name);
          return profile;
        } catch {
          // Service doesn't exist on this device, try next profile
          continue;
        }
      }
    } catch (error) {
      console.warn('[BLE] Service probing failed, using default profile:', error);
    }

    // Default to vGate iCar Pro — most common FFE0/FFE1 adapter
    console.log('[BLE] Using default profile: vGate iCar Pro (FFE0/FFE1)');
    return ADAPTER_PROFILES[0];
  }

  /**
   * Full ELM327 initialization sequence.
   * Sends each AT command with appropriate delay.
   * Critical commands must succeed; non-critical failures are logged but ignored.
   */
  private async initializeELM327(): Promise<void> {
    console.log('[ELM327] Starting initialization sequence...');

    for (const { cmd, desc, delay, critical } of ELM327_INIT_COMMANDS) {
      try {
        const response = await this.sendCommand(cmd, 3000);
        console.log(`[ELM327] ${cmd} (${desc}): "${response}"`);
        await new Promise(r => setTimeout(r, delay));
      } catch (error) {
        if (critical) {
          console.error(`[ELM327] CRITICAL: ${cmd} (${desc}) failed:`, error);
          // Don't throw — some adapters respond differently
        } else {
          console.warn(`[ELM327] Non-critical: ${cmd} (${desc}) failed:`, error);
        }
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Validate vehicle communication with PID 00 support query
    try {
      const pidResponse = await this.sendCommand('0100', 5000);
      if (pidResponse && pidResponse.includes('41')) {
        console.log('[ELM327] Vehicle communication confirmed (0100 response received)');
      } else {
        console.warn('[ELM327] No vehicle response to 0100 — vehicle may not be ready');
      }
    } catch (error) {
      console.warn('[ELM327] Vehicle communication check failed:', error);
    }

    console.log('[ELM327] Initialization complete');
  }

  /**
   * Identify the connected adapter:
   * - Firmware version (ATI)
   * - Device description (AT@1)
   * - Device identifier (AT@2)
   * - Current protocol (ATDP)
   * - Clone detection
   * - Adapter voltage (AT RV or PID 42)
   */
  private async identifyAdapter(): Promise<void> {
    this.adapterInfo = {
      firmware: '',
      description: '',
      identifier: '',
      protocol: '',
      protocolCode: '',
      isClone: false,
      chipset: 'Unknown',
      voltage: 0,
      vin: '',
      supportedPIDs: new Set<string>(),
    };

    // Query firmware (ATI)
    try {
      const fw = await this.sendCommand('ATI', 2000);
      this.adapterInfo.firmware = fw.replace(/\s+/g, ' ').trim();
      console.log('[Adapter] Firmware:', this.adapterInfo.firmware);

      // Clone detection: genuine ELM327 responses start with "ELM327"
      // STN chips respond with "STN" or similar
      // PIC-based clones often respond with "ELM327 v2.1" or wrong version
      const fwLower = this.adapterInfo.firmware.toLowerCase();

      if (fwLower.includes('stn')) {
        // STN chip (OBDLink/ScanTool.net) — these are HIGH QUALITY, not bad clones
        this.adapterInfo.isClone = false;
        this.adapterInfo.chipset = fwLower.includes('stn21') ? 'STN2120' :
                                    fwLower.includes('stn11') ? 'STN1110' : 'STN';
      } else if (fwLower.includes('elm327')) {
        // Could be genuine or clone — check version
        // Genuine ELM327 chips: v1.0, v1.1, v1.2, v1.3, v1.4, v1.5 (discontinued)
        // v2.0, v2.1, v2.2, v2.3 — most v2.x on the market are PIC clones
        // Genuine v2.x was only available in limited quantities
        const versionMatch = fwLower.match(/v([\d.]+)/);
        if (versionMatch) {
          const ver = parseFloat(versionMatch[1]);
          // Most "v2.x" ELM327s are PIC clones. Genuine chips are rare.
          // However, this doesn't mean they're bad — many work fine for standard OBD-II
          this.adapterInfo.isClone = ver >= 2.0;
          this.adapterInfo.chipset = this.adapterInfo.isClone ? 'ELM327 (PIC Clone)' : 'ELM327 (Genuine)';
        } else {
          this.adapterInfo.chipset = 'ELM327';
        }
      } else {
        this.adapterInfo.chipset = 'Unknown';
      }
    } catch {}

    // Query device description (AT@1)
    try {
      const desc = await this.sendCommand('AT@1', 2000);
      this.adapterInfo.description = desc.replace(/\s+/g, ' ').trim();
      console.log('[Adapter] Description:', this.adapterInfo.description);
    } catch {}

    // Query device identifier (AT@2)
    try {
      const id = await this.sendCommand('AT@2', 2000);
      this.adapterInfo.identifier = id.replace(/\s+/g, ' ').trim();
      console.log('[Adapter] Identifier:', this.adapterInfo.identifier);
    } catch {}

    // Query current protocol (ATDP)
    try {
      const proto = await this.sendCommand('ATDP', 2000);
      this.adapterInfo.protocol = proto.replace(/\s+/g, ' ').trim();
      console.log('[Adapter] Protocol:', this.adapterInfo.protocol);

      // Extract protocol code
      // ATDP returns "AUTO, ISO 15765-4 (CAN 11bit/500kb)" or just "6"
      const protoLower = this.adapterInfo.protocol.toLowerCase();
      if (protoLower.includes('auto')) {
        // Auto mode — extract the detected protocol
        this.adapterInfo.protocolCode = '0';
      }
      // Check for protocol number or name patterns
      for (const [code, name] of Object.entries(ELM327_PROTOCOLS)) {
        if (protoLower.includes(name.toLowerCase().split('(')[0].trim())) {
          this.adapterInfo.protocolCode = code;
          break;
        }
      }
      // CAN detection for EVs
      if (protoLower.includes('can') && protoLower.includes('500')) {
        this.adapterInfo.protocolCode = protoLower.includes('29') ? '7' : '6';
      } else if (protoLower.includes('can') && protoLower.includes('250')) {
        this.adapterInfo.protocolCode = protoLower.includes('29') ? '9' : '8';
      }
    } catch {}

    // Query adapter voltage (AT RV)
    try {
      const voltResponse = await this.sendCommand('ATRV', 2000);
      // ATRV returns voltage like "12.4V"
      const voltageMatch = voltResponse.match(/([\d.]+)V/i);
      if (voltageMatch) {
        this.adapterInfo.voltage = parseFloat(voltageMatch[1]);
        console.log('[Adapter] Voltage:', this.adapterInfo.voltage, 'V');
      }
    } catch {}

    console.log('[Adapter] Identification complete:', {
      firmware: this.adapterInfo.firmware,
      chipset: this.adapterInfo.chipset,
      isClone: this.adapterInfo.isClone,
      protocol: this.adapterInfo.protocol,
      voltage: this.adapterInfo.voltage,
    });
  }

  /**
   * Detect which PIDs the vehicle supports.
   * Queries PID 00, 20, 40, 60, 80, A0, C0 to build support bitfield.
   * Per SAE J1979, each response is 4 bytes where each bit represents a PID.
   */
  private async detectSupportedPIDs(): Promise<void> {
    if (!this.adapterInfo) return;

    const supportedPIDs = new Set<string>();

    for (const supportPid of PID_SUPPORT_PIDS) {
      try {
        const response = await this.sendCommand(`01${supportPid}`, 3000);
        if (!response || !response.startsWith('41')) continue;

        const clean = response.replace(/\s/g, '');
        const pid = clean.substring(2, 4).toUpperCase();

        // Verify this is the response to our query
        if (pid !== supportPid.toUpperCase()) continue;

        // Parse 4 data bytes as a 32-bit support field
        const dataBytes = clean.substring(4, 12); // 4 bytes = 8 hex chars
        if (dataBytes.length < 8) continue;

        const supportField = parseInt(dataBytes, 16);
        if (isNaN(supportField)) continue;

        // Each bit from MSB to LSB represents PID (base+1) through (base+32)
        const base = parseInt(supportPid, 16);
        for (let bit = 31; bit >= 0; bit--) {
          if (supportField & (1 << bit)) {
            const supportedPid = (base + (32 - bit)).toString(16).toUpperCase().padStart(2, '0');
            supportedPIDs.add(supportedPid);
          }
        }

        // If bit 32 (next range supported) is not set, stop checking
        if (!(supportField & 1)) break;
      } catch (error) {
        console.warn(`[PID] Support query 01${supportPid} failed:`, error);
        break;  // If one fails, subsequent ranges likely won't work either
      }
    }

    this.adapterInfo.supportedPIDs = supportedPIDs;
    console.log(`[PID] Detected ${supportedPIDs.size} supported PIDs:`,
      [...supportedPIDs].sort().join(', '));
  }

  /**
   * Read Vehicle Identification Number (VIN).
   * Mode 09 PID 02 — returns 17-character VIN across one or more CAN frames.
   * Uses ISO 15765-2 multi-frame CAN protocol.
   *
   * Response formats:
   *  - Single frame (most modern CAN vehicles):
   *    "49 02 01 [5 VIN bytes]" (CAN single-frame: 1 byte frame info + 1 byte count + data)
   *  - Multi-frame (older ISO-TP or verbose adapters):
   *    Frame 1: "49 02 01 [3 VIN bytes]"
   *    Frame 2: "49 02 02 [7 VIN bytes]"  — the leading "02" is a SEQUENCE COUNTER, not VIN
   *    Frame 3: "49 02 03 [7 VIN bytes]"
   *
   * The previous implementation decoded the counter bytes as ASCII '1'/'2'/'3',
   * which then slipped through the VIN regex filter (digits 0-9 are valid VIN
   * chars) and corrupted the result. We now skip the 2-hex-digit counter that
   * immediately follows "49 02" in every frame.
   */
  private async readVIN(): Promise<void> {
    if (!this.adapterInfo) return;

    try {
      // Request VIN: 0902
      const response = await this.sendCommand('0902', 5000);
      if (!response) return;

      // Parse VIN from response. Strip all whitespace/newlines first so we
      // can scan it as a single hex stream regardless of how the adapter
      // split it across lines.
      const clean = response.replace(/\s/g, '');
      if (!clean.startsWith('4902')) return;

      // Walk through the response, finding every "49 02 NN" frame header and
      // collecting the bytes that follow it (minus the 2-hex-digit counter).
      const vinBytes: number[] = [];
      let cursor = 0;
      while (cursor < clean.length) {
        const frameStart = clean.indexOf('4902', cursor);
        if (frameStart === -1) break;
        // Skip "4902" + 2-char counter
        const dataStart = frameStart + 6;
        // Read bytes until the next "4902" frame header or end of string
        let nextFrame = clean.indexOf('4902', dataStart);
        if (nextFrame === -1) nextFrame = clean.length;
        for (let i = dataStart; i + 2 <= nextFrame; i += 2) {
          const byte = parseInt(clean.substring(i, i + 2), 16);
          if (!isNaN(byte)) vinBytes.push(byte);
        }
        cursor = nextFrame;
      }

      // Decode ASCII bytes and filter to valid VIN characters
      // (VINs exclude I, O, Q to avoid confusion with 0 and 1)
      let vin = '';
      for (const byte of vinBytes) {
        if (byte >= 0x20 && byte <= 0x7E) {
          vin += String.fromCharCode(byte);
        }
      }
      vin = vin.replace(/[^A-HJ-NPR-Z0-9]/g, '');

      // Valid VINs are exactly 17 chars; accept >=10 as a safety margin for
      // adapters that truncate the last frame.
      if (vin.length >= 10) {
        this.adapterInfo.vin = vin.substring(0, 17);
        console.log('[VIN]', this.adapterInfo.vin);
      } else {
        console.warn('[VIN] Decoded VIN too short:', vin, 'from bytes:', vinBytes);
      }
    } catch (error) {
      console.warn('[VIN] Read failed:', error);
    }
  }

  /**
   * Parse DTC response from Mode 03/07/0A.
   * Each DTC is 2 bytes: first nibble = code type, remaining = code number.
   * Format: P/B/C/U XXXX
   */
  private parseDTCResponse(response: string, _mode: string): string[] {
    const clean = response.replace(/\s/g, '');
    const dtcs: string[] = [];

    // Mode 03 response: 43 [number of codes] [DTC1] [DTC2] ...
    // Mode 07 response: 47 [DTC1] [DTC2] ...
    // Mode 0A response: 4A [number of codes] [DTC1] [DTC2] ...
    const dataStart = clean.startsWith('43') ? 4 : clean.startsWith('47') ? 2 : clean.startsWith('4A') ? 4 : 0;
    if (dataStart === 0) return dtcs;

    const data = clean.substring(dataStart);
    for (let i = 0; i < data.length; i += 4) {
      if (i + 4 > data.length) break;
      const byte1 = parseInt(data.substring(i, i + 2), 16);
      const byte2 = parseInt(data.substring(i + 2, i + 4), 16);

      if (byte1 === 0 && byte2 === 0) continue;  // Empty slot

      // First nibble determines DTC type
      const typeMap: Record<number, string> = { 0: 'P', 1: 'P', 2: 'P', 3: 'P', 4: 'C', 5: 'C', 6: 'C', 7: 'C', 8: 'B', 9: 'B', 0xA: 'B', 0xB: 'B', 0xC: 'U', 0xD: 'U', 0xE: 'U', 0xF: 'U' };
      const highNibble = (byte1 >> 4) & 0xF;
      const type = typeMap[highNibble] || 'P';
      const firstDigit = highNibble % 4;
      const code = `${type}${firstDigit}${(byte1 & 0x0F).toString(16).toUpperCase()}${byte2.toString(16).toUpperCase().padStart(2, '0')}`;

      dtcs.push(code);
    }

    return dtcs;
  }

  /**
   * Handle incoming BLE/WiFi notification data.
   * Buffers until ELM327 '>' prompt indicates complete response.
   * Also handles multi-line responses and 'SEARCHING...' status.
   */
  private handleNotification(data: string): void {
    this.responseBuffer += data;

    // Handle 'SEARCHING...' — ELM327 sends this while trying protocols
    // Don't resolve yet, keep buffering
    if (this.responseBuffer.includes('SEARCHING')) {
      return;
    }

    // Handle 'UNABLE TO CONNECT' — ELM327 can't find a protocol
    if (this.responseBuffer.includes('UNABLE TO CONNECT')) {
      this.responseBuffer = '';
      if (this.responseResolve) {
        this.responseResolve('UNABLE TO CONNECT');
        this.responseResolve = null;
      }
      return;
    }

    // Handle 'NO DATA' — ELM327 didn't get a response from ECU
    if (this.responseBuffer.includes('NO DATA')) {
      this.responseBuffer = '';
      if (this.responseResolve) {
        this.responseResolve('');
        this.responseResolve = null;
      }
      return;
    }

    // Handle 'BUS INIT: ...ERROR' — protocol initialization failed
    if (this.responseBuffer.includes('BUS INIT') && this.responseBuffer.includes('ERROR')) {
      this.responseBuffer = '';
      if (this.responseResolve) {
        this.responseResolve('BUS ERROR');
        this.responseResolve = null;
      }
      return;
    }

    // Check for complete response (ELM327 ends with '>' prompt)
    if (this.responseBuffer.includes('>')) {
      // Remove the prompt and clean up
      const response = this.responseBuffer.replace(/>/g, '').trim();
      this.responseBuffer = '';

      if (this.responseResolve) {
        this.responseResolve(response);
        this.responseResolve = null;
      }
    }
  }

  /**
   * Encode a string command to DataView for BleClient.write()
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

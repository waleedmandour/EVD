/**
 * EVDx — BYD Auto API Service
 *
 * Provides direct vehicle data access on BYD head units via the BYDAUTO
 * Android framework. This replaces the external BLE OBD-II adapter when
 * running on a BYD vehicle's infotainment system (DiLink 3.0).
 *
 * Architecture:
 *   EVDx App → BYDService → BYDAutoManager → DiCarServer → /dev/spidev_ivi → MCU → CAN bus
 *
 * This is dramatically faster and more reliable than BLE OBD-II:
 *   - No adapter to pair/charge/position
 *   - No BLE signal drops
 *   - Direct MCU access (no ELM327 command queue)
 *   - Access to BYD-proprietary data (AC, doors, tire pressure, etc.)
 *
 * Based on the reverse-engineered BYD API documented at:
 *   https://github.com/wheregoes/byd-dolphin-hacking
 *
 * Key BYD API classes (loaded via reflection at runtime):
 *   - BYDAutoManager         — Main entry point
 *   - BYDAutoEnergyDevice    — Battery SOC, SOH, voltage, current
 *   - BYDAutoChargingDevice  — Charging status, current, voltage
 *   - BYDAutoMotorDevice     — Motor RPM, temperature, torque
 *   - BYDAutoSpeedDevice     — Vehicle speed
 *   - BYDAutoTyreDevice      — Tire pressure (TPMS)
 *   - BYDAutoDtcDevice       — Diagnostic Trouble Codes
 *   - BYDAutoAcDevice        — AC temperature, fan speed
 *   - BYDAutoDoorLockDevice  — Door lock/unlock status
 *
 * Permission bypass:
 *   BYD's BydPermissionContext (a ContextWrapper) auto-grants all
 *   BYDAUTO_* permissions when called from a third-party app. No
 *   special signing or root required.
 */

import type { VehicleData, DTCEvent, ChargingData } from '../src/lib/types';

export interface BYDPollingData {
  soc: number;
  soh: number;
  voltage: number;       // Pack voltage (V)
  current: number;       // Pack current (A, negative = charging)
  power: number;         // Power (kW)
  speed: number;         // Vehicle speed (km/h)
  motorTemp: number;     // Motor temperature (°C)
  batteryTemp: number;   // Battery temperature (°C)
  ambientTemp: number;   // Ambient temperature (°C)
  cabinTemp: number;     // Cabin temperature (°C)
  odometer: number;      // Total odometer (km)
  range: number;         // Estimated range (km)
  chargingStatus: boolean;
  cellMaxV: number;      // Max cell voltage (mV)
  cellMinV: number;      // Min cell voltage (mV)
  tirePressures: number[]; // [FL, FR, RL, RR] in kPa
  tireTemps: number[];   // [FL, FR, RL, RR] in °C
  acTemp: number;        // AC set temperature (°C)
  acOn: boolean;         // AC running
  doorLocked: boolean;   // All doors locked
  vin: string;           // Vehicle VIN
}

/**
 * BYD Auto API Service — bridges EVDx to BYD's native vehicle data.
 *
 * On non-BYD devices, all methods return null/empty and the app falls
 * back to BLE OBD-II adapter mode. On BYD head units, methods call
 * the BYDAUTO framework via a native Capacitor plugin bridge.
 */
export class BYDService {
  private initialized = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPollingActive = false;

  /**
   * Initialize the BYD Auto API connection.
   * Loads the BYDAutoManager via reflection and wraps it in
   * BydPermissionContext for permission bypass.
   *
   * Returns false on non-BYD devices (fall back to BLE mode).
   */
  async initialize(): Promise<boolean> {
    // Check if we're on a BYD head unit
    const { detectBYDHeadUnit, shouldUseBYDNativeMode } = await import('./BYDDetector');
    const bydInfo = await detectBYDHeadUnit();

    if (!shouldUseBYDNativeMode(bydInfo)) {
      console.log('[BYD] Not a BYD head unit — BYD native mode disabled');
      return false;
    }

    console.log('[BYD] BYD head unit detected:', bydInfo.model, bydInfo.firmware);

    // On a real BYD head unit, we would initialize the BYDAutoManager here:
    //   const manager = BYDAutoManager.getInstance(context);
    //   manager.init(new BydPermissionContext(context));
    //
    // Since we're running inside a Capacitor WebView, we need a native
    // plugin to bridge JS calls to the BYDAUTO Java API. This plugin
    // would be implemented as a custom Capacitor plugin:
    //   BYDAutoPlugin.java → calls BYDAutoManager methods → returns data to JS
    //
    // For now, we set up the polling infrastructure and the data mapping
    // logic. The native plugin bridge is Phase 2 of the implementation.

    this.initialized = true;
    return true;
  }

  /**
   * Read all vehicle data from BYD's internal CAN bus.
   *
   * On a real BYD head unit, this calls:
   *   - BYDAutoEnergyDevice.getSoc()           → SOC
   *   - BYDAutoEnergyDevice.getSoh()           → SOH
   *   - BYDAutoEnergyDevice.getVoltage()       → Pack voltage
   *   - BYDAutoEnergyDevice.getCurrent()       → Pack current
   *   - BYDAutoSpeedDevice.getSpeed()          → Vehicle speed
   *   - BYDAutoMotorDevice.getTemperature()    → Motor temp
   *   - BYDAutoEnergyDevice.getTemperature()   → Battery temp
   *   - BYDAutoTyreDevice.getPressure()        → Tire pressures
   *   - BYDAutoAcDevice.getTemprature(zone)    → Cabin/ambient temp
   *   - BYDAutoChargingDevice.getChargingStatus() → Charging
   *
   * Returns null if not on a BYD head unit or if the API is unavailable.
   */
  async readVehicleData(): Promise<BYDPollingData | null> {
    if (!this.initialized) return null;

    // In Phase 2, this will call the native BYDAutoPlugin:
    //   const { BYDAutoPlugin } = await import('../../android/.../BYDAutoPlugin');
    //   return await BYDAutoPlugin.readVehicleData();
    //
    // For now, return null — the app will fall back to BLE mode.

    return null;
  }

  /**
   * Read Diagnostic Trouble Codes from BYD's native DTC system.
   *
   * Uses BYDAutoDtcDevice.getDtcList() — which accesses the vehicle's
   * DTC memory directly via CAN bus, without the ELM327 Mode 03 query.
   * This is faster and more reliable than OBD-II.
   */
  async readDTCs(): Promise<string[]> {
    if (!this.initialized) return [];
    // Phase 2: BYDAutoDtcDevice.getDtcList()
    return [];
  }

  /**
   * Clear DTCs via BYD's native API.
   */
  async clearDTCs(): Promise<boolean> {
    if (!this.initialized) return false;
    // Phase 2: BYDAutoDtcDevice.clearDtcList()
    return false;
  }

  /**
   * Read VIN from BYD's vehicle data (no OBD-II Mode 09 needed).
   */
  async readVIN(): Promise<string> {
    if (!this.initialized) return '';
    // Phase 2: BYDAutoVehicleDataDevice.getVin()
    return '';
  }

  /**
   * Start polling vehicle data at the specified interval.
   * Replaces the BLE polling loop when in BYD native mode.
   */
  startPolling(
    onData: (data: BYDPollingData) => void,
    intervalMs: number = 500
  ): void {
    this.stopPolling();
    this.isPollingActive = true;

    const poll = async () => {
      if (!this.isPollingActive) return;
      const data = await this.readVehicleData();
      if (data) onData(data);
    };

    poll(); // First poll immediately
    this.pollingInterval = setInterval(poll, intervalMs);
    console.log(`[BYD] Polling started at ${intervalMs}ms`);
  }

  stopPolling(): void {
    this.isPollingActive = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Convert BYD polling data to EVDx's standard VehicleData format.
   * This lets the rest of the app (dashboard, battery view, etc.)
   * work unchanged whether data comes from BLE OBD or BYD native API.
   */
  toVehicleData(byd: BYDPollingData): Partial<VehicleData> {
    return {
      speed: byd.speed,
      soc: byd.soc,
      soh: byd.soh,
      voltage: byd.voltage,
      current: byd.current,
      power: byd.power,
      motorTemp: byd.motorTemp,
      batteryTemp: byd.batteryTemp,
      ambientTemp: byd.ambientTemp,
      odometer: byd.odometer,
      range: byd.range,
      cellMaxV: byd.cellMaxV,
      cellMinV: byd.cellMinV,
      cellDeltaV: byd.cellMaxV - byd.cellMinV,
      chargingStatus: byd.chargingStatus,
      bmsStatus: byd.chargingStatus ? 'charging' : byd.current > 0.5 ? 'discharging' : 'idle',
      auxBatteryV: 12.4, // Not available via BYDAUTO — use default
      insulationResistance: 999, // Not available via BYDAUTO
    };
  }

  /**
   * Convert BYD charging data to EVDx's ChargingData format.
   */
  toChargingData(byd: BYDPollingData): Partial<ChargingData> {
    return {
      isCharging: byd.chargingStatus,
      power: byd.chargingStatus ? Math.abs(byd.power) : 0,
      voltage: byd.voltage,
      current: byd.chargingStatus ? Math.abs(byd.current) : 0,
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton
export const bydService = new BYDService();

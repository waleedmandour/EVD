/**
 * EVDx — BYD Auto API Service
 *
 * Provides direct vehicle data access on BYD head units via the BYDAUTO
 * Android framework. This replaces the external BLE OBD-II adapter when
 * running on a BYD vehicle's infotainment system (DiLink 3.0).
 *
 * Architecture:
 *   EVDx App → BYDService → BYDAutoPlugin (Capacitor) → BYDAutoManager → CAN bus
 *
 * Based on the reverse-engineered BYD API documented at:
 *   https://github.com/wheregoes/byd-dolphin-hacking
 */

import { Capacitor } from '@capacitor/core';
import type { VehicleData, ChargingData } from '../src/lib/types';
import type { BYDInfo } from './BYDDetector';

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
  // The native BYDAuto Capacitor plugin (registered in MainActivity.java)
  // Provides detect(), readVehicleData(), readDTCs(), clearDTCs(), readVIN()
  private bydPlugin: any = null;
  private bydInfo: BYDInfo | null = null;

  /**
   * Initialize the BYD Auto API connection.
   * Uses the native BYDAutoPlugin (registered in MainActivity.java) to
   * detect the BYD head unit and initialize BYDAutoManager via reflection.
   *
   * Returns false on non-BYD devices (fall back to BLE mode).
   */
  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[BYD] Not a native platform — BYD native mode disabled');
      return false;
    }

    try {
      // Register the BYDAuto plugin dynamically
      const { registerPlugin } = await import('@capacitor/core');
      const BYDAuto: any = registerPlugin('BYDAuto');

      // Call detect() — returns { isBYD, brand, model, firmware, androidVersion }
      const result: any = await BYDAuto.detect();

      if (!result.isBYD) {
        console.log('[BYD] Not a BYD head unit — BYD native mode disabled');
        return false;
      }

      console.log('[BYD] BYD head unit detected:', result.brand, result.model, result.firmware);
      this.bydInfo = {
        isBYD: true,
        model: `${result.brand} ${result.model}`,
        firmware: result.firmware || 'Unknown',
        androidVersion: result.androidVersion || 'Unknown',
        soc: '',
        hasDiLink: true,
      };
      this.bydPlugin = BYDAuto;
      this.initialized = true;

      // Eagerly fetch the VIN in the background so that readVehicleData()
      // doesn't have to make an extra round-trip on the first poll. This
      // also tolerates a missing VIN property on the BYD head unit — the
      // empty string falls through gracefully.
      this.bydPlugin.readVIN?.()
        .then((r: any) => {
          if (this.bydInfo && r?.vin) this.bydInfo.vin = r.vin;
        })
        .catch((e: any) => console.warn('[BYD] eager VIN read failed', e));

      return true;
    } catch (error) {
      console.warn('[BYD] BYDAuto plugin not available:', error);
      return false;
    }
  }

  /**
   * Read all vehicle data from BYD's internal CAN bus.
   * Calls the native BYDAutoPlugin.readVehicleData() which uses
   * reflection to access BYDAutoEnergyDevice, BYDAutoSpeedDevice,
   * BYDAutoChargingDevice, BYDAutoTyreDevice, BYDAutoAcDevice.
   */
  async readVehicleData(): Promise<BYDPollingData | null> {
    if (!this.initialized || !this.bydPlugin) return null;

    try {
      const result = await this.bydPlugin.readVehicleData();

      return {
        soc: result.soc ?? 0,
        soh: result.soh ?? 100,
        voltage: result.voltage ?? 0,
        current: result.current ?? 0,
        power: result.power ?? 0,
        speed: result.speed ?? 0,
        motorTemp: result.motorTemp ?? 0,
        batteryTemp: result.batteryTemp ?? 0,
        ambientTemp: result.ambientTemp ?? 25,
        cabinTemp: result.cabinTemp ?? 25,
        odometer: result.odometer ?? 0,
        range: result.range ?? 0,
        chargingStatus: result.chargingStatus ?? false,
        cellMaxV: result.cellMaxV ?? 3300,
        cellMinV: result.cellMinV ?? 3280,
        tirePressures: result.tirePressures ?
          [result.tirePressures.fl, result.tirePressures.fr, result.tirePressures.rl, result.tirePressures.rr] :
          [0, 0, 0, 0],
        tireTemps: [0, 0, 0, 0],
        acTemp: result.cabinTemp ?? 22,
        acOn: result.acOn ?? false,
        doorLocked: result.doorLocked ?? true,
        vin: this.bydInfo?.vin || result.vin || '',
      };
    } catch (error) {
      console.warn('[BYD] readVehicleData failed:', error);
      return null;
    }
  }

  /**
   * Read DTCs via BYD's native DTC system.
   */
  async readDTCs(): Promise<string[]> {
    if (!this.initialized || !this.bydPlugin) return [];
    try {
      const result = await this.bydPlugin.readDTCs();
      return result.dtcs || [];
    } catch (error) {
      console.warn('[BYD] readDTCs failed:', error);
      return [];
    }
  }

  /**
   * Clear DTCs via BYD's native API.
   */
  async clearDTCs(): Promise<boolean> {
    if (!this.initialized || !this.bydPlugin) return false;
    try {
      await this.bydPlugin.clearDTCs();
      return true;
    } catch (error) {
      console.warn('[BYD] clearDTCs failed:', error);
      return false;
    }
  }

  /**
   * Read VIN from BYD's vehicle data.
   */
  async readVIN(): Promise<string> {
    if (!this.initialized || !this.bydPlugin) return '';
    try {
      const result = await this.bydPlugin.readVIN();
      return result.vin || '';
    } catch (error) {
      console.warn('[BYD] readVIN failed:', error);
      return '';
    }
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

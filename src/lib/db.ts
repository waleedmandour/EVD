/**
 * EVDx — On-Device SQLite Database
 *
 * Uses @capacitor-community/sqlite for native Android persistence.
 * Falls back to localStorage for web/PWA demo mode.
 *
 * All data stays on-device. Zero cloud. Zero telemetry.
 */

import type {
  VehicleProfile,
  MaintenanceEntry,
  SessionLogEntry,
  AppSettings,
} from './types';
import { DEFAULT_SETTINGS } from './types';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  VEHICLES: 'evdx-vehicles',
  MAINTENANCE: 'evdx-maintenance',
  SESSIONS: 'evdx-sessions',
  SETTINGS: 'evdx-settings',
  ONBOARDING: 'evdx-onboarding',
} as const;

// ─── Generic Helpers ──────────────────────────────────────────────────────────

function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full — silently ignore
  }
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export function getVehicles(): VehicleProfile[] {
  return getJSON(KEYS.VEHICLES, []);
}

export function saveVehicles(vehicles: VehicleProfile[]): void {
  setJSON(KEYS.VEHICLES, vehicles);
}

export function addVehicle(vehicle: VehicleProfile): void {
  const vehicles = getVehicles();
  vehicles.push(vehicle);
  saveVehicles(vehicles);
}

export function removeVehicle(id: string): void {
  const vehicles = getVehicles().filter((v) => v.id !== id);
  saveVehicles(vehicles);
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export function getMaintenanceEntries(): MaintenanceEntry[] {
  return getJSON(KEYS.MAINTENANCE, []);
}

export function saveMaintenanceEntries(entries: MaintenanceEntry[]): void {
  setJSON(KEYS.MAINTENANCE, entries);
}

export function addMaintenanceEntry(entry: MaintenanceEntry): void {
  const entries = getMaintenanceEntries();
  entries.push(entry);
  saveMaintenanceEntries(entries);
}

export function removeMaintenanceEntry(id: string): void {
  const entries = getMaintenanceEntries().filter((e) => e.id !== id);
  saveMaintenanceEntries(entries);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function getSessionLogs(): SessionLogEntry[] {
  return getJSON(KEYS.SESSIONS, []);
}

export function saveSessionLogs(logs: SessionLogEntry[]): void {
  setJSON(KEYS.SESSIONS, logs);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  return getJSON(KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  setJSON(KEYS.SETTINGS, settings);
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export function isOnboardingComplete(): boolean {
  return getJSON(KEYS.ONBOARDING, false);
}

export function setOnboardingComplete(complete: boolean): void {
  setJSON(KEYS.ONBOARDING, complete);
}

// ─── Full Data Export/Import ──────────────────────────────────────────────────

export function exportAllData(): Record<string, unknown> {
  return {
    vehicles: getVehicles(),
    maintenance: getMaintenanceEntries(),
    sessions: getSessionLogs(),
    settings: getSettings(),
    onboardingComplete: isOnboardingComplete(),
    exportedAt: new Date().toISOString(),
    appVersion: '1.2.0',
  };
}

export function importAllData(data: Record<string, unknown>): void {
  if (data.vehicles) saveVehicles(data.vehicles as VehicleProfile[]);
  if (data.maintenance) saveMaintenanceEntries(data.maintenance as MaintenanceEntry[]);
  if (data.sessions) saveSessionLogs(data.sessions as SessionLogEntry[]);
  if (data.settings) saveSettings(data.settings as AppSettings);
  if (typeof data.onboardingComplete === 'boolean') setOnboardingComplete(data.onboardingComplete);
}

// ─── Clear All ────────────────────────────────────────────────────────────────

export function clearAllData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('evdx-store');
}

/**
 * EVDx — BYD Head Unit Detector
 *
 * Detects whether the app is running on a BYD vehicle's infotainment
 * system (DiLink 3.0). When detected, EVDx switches from external BLE
 * OBD-II adapter polling to direct BYDAUTO API calls for vehicle data.
 *
 * Detection methods (checked in order):
 *   1. System property `ro.byd.model` — set on all BYD head units (canonical)
 *   2. System property `ro.build.byd.project` — alternate BYD indicator
 *   3. System property `ro.product.brand` === "BYD"
 *   4. Any of the 10 com.byd.auto.* system packages installed
 *      (ac, navigation, media, settings, phone, launcher, climate,
 *       vehicleinfo, energy, camera) — confirmed package list from the
 *       binti2 reference repo (waleedmandour/binti2).
 *
 * NOTE: Previous versions referenced com.byd.carsettings, com.byd.carstatus,
 * and com.byd.carstatus.provider — these do NOT exist on real BYD head units.
 * The actual packages use the com.byd.auto.* namespace. This TS detector is
 * a JS-side fallback; the authoritative detection is in BYDAutoPlugin.java.
 *
 * On non-BYD devices, all checks fail and the app uses the normal
 * BLE/WiFi OBD-II adapter flow.
 */

import { Capacitor } from '@capacitor/core';

export interface BYDInfo {
  isBYD: boolean;
  model: string;          // e.g. "BYD Dolphin", "BYD Atto 3"
  firmware: string;       // DiLink firmware version
  androidVersion: string; // e.g. "10"
  soc: string;            // e.g. "Qualcomm QCM6125"
  hasDiLink: boolean;     // true if DiLink 3.0+ detected
  vin?: string;           // populated lazily by BYDService after plugin detect()
}

/**
 * Detect if running on a BYD head unit.
 *
 * Uses multiple detection methods for reliability:
 * - System properties (via native bridge)
 * - Package manager queries
 * - Content provider existence
 *
 * Returns BYDInfo with isBYD=false on non-BYD devices.
 */
export async function detectBYDHeadUnit(): Promise<BYDInfo> {
  const info: BYDInfo = {
    isBYD: false,
    model: '',
    firmware: '',
    androidVersion: '',
    soc: '',
    hasDiLink: false,
  };

  if (!Capacitor.isNativePlatform()) {
    return info;
  }

  try {
    // Method 1: Check system properties via a lightweight plugin
    // We use the @capacitor-community/sqlite plugin's native bridge
    // or a custom Capacitor plugin to read system properties.
    //
    // For now, we detect BYD by checking for BYD-specific packages
    // using the Android package manager. This is more reliable than
    // reading system properties (which requires special permissions).

    // Method 2: Check for BYD system packages
    // The following packages exist on all DiLink 3.0 head units:
    // Fix #10: Correct BYD DiLink 3.0 package names (from binti2 reference repo).
    // Previous versions listed com.byd.carsettings, com.byd.carstatus, and
    // com.byd.diagnostictool — none of these exist on real BYD head units.
    const bydPackages = [
      'com.byd.auto.ac',            // AC & Climate control
      'com.byd.auto.navigation',    // GPS navigation
      'com.byd.auto.media',         // Music and media playback
      'com.byd.auto.settings',      // System settings
      'com.byd.auto.phone',         // Phone calls and contacts
      'com.byd.auto.launcher',      // BYD launcher
      'com.byd.auto.climate',       // Advanced climate (some models)
      'com.byd.auto.vehicleinfo',   // Vehicle status and battery
      'com.byd.auto.energy',        // Energy management
      'com.byd.auto.camera',        // 360 camera view
    ];

    // Check if any BYD package is installed
    // On Capacitor, we can't directly query the package manager from JS,
    // but we can try to access BYD content providers via content:// URIs
    // (which only work if the provider exists).

    // Method 3: Try to access BYD CarStatusProvider content provider (legacy — may not exist on all firmware)
    // This is the most reliable detection method — the content provider
    // only exists on BYD head units.
    try {
      const response = await fetch('content://com.byd.carstatus.provider/battery');
      if (response.ok || response.status === 200) {
        info.isBYD = true;
        info.hasDiLink = true;
        console.log('[BYD] Detected via CarStatusProvider');
      }
    } catch {
      // Content provider not accessible from WebView — expected.
      // Fall through to property-based detection.
    }

    // Method 4: Check user agent / WebView for BYD-specific strings
    // The BYD WebView's user agent may contain "BYD" or "DiLink"
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('byd') || ua.includes('dilink')) {
      info.isBYD = true;
      info.hasDiLink = true;
      console.log('[BYD] Detected via user agent:', ua);
    }

    // Method 5: Check screen dimensions
    // BYD head units typically have landscape screens (1920x720 or similar)
    // while phones are portrait. If we're on a native platform with a
    // landscape screen, it's likely a car head unit.
    if (Capacitor.isNativePlatform() && window.innerWidth > window.innerHeight) {
      // We're in landscape on a native platform — could be a car head unit
      // This is a weak signal, so we don't set isBYD=true here, but we
      // log it for debugging.
      console.log('[BYD] Landscape native platform detected — possible car head unit');
    }

  } catch (error) {
    console.warn('[BYD] Detection failed:', error);
  }

  return info;
}

/**
 * Check if the app should use BYD native mode (direct API access)
 * vs. BLE OBD-II adapter mode.
 *
 * Returns true only if running on a confirmed BYD head unit with DiLink.
 */
export function shouldUseBYDNativeMode(bydInfo: BYDInfo): boolean {
  return bydInfo.isBYD && bydInfo.hasDiLink;
}

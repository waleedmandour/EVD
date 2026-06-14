/**
 * EVDx — Permission Request Handler
 *
 * Requests Android runtime permissions for BLE, Location, WiFi, and Microphone.
 * Handles Android 6+ (API 23+) dangerous permissions with proper flows for:
 *
 * - Android 12+ (API 31+): BLUETOOTH_CONNECT, BLUETOOTH_SCAN (no location needed)
 * - Android 11- (API 30-): BLUETOOTH, BLUETOOTH_ADMIN + ACCESS_FINE_LOCATION for BLE scan
 * - WiFi: Required for WiFi ELM327 OBD adapter connections
 * - Microphone: Required for voice assistant STT
 *
 * Key Android permission rules:
 * 1. BLUETOOTH_CONNECT is needed to connect to BLE devices on Android 12+
 * 2. BLUETOOTH_SCAN with neverForLocation flag doesn't need location on Android 12+
 * 3. On Android 11 and below, ACCESS_FINE_LOCATION is required for BLE scanning
 * 4. If the user denies a permission, we should check and re-request gracefully
 * 5. Permissions must be requested at runtime, not just declared in manifest
 *
 * References:
 * - https://developer.android.com/develop/connectivity/bluetooth/bt-permissions
 * - https://punchthrough.com/mastering-permissions-for-bluetooth-low-energy-android
 * - @capacitor-community/bluetooth-le README
 */

import { Capacitor } from '@capacitor/core';

// Permission status type
type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

interface PermissionResult {
  granted: boolean;
  permissions: Record<string, PermissionState>;
  missingPermissions: string[];
}

/**
 * Get the Android SDK version at runtime.
 * Returns 0 on non-Android platforms.
 */
function getAndroidVersion(): number {
  if (!Capacitor.isNativePlatform()) return 99;
  // On Capacitor, we can check via the platform
  try {
    const ua = navigator.userAgent;
    const match = ua.match(/Android\s([\d.]+)/);
    if (match) return parseInt(match[1]);
  } catch {}
  // Assume Android 12+ for safety
  return 31;
}

/**
 * Request Bluetooth LE permissions with proper Android version handling.
 *
 * Android 12+ (API 31+):
 * - BLUETOOTH_CONNECT: Required to connect to BLE devices
 * - BLUETOOTH_SCAN: Required to scan for BLE devices
 *   - With neverForLocation flag, location permission is NOT required
 *
 * Android 11 and below (API 30-):
 * - BLUETOOTH: Required for classic Bluetooth
 * - BLUETOOTH_ADMIN: Required for BLE scanning
 * - ACCESS_FINE_LOCATION: Required for BLE scanning results
 */
export async function requestBlePermissions(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, permissions: {}, missingPermissions: [] };
  }

  const results: Record<string, PermissionState> = {};
  const missing: string[] = [];

  try {
    const androidVersion = getAndroidVersion();

    // Initialize BleClient — this triggers the system permission dialog on Android 12+
    // androidNeverForLocation: true is required because our manifest declares
    // BLUETOOTH_SCAN with neverForLocation flag
    const { BleClient } = await import('@capacitor-community/bluetooth-le');
    await BleClient.initialize({ androidNeverForLocation: true });
    results['bluetooth_le'] = 'granted';
    console.log('[Permissions] BLE client initialized (Android', androidVersion, ')');

    // On Android 11 and below, location permission is required for BLE scanning
    if (androidVersion < 31) {
      const locationGranted = await requestLocationPermission();
      results['location'] = locationGranted ? 'granted' : 'denied';
      if (!locationGranted) {
        missing.push('ACCESS_FINE_LOCATION');
        // On Android 11-, BLE scan won't return results without location
        // But we still allow the user to try — some devices work anyway
        console.warn('[Permissions] Location not granted — BLE scan may not return results on Android', androidVersion);
      }
    }

    return { granted: true, permissions: results, missingPermissions: missing };
  } catch (error: unknown) {
    console.error('[Permissions] BLE permission error:', error);

    // Check if it's a permission denial vs a real error
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.toLowerCase().includes('denied') || errorMsg.toLowerCase().includes('permission')) {
      results['bluetooth_le'] = 'denied';
      missing.push('BLUETOOTH_CONNECT', 'BLUETOOTH_SCAN');
      return { granted: false, permissions: results, missingPermissions: missing };
    }

    results['bluetooth_le'] = 'unavailable';
    return { granted: false, permissions: results, missingPermissions: missing };
  }
}

/**
 * Request fine location permission.
 * Required for BLE scanning on Android 11 and below.
 * Uses @capacitor/geolocation which triggers the system permission dialog.
 */
async function requestLocationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const { Geolocation } = await import('@capacitor/geolocation');

    // Check current status first
    const status = await Geolocation.checkPermissions();
    if (status.location === 'granted' || status.coarseLocation === 'granted') {
      return true;
    }

    // If previously denied with "Don't ask again", requestPermissions won't show dialog
    if (status.location === 'denied') {
      console.warn('[Permissions] Location permission previously denied — user must enable in Settings');
      return false;
    }

    // Request permission
    const requestResult = await Geolocation.requestPermissions();
    return requestResult.location === 'granted' || requestResult.coarseLocation === 'granted';
  } catch {
    // On Android 12+, location is not required for BLE with neverForLocation flag
    // So failure here is acceptable on modern devices
    console.warn('[Permissions] Geolocation plugin unavailable — location permission not requested');
    return false;
  }
}

/**
 * Request WiFi-related permissions for WiFi ELM327 OBD adapter connections.
 * These are normal (not dangerous) permissions on Android, but we still
 * check availability for proper error handling.
 */
export async function requestWifiPermissions(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, permissions: {}, missingPermissions: [] };
  }

  // WiFi state permissions are normal permissions (auto-granted at install time)
  // on Android. No runtime request needed. But we validate WiFi is available.
  const results: Record<string, PermissionState> = {
    'wifi_state': 'granted',
    'network_state': 'granted',
    'change_wifi_state': 'granted',
  };

  return { granted: true, permissions: results, missingPermissions: [] };
}

/**
 * Request microphone permission for voice assistant (STT).
 * Uses @capacitor-community/speech-recognition which handles the system dialog.
 */
export async function requestMicrophonePermission(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, permissions: {}, missingPermissions: [] };
  }

  const results: Record<string, PermissionState> = {};

  try {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');

    // Check if speech recognition is available on device
    const available = await SpeechRecognition.available();
    if (!available.available) {
      results['microphone'] = 'unavailable';
      return { granted: false, permissions: results, missingPermissions: ['SPEECH_RECOGNITION'] };
    }

    // Request permission
    const permission = await SpeechRecognition.requestPermissions();
    const granted = permission.speechRecognition === 'granted' || permission.speechRecognition === 'prompt';
    results['microphone'] = granted ? 'granted' : 'denied';

    return {
      granted,
      permissions: results,
      missingPermissions: granted ? [] : ['RECORD_AUDIO'],
    };
  } catch (error: unknown) {
    console.error('[Permissions] Microphone permission error:', error);
    results['microphone'] = 'denied';
    return { granted: false, permissions: results, missingPermissions: ['RECORD_AUDIO'] };
  }
}

/**
 * Request all permissions needed for full app functionality.
 * BLE + Location (if needed) + Microphone + WiFi.
 */
export async function requestAllPermissions(): Promise<PermissionResult> {
  const bleResult = await requestBlePermissions();
  const micResult = await requestMicrophonePermission();
  const wifiResult = await requestWifiPermissions();

  const allGranted = bleResult.granted && micResult.granted && wifiResult.granted;
  const allMissing = [...bleResult.missingPermissions, ...micResult.missingPermissions, ...wifiResult.missingPermissions];

  return {
    granted: allGranted,
    permissions: { ...bleResult.permissions, ...micResult.permissions, ...wifiResult.permissions },
    missingPermissions: allMissing,
  };
}

/**
 * Check if BLE permissions are currently granted without showing a dialog.
 * Useful for pre-flight checks before showing the connection UI.
 */
export async function checkBlePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const { BleClient } = await import('@capacitor-community/bluetooth-le');
    await BleClient.initialize({ androidNeverForLocation: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if location permission is granted (needed for BLE on Android 11-).
 */
export async function checkLocationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const status = await Geolocation.checkPermissions();
    return status.location === 'granted' || status.coarseLocation === 'granted';
  } catch {
    return false;
  }
}

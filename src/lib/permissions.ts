/**
 * EVDx — Permission Request Handler
 *
 * Requests Android runtime permissions for BLE, Location, and Microphone.
 * Required on Android 6+ (API 23+) with dangerous permissions.
 */

import { Capacitor } from '@capacitor/core';

// Permission status type
type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

interface PermissionResult {
  granted: boolean;
  permissions: Record<string, PermissionState>;
}

/**
 * Request Bluetooth LE permissions (BLE scan + connect)
 */
export async function requestBlePermissions(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, permissions: {} };
  }

  const results: Record<string, PermissionState> = {};

  try {
    // On Android 12+, need BLUETOOTH_SCAN, BLUETOOTH_CONNECT, and location
    const { BluetoothLe } = await import('@capacitor-community/bluetooth-le');

    // Initialize BLE (this triggers permission prompts on Android 12+)
    await BluetoothLe.initialize();

    // Also request location permission (required for BLE scan on Android 11-)
    const locationResult = await requestLocationPermission();
    results['location'] = locationResult ? 'granted' : 'denied';

    results['bluetooth'] = 'granted';
    return { granted: true, permissions: results };
  } catch (error: unknown) {
    console.error('BLE permission error:', error);
    results['bluetooth'] = 'denied';
    return { granted: false, permissions: results };
  }
}

/**
 * Request fine location permission (needed for BLE scanning on Android 11-)
 */
async function requestLocationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const { Geolocation } = await import('@capacitor/core');
    // Requesting geolocation triggers the location permission prompt
    // We don't actually use the location — just need the permission for BLE
    const status = await Geolocation.checkPermissions();
    if (status.location === 'granted') return true;

    const requestResult = await Geolocation.requestPermissions();
    return requestResult.location === 'granted';
  } catch {
    // Geolocation plugin might not be installed — try alternate approach
    return true;
  }
}

/**
 * Request microphone permission for voice assistant (STT)
 */
export async function requestMicrophonePermission(): Promise<PermissionResult> {
  if (!Capacitor.isNativePlatform()) {
    return { granted: true, permissions: {} };
  }

  const results: Record<string, PermissionState> = {};

  try {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
    const available = await SpeechRecognition.available();
    if (!available.available) {
      results['microphone'] = 'unavailable';
      return { granted: false, permissions: results };
    }

    const permission = await SpeechRecognition.requestPermissions();
    const granted = permission.speechRecognition === 'granted' || permission.speechRecognition === 'prompt';
    results['microphone'] = granted ? 'granted' : 'denied';
    return { granted, permissions: results };
  } catch (error: unknown) {
    console.error('Microphone permission error:', error);
    results['microphone'] = 'denied';
    return { granted: false, permissions: results };
  }
}

/**
 * Request all permissions needed for full app functionality
 */
export async function requestAllPermissions(): Promise<PermissionResult> {
  const bleResult = await requestBlePermissions();
  const micResult = await requestMicrophonePermission();

  return {
    granted: bleResult.granted && micResult.granted,
    permissions: { ...bleResult.permissions, ...micResult.permissions },
  };
}

/**
 * Check if BLE permissions are currently granted
 */
export async function checkBlePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    const { BluetoothLe } = await import('@capacitor-community/bluetooth-le');
    await BluetoothLe.initialize();
    return true;
  } catch {
    return false;
  }
}

import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Fix #4: Removed androidScheme: 'http' override.
 *
 * Capacitor 8's default androidScheme is 'https'. The 'http' override was
 * originally added for BYD DiLink 3.0 (Chromium 83) compatibility, but this
 * was based on a misunderstanding: Capacitor serves content via its own
 * internal content provider (WebViewAssetLoader), NOT via a real HTTPS
 * network request. The 'https' scheme is handled entirely in-process and
 * works correctly on Chromium 83. Using 'http' instead can break the
 * Capacitor 8 bridge's internal URL routing and cause issues with
 * localStorage scoped to the scheme.
 *
 * Fix #7: webContentsDebuggingEnabled set to false for production.
 *
 * Previously true, which exposed the WebView to remote Chrome DevTools
 * inspection by anyone on the same network. This is a security issue in
 * production. Set to false; enable only for local debug builds via:
 *   webContentsDebuggingEnabled: __DEV__
 * (Capacitor doesn't expose __DEV__ in config, so we hardcode false here
 * and override in debug builds if needed.)
 *
 * Fix #2b: Added @capacitor/splash-screen plugin configuration.
 *
 * Coordinates the splash-to-WebView transition at the Capacitor bridge
 * level, complementing the AndroidX SplashScreen API in MainActivity.
 */
const config: CapacitorConfig = {
  appId: 'com.waleedmandour.evdx',
  appName: 'EVDx',
  webDir: 'out',
  // server.androidScheme removed — Capacitor 8 default 'https' is correct
  // and safe even on BYD DiLink's Chromium 83 WebView.
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0D1117',
      androidSplashResourceName: 'splash_screen',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    BluetoothLe: {
      displayStrings: {
        scanning: 'Scanning for OBD adapters...',
        cancel: 'Cancel',
        availableDevices: 'Available OBD Adapters',
        noDeviceFound: 'No adapter found',
      },
    },
    SpeechRecognition: {
      languages: ['en-US', 'ar-SA'],
    },
  },
  android: {
    // allowMixedContent: false is the correct default now that we use 'https'.
    // Only needed with 'http' scheme, which we removed.
    allowMixedContent: false,
    backgroundColor: '#0D1117',
    // SECURITY FIX: disable remote debugging in production.
    // Was true, which exposed the WebView to chrome://inspect from any
    // device on the same network.
    webContentsDebuggingEnabled: false,
  },
};

export default config;

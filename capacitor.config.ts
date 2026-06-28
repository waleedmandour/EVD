import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Splash screen configuration:
 *
 * launchShowDuration: 10000 (10 seconds) — this is the SAFETY TIMEOUT.
 * The splash stays visible until either:
 *   (a) React calls SplashScreen.hide() after first render (normal case, ~2-5s)
 *   (b) 10 seconds elapse without hide() being called (JS failed to load)
 *
 * launchAutoHide: true — the splash auto-hides after launchShowDuration.
 * This ensures the user never sees a permanent splash screen even if
 * JavaScript fails to parse on BYD DiLink's Chromium 83 WebView.
 *
 * The pre-hydration HTML splash in layout.tsx is the fallback that shows
 * if the Capacitor splash auto-hides before React has rendered.
 */
const config: CapacitorConfig = {
  appId: 'com.waleedmandour.evdx',
  appName: 'EVDx',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      launchShowDuration: 10000,
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
    allowMixedContent: false,
    backgroundColor: '#0D1117',
    webContentsDebuggingEnabled: false,
  },
};

export default config;

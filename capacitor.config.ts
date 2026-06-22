import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waleedmandour.evdx',
  appName: 'EVDx',
  webDir: 'out',
  server: {
    // Use 'http' instead of 'https' for better compatibility with older
    // Android WebView versions (Android 10 / Chromium 83 on BYD head units).
    // The 'https' scheme can cause black screen issues on some head units
    // because the WebView can't establish a local SSL context.
    androidScheme: 'http',
  },
  plugins: {
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
    allowMixedContent: true,
    backgroundColor: '#0D1117',
    // Force WebView to use legacy mode for better compatibility with
    // older Android versions (BYD DiLink 3.0 runs Android 10).
    webContentsDebuggingEnabled: true,
  },
};

export default config;

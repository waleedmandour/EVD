import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waleedmandour.evdx',
  appName: 'EVDx',
  webDir: 'out',
  server: {
    androidScheme: 'https',
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
  },
};

export default config;

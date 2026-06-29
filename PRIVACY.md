# EVDx Privacy Policy

**Last updated: June 29, 2026**

## Overview

EVDx is a privacy-first electric vehicle diagnostics application. This privacy policy explains how EVDx handles your data.

## Data Collection

**EVDx does NOT collect, transmit, or store any personal data.**

- **No cloud connectivity**: The app does not connect to any cloud service, analytics platform, or crash reporting service. The `INTERNET` permission in the AndroidManifest is used solely for local WiFi ELM327 OBD-II adapter connections (192.168.x.x private network only).

- **No telemetry**: No usage statistics, crash reports, or performance metrics are sent to the developer or any third party.

- **No accounts**: There is no login, registration, or user account system.

- **No advertising**: The app contains no advertisements or ad SDKs.

## Data Storage

All vehicle data, session logs, maintenance records, and app settings are stored **locally on your device** using:
- **Zustand persist middleware** (backed by localStorage in the WebView)
- **Android internal storage** (for native BYD data bridge)

Data never leaves your device. You can export all data via **Settings → Export Data** (saves a JSON file to your device), and you can delete all data via **Settings → Delete All Data**.

## Permissions Explained

| Permission | Purpose | Data Sent |
|-----------|---------|-----------|
| `BLUETOOTH` / `BLUETOOTH_CONNECT` / `BLUETOOTH_SCAN` | Connect to OBD-II BLE adapters | None — BLE is peer-to-peer with the adapter |
| `ACCESS_FINE_LOCATION` | Required for BLE scanning on Android ≤ 11 | None — location is not used by the app |
| `ACCESS_WIFI_STATE` / `CHANGE_WIFI_STATE` | Connect to WiFi ELM327 adapters | None — local network only |
| `INTERNET` | WiFi ELM327 adapter communication | None — local network only (192.168.x.x) |
| `RECORD_AUDIO` | Voice assistant (Arabic/English) | Audio is processed on-device, never transmitted |
| `WAKE_LOCK` | Keep screen on during diagnostics | None |
| `VIBRATE` | Haptic feedback | None |
| `CAR_SPEED` / `CAR_POWERTRAIN` / `CAR_ENERGY` | Android Automotive vehicle data | None — read locally from car's CAN bus |
| `SYSTEM_ALERT_WINDOW` | Floating voice assistant button | None |

## BYD Head Unit Integration

On BYD DiLink 3.0 head units, EVDx reads vehicle data directly from the car's internal CAN bus via the `BYDAutoManager` framework. This data includes:
- State of Charge (SOC), State of Health (SOH)
- Pack voltage, current, power
- Vehicle speed, motor RPM, motor temperature
- Battery temperature, cell voltages
- Odometer, remaining range
- Tire pressures
- Diagnostic Trouble Codes (DTCs)

**This data is read locally from the vehicle and is never transmitted anywhere.** The BYD integration uses Android's reflection API to access the car's internal framework — no data leaves the head unit.

## Huawei HMS Core

EVDx may optionally use Huawei HMS Core for:
- **ML Kit ASR** (speech recognition fallback) — audio is processed on-device
- **ML Kit TTS** (text-to-speech fallback) — text is synthesized on-device

HMS Core does not transmit any personal data to Huawei servers in this app. All voice processing is offline and on-device.

## Open Source

EVDx is open source. The complete source code is available at:
https://github.com/waleedmandour/EVD

You can verify all privacy claims by reviewing the source code.

## Contact

For privacy questions or concerns:
- **Email**: waleedmandour@gmail.com
- **GitHub**: https://github.com/waleedmandour/EVD

## Changes to This Policy

If we change this privacy policy, we will update this file and note the change date above. Since EVDx does not collect any data, policy changes only affect how we describe the app's behavior, not actual data practices.

---

© 2026 Dr. Waleed Mandour. All rights reserved.

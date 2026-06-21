# EVDx for BYD Vehicles — Direct Integration Guide

## Overview

EVDx can run **directly on BYD vehicle infotainment systems** (DiLink 3.0), eliminating the need for an external OBD-II adapter. When installed on a BYD head unit, EVDx accesses vehicle data through BYD's internal Auto API — faster, more reliable, and with more data than BLE OBD-II.

## Supported Vehicles

All BYD vehicles with DiLink 3.0 (global version):
- ✅ BYD Dolphin (25/26)
- ✅ BYD Atto 3 / Yuan Plus
- ✅ BYD Seal
- ✅ BYD Seal U
- ✅ BYD King
- ✅ BYD Shark
- ✅ All other DiLink 3.0 models

## Head Unit Specs

| Property | Value |
|----------|-------|
| Platform | DiLink 3.0 |
| Android | 10 (API 29) |
| SoC | Qualcomm QCM6125 (8-core ARM64) |
| Screen | Landscape (1920×720 or 2152×1032) |
| ADB | WiFi at 192.168.10.10:5555 |
| Bootloader | Unlocked |

## Installation

### Method 1: USB Drive (Easiest — No Computer Needed)

1. On a USB drive formatted as FAT32 or exFAT, create a folder named exactly:
   ```
   Third Party Apps 55
   ```
   (The folder name must include spaces and the number 55)

2. Copy the EVDx BYD APK (`evdx-v1.5.3-byd-release.apk`) into that folder

3. Plug the USB drive into your BYD's USB port

4. Wait a few seconds — a password prompt will appear on the car's screen

5. Enter the password: **`BYD6125F`**

6. A file browser will appear — tap the APK to install

### Method 2: ADB over WiFi

**Step 1: Enable USB Debugging**

1. Find your IMEI: go to **Settings → System → About** on the head unit
2. Go to `electro.app.br/usb` and enter the **last 6 digits** of your IMEI to generate the debug password
3. Open the USB settings screen on the head unit
4. Enter the generated password and tap the gray button
5. Tap **TestTools**
6. Enable **Wireless adb debug switch**

**Step 2: Connect and Install**

```bash
# Connect to the car's WiFi network first, then:
adb connect 192.168.10.10:5555

# Install EVDx
adb install evdx-v1.5.3-byd-release.apk

# Or update (keep data):
adb install -r evdx-v1.5.3-byd-release.apk
```

## What EVDx Gets on BYD (vs. OBD-II Adapter)

| Feature | OBD-II Adapter | BYD Native API |
|---------|---------------|----------------|
| Battery SOC | ✅ (PID 2F) | ✅ Direct from BMS |
| Battery SOH | ❌ Not available | ✅ Direct from BMS |
| Pack Voltage | ✅ (PID 42) | ✅ Direct from BMS |
| Pack Current | ❌ Not available | ✅ Direct from BMS |
| Cell Voltages | ✅ (Mode 22) | ✅ Direct from BMS |
| Motor Temperature | ✅ (PID 05) | ✅ Direct from MCU |
| Vehicle Speed | ✅ (PID 0D) | ✅ Direct from CAN |
| Charging Status | ❌ Limited | ✅ Full charging data |
| Tire Pressure (TPMS) | ❌ Not available | ✅ All 4 wheels |
| Cabin Temperature | ❌ Not available | ✅ AC zones |
| AC Control | ❌ Not available | ✅ Read + control |
| Door Lock Status | ❌ Not available | ✅ All doors |
| DTCs | ✅ (Mode 03) | ✅ Native DTC system |
| VIN | ✅ (Mode 09) | ✅ Direct from vehicle |
| GPS Location | ❌ Not available | ✅ Built-in GPS |
| Trip Consumption | ❌ Not available | ✅ BYD statistics |
| Odometer | ✅ (PID A6) | ✅ Direct from cluster |

## Architecture

```
EVDx App → BYDService → BYDAutoManager → DiCarServer → /dev/spidev_ivi → MCU → CAN bus
```

vs. the OBD-II adapter approach:
```
EVDx App → BLE → ELM327 Adapter → OBD-II Port → ECU → CAN bus
```

The BYD native path is **direct** (no wireless, no adapter, no ELM327 command queue) — data latency is <50ms vs. 500ms+ with BLE OBD.

## Auto-Detection

EVDx automatically detects when it's running on a BYD head unit:
1. Checks for BYD system packages
2. Checks WebView user agent for "BYD" or "DiLink"
3. Checks screen orientation (landscape = car display)

If BYD is detected → switches to native API mode.
If not → uses normal BLE/WiFi OBD-II adapter mode.

**One APK, two modes, zero configuration.**

## Technical Details

### BYDAUTO Permissions

BYD defines 100+ custom Android permissions:
```
android.permission.BYDAUTO_ENERGY_GET      → Battery data
android.permission.BYDAUTO_CHARGING_GET    → Charging data
android.permission.BYDAUTO_MOTOR_GET       → Motor data
android.permission.BYDAUTO_SPEED_GET       → Vehicle speed
android.permission.BYDAUTO_TYRE_GET        → Tire pressure
android.permission.BYDAUTO_DTC_GET         → DTCs
android.permission.BYDAUTO_AC_GET          → AC/climate
android.permission.BYDAUTO_DOOR_LOCK_GET   → Door locks
```

All permissions are `protectionLevel=normal` — any sideloaded app can request them.

### Permission Bypass

BYD's `BydPermissionContext` (a ContextWrapper) auto-grants all `BYDAUTO_*` permissions when called from a third-party app. No special signing or root required.

### Content Providers

BYD's `CarStatusProvider` exposes structured data:
```
content://com.byd.carstatus.provider/battery     → battery stats
content://com.byd.carstatus.provider/tyre        → tire pressure
content://com.byd.carstatus.provider/maintenance → service history
content://com.byd.carstatus.provider/consumption → trip efficiency
```

## Research Sources

- [BYD Dolphin Hacking](https://github.com/wheregoes/byd-dolphin-hacking) — Full system documentation
- [BYD Apps](https://github.com/wheregoes/byd-apps) — Working Android apps using BYDAUTO API
- [BYD CAN Protocol](https://github.com/dfch/BydCanProtocol) — Battery CAN bus protocol
- [AppManager](https://github.com/muntashirakon/appmanager) — APK management tool

## Disclaimer

This is an unofficial, community-driven feature with no affiliation with BYD. Reverse engineering of BYD's internal Android services is for educational and interoperability purposes only. Use at your own risk — modifying vehicle software may void your warranty.

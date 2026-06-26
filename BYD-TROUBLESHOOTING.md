# EVDx BYD Troubleshooting Guide

## How to Report a Black Screen or Other Issue

If EVDx shows a black screen, crashes, or doesn't display correctly on your BYD head unit, this guide walks you through capturing diagnostic logs using two methods.

---

## Overview

| Method | Difficulty | Requirements | Best for |
|--------|-----------|--------------|----------|
| **AppManager (on the car)** | Easy | Just a USB drive | Most users — no laptop needed |
| **ADB over WiFi** | Medium | A laptop with USB (one-time setup) | Advanced users — more control |

**Start with Method 1 (AppManager).** It runs directly on the BYD head unit and can capture EVDx's logs without any external equipment.

---

## Method 1: AppManager (Recommended — No Laptop Needed)

[AppManager](https://github.com/MuntashirAkon/AppManager) is a free, open-source Android utility with a built-in **Logcat viewer, manager, and exporter**. It can run directly on the BYD head unit and filter logs by app package name — perfect for capturing EVDx's diagnostic output.

### What you need

- A USB flash drive (any size, formatted as FAT32 or exFAT)
- 2 minutes

### Step 1: Download AppManager

On your phone or computer, download the AppManager APK from the official releases page:

> https://github.com/MuntashirAkon/AppManager/releases/latest

Direct download (v4.0.5, ~25 MB):
> https://github.com/MuntashirAkon/AppManager/releases/download/v4.0.5/AppManager_v4.0.5.apk

### Step 2: Install AppManager on the BYD head unit

1. On a USB drive, create a folder named exactly (with spaces and capitalization):
   ```
   Third Party Apps 55
   ```
2. Copy the `AppManager_v4.0.5.apk` file into that folder
3. Plug the USB into the car's USB port
4. Wait a few seconds — a password prompt appears
5. Enter the password: **`BYD6125F`**
6. Tap the APK file to install

### Step 3: Capture EVDx logs

1. **Open AppManager** on the car screen (it appears in the app launcher)
2. Grant the **"Display over other apps"** permission if prompted
3. From the AppManager home screen, tap the **three-line menu** (≡) in the top-left
4. Select **"Log viewer"** (also called "Logcat")
5. Grant the **"Read logs"** permission if prompted (this is required on Android 10+)
6. In the Logcat view, tap the **filter icon** (🔍 or a funnel shape)
7. In the **"Filter by package"** or **"Search"** field, type:
   ```
   com.waleedmandour.evdx
   ```
8. Now launch EVDx from the app launcher (or use AppManager's "Launch" button if you see EVDx in its app list)
9. Wait 30 seconds for EVDx to load (or fail to load)
10. Return to AppManager's Logcat view — you should see filtered logs from EVDx

### Step 4: Save the filtered logs

1. In AppManager's Logcat view, tap the **three-dot menu** (⋮) in the top-right
2. Select **"Save log"** or **"Export"**
3. Choose a save location (e.g., the USB drive or internal storage)
4. Name the file: `evdx-byd-filtered.txt`

### Step 5: Share the logs

Transfer the `evdx-byd-filtered.txt` file to your phone or computer via:
- USB drive (plug back into your computer)
- Email (if the car has internet connectivity)
- Bluetooth

Email the file to: **waleedmandour@gmail.com**

Include in your email:
- Your BYD model and year (e.g., "Yuan Plus 2023")
- The EVDx version (shown in Settings tab, or check the APK filename)
- What you see on screen (black screen, crash, blank white, etc.)
- Whether the white splash screen with the EVDx logo appeared at all

### AppManager advantages

- ✅ Runs entirely on the car — no laptop or ADB setup needed
- ✅ Can filter logs by app package name (no manual grep needed)
- ✅ Visual log viewer with color-coded log levels
- ✅ Can record logs in the background while you launch EVDx
- ✅ Also includes a **Crash Monitor** feature for detecting app crashes
- ✅ Free and open source (GPLv3+)

---

## Method 2: ADB over WiFi (Advanced — For Persistent Issues)

Use this method if AppManager can't capture the logs you need, or if you need more detailed system-level logs.

### What you need

- A laptop or desktop computer (Windows, Mac, or Linux)
- A USB flash drive
- Your BYD head unit's IMEI number (Settings → System → About)

### Step 1: Enable Wireless ADB on the BYD Head Unit

1. On the car screen, go to **Settings → System → About**
2. Note the **IMEI** number (write down the last 6 digits)
3. On a phone or laptop browser, go to: `https://electro.app.br/usb`
4. Enter the **last 6 digits of your IMEI** to generate the debug password
5. Back on the car screen, open the **USB settings** screen
6. Enter the generated password and tap the gray button
7. Tap **TestTools**
8. Enable **Wireless adb debug switch**

The head unit is now listening on `192.168.10.10:5555`.

### Step 2: Install ADB on your computer

**Windows:**
1. Download Platform Tools from https://developer.android.com/tools/releases/platform-tools
2. Extract to `C:\platform-tools`
3. Open Command Prompt, run: `C:\platform-tools\adb.exe version`

**Mac:**
```bash
brew install android-platform-tools
adb version
```

**Linux:**
```bash
sudo apt install adb
adb version
```

### Step 3: Connect and capture logs

```bash
# Connect to the car (same WiFi network)
adb connect 192.168.10.10:5555

# Clear old logs
adb logcat -c

# Launch EVDx
adb shell am start -n com.waleedmandour.evdx/.SplashActivity

# Wait 30 seconds for the app to load (or fail)
# Then capture all logs to a file
adb logcat -d > evdx-byd-logs.txt

# Filter to just the relevant lines
grep -iE "chromium|webview|capacitor|EVDx|BYDAuto|SplashActivity|FATAL|AndroidRuntime|console|SyntaxError" evdx-byd-logs.txt > evdx-byd-filtered.txt
```

On Windows, replace the last command with:
```cmd
findstr /i "chromium webview capacitor EVDx BYDAuto SplashActivity FATAL AndroidRuntime console SyntaxError" evdx-byd-logs.txt > evdx-byd-filtered.txt
```

### Step 4: Share the logs

Email `evdx-byd-filtered.txt` to **waleedmandour@gmail.com** with:
- BYD model and year
- EVDx version
- What you see on screen

### Step 5: Disconnect

```bash
adb disconnect 192.168.10.10:5555
```

---

## Method 3: Visual Screenshot (Quick and Easy)

If you can't set up AppManager or ADB, a screenshot can still help.

### Take a screenshot on BYD DiLink 3.0

1. Open the app that shows the issue
2. Press and hold the **power button** on the steering wheel for 2 seconds
3. Or use the screenshot button in the DiLink notification panel (swipe down from the top)

The screenshot is saved to the car's internal storage under **File Manager → Pictures → Screenshots**. Transfer it to your phone via Bluetooth, USB, or email, then send it to **waleedmandour@gmail.com**.

---

## What the logs tell us

The filtered logs help identify the exact cause of the black screen:

| Log keyword | What it means | Likely fix |
|-------------|--------------|------------|
| `FATAL EXCEPTION` | A Java crash in native code | Check which plugin/method crashed |
| `SyntaxError` | JavaScript error in the WebView | Fix JS code that Chromium 83 can't parse |
| `chromium: ERROR` | WebView rendering error | Check WebView/CSS compatibility |
| `console.error` | JavaScript console error | Fix the React/JS error |
| `BYDAuto detected: false` | BYD detection failed | Check package visibility / queries block |
| `SplashActivity` | Splash screen lifecycle events | Check if splash is showing |
| `EVDx/BYDAuto` | EVDx-specific log tags | App-specific diagnostics |

---

## Common Issues and Quick Fixes

### Issue: App installs but shows only a black screen

**Quick checks:**
- Did the white splash screen with the dark EVDx logo appear? If yes → splash works, issue is in the WebView
- If no splash appeared → issue is in the native layer (AndroidManifest, theme, or SplashActivity)

**Action:** Capture logs using Method 1 (AppManager) or Method 2 (ADB).

### Issue: App crashes immediately after splash

**Action:** Look for `FATAL EXCEPTION` in the filtered logs.

### Issue: App works but data doesn't load

**Possible causes:**
1. BYD detection failed (check logs for `BYDAuto detected: false`)
2. BYDAutoManager not available on this firmware
3. BLE OBD-II adapter not connected

**Action:** Check the Device tab in EVDx — it shows whether BYD native mode or BLE mode is active.

---

## Quick Reference

| Item | Value |
|------|-------|
| AppManager download | https://github.com/MuntashirAkon/AppManager/releases/latest |
| AppManager direct APK | https://github.com/MuntashirAkon/AppManager/releases/download/v4.0.5/AppManager_v4.0.5.apk |
| BYD ADB address | `192.168.10.10:5555` |
| ADB password generator | `https://electro.app.br/usb` |
| EVDx package name | `com.waleedmandour.evdx` |
| Splash activity | `com.waleedmandour.evdx.SplashActivity` |
| Developer email | `waleedmandour@gmail.com` |
| GitHub repo | `https://github.com/waleedmandour/EVD` |

---

## Developer Notes

**Reviewed repository:** https://github.com/MuntashirAkon/AppManager

AppManager is a free, open-source Android utility (GPLv3+) by Muntashir Al-Islam that provides:
- **Logcat viewer, manager, and exporter** — captures and saves logcat output without needing ADB
- **Crash monitor** — detects and records app crashes
- **Filter by package name** — can isolate logs from a specific app (like `com.waleedmandour.evdx`)
- **Background recording** — `LogcatRecordingService` can record logs while other apps run
- Supports multiple log buffers: main, radio, events, system, crash

AppManager runs on Android 5.0+ and does NOT require root for log viewing (it uses the standard `android.permission.READ_LOGS` permission which is granted via ADB on Android 10+, or works directly on rooted devices). On BYD DiLink 3.0, the user may need to grant the READ_LOGS permission via ADB one-time:

```bash
adb shell pm grant com.waleedmandour.evdx android.permission.READ_LOGS
```

Wait — that's for EVDx itself. For AppManager:
```bash
adb shell pm grant io.github.muntashirakon.AppManager android.permission.READ_LOGS
```

This one-time grant lets AppManager read system logs. After that, AppManager can be used entirely on the car without a laptop.

**Future enhancement for EVDx:** Add an in-app "Diagnostics" screen that:
1. Displays app version, BYD detection status, and WebView version
2. Has a "Save Diagnostic Report" button that writes a text file with all relevant info
3. Saves to the Downloads folder for easy sharing via USB or email

This would eliminate the need for AppManager or ADB for most users.

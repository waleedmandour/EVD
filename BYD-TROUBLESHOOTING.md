# EVDx BYD Troubleshooting Guide

## How to Report a Black Screen or Other Issue

If EVDx shows a black screen, crashes, or doesn't display correctly on your BYD head unit, you can help the developer diagnose the problem by capturing diagnostic logs. This guide walks you through the process step by step.

---

## Overview

There are two ways to capture logs from your BYD head unit:

| Method | Difficulty | Requirements | Best for |
|--------|-----------|--------------|----------|
| **ADB over WiFi** | Medium | A laptop with USB (one-time setup) | Detailed WebView and app logs |
| **In-app screenshot** | Easy | Just the car screen | Visual bugs and error messages |

If the black screen persists, the **ADB method** is the only way to see what's happening inside the WebView.

---

## Method 1: ADB over WiFi (Recommended for Black Screen Issues)

### What you need

- A laptop or desktop computer (Windows, Mac, or Linux)
- A USB flash drive (any size, formatted as FAT32 or exFAT)
- Your BYD head unit's IMEI number (find it in Settings → System → About)

### Step 1: Enable Wireless ADB on the BYD Head Unit

1. On the car's screen, go to **Settings → System → About**
2. Note the **IMEI** number (write down the last 6 digits)
3. On a phone or laptop browser, go to: `https://electro.app.br/usb`
4. Enter the **last 6 digits of your IMEI** to generate the debug password
5. Back on the car screen, open the **USB settings** screen
6. Enter the generated password and tap the gray button
7. Tap **TestTools**
8. Enable **Wireless adb debug switch**

The head unit is now listening for ADB connections on `192.168.10.10:5555`.

### Step 2: Install ADB on your computer

**Windows:**
1. Download Platform Tools from https://developer.android.com/tools/releases/platform-tools
2. Extract the ZIP to `C:\platform-tools`
3. Open Command Prompt and run:
   ```
   C:\platform-tools\adb.exe version
   ```

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

### Step 3: Connect to the BYD head unit

Make sure your laptop is connected to the same WiFi network as the car (or connect to the car's hotspot if it has one).

Open a terminal/command prompt and run:
```bash
adb connect 192.168.10.10:5555
```

You should see:
```
connected to 192.168.10.10:5555
```

If you see `failed to connect`, verify:
- The head unit's ADB switch is still enabled (it can turn off after a reboot)
- Your laptop and the car are on the same network
- No firewall is blocking port 5555

### Step 4: Capture the logs

Run these commands in order:

```bash
# 1. Clear any old logs
adb logcat -c

# 2. Launch EVDx
adb shell am start -n com.waleedmandour.evdx/.SplashActivity

# 3. Wait 30 seconds for the app to load (or fail to load)
#    (Just count to 30 in your head)

# 4. Capture all logs to a file
adb logcat -d > evdx-byd-logs.txt
```

### Step 5: Filter the logs

The raw log file is very large. Filter it to just the relevant lines:

**Windows (Command Prompt):**
```cmd
findstr /i "chromium webview capacitor EVDx BYDAuto SplashActivity FATAL AndroidRuntime console SyntaxError" evdx-byd-logs.txt > evdx-byd-filtered.txt
```

**Mac/Linux:**
```bash
grep -iE "chromium|webview|capacitor|EVDx|BYDAuto|SplashActivity|FATAL|AndroidRuntime|console|SyntaxError" evdx-byd-logs.txt > evdx-byd-filtered.txt
```

### Step 6: Share the filtered logs

Email the file `evdx-byd-filtered.txt` to: **waleedmandour@gmail.com**

Include in your email:
- Your BYD model and year (e.g., "Yuan Plus 2023")
- The EVDx version (shown in Settings tab, or check the APK filename)
- What you see on screen (black screen, crash, blank white, etc.)
- Whether the splash logo (the dark EVDx square) appeared at all

### Step 7: Disconnect

When done:
```bash
adb disconnect 192.168.10.10:5555
```

You can also disable the ADB switch on the head unit for security.

---

## Method 2: Visual Screenshot (Quick and Easy)

If you can't set up ADB, a screenshot can still help.

### Take a screenshot on BYD DiLink 3.0

1. On the car screen, open the app that shows the issue
2. Press and hold the **power button** on the steering wheel for 2 seconds
3. Or use the screenshot button in the DiLink notification panel (swipe down from the top)

The screenshot is saved to the car's internal storage. You can find it in the **File Manager** app under **Pictures/Screenshots**.

### Share the screenshot

Transfer the screenshot to your phone via:
- Bluetooth
- USB drive
- Email (if the car has internet connectivity)

Email it to: **waleedmandour@gmail.com**

---

## What the logs tell us

The filtered logs help identify the exact cause of the black screen:

| Log keyword | What it means | Likely fix |
|-------------|--------------|------------|
| `FATAL EXCEPTION` | A Java crash in the native code | Check which plugin/method crashed |
| `SyntaxError` | JavaScript error in the WebView | Fix the JS code that Chromium 83 can't parse |
| `chromium: ERROR` | WebView rendering error | Check WebView/CSS compatibility |
| `console.error` | JavaScript console error | Fix the React/JS error |
| `BYDAuto detected: false` | BYD detection failed | Check package visibility / queries block |
| `SplashActivity` | Splash screen lifecycle events | Check if splash is showing |
| `EVDx/BYDAuto` | EVDx-specific log tags | App-specific diagnostics |

---

## Common Issues and Quick Fixes

### Issue: App installs but shows only a black screen

**Possible causes:**
1. WebView compatibility issue with Chromium 83 (BYD DiLink 3.0)
2. JavaScript error preventing React from rendering
3. CSS/media query issue causing invisible layout

**Quick checks:**
- Did the white splash screen with the EVDx logo appear? If yes, the splash works — the issue is in the WebView.
- If no splash appeared, the issue is in the native layer (AndroidManifest, theme, or SplashActivity).

**Action:** Capture ADB logs (Method 1 above) and share with the developer.

### Issue: App crashes immediately after splash

**Possible causes:**
1. BYDAutoPlugin native bridge crash
2. Capacitor plugin version mismatch
3. Missing permission

**Action:** Look for `FATAL EXCEPTION` in the filtered logs.

### Issue: App works but data doesn't load

**Possible causes:**
1. BYD detection failed (check logs for `BYDAuto detected: false`)
2. BYDAutoManager not available on this firmware
3. BLE OBD-II adapter not connected

**Action:** Check the Device tab in the app — it should show whether BYD native mode or BLE mode is active.

---

## Quick Reference

| Item | Value |
|------|-------|
| BYD ADB address | `192.168.10.10:5555` |
| ADB password generator | `https://electro.app.br/usb` |
| EVDx package name | `com.waleedmandour.evdx` |
| Splash activity | `com.waleedmandour.evdx.SplashActivity` |
| Developer email | `waleedmandour@gmail.com` |
| GitHub repo | `https://github.com/waleedmandour/EVD` |

---

## Developer Notes

The binti2 reference repo (waleedmandour/binti2) was reviewed for an automated log collection mechanism. It does not have one — its CONTRIBUTING.md simply requests "Logs (if available)" when reporting bugs, without providing a method to collect them. The ADB method described above is the standard Android approach and the only reliable way to capture WebView logs on BYD DiLink 3.0.

A future enhancement could add an in-app "Diagnostics" screen that:
1. Displays app version, BYD detection status, and WebView version
2. Has a "Save Diagnostic Report" button that writes a text file with all relevant info
3. Saves to the Downloads folder for easy sharing via USB or email

This would eliminate the need for ADB for most users.

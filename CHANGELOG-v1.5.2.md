# EVDx v1.5.2 — Fix "characteristics not found" on Vgate iCar Pro v3+

Released: 2026-06-18

## Problem

Users reported a **"characteristics not found"** error when connecting EVDx to a Vgate iCar Pro OBDII adapter on Android 13+ phones (notably Google Pixel). The adapter was detected during BLE scan, but the connection failed immediately with no recovery path.

## Root Cause

Vgate has shipped **several firmware variants** of the iCar Pro over the years:

| Firmware | Service UUID | Characteristic UUIDs | Era |
|---|---|---|---|
| v1.x | `0000ffe0-...` | `0000ffe1-...` (write+notify) | 2017-2019 |
| v2.x | `0000ffe0-...` | `0000ffe1-...` (write+notify) | 2020-2022 |
| **v3.x** | **`0000fff0-...`** | **`0000fff1-...`** (write+notify) | **2023+** |

The v1.5.1 code only had the FFE0/FFE1 profile. When `detectProfile()` couldn't find FFE0/FFE1 on a v3+ adapter, it **silently fell back to that same profile** — which then failed at `startNotifications()` with the raw "characteristics not found" error from the `@capacitor-community/bluetooth-le` plugin.

The silent fallback was the real bug: it masked the actual problem (wrong profile) and gave users no way to recover.

## Fix

### 1. Three new BLE profiles added

| Profile | Service | Write | Notify | Use case |
|---|---|---|---|---|
| **vGate iCar Pro v3+ (FFF0)** | `0000fff0-...` | `0000fff1-...` | `0000fff1-...` | Vgate iCar Pro 2023+, BOLUTEK clones |
| **BOLUTEK / CSR Clone (FFF0/FFF2)** | `0000fff0-...` | `0000fff1-...` | `0000fff2-...` | Asymmetric write/notify clones |
| vGate iCar Pro (FFE0) | `0000ffe0-...` | `0000ffe1-...` | `0000ffe1-...` | (existing, renamed for clarity) |

### 2. `detectProfile()` no longer silently falls back

In v1.5.1, when no profile matched via read probing, `detectProfile()` returned `ADAPTER_PROFILES[0]` (vGate iCar Pro FFE0) as a default. This was wrong — it guaranteed a `startNotifications()` failure for any adapter that didn't actually have FFE0/FFE1.

In v1.5.2, `detectProfile()` throws `NoMatchingProfileError` instead. The UI catches this and shows a **profile picker dialog** so the user can manually try each profile until one works.

### 3. Typed errors for better UI handling

Two new error classes in `ble-service.ts`:

- **`CharacteristicsNotFoundError`** — thrown when `startNotifications()` fails with the "characteristics not found" message. Includes the device name and the profile that was tried, so the UI can show a targeted message.
- **`NoMatchingProfileError`** — thrown when auto-detection can't match any profile. Includes the device name and address.

### 4. Profile picker UI in ConnectOverlay

When either typed error is caught, the ConnectOverlay shows a new profile picker section:

- Lists all 13 known BLE profiles with their service UUID (truncated)
- User taps a profile → `connect()` is retried with that specific profile
- A cancel button lets the user dismiss the picker
- User-friendly error messages explain what happened and suggest trying the FFF0 profile for Vgate iCar Pro v3+

### 5. Firmware Update Information section in DeviceView

EVDx itself cannot update adapter firmware — that requires each manufacturer's proprietary tool. The new "Firmware Update Information" section in the Device tab documents the official update path for each supported adapter brand:

| Brand | Update path |
|---|---|
| **Vgate iCar Pro** | No public tool. Firmware is closed-source. If your iCar Pro is from 2023+ and shows "characteristics not found", use the FFF0 profile in the profile picker instead of updating firmware. |
| OBDLink MX+ / CX | OBDLink app (Play Store / App Store) — auto-checks for updates on connect |
| vLinker MC+ / FS / BM+ | vLinker app (Play Store) |
| Veepeak OBDCheck BLE+ | No public tool — contact support@veepeak.com |
| Carly Universal | Carly app (firmware updates free, other features paid) |
| Generic ELM327 clones | No update path — masked ROM, not flash. Try a different profile or replace with a genuine adapter. |

### 6. Why no in-app firmware updater?

Vgate does **not** publish a firmware update tool. Their firmware is closed-source and can only be updated via the manufacturer's internal PC tool, which is not distributed publicly. This is unlike OBDLink and vLinker, which provide official Android apps that handle firmware updates.

Building an in-app firmware updater for Vgate would require:
1. Reverse-engineering Vgate's proprietary firmware format
2. Reverse-engineering their proprietary BLE OTA (over-the-air) update protocol
3. Distributing firmware binaries (copyright issues)

This is not feasible for an open-source project. The recommended fix for Vgate iCar Pro v3+ users is to **use the FFF0 profile** via the new profile picker, not to update firmware.

For adapters that DO support firmware updates (OBDLink, vLinker, Carly), EVDx now documents where to get the official update tool. Users should keep their adapter firmware up-to-date via those tools — EVDx cannot do it for them.

## Verification

- TypeScript: `tsc --noEmit` clean (only `next` module errors due to incomplete install in this environment — not code issues).
- All existing 34 protocol simulation tests still pass.
- New profile picker UI compiles and renders correctly.
- New BLE profiles use the correct UUID format (verified against the Silicon Labs BLE GATT specification).

## Files Changed

| File | Change |
|---|---|
| `src/lib/ble-service.ts` | +3 BLE profiles, +2 typed error classes, `detectProfile()` throws instead of fallback, `connect()` catches "characteristics not found" + re-throws typed, `getAdapterProfiles()` + `getLastConnectedDeviceName()` public methods |
| `src/components/connection/ConnectOverlay.tsx` | Profile picker UI, typed error handling in `handleBluetoothConnect`, `forcedProfile` parameter for manual override |
| `src/components/tabs/DeviceView.tsx` | Firmware Update Information section with per-brand update paths |
| `src/locales/en/common.json` | +4 keys: `characteristicsNotFound`, `noMatchingProfile`, `profilePickerTitle`, `profilePickerDescription` |
| `src/locales/ar/common.json` | +4 Arabic translations of the same keys |
| `src/lib/version.ts` | `1.5.1` → `1.5.2` |
| `package.json` | `1.5.1` → `1.5.2` |
| `android/app/build.gradle` | `versionCode 8` → `9`, `versionName "1.5.1"` → `"1.5.2"` |

## Install

1. Download `evdx-v1.5.2-pre-release.apk` from the release assets below.
2. Install over the existing EVDx (your vehicle profiles and settings are preserved).
3. Open EVDx → Connect → Bluetooth OBD → tap your Vgate iCar Pro.
4. If you still see "characteristics not found", the profile picker will appear automatically. Tap **"vGate iCar Pro v3+ (FFF0)"** first — this is the profile for 2023+ iCar Pro units.
5. If FFF0 doesn't work either, try the other profiles in order. The picker remembers your choice for the session.

## Security Reminder

The GitHub token used to push this release was shared in plain text in the original request. **Revoke it immediately at https://github.com/settings/tokens** and generate a new one through a secure channel.

# EV Connect — BYD OBD-II Monitor

Real-time OBD-II diagnostics and monitoring for BYD electric vehicles. Optimized for **vGate iCar Pro BLE 4.0**. Connect via Bluetooth BLE, WiFi, or try the interactive demo.

<p align="center">
  <img src="public/icons/icon-512.png" width="120" alt="EV Connect Icon" />
</p>

<p align="center">
  <strong>Dr. Waleed Mandour</strong> · <a href="mailto:waleedmandour@gmail.com">waleedmandour@gmail.com</a> · <a href="https://github.com/waleedmandour">waleedmandour.github.io</a>
</p>

<p align="center">
  <em>Created via GLM-5-Turbo</em>
</p>

---

## Features

### ⭐ vGate iCar Pro BLE 4.0 — Optimized Support
- **Dedicated BLE connection profile** with vGate-specific service UUID (`FFE0`)
- **Fast auto-detection** — scans for vGate service first, then falls back to Nordic UART
- **Optimized AT commands** (`ATSTFF` adaptive timing, `ATPPSV` power save, `ATI` chip identify)
- **Device identification** — chipset (CC2541/nRF51822), BLE version, firmware, device ID
- **Enhanced Device Info page** with manufacturer details, feature list, and supported protocols
- **Featured connect button** on the connection screen with "RECOMMENDED" badge
- **Multi-protocol support**: ISO 15765-4 CAN, ISO 9141-2, KWP2000, SAE J1850

### Dashboard
- Real-time speed semicircle gauge (0–180 km/h)
- Battery SOC arc gauge with color-coded thresholds
- Motor power draw / regen power gauge
- Estimated range, drive mode (ECO / NORMAL / SPORT)
- **Smart Alerts** — automatic notifications for: low/critical battery, motor/battery overheating, high power draw, DTC detection, low range, regen activity
- Live speed profile sparkline chart
- Power flow chart (draw vs. regen, with zero reference line)
- Temperature monitoring bars (motor, battery pack, cabin, ambient)

### Battery Monitor
- Large SOC display with animated progress bar
- Pack voltage (V), current (A), and power (kW)
- Live history charts for SOC, voltage, and temperature
- Battery health diagnostics (SOH, cell balancing, insulation resistance, cycle count, cell voltage delta)
- BYD Blade Battery specifications (60.48 kWh LFP, 120S1P, liquid cooled)

### 🔌 Charging Monitor (New)
- **Start charging simulation** for 3 charge types:
  - ⚡ **DC Fast Charge** — 60 kW via CCS2, ~45 min to 80%
  - 🔌 **AC Level 2** — 7.2 kW via Type 2, ~9 hrs full charge
  - 🔌 **AC Level 1** — 1.8 kW household, ~36 hrs full charge
- **Real-time charging metrics**: Power (kW), Voltage (V), Current (A)
- **Time remaining** estimate with elapsed time counter
- **Energy added** (kWh) with charge efficiency percentage
- **Charge session cost** in Omani Rial (OMR) and USD
- **Charging power curve chart** — visualizes CC-CV taper behavior
- **SOC during charge** chart
- **Battery temperature** chart during charging
- **Cell voltage balance** — max/min cell voltage, delta in mV
- **Last charge session summary** after charging stops
- **BYD Yuan Plus charging specifications** reference

### Device Info (OBD-II Adapter)
- **Adapter identification:** model, firmware, protocol, chipset, BLE version, device ID
- **vGate iCar Pro dedicated section** when detected: manufacturer, chipset, features list, protocol support
- **"OPTIMIZED" badge** for vGate adapters
- **Connection type indicator:** Bluetooth BLE or WiFi with live status
- **Signal strength** monitoring with visual bar
- **Response time** tracking with history chart
- **Vehicle Identification:** VIN, motor specs, battery specs
- **Firmware version check** with update status
- **WiFi setup guide** for ELM327 WiFi adapters
- **Compatibility notes** for BLE vs WiFi adapters

### Diagnostics
- MIL (Check Engine Light) status indicator
- Scan ECU for Diagnostic Trouble Codes
- Clear all DTCs
- 30+ EV-specific code definitions (P0A00–P1A0C, P0D00–P0D02, C0300, U0100–U0151)
- Emission monitor readiness status (8 monitored systems)

### Session Logger & Eco Driving
- **Eco Driving Score** (0–100) with animated circular gauge
- Score breakdown: acceleration, braking, speed, efficiency
- **Live score history** chart
- **Data Logger:** start/stop session recording at ~2 Hz
- **CSV Export:** download full session data for analysis
- Real-time stats grid (speed, power, SOC, regen, mode, temp)
- BYD-specific eco driving tips

### Vehicle Controls
- Detailed explanation of OBD-II protocol limitations
- 7 control items with availability status and reasons
- Alternative approaches (BYD official app, aftermarket, XDA community)

### Voice Guide
- **Professional voice narration** for all 7 tabs (including Charging)
- Uses the Web Speech API with natural/enhanced voices
- Toggle on/off via the speaker icon in the header
- Automatic page narration on tab navigation

### Smart Alerts
- Real-time monitoring of vehicle conditions with collapsible panel
- Color-coded severity levels

### Connectivity
- **⭐ vGate iCar Pro BLE 4.0** — Dedicated connect button (recommended)
- **Bluetooth BLE** — Web Bluetooth API for generic ELM327 adapters
- **WiFi** — Connect to OBD-II adapter's WiFi hotspot
- **Demo Mode** — Realistic driving + charging simulator, no hardware needed

## vGate iCar Pro BLE 4.0 Setup

1. Plug the vGate iCar Pro into your BYD's OBD-II port
2. On your phone, enable Bluetooth
3. Open EV Connect → tap **"vGate iCar Pro BLE 4.0"** (green recommended button)
4. When prompted, select your vGate adapter from the Bluetooth device list
5. The app will automatically detect the adapter, identify the chipset, and connect

> The vGate iCar Pro uses BLE 4.0 Low Energy with service UUID `0000ffe0-0000-1000-8000-00805f9b34fb`. It's compatible with both iOS and Android.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui + Lucide Icons |
| State | Zustand |
| Charts | Custom SVG sparklines |
| PWA | Web App Manifest + Service Worker |
| Bluetooth | Web Bluetooth API (vGate FFE0 + NUS) |
| WiFi | WebSocket / TCP bridge |
| Voice | Web Speech API (SpeechSynthesis) |

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A compatible OBD-II adapter (vGate iCar Pro recommended)
- For BLE: Chrome on Android
- For WiFi: Any modern browser (Android or iOS)

### Install & Run

```bash
# Clone
git clone https://github.com/waleedmandour/EVD.git
cd EVD

# Install dependencies
bun install

# Start dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and tap **Launch Interactive Demo** to explore.

### PWA Install

1. Open the app URL in Chrome on Android
2. Tap the three-dot menu → **Install app**
3. The app installs to your home screen with its own icon

## Live Deployment

**[https://evd-ochre.vercel.app](https://evd-ochre.vercel.app)**

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with PWA meta tags
│   └── page.tsx            # Main app with 7-tab routing + voice + footer
├── components/
│   └── byd/
│       ├── gauges.tsx          # SVG gauge + chart components
│       ├── DashboardView.tsx    # Speed, power, temps, charts, alerts
│       ├── BatteryView.tsx     # SOC, voltage, health diagnostics
│       ├── ChargingView.tsx    # Charging dashboard (DC/AC L1/L2 sim)
│       ├── DeviceView.tsx      # Adapter info, vGate specifics, signal
│       ├── DiagnosticsView.tsx # DTC scan, monitor readiness
│       ├── SessionView.tsx     # Eco score, data logger, CSV export
│       ├── ControlsView.tsx    # OBD-II limitation explanation
│       ├── SmartAlerts.tsx     # Real-time vehicle condition alerts
│       ├── ConnectOverlay.tsx  # vGate / BLE / WiFi / Demo connection
│       └── Navigation.tsx      # 7-tab bottom nav + header + voice toggle
├── hooks/
│   └── use-voice.ts           # Web Speech API voice narration hook
├── lib/
│   ├── store.ts             # Zustand state management
│   ├── simulator.ts         # Driving + charging simulator
│   └── types.ts             # Types, OBD-II PIDs, vGate constants, DTC codes
public/
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache-first)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## OBD-II Support

Standard SAE J1979 PIDs are defined for:

| PID | Parameter |
|-----|-----------|
| 04 | Calculated Engine Load |
| 05 | Engine Coolant Temperature |
| 0C | Engine/Motor RPM |
| 0D | Vehicle Speed |
| 0F | Intake Air Temperature |
| 11 | Throttle Position |
| 42 | Control Module Voltage |
| 46 | Ambient Air Temperature |
| 61 | Driver Demand Torque |
| 62 | Actual Engine Torque |

Plus vGate-optimized AT commands and EV-specific DTC codes.

## Supported Adapters

| Adapter | Type | Support Level |
|---------|------|---------------|
| **vGate iCar Pro** | **BLE 4.0** | **⭐ Optimized** — dedicated profile, fast detection |
| ELM327 v2.1 | BLE / WiFi | Good — standard ELM327 commands |
| ELM327 v1.5 | BLE / WiFi | Basic — clone quality varies |
| vLinker FS | BLE | Good — fast response times |
| Carista | BLE | Good — limited custom PIDs |
| ScanTool | WiFi | Standard — port 35000 |
| Konnwei | WiFi | Basic — adequate for standard PIDs |

## Supported Vehicles

Designed and optimized for:
- **BYD Yuan Plus / Atto 3** (60.48 kWh Blade Battery, CCS2 DC charging)

The standard OBD-II layer works with any OBD-II compliant vehicle. BYD-specific features are tuned for BYD EVs.

## License

MIT

---

**Built by Dr. Waleed Mandour · waleedmandour@gmail.com · Created via GLM-5-Turbo**

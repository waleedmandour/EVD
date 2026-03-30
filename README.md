# EV Connect — BYD OBD-II Monitor

Real-time OBD-II diagnostics and monitoring for BYD electric vehicles. Connect via Bluetooth BLE adapter or try the interactive demo.

<p align="center">
  <img src="public/icons/icon-512.png" width="120" alt="EV Connect Icon" />
</p>

## Features

### Dashboard
- Real-time speed semicircle gauge (0–180 km/h)
- Battery SOC arc gauge with color-coded thresholds
- Motor power draw / regen power gauge
- Estimated range, drive mode (ECO / NORMAL / SPORT)
- Live speed profile sparkline chart
- Power flow chart (draw vs. regen, with zero reference line)
- Temperature monitoring bars (motor, battery pack, cabin, ambient)

### Battery Monitor
- Large SOC display with animated progress bar
- Pack voltage (V), current (A), and power (kW)
- Live history charts for SOC, voltage, and temperature
- Battery health diagnostics (SOH, cell balancing, insulation resistance, cycle count, cell voltage delta)
- BYD Blade Battery specifications (60.48 kWh LFP, 120S1P, liquid cooled)

### Diagnostics
- MIL (Check Engine Light) status indicator
- Scan ECU for Diagnostic Trouble Codes
- Clear all DTCs
- 30+ EV-specific code definitions (P0A00–P1A0C, P0D00–P0D02, C0300, U0100–U0151)
- Emission monitor readiness status (8 monitored systems)

### Trip Computer
- Energy efficiency rating (Wh/km) with Excellent / Good / Average / High scale
- Distance, duration, average / max speed
- Total energy consumed (kWh)
- Regenerative braking energy recovered with recovery ratio
- Trip cost estimates in OMR and USD

### Vehicle Controls
- Detailed explanation of OBD-II protocol limitations
- 7 control items with availability status and reasons
- Alternative approaches (BYD official app, aftermarket, XDA community)

### Connectivity
- **Bluetooth BLE** — Web Bluetooth API for ELM327 adapters (Chrome on Android)
- **Demo Mode** — Realistic driving simulator, no hardware needed

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
| Bluetooth | Web Bluetooth API (BLE GATT) |

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A BLE-compatible ELM327 OBD-II adapter (v1.5+) for live data

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

The app is a Progressive Web App. In Chrome on Android:
1. Open the app URL
2. Tap the three-dot menu → **Install app**
3. The app installs to your home screen with its own icon

### Connect to Your BYD

1. Plug a BLE ELM327 adapter into the OBD-II port (under the steering wheel)
2. Open EV Connect
3. Tap **Connect BLE OBD-II Adapter**
4. Select your adapter from the pairing dialog
5. Live data streams to the dashboard

> **Note:** Works with Chrome on Android. iOS does not support Web Bluetooth for OBD-II adapters.

## OBD-II Support

Standard SAE J1979 PIDs are defined for:

| PID | Parameter |
|-----|-----------|
| 04 | Calculated Engine Load |
| 05 | Engine Coolant Temperature |
| 0C | Engine/Motor RPM |
| 0D | Vehicle Speed |
| 0F | Intake Air Temperature |
| 42 | Control Module Voltage |
| 46 | Ambient Air Temperature |
| 4C | Engine Reference Torque |
| 61 | Driver Demand Torque |
| 62 | Actual Engine Torque |

Plus additional EV-specific DTC codes for BYD powertrain systems.

## Supported Vehicles

Designed and tested for:
- **BYD Yuan Plus / Atto 3** (60.48 kWh Blade Battery)

The standard OBD-II layer works with any OBD-II compliant vehicle. BYD-specific features (battery specs, DTC definitions) are tuned for BYD EVs.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with PWA meta tags
│   └── page.tsx            # Main app with tab routing
├── components/
│   └── byd/
│       ├── gauges.tsx      # SVG gauge + chart components
│       ├── DashboardView.tsx
│       ├── BatteryView.tsx
│       ├── DiagnosticsView.tsx
│       ├── TripView.tsx
│       ├── ControlsView.tsx
│       ├── ConnectOverlay.tsx
│       └── Navigation.tsx
├── lib/
│   ├── store.ts            # Zustand state management
│   ├── simulator.ts        # Realistic EV driving simulator
│   └── types.ts            # TypeScript types, OBD-II PID definitions, DTC codes
public/
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (cache-first static, network-first navigation)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## License

MIT

---

**Built with Next.js, Tailwind CSS, and Zustand.**

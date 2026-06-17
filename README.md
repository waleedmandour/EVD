# ⚡ EVDx — Universal EV Diagnostics Pro

**Professional electric vehicle diagnostics companion — built with privacy at its core.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)]()
[![Privacy-First](https://img.shields.io/badge/Privacy-100%25%20On--Device-red.svg)]()

**Author:** Dr. Waleed Mandour
**Email:** waleedmandour@gmail.com
**Email2:** w.abumandour@squ.edu.om
**Version:** 1.5.1
**License:** © 2026 Dr. Waleed Mandour

---

## 📦 Download Latest Release

> **EVDx v1.5.1** — Universal BLE device discovery, smart profile detection, all devices visible in scan. Build infrastructure upgraded with JDK 21 + Android SDK 36.

[![Download APK](https://img.shields.io/badge/Download-EVDx%20v1.5.1%20APK-blue?style=for-the-badge&logo=android)](https://github.com/waleedmandour/EVD/releases/tag/v1.5.1)

| Asset | Description |
|---|---|
| 📦 [EVDx-v1.5.1.apk](https://github.com/waleedmandour/EVD/releases/download/v1.5.1/EVDx-v1.5.1.apk) | Android APK (25 MB) |
| 📘 [User Guide (English)](https://github.com/waleedmandour/EVD/releases/download/v1.3.0-pre-release/EVDx-UserGuide-EN-v1.3.0.pdf) | Complete English guide (8 pages) |
| 📗 [دليل المستخدم (العربية)](https://github.com/waleedmandour/EVD/releases/download/v1.3.0-pre-release/EVDx-UserGuide-AR-v1.3.0.pdf) | دليل عربي كامل (8 صفحات) |

**Installation:**
1. Download the APK from the [Releases page](https://github.com/waleedmandour/EVD/releases/tag/v1.5.1)
2. Enable "Install from Unknown Sources" in your Android settings
3. Open the downloaded APK and tap **Install**
4. Launch EVDx and follow the onboarding wizard

**System Requirements:** Android 7.0 (API 24) or later, Bluetooth LE recommended

---

## 🌟 Overview

EVDx is a **production-grade universal EV diagnostic application** that transforms your Android phone into a professional-grade electric vehicle diagnostic tool. Connect via Bluetooth or WiFi OBD-II adapters to access real-time telemetry, battery health analytics, fault code scanning, charging session management, and more — all with **zero cloud dependency and zero telemetry**.

### Key Differentiators

- **🔒 Privacy-First:** No internet permission in AndroidManifest. All data stays on-device. Zero cloud. Zero telemetry. Zero analytics.
- **🌍 Universal:** Supports 16+ EV brands worldwide with brand-specific OBD profiles and proprietary PIDs
- **🧠 Intelligent:** Bilingual voice assistant (English/Arabic) with 90+ commands across 3 Arabic dialects, on-device TTS/STT
- **📊 Comprehensive:** 500+ DTC codes database covering all major EV systems
- **📄 Report Generation:** Professional PDF reports for battery health, diagnostic scans, and trip summaries
- **🌐 Bilingual:** Full English and Arabic support with complete RTL layout

---

## 📱 Features

### Primary Navigation (5 tabs + Quick Menu)

| Tab | Description |
|---|---|
| 🏠 **Dashboard** | Live speed gauge, SOC, power, temperatures, drive mode, smart alerts, mini sparkline charts |
| 🔋 **Battery** | SOC/SOH tracking, cell voltage analysis, thermal management, capacity charts, PDF report generation |
| ⚡ **Charging** | Real-time charging session tracking, DC/AC charge type selection, cost calculator (OMR/USD), cell voltage balance chart, charge curve visualization |
| 🔍 **Diagnostics** | Full DTC scan/clear, MIL indicator, severity-coded fault list with causes & fixes, monitor readiness grid, PDF report generation |
| ⚙️ **Settings** | Language toggle (EN/AR), voice assistant, alert thresholds, AI features access, units, data export/delete, privacy policy, credits |

### Quick Menu (expandable above nav)

| Tab | Description |
|---|---|
| 📈 **Live Data** | Multi-parameter graphing (up to 6 simultaneous), time window selection (30s/5min/30min), CSV export |
| 🗺️ **Sessions** | Trip logging with start/stop, eco-score breakdown, EV vs ICE cost comparison, CO₂ savings calculator |
| 🔧 **Maintenance** | Service tracker with next-due reminders, 7 service types, cost tracking, full service history log |
| 📡 **Device** | Adapter info, signal strength, connection quality, clone detection, VIN display, supported adapter list |

### AI Features

| Feature | Description |
|---|---|
| 🧠 **AI Battery Predictor** | Degradation forecasting, health grading (A+ to F), risk factor detection, personalized care recommendations |
| 🛡️ **AI Smart DTC Analyzer** | Root cause analysis correlating multiple fault codes, action plans with priority levels, estimated repair costs |
| 🌿 **AI Eco-Driving Coach** | Real-time driving score breakdown, personalized range optimization tips, regen braking coaching |

### Onboarding Flow

5-step guided setup: Splash → Language Selection → Privacy Consent → Vehicle Setup (brand/model/battery) → Adapter/Demo Connection

### Voice Assistant (v1.3.0 — Major Upgrade)

Floating mic + summarize buttons with on-device speech recognition and enhanced TTS:

**90+ voice command phrases** across **3 Arabic dialects** and English:

| Dialect | Example Commands |
|---|---|
| **Modern Standard Arabic** | حالة البطارية، المدى، أعطال، تشخيص، الإعدادات، ملخص |
| **Gulf Arabic** | كم الشحن، كم اقدر امشي، ايش العطل، وصّل، اشبك، لخّص، سبورت |
| **Egyptian Arabic** | قد ايه الشحن، هاوصل فين، الموتور، سكان، التابلو، اقرألي، ديمو |
| **English** | battery, battery health, range, scan faults, clear codes, summarize, help |

**20+ command categories** supported:
- **Navigation:** dashboard, battery, charging, sessions, maintenance, settings, diagnostics
- **Data queries:** battery level, battery health, range, motor temp, speed, temperature, cell voltage
- **Actions:** clear codes, export report, demo mode, connect/disconnect adapter
- **Voice control:** read aloud, stop reading, summarize page, voice help, mute alerts
- **Drive modes:** eco, sport, normal
- **Intelligent sub-detection:** "صحة البطارية" gives health-specific SOH response; "شحن البطارية" gives charge level

**Enhanced TTS** for natural voice output:
- Severity-aware prosody (normal/warning/critical with distinct rate and pitch)
- DTC codes spelled character-by-character (e.g., P, 0, A, 8, 0)
- Arabic acronym substitution (BMS → "نظام إدارة البطارية", SOC → "حالة الشحن", 22+ acronyms)
- Natural comma pauses at sentence boundaries
- Visual feedback overlay with transcript display
- Page summarization via Sparkles button

---

## 🚗 Supported Vehicles (17+ Brands, 90+ Models)

| Brand | Models | Chemistry | Custom PIDs | OBD Protocol |
|---|---|---|---|---|
| **BYD** | Yuan Plus, Atto 3, Han, Tang, Seal, Dolphin, Seagull, Atto 2, Sealion 6 | LFP (Blade) | 0x2101–0x210A | CAN 29-bit |
| **Tesla** | Model 3, Y, S, X, Cybertruck | NCA/NMC/LFP | 0x2210–0x2260 | CAN 11-bit |
| **Nissan** | Leaf (ZE0/ZE1/Ariya) | NMC/LFP | 0x5B9x | CAN 11-bit |
| **Hyundai/Kia** | Ioniq 5/6, EV6, EV9, Kona, Niro | NCM | 0x2100–0x21FF | CAN 11-bit |
| **VW Group** | ID.3/4/5/7, Q4 e-tron, Enyaq, Taycan, Macan EV | NMC | UDS 0x22xx | CAN 29-bit |
| **Mercedes-Benz** | EQS, EQE, EQA, EQB, EQC, EQV | NMC | 0x2200–0x22FF | CAN 29-bit |
| **BMW** | iX3, i4, iX, i5, i7 | NMC | 0xD0xx | CAN 29-bit |
| **GM (Chevy/Cadillac)** | Bolt EV/EUV, Lyriq, Equinox EV, Blazer EV | NMC/LFP | 0x22xx | CAN 11-bit |
| **Rivian** | R1T, R1S, R2 | NMC/LFP | 0x2200–0x22FF | CAN 29-bit |
| **XPeng** | G6, G9, P7, P5, G3 | NMC/LFP | 0x2210–0x22FF | CAN 29-bit |
| **NIO** | ET5, ET7, ES6, ES8, EC6, EL7 | NMC/LFP | 0x2200–0x22FF | CAN 29-bit |
| **MG/SAIC** | ZS EV, MG4, Marvel R | NMC/LFP | 0x2200–0x22FF | CAN 29-bit |
| **Geely** | Zeekr 001/009/X/7X, Galaxy E8, Geometry C/A, Polestar 2 (SEA) | NMC/LFP | 0x2901–0x290A | CAN 29-bit |
| **Chery** | Omoda E5, Jaecoo 7 EV | LFP/NMC | 0x2B01–0x2B0A | CAN 29-bit |
| **Honda** | e, Prologue | NMC | 0x22xx | CAN 11-bit |
| **Toyota** | bZ4X, Lexus RZ, UX300e | NMC | 0x22xx | CAN 11-bit |
| **Generic OBD-II** | Any SAE J1979 compliant EV | — | Standard PIDs | SAE J1979 |

See [VEHICLES.md](VEHICLES.md) for the complete vehicle database with all models, specifications, and custom PIDs.

---

## 📡 Supported OBD Adapters

| Adapter | BLE Profile | Quality | Notes |
|---|---|---|---|
| **vGate iCar Pro** | FFE0/FFE1 | ⭐⭐⭐⭐⭐ | Primary development target |
| **OBDLink MX+** | 18F0/2AF0/2AF1 | ⭐⭐⭐⭐⭐ | Professional-grade, STN chip |
| **OBDLink CX** | 18F0/2AF0/2AF1 | ⭐⭐⭐⭐⭐ | Compact BLE, STN chip |
| **vLinker MC+** | Nordic NUS | ⭐⭐⭐⭐⭐ | High-speed diagnostics |
| **vLinker FS** | Nordic NUS | ⭐⭐⭐⭐ | Ford-specific adapter |
| **vLinker BM+** | Nordic NUS | ⭐⭐⭐⭐ | BMW-specific adapter |
| **Veepeak OBDCheck BLE+** | FFE0/FFE1/FFE2 | ⭐⭐⭐⭐ | Reliable, alternate notify |
| **ELM327 Generic** | FFE0/FFE1 | ⭐⭐⭐ | Budget-friendly, clone detection |
| **Carly Universal** | FFE0/FFE1 | ⭐⭐⭐ | Compatible |
| **LEMON OBD2** | FFE0/FFE1 | ⭐⭐⭐ | Compatible |

WiFi ELM327 adapters also supported (default: IP 192.168.0.10, Port 35000).

### ELM327 Initialization Sequence

On connection, EVDx runs a complete ELM327 initialization per the ELM Electronics datasheet:

```
ATD  → Set defaults          ATZ  → Hardware reset
ATE0 → Echo off              ATL0 → Linefeeds off
ATS0 → Spaces off            ATH0 → Headers off
ATAT1→ Adaptive timing       ATSP0→ Auto protocol detect
ATST64→ 100ms timeout        ATI  → Identify device
AT@1 → Device description   AT@2 → Device identifier
ATDP → Describe protocol    0100 → Validate vehicle comm
```

### OBD-II Protocol Support

EVDx supports all SAE J1979 OBD-II protocols via ATSP auto-detection:

| Code | Protocol |
|---|---|
| 0 | Automatic (default) |
| 6 | ISO 15765-4 CAN (11-bit, 500 kbaud) — **Most EVs** |
| 7 | ISO 15765-4 CAN (29-bit, 500 kbaud) — **BYD, VW, Mercedes** |
| 8 | ISO 15765-4 CAN (11-bit, 250 kbaud) |
| 9 | ISO 15765-4 CAN (29-bit, 250 kbaud) |
| A | SAE J1939 CAN (29-bit, 250 kbaud) |
| 1-5 | Legacy protocols (J1850, ISO 9141, KWP2000) |

### Clone Detection

EVDx automatically detects clone ELM327 chips:
- **STN chips** (OBDLink, ScanTool.net): Identified as genuine, high-quality adapters
- **Genuine ELM327** (v1.x): Rare, identified by firmware string
- **PIC clones** (most "v2.x"): Detected and flagged, basic OBD-II works but advanced features may be unreliable

See [ADAPTERS.md](ADAPTERS.md) for the complete adapter compatibility list.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                   EVDx App                   │
│            (Next.js 16 + React 19)           │
├─────────────────────────────────────────────┤
│  UI Layer (shadcn/ui + Tailwind CSS 4)       │
│  ├── Dashboard    ├── Charging               │
│  ├── Battery      ├── Diagnostics            │
│  ├── Live Data    ├── Sessions               │
│  ├── Maintenance  ├── Device                 │
│  └── Settings     └── Onboarding             │
├─────────────────────────────────────────────┤
│  State Management (Zustand + persist)         │
│  i18n (react-i18next, EN/AR, full RTL)       │
│  Charts (Recharts)                           │
│  Animations (Framer Motion)                  │
├─────────────────────────────────────────────┤
│  Capacitor 8 Native Bridge                   │
│  ├── @capacitor-community/bluetooth-le       │
│  ├── @capacitor-community/sqlite             │
│  ├── @capacitor-community/text-to-speech     │
│  └── @capacitor-community/speech-recognition │
├─────────────────────────────────────────────┤
│              Android APK                      │
│  ├── No INTERNET permission (privacy)        │
│  ├── BLE for OBD adapter connectivity        │
│  ├── On-device SQLite with SQLCipher         │
│  └── On-device TTS/STT for voice assistant   │
└─────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.1 (static export) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui |
| **State** | Zustand 5 with persist middleware |
| **Charts** | Recharts 2.15 |
| **Animations** | Framer Motion 12 |
| **i18n** | react-i18next 17 (EN/AR, full RTL) |
| **Native** | Capacitor 8 (Android) |
| **BLE** | @capacitor-community/bluetooth-le 8 |
| **Database** | @capacitor-community/sqlite 8 (SQLCipher) |
| **TTS** | @capacitor-community/text-to-speech 8 (enhanced prosody) |
| **STT** | @capacitor-community/speech-recognition 7 |
| **PDF** | jsPDF (on-device generation) |
| **Icons** | Lucide React |
| **Language** | TypeScript 5 |

---

## 📊 DTC Database

EVDx includes a comprehensive **500+ Diagnostic Trouble Code** database covering all major EV systems:

| Code Range | System | Example Codes |
|---|---|---|
| **P0Axx** | Electric/Hybrid Powertrain | P0A00 (Inverter Temp), P0A04 (Motor Phase U), P0A80 (Replace Battery) |
| **P0Bxx** | Battery Pack | P0B00 (Pack voltage), P0B10 (Cell imbalance), P0B80 (Isulation monitor) |
| **P0Cxx** | Charging System | P0C00 (Charger input), P0C72 (CCID), P0C80 (DC-DC converter) |
| **P0Dxx** | Drive Motor | P0D00 (Phase V current), P0D26 (Resolver), P0D40 (Motor overtemp) |
| **P0Exx** | Power Inverter | P0E00 (Gate driver), P0E10 (DC link voltage), P0E30 (IGBT temp) |
| **P1xxx** | Manufacturer-Specific | BYD, Tesla, Nissan, Hyundai, VW Group proprietary codes |
| **C0xxx** | Chassis/ABS | C0035 (Steering angle), C0186 (Brake pressure), C0561 (Chassis CAN) |
| **B0xxx** | Body/BMS | B0010 (Battery management), B1000 (ECU internal), B1415 (Coolant valve) |
| **U0xxx** | Network/Communication | U0100 (CAN bus off), U0140 (Lost comms with BCM), U0300 (Software incompat) |

Each DTC entry includes: code, title, description, possible causes, suggested fixes, severity level, and clearability status.

---

## 📄 PDF Report Generator

Generate professional reports on-device (no cloud, no server):

- **Battery Health Report:** SOC, SOH, cell analysis, thermal management, degradation metrics
- **Diagnostic Scan Report:** MIL status, DTC list with severity, causes, and recommended fixes
- **Trip Summary Report:** Distance, energy consumption, eco-score breakdown, cost analysis
- **Full Vehicle Report:** Complete vehicle snapshot combining all data sections

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm/bun
- **Android Studio** (for APK build)
- **Java JDK** 17+

### Development (Web/PWA)

```bash
# Clone the repository
git clone https://github.com/waleedmandour/EVD.git
cd EVD

# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser at http://localhost:3000
```

### Build Android APK

```bash
# Quick build using the build script
chmod +x build-apk.sh
./build-apk.sh

# Or manually:
npm run build          # Build Next.js static export
npx cap sync android   # Sync web assets to Android
cd android
./gradlew assembleRelease  # Build release APK

# APK output: android/app/build/outputs/apk/release/app-release.apk
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Build Next.js static export |
| `npm run lint` | Run ESLint |
| `npm run cap:sync` | Sync web assets to Android |
| `npm run cap:open:android` | Open Android project in Android Studio |
| `npm run apk:build` | Build release APK |

---

## 📁 Project Structure

```
EVD/
├── android/                          # Capacitor Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml   # No INTERNET permission
│   │   │   ├── java/.../MainActivity.java
│   │   │   └── res/
│   │   │       ├── xml/network_security_config.xml
│   │   │       └── values/strings.xml
│   │   └── build.gradle
│   └── gradle/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with metadata
│   │   ├── page.tsx                 # Main app page (9-tab layout)
│   │   └── globals.css              # Dark theme, RTL, animations
│   ├── components/
│   │   ├── tabs/                    # 9 tab view components
│   │   │   ├── DashboardView.tsx
│   │   │   ├── BatteryView.tsx
│   │   │   ├── ChargingView.tsx
│   │   │   ├── DiagnosticsView.tsx
│   │   │   ├── LiveDataView.tsx
│   │   │   ├── SessionsView.tsx
│   │   │   ├── MaintenanceView.tsx
│   │   │   ├── DeviceView.tsx
│   │   │   └── SettingsView.tsx
│   │   ├── connection/
│   │   │   └── ConnectOverlay.tsx   # BLE/WiFi/Demo connection
│   │   ├── onboarding/
│   │   │   └── OnboardingFlow.tsx   # 5-step setup wizard
│   │   ├── voice/
│   │   │   └── VoiceAssistant.tsx   # Bilingual voice assistant
│   │   ├── navigation/
│   │   │   └── BottomNav.tsx        # 9-tab bottom navigation
│   │   ├── shared/
│   │   │   └── Gauges.tsx           # SpeedGauge, CircleGauge, MiniChart, TempBar
│   │   ├── I18nProvider.tsx
│   │   └── ui/                      # 35+ shadcn/ui components
│   ├── lib/
│   │   ├── store.ts                 # Zustand store (full state management)
│   │   ├── types.ts                 # TypeScript type definitions
│   │   ├── i18n.ts                  # i18next configuration
│   │   ├── db.ts                    # On-device persistence layer
│   │   ├── dtc-codes.ts             # 500+ DTC code database
│   │   ├── simulator.ts             # Multi-brand driving/charging simulator
│   │   ├── speech.ts                # Enhanced speech formatter for natural TTS
│   │   ├── utils.ts                 # Utility functions
│   │   └── pdf/
│   │       └── report-generator.ts  # PDF report generation
│   ├── data/
│   │   └── vehicles.json            # 16+ brand vehicle database
│   ├── locales/
│   │   ├── en/                      # English translations (11 files)
│   │   └── ar/                      # Arabic translations (11 files)
│   └── hooks/                       # Custom React hooks
├── public/
│   ├── icons/                       # App icons
│   ├── logo.svg
│   └── manifest.json
├── capacitor.config.ts              # Capacitor configuration
├── next.config.ts                   # Next.js static export config
├── tailwind.config.ts               # Tailwind CSS configuration
├── build-apk.sh                     # One-command APK build script
├── PRIVACY.md                       # Privacy policy (EN/AR)
├── VEHICLES.md                      # Vehicle database documentation
├── ADAPTERS.md                      # Adapter compatibility list
└── package.json
```

---

## 🔒 Privacy & Security

EVDx is built with a **privacy-first architecture**:

- **Network security config** blocks all non-local traffic — WiFi only for local ELM327 adapter connections (192.168.x.x, 10.x.x.x)
- **No cloud services** — all data processing and storage is on-device
- **No analytics SDKs** — no Firebase, Google Analytics, Sentry, or any tracking
- **No user accounts** — no registration, no login, no server-side data
- **No crash reporting** — errors are handled locally only
- **Voice processing on-device** — TTS/STT uses Android's built-in capabilities
- **Data export** — all data is exportable as CSV, JSON, or PDF at any time
- **Data deletion** — one-tap delete all data in Settings

See [PRIVACY.md](PRIVACY.md) for the full bilingual privacy policy.

---

## 🎨 Design System

### Color Palette

| Token | Color | Hex |
|---|---|---|
| Background | Dark | `#0D1117` |
| Surface | Dark Blue | `#1A2332` |
| Primary | Electric Cyan | `#00D2FF` |
| Purple | Accent | `#7B2FBE` |
| Green | Success/Good | `#00E676` |
| Warning | Caution | `#FFB300` |
| Critical | Error/Danger | `#FF3D00` |
| Text | Light | `#E8EAF6` |
| Text Secondary | Muted | `#78909C` |

### RTL Support

Full right-to-left support for Arabic:
- Dynamic `dir` attribute based on language setting
- Mirrored layout for navigation, cards, and text
- Arabic-specific EV terminology glossary
- Bidirectional voice commands

---

## 📝 License

© 2026 Dr. Waleed Mandour. All rights reserved.

See [LICENSE](LICENSE) for details.

---

## 👤 Author

**Dr. Waleed Mandour**

- Email: waleedmandour@gmail.com
- University Email: w.abumandour@squ.edu.om
- GitHub: [@waleedmandour](https://github.com/waleedmandour)
- Website: waleedmandour.org

---

## 🙏 Acknowledgments شكر واجب

- **SAE International** for the J1979 OBD-II standard
- **ELM Electronics** for the ELM327 command set and datasheet
- **ISO** for the 15765-4 CAN bus protocol standard
- **OBDTester.com** for ELM327 AT command reference
- **Capacitor** by Ionic for the native bridge
- **shadcn/ui** for the component library
- **Multi-AI Agent Systems** — This application was built with the support of multi-AI agents including **GLM-5.1 (2026)** by Z.ai, which contributed to code development, debugging, and architecture decisions
- The global EV community for feedback and testing

---

## 🕊️ Dedication إهداء

أُهدي هذا المشروع إلى مجتمع السيارات الكهربائية في العالم العربي، سواء في مصر أو الأردن أو عمان أو المغرب أو أي بلد عربي. فقد صممت هذه الأداة لتكون عوناً لكم في العناية بمركباتكم بكل سهولة. نفعنا الله وإياكم.

I dedicate this project to the Arab EV community, whether in Egypt, Jordan, Oman, Morocco, or any other Arab country. I designed this tool to help you care for your vehicles with ease. May it be of benefit to us all.

---

## 📜 Disclaimer تنويه

**English:**

This project is an independent, self-funded initiative developed solely by Dr. Waleed Mandour. It is not sponsored, endorsed, funded, or affiliated with any company, institution, organization, or commercial entity — including but not limited to vehicle manufacturers, OBD adapter vendors, or software corporations. All development costs, hosting, and maintenance are borne entirely by the developer. This tool is provided as-is to support the global electric vehicle community, with no commercial intent or financial backing whatsoever.

**العربية:**

هذا المشروع مبادرة مستقلة يمولها المطوّر بالكامل من ميزانيته الشخصية، أنشأها الدكتور وليد مندور بمفرده دون أي دعم خارجي. لا يحظى هذا المشروع برعاية أو تمويل أو إقرار أو انتماء من أي شركة أو مؤسسة أو منظمة أو جهة تجارية — بما في ذلك على سبيل المثال لا الحصر مصنعي المركبات أو بائعي محولات OBD أو شركات البرمجيات. تتحمل التكاليف التطويرية والاستضافة والصيانة بالكامل على عاتق المطوّر. تُقدَّم هذه الأداة كما هي لدعم مجتمع السيارات الكهربائية العالمي، دون أي هدف تجاري أو دعم مالي من أي جهة كانت.

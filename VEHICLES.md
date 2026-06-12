# 🚗 EVDx Supported Vehicles Database

**Version:** 1.0.0  
**Author:** Dr. Waleed Mandour

EVDx supports **18 electric vehicle brands** with **82+ models** worldwide. Each brand has custom OBD profiles, proprietary PIDs, and brand-specific diagnostic capabilities.

## Supported Brands

### 1. BYD (比亚迪)
- **Models:** Yuan Plus, Atto 3, Han, Tang, Seal, Dolphin, Seagull, Atto 2, Sealion 6
- **Battery Chemistry:** LFP (Blade Battery)
- **OBD Protocol:** CAN 29-bit
- **Custom PIDs:** 0x2101–0x210A (BMS data)
- **Charging:** DC max 60 kW, AC max 7.2 kW, CCS2 port
- **ECU Addresses:** BMS 0x7E4, MCU 0x7E1, OBC 0x7E6

### 2. Tesla
- **Models:** Model 3, Model Y, Model S, Model X, Cybertruck
- **Battery Chemistry:** NCA/NMC + LFP (Model 3 SR)
- **OBD Protocol:** CAN 29-bit (variable DBC)
- **Custom PIDs:** 0x2110–0x2119
- **Charging:** DC max 250 kW (V3 Supercharger), AC max 11.5 kW, NACS/CCS1

### 3. Nissan
- **Models:** Leaf (ZE1), Ariya
- **Battery Chemistry:** NMC/LMO
- **OBD Protocol:** CAN 11-bit
- **Custom PIDs:** 0x5B9A–0x5BA4 (Leaf-specific BMS)
- **Charging:** DC max 50-100 kW (CHAdeMO/CCS), AC max 6.6 kW

### 4. Hyundai / Kia
- **Models:** Ioniq 5, Ioniq 6, EV6, EV9, Ioniq 5N, Kona EV
- **Battery Chemistry:** NCM (SK On)
- **OBD Protocol:** CAN 11-bit (E-GMP)
- **Custom PIDs:** 0x2201–0x220A
- **Charging:** DC max 239 kW (800V), AC max 10.9 kW, CCS2/NACS

### 5. VW Group (VW/Audi/Skoda/Seat/Porsche)
- **Models:** ID.3, ID.4, ID.5, ID.7, e-tron GT, Taycan, Q4 e-tron
- **Battery Chemistry:** NMC (LG/SKK)
- **OBD Protocol:** CAN 11-bit UDS
- **Custom PIDs:** 0x2301–0x230A
- **Charging:** DC max 135-270 kW, AC max 11 kW, CCS2

### 6. Mercedes-Benz
- **Models:** EQA, EQB, EQC, EQE, EQS, EQS SUV
- **Battery Chemistry:** NMC
- **OBD Protocol:** CAN 29-bit UDS
- **Custom PIDs:** 0x2401–0x240A
- **Charging:** DC max 200 kW, AC max 11 kW, CCS2

### 7. BMW / Mini
- **Models:** i3, iX1, iX3, i4, iX, i5, i7, Mini Electric
- **Battery Chemistry:** NMC (Samsung SDI)
- **OBD Protocol:** CAN 29-bit UDS
- **Custom PIDs:** 0x2501–0x250A
- **Charging:** DC max 200 kW, AC max 11 kW, CCS2

### 8. GM (Chevrolet/GMC/Cadillac)
- **Models:** Bolt EV, Bolt EUV, Hummer EV, Silverado EV, Lyriq, Blazer EV
- **Battery Chemistry:** NMC (LG Chem Ultium)
- **OBD Protocol:** CAN 11-bit GMLAN
- **Custom PIDs:** 0x2601–0x260A
- **Charging:** DC max 190 kW, AC max 11.5 kW, NACS/CCS1

### 9. Rivian
- **Models:** R1T, R1S, R2
- **Battery Chemistry:** NMC (Samsung SDI)
- **OBD Protocol:** CAN 29-bit
- **Custom PIDs:** 0x2701–0x270A
- **Charging:** DC max 220 kW, AC max 11.5 kW, CCS1/NACS

### 10. XPeng
- **Models:** P7, G9, G6, X9
- **Battery Chemistry:** NMC/LFP
- **OBD Protocol:** CAN 29-bit
- **Custom PIDs:** 0x2801–0x280A
- **Charging:** DC max 175 kW, AC max 7 kW, CCS2

### 11. NIO
- **Models:** ET5, ET7, ES6, ES8, EL7
- **Battery Chemistry:** NMC (CATL swappable)
- **OBD Protocol:** CAN 29-bit
- **Custom PIDs:** 0x2901–0x290A
- **Charging:** DC max 180 kW, AC max 7 kW, CCS2 + Battery Swap

### 12. MG / SAIC
- **Models:** MG4, MG5, MG ZS EV, Cyberster
- **Battery Chemistry:** LFP/NMC (CATL)
- **OBD Protocol:** CAN 29-bit
- **Custom PIDs:** 0x2A01–0x2A0A
- **Charging:** DC max 50-150 kW, AC max 7 kW, CCS2

### 13. Chery / Omoda / Jaecoo
- **Models:** Omoda E5, Jaecoo 7 EV
- **Battery Chemistry:** LFP (CATL/Gotion)
- **OBD Protocol:** CAN 29-bit
- **Custom PIDs:** 0x2B01–0x2B0A
- **Charging:** DC max 60 kW, AC max 7 kW, CCS2

### 14. Honda / Acura
- **Models:** Honda e, Prologue, ZDX
- **Battery Chemistry:** NMC (GM Ultium)
- **OBD Protocol:** CAN 11-bit
- **Custom PIDs:** 0x2C01–0x2C0A
- **Charging:** DC max 150 kW, AC max 11.5 kW, NACS/CCS1

### 15. Toyota / Lexus
- **Models:** bZ4X, RZ 450e, C-HR EV
- **Battery Chemistry:** NMC (CATL/Prime Planet)
- **OBD Protocol:** CAN 11-bit
- **Custom PIDs:** 0x2D01–0x2D0A
- **Charging:** DC max 100 kW, AC max 6.6 kW, CCS2/CHAdeMO

### 16. Generic OBD-II EV
- **Models:** Any OBD-II compliant EV
- **Battery Chemistry:** Any
- **OBD Protocol:** SAE J1979 (standard PIDs only)
- **Custom PIDs:** None (standard Mode 01/09 only)
- **Charging:** Varies by vehicle

### 17. Lucid (Bonus)
- **Models:** Air Pure, Air Touring, Air Grand Touring, Air Sapphire
- **Battery Chemistry:** NMC (Samsung SDI)
- **OBD Protocol:** CAN 29-bit
- **Charging:** DC max 300 kW, 922V architecture, CCS1/NACS

### 18. Polestar / Volvo (Bonus)
- **Models:** Polestar 2, Polestar 3, Polestar 4, Volvo XC40 Recharge, EX30, C40
- **Battery Chemistry:** NMC (CATL/LG)
- **OBD Protocol:** CAN 11-bit
- **Charging:** DC max 200 kW, AC max 11 kW, CCS2

## Adding Your Vehicle

If your EV is not listed, you can:
1. Select "Generic OBD-II EV" for standard OBD-II PID support
2. Use the **Custom PID Builder** (Settings → Advanced) to add manufacturer-specific PIDs
3. Request brand support by emailing: waleedmandour@gmail.com

## OBD Profile Detection

EVDx automatically detects your vehicle when connected:
1. Reads VIN via standard PID 0902
2. Parses WMI (World Manufacturer Identifier) from VIN
3. Matches to the correct brand OBD profile
4. Prompts user to confirm: "Detected: BYD Yuan Plus — is this correct?"
5. Falls back to manual brand/model selection if VIN detection fails

## Database Version

The vehicles database is bundled with the app and updated with each app release. No live API calls are made to fetch vehicle data.

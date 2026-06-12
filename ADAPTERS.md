# 📡 EVDx Supported OBD Adapters

**Version:** 1.0.0  
**Author:** Dr. Waleed Mandour

EVDx supports a wide range of OBD-II adapters for connecting to your electric vehicle's diagnostic port.

## Optimized Adapters

| Adapter | Protocol | Quality | Notes |
|---|---|---|---|
| **vGate iCar Pro BLE 4.0** | BLE (FFE0) | ⭐⭐⭐⭐⭐ | **Optimized** — Primary development target |
| **vLinker MC+** | BLE (Nordic NUS) | ⭐⭐⭐⭐⭐ | High-speed, recommended for advanced diagnostics |

## Supported Adapters

| Adapter | Protocol | Quality | Notes |
|---|---|---|---|
| **OBDLink MX+** | BLE | ⭐⭐⭐⭐⭐ | Professional-grade, fast response |
| **Carista** | BLE | ⭐⭐⭐⭐ | Brand-specific features available |
| **Veepeak OBDCheck BLE+** | BLE | ⭐⭐⭐⭐ | Reliable mid-range option |
| **KONNWEI KW902** | BLE | ⭐⭐⭐ | Budget option, adequate for basic diagnostics |
| **ELM327 v2.1 clone** | BLE/WiFi | ⭐⭐ | Standard — watch for clone quality issues |
| **ELM327 WiFi** | WiFi (TCP 35000) | ⭐⭐⭐ | iOS-compatible, requires WiFi connection |
| **OBDLink LX** | Bluetooth Classic | ⭐⭐⭐⭐ | Older Android, reliable |

## Adapter Quality Detection

EVDx automatically evaluates your adapter's quality:

- **Excellent (⭐⭐⭐⭐⭐):** Fast response time (<50ms), stable connection, supports all protocols
- **Good (⭐⭐⭐⭐):** Good response time (<100ms), stable connection
- **Fair (⭐⭐⭐):** Acceptable response time (<200ms), occasional disconnections
- **Poor (⭐⭐):** Slow response, frequent disconnections, may be a low-quality clone

## Clone Detection

⚠️ EVDx can detect known-bad ELM327 clones and will warn you:
- Fake ELM327 v2.1 chips (actually v1.5 or v1.4)
- Unreliable AT command responses
- Missing or corrupted firmware strings

If a clone is detected, EVDx will show a warning and may limit some features to prevent incorrect readings.

## Connection Types

### Bluetooth Low Energy (BLE)
- **Recommended for:** Most Android phones
- **Setup:** Enable Bluetooth → Scan → Select adapter → Connect
- **Default Service UUIDs:**
  - vGate: FFE0 (service), FFE1 (write), FFE2 (notify)
  - Nordic NUS: 6e400001 (service), 6e400003 (write), 6e400002 (notify)

### WiFi
- **Recommended for:** iOS users, older Android phones
- **Setup:** Connect to adapter's WiFi network → Enter IP/port
- **Default:** IP 192.168.0.10, Port 35000
- **Note:** Requires disconnecting from your regular WiFi

### Demo Mode
- **For:** Testing and learning without a real vehicle
- **Setup:** Select any brand/model → Simulated data
- **Features:** Full diagnostic simulation, DTC injection, charging simulation

## Troubleshooting

### Adapter Not Found
1. Ensure Bluetooth is enabled on your phone
2. Make sure the adapter is powered (plug into OBD port)
3. Try scanning again
4. Check if the adapter needs to be paired in Android Bluetooth settings first

### Connection Drops
1. Move phone closer to the OBD adapter
2. Ensure the vehicle is turned on (accessories mode is fine)
3. Check for other Bluetooth devices causing interference
4. Try a different adapter if problems persist

### Slow Response Times
1. Check adapter quality score in Device tab
2. Reduce the number of active PIDs being polled
3. Use a higher-quality adapter for better performance

## Email Support

For adapter compatibility questions: waleedmandour@gmail.com

#!/bin/bash
# EVDx BYD Head Unit Build Script (portable: macOS + Linux, no sed)
#
# Builds a BYD-compatible APK with:
#   - targetSdk 33 (BYD DiLink 3.0 requires <= 33)
#   - screenOrientation = sensorLandscape (BYD screens are 1920x720 / 2152x1032)
#   - BYD <queries> block already in the main manifest
#   - Landscape layout support via BYDLayoutManager
#   - BYD Auto API integration modules (BYDAutoPlugin)
#
# CRITICAL: The default AndroidManifest forces portrait orientation (correct
# for phones). On a BYD head unit, forcing portrait causes Android to render
# the WebView into an off-screen buffer -> BLACK SCREEN. This script patches
# the manifest to sensorLandscape during build, then restores it afterwards.
#
# PORTABILITY: This script uses Python 3 (not sed) for all in-place file edits.
# Python 3 is pre-installed on macOS (via Xcode command-line tools) and on
# virtually every Linux distribution, and behaves identically on both.
# This avoids the BSD sed vs GNU sed incompatibility that previously blocked
# the build on macOS.
#
# Installation on BYD:
#   1. Create folder "Third Party Apps 55" on a USB drive
#   2. Copy the APK into that folder
#   3. Plug USB into the car
#   4. Enter password: BYD6125F
#   5. Tap to install

set -e

echo "EVDx - Building BYD Head Unit APK..."
echo "=================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "\n${YELLOW}Platform: ${OSTYPE:-unknown}${NC}"

# Verify Python 3 is available (required for portable file patching)
if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}FATAL: python3 is required but not found on PATH.${NC}"
    echo "  On macOS: install Xcode command-line tools with:  xcode-select --install"
    echo "  On Linux: install with:  sudo apt install python3   (or your distro's equivalent)"
    exit 1
fi
PYVER=$(python3 -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])')
echo "Using Python: $PYVER  ($(command -v python3))"

# ─────────────────────────────────────────────────────────────────────────────
# Portable in-place text replacement using Python.
# Usage: patch_file <file> <old_string> <new_string>
#
# Replaces the first occurrence of <old_string> in <file> with <new_string>.
# If <old_string> appears multiple times, set PATCH_ALL=1 in the environment
# to replace every occurrence.
# Aborts the script (exit 1) if <old_string> is not found.
# ─────────────────────────────────────────────────────────────────────────────
patch_file() {
    local file="$1"
    local old="$2"
    local new="$3"
    local mode="${PATCH_ALL:-first}"

    python3 - "$file" "$old" "$new" "$mode" <<'PYEOF'
import sys, os
path, old, new, mode = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
if old not in content:
    print(f"  ERROR: pattern not found in {path}", file=sys.stderr)
    print(f"    pattern: {old[:80]!r}", file=sys.stderr)
    sys.exit(2)
if mode == 'all':
    new_content = content.replace(old, new)
    count = content.count(old)
else:
    new_content = content.replace(old, new, 1)
    count = 1
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print(f"  patched {path}: {count} replacement(s)")
PYEOF
}

# Step 1: Install dependencies
echo -e "\n${YELLOW}[1/9] Installing dependencies...${NC}"
bun install

# Step 2: Build Next.js as static export
echo -e "\n${YELLOW}[2/9] Building Next.js static export...${NC}"
bun run build:static

# Step 3: Sync Capacitor
echo -e "\n${YELLOW}[3/9] Syncing Capacitor...${NC}"
bun x cap sync android

# Step 4: Temporarily lower targetSdk for BYD compatibility
echo -e "\n${YELLOW}[4/9] Adjusting targetSdk to 33 for BYD DiLink 3.0...${NC}"
BUILD_GRADLE="android/app/build.gradle"
cp "$BUILD_GRADLE" "$BUILD_GRADLE.bak"
patch_file "$BUILD_GRADLE" \
    "targetSdkVersion rootProject.ext.targetSdkVersion" \
    "targetSdkVersion 33"
echo "  targetSdk temporarily set to 33 (was 36)"

# Step 5: Patch AndroidManifest.xml — portrait -> sensorLandscape (THE BLACK-SCREEN FIX)
echo -e "\n${YELLOW}[5/9] Patching AndroidManifest for BYD landscape screen...${NC}"
MANIFEST="android/app/src/main/AndroidManifest.xml"
cp "$MANIFEST" "$MANIFEST.bak"
PATCH_ALL=1 patch_file "$MANIFEST" \
    'android:screenOrientation="portrait"' \
    'android:screenOrientation="sensorLandscape"'
echo "  screenOrientation: portrait -> sensorLandscape"
echo "  (BYD head units are 1920x720 / 2152x1032 landscape-only)"

# Verify the patch actually applied
if ! grep -q 'android:screenOrientation="sensorLandscape"' "$MANIFEST"; then
    echo -e "${RED}FAIL: screenOrientation patch did not apply. Aborting.${NC}"
    mv "$MANIFEST.bak" "$MANIFEST"
    mv "$BUILD_GRADLE.bak" "$BUILD_GRADLE"
    exit 1
fi
echo "  Verified: sensorLandscape is now in the manifest."

# Step 6: Generate keystore (if not exists)
echo -e "\n${YELLOW}[6/9] Checking signing keystore...${NC}"
if [ ! -f "evdx.keystore" ]; then
  echo "Generating signing keystore..."
  keytool -genkey -v -keystore evdx.keystore -alias evdx -keyalg RSA -keysize 2048 -validity 10000 -storepass evdx123 -keypass evdx123 -dname "CN=Dr. Waleed Mandour, OU=EVDx, O=Waleed Mandour, L=Muscat, ST=Muscat, C=OM"
  echo -e "${GREEN}Keystore generated: evdx.keystore${NC}"
else
  echo "Keystore already exists."
fi

# Step 7: Build APK
echo -e "\n${YELLOW}[7/9] Building BYD release APK...${NC}"
cd android
./gradlew assembleRelease
cd ..

# Step 8: Restore original build.gradle + AndroidManifest.xml
echo -e "\n${YELLOW}[8/9] Restoring original build.gradle + AndroidManifest.xml...${NC}"
mv "$BUILD_GRADLE.bak" "$BUILD_GRADLE"
mv "$MANIFEST.bak" "$MANIFEST"
echo "  Restored."

# Step 9: Copy APK
echo -e "\n${YELLOW}[9/9] Copying APK...${NC}"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
OUTPUT_NAME="evdx-v1.5.3-byd-release.apk"
if [ -f "$APK_PATH" ]; then
  mkdir -p download
  cp "$APK_PATH" "download/$OUTPUT_NAME"
  echo -e "\n${GREEN}OK: BYD APK built successfully!${NC}"
  echo -e "${GREEN}   Output: download/$OUTPUT_NAME${NC}"
  echo ""
  echo "Patches applied for BYD:"
  echo "  - targetSdk = 33"
  echo "  - screenOrientation = sensorLandscape (was portrait)"
  echo "  - <queries> for com.byd.auto.* packages (in main manifest)"
  echo "  - BYDLayoutManager.startMonitoring() wired in src/app/page.tsx"
  echo "  - BYDAutoPlugin uses correct com.byd.auto.* package names"
  echo ""
  echo "To install on your BYD vehicle:"
  echo "  1. Create a folder named 'Third Party Apps 55' on a USB drive"
  echo "  2. Copy download/$OUTPUT_NAME into that folder"
  echo "  3. Plug the USB into your BYD's USB port"
  echo "  4. Enter password: BYD6125F"
  echo "  5. Tap the APK to install"
  echo ""
  echo "Or via ADB:"
  echo "  adb connect 192.168.10.10:5555"
  echo "  adb install download/$OUTPUT_NAME"
  echo ""
  echo "If black screen persists, capture logs with:"
  echo "  adb logcat | grep -iE 'chromium|webview|capacitor|EVDx|BYDAuto'"
else
  echo -e "\n${RED}FAIL: APK build failed. Check the error output above.${NC}"
  exit 1
fi

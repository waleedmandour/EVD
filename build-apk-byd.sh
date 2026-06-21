#!/bin/bash
# EVDx BYD Head Unit Build Script
# Builds a BYD-compatible APK with:
#   - targetSdk 33 (BYD DiLink 3.0 requires ≤ 33)
#   - Landscape layout support
#   - BYD Auto API integration modules
#
# Installation on BYD:
#   1. Create folder "Third Party Apps 55" on a USB drive
#   2. Copy the APK into that folder
#   3. Plug USB into the car
#   4. Enter password: BYD6125F
#   5. Tap to install

set -e

echo "⚡ EVDx — Building BYD Head Unit APK..."
echo "=================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Install dependencies
echo -e "\n${YELLOW}[1/8] Installing dependencies...${NC}"
bun install

# Step 2: Build Next.js as static export
echo -e "\n${YELLOW}[2/8] Building Next.js static export...${NC}"
bun run build:static

# Step 3: Sync Capacitor
echo -e "\n${YELLOW}[3/8] Syncing Capacitor...${NC}"
bun x cap sync android

# Step 4: Temporarily lower targetSdk for BYD compatibility
echo -e "\n${YELLOW}[4/8] Adjusting targetSdk to 33 for BYD DiLink 3.0...${NC}"
BUILD_GRADLE="android/app/build.gradle"
# Save original
cp "$BUILD_GRADLE" "$BUILD_GRADLE.bak"
# Change targetSdk to 33
sed -i 's/targetSdkVersion rootProject.ext.targetSdkVersion/targetSdkVersion 33/' "$BUILD_GRADLE"
echo "  targetSdk temporarily set to 33 (was 36)"

# Step 5: Generate keystore (if not exists)
echo -e "\n${YELLOW}[5/8] Checking signing keystore...${NC}"
if [ ! -f "evdx.keystore" ]; then
  echo "Generating signing keystore..."
  keytool -genkey -v -keystore evdx.keystore -alias evdx -keyalg RSA -keysize 2048 -validity 10000 -storepass evdx123 -keypass evdx123 -dname "CN=Dr. Waleed Mandour, OU=EVDx, O=Waleed Mandour, L=Muscat, ST=Muscat, C=OM"
  echo -e "${GREEN}Keystore generated: evdx.keystore${NC}"
else
  echo "Keystore already exists."
fi

# Step 6: Build APK
echo -e "\n${YELLOW}[6/8] Building BYD release APK...${NC}"
cd android
./gradlew assembleRelease
cd ..

# Step 7: Restore original build.gradle
echo -e "\n${YELLOW}[7/8] Restoring original build.gradle...${NC}"
mv "$BUILD_GRADLE.bak" "$BUILD_GRADLE"

# Step 8: Copy APK
echo -e "\n${YELLOW}[8/8] Copying APK...${NC}"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
OUTPUT_NAME="evdx-v1.5.3-byd-release.apk"
if [ -f "$APK_PATH" ]; then
  mkdir -p download
  cp "$APK_PATH" "download/$OUTPUT_NAME"
  echo -e "\n${GREEN}✅ BYD APK built successfully!${NC}"
  echo -e "${GREEN}   Output: download/$OUTPUT_NAME${NC}"
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
else
  echo -e "\n${RED}❌ APK build failed. Check the error output above.${NC}"
  exit 1
fi

#!/bin/bash
# EVDx APK Build Script
# Builds a production-ready Android APK from the Next.js web app using Capacitor
# Author: Dr. Waleed Mandour

set -e

echo "⚡ EVDx — Building Android APK..."
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Install dependencies
echo -e "\n${YELLOW}[1/7] Installing dependencies...${NC}"
bun install

# Step 2: Build Next.js as static export
echo -e "\n${YELLOW}[2/7] Building Next.js static export...${NC}"
bun run build:static

# Step 3: Initialize Capacitor (if not already done)
echo -e "\n${YELLOW}[3/7] Checking Capacitor setup...${NC}"
if [ ! -d "android" ]; then
  echo "Initializing Capacitor and adding Android platform..."
  npx cap init EVDx com.waleedmandour.evdx --web-dir=out
  npx cap add android
else
  echo "Android platform already exists."
fi

# Step 4: Sync web assets to Android
echo -e "\n${YELLOW}[4/7] Syncing web assets to Android...${NC}"
npx cap sync android

# Step 5: Configure Android permissions
echo -e "\n${YELLOW}[5/7] Configuring Android permissions...${NC}"
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
  echo "Android manifest found. Ensure permissions are set."
fi

# Step 6: Generate keystore (if not exists)
echo -e "\n${YELLOW}[6/7] Checking signing keystore...${NC}"
if [ ! -f "evdx.keystore" ]; then
  echo "Generating signing keystore..."
  keytool -genkey -v -keystore evdx.keystore -alias evdx -keyalg RSA -keysize 2048 -validity 10000 -storepass evdx123 -keypass evdx123 -dname "CN=Dr. Waleed Mandour, OU=EVDx, O=Waleed Mandour, L=Muscat, ST=Muscat, C=OM"
  echo -e "${GREEN}Keystore generated: evdx.keystore${NC}"
else
  echo "Keystore already exists."
fi

# Step 7: Build APK
echo -e "\n${YELLOW}[7/7] Building release APK...${NC}"
cd android
./gradlew assembleRelease
cd ..

# Copy APK to download directory
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
OUTPUT_NAME="evdx-v1.0.0-release.apk"
if [ -f "$APK_PATH" ]; then
  mkdir -p download
  cp "$APK_PATH" "download/$OUTPUT_NAME"
  echo -e "\n${GREEN}✅ APK built successfully!${NC}"
  echo -e "${GREEN}   Output: download/$OUTPUT_NAME${NC}"
  echo ""
  echo "To install on your Android device:"
  echo "  1. Transfer download/$OUTPUT_NAME to your phone"
  echo "  2. Enable 'Install from unknown sources' in Settings"
  echo "  3. Open the APK file to install"
else
  echo -e "\n${RED}❌ APK build failed. Check the error output above.${NC}"
  exit 1
fi

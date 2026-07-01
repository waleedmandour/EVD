import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EVDx — Universal EV Diagnostics Pro",
  description: "Professional electric vehicle diagnostics companion. Real-time monitoring, battery health, fault scanning, AI analysis, and more. By Dr. Waleed Mandour © 2026.",
  authors: [{ name: "Dr. Waleed Mandour", url: "https://github.com/waleedmandour/EVD" }],
  keywords: ["EV", "electric vehicle", "diagnostics", "OBD2", "battery health", "DTC", "real-time data", "AI", "bilingual", "Arabic"],
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0D1117",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
      <head>
        {/*
          Safety-net script — MUST run before any other JS.

          Loaded from /evdx-safety-net.js (a static asset in /public/) so
          the WebView executes it synchronously before any Next.js chunk.
          On BYD DiLink 3.0 (Chromium 83, June 2020), missing runtime APIs
          like Array.prototype.at, Object.hasOwn, structuredClone, and
          Promise.any cause React to throw a TypeError during mount and
          tear down the entire tree — leaving the pre-hydration splash
          visible forever ("logo shows but keeps loading forever").

          This script polyfills those APIs AND adds two safety nets:
            1. After 8s: swap "Loading EVDx…" → "App failed to load. Tap to retry."
            2. After 15s: remove the splash entirely.
          It also hides the native Capacitor SplashScreen ASAP via the
          Capacitor bridge, decoupling native-splash dismissal from React
          mounting.

          The file is plain ES5 so it parses on every Chromium version
          back to v40. See /public/evdx-safety-net.js for the full source.
        */}
        <script src="/evdx-safety-net.js" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/*
          Pre-hydration splash (Phase 1.2):
          This div is in the static HTML export, so the WebView renders it
          INSTANTLY — before any JavaScript loads. It shows the EVDx logo on
          the app's dark background (#0D1117) so the user sees a branded
          screen immediately instead of black.

          React removes this div in page.tsx's first useEffect (after mount).
          If JavaScript fails to load entirely (e.g., ES2022+ syntax that
          Chromium 83 can't parse), the safety-net script in <head> will:
            - After 8s: replace "Loading EVDx…" with a retry prompt
            - After 15s: remove the splash entirely
            - Capture window.onerror and surface the message in the splash

          The logo image is bundled in the APK at /icons/evd-icon-1024.png
          and loads from the local WebViewAssetLoader, not from network.
        */}
        <div
          id="pre-hydration-splash"
          style={{
            position: "fixed",
            inset: 0,
            background: "#0D1117",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            transition: "opacity 300ms ease-out",
          }}
        >
          <img
            src="/icons/evd-icon-1024.png"
            alt="EVDx"
            style={{ width: 200, height: 200 }}
          />
          <p
            className="evdx-loader-text"
            style={{
              color: "#78909C",
              marginTop: 24,
              fontFamily: "system-ui, sans-serif",
              fontSize: 16,
            }}
          >
            Loading EVDx…
          </p>
        </div>

        {children}
        <Toaster />
      </body>
    </html>
  );
}

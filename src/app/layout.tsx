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
          Chromium 83 can't parse), this div stays visible permanently —
          which is far better than a permanent black screen.

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

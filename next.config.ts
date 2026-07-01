import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Remove trailingSlash — it causes issues on BYD head unit's WebView
  // (Android 10 / Chromium 83) where redirects from /index.html/ to
  // /index.html can fail silently, resulting in a black screen.
  // trailingSlash: true,

  // ─── Chromium 83 compatibility (Phase 2.1 + 2.2) ────────────────────────
  //
  // browserslist "chrome >= 83" in package.json tells SWC to transpile
  // ES2021+ SYNTAX (??=, ||=, &&=, etc.) down to ES2020, which Chromium 83
  // (BYD DiLink 3.0, June 2020) supports. BUT browserslist ONLY affects
  // Next.js's own app code — it does NOT transpile node_modules deps.
  //
  // transpilePackages forces Next.js to also run SWC over the listed
  // third-party packages. This is critical because many of these deps
  // (radix-ui, framer-motion, recharts, cmdk, vaul, embla) ship modern
  // ES2021+ syntax in their published dist builds. Without transpilation,
  // a single `??=` or `?.()` in one of these deps silently breaks JS
  // parsing on Chromium 83 and React never mounts → permanent splash.
  //
  // The list below covers every dep that:
  //   1. Is imported anywhere in src/ or byd/
  //   2. Ships modern ESM that SWC's browserslist target doesn't reach
  //
  // Adding a package that doesn't need transpilation is harmless — it
  // just gets a no-op pass through SWC.
  transpilePackages: [
    // Animation / motion
    "framer-motion",
    "tw-animate-css",
    // Radix UI primitives — ship modern ESM
    "@radix-ui/react-accordion",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-aspect-ratio",
    "@radix-ui/react-avatar",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-collapsible",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-hover-card",
    "@radix-ui/react-label",
    "@radix-ui/react-menubar",
    "@radix-ui/react-navigation-menu",
    "@radix-ui/react-popover",
    "@radix-ui/react-progress",
    "@radix-ui/react-radio-group",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-select",
    "@radix-ui/react-separator",
    "@radix-ui/react-slider",
    "@radix-ui/react-slot",
    "@radix-ui/react-switch",
    "@radix-ui/react-tabs",
    "@radix-ui/react-toast",
    "@radix-ui/react-toggle",
    "@radix-ui/react-toggle-group",
    "@radix-ui/react-tooltip",
    // Charts / data viz
    "recharts",
    // Forms / inputs
    "react-hook-form",
    "@hookform/resolvers",
    "zod",
    "input-otp",
    "cmdk",
    // Tables / queries
    "@tanstack/react-query",
    "@tanstack/react-table",
    // Carousels / overlays
    "embla-carousel-react",
    "vaul",
    // i18n / dates / utilities
    "i18next",
    "i18next-browser-languagedetector",
    "react-i18next",
    "date-fns",
    "react-day-picker",
    "react-markdown",
    "react-syntax-highlighter",
    "react-resizable-panels",
    "arabic-reshaper",
    // Markdown editor
    "@mdxeditor/editor",
    // Misc
    "lucide-react",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "tailwindcss-animate",
    "uuid",
    "next-themes",
    "sonner",
    "jspdf",
    "z-ai-web-dev-sdk",
    // Capacitor — its ESM bundles may use modern syntax
    "@capacitor/core",
    "@capacitor/splash-screen",
    "@capacitor-community/bluetooth-le",
    "@capacitor-community/speech-recognition",
    "@capacitor-community/sqlite",
    "@capacitor-community/text-to-speech",
    "@capacitor/geolocation",
    "@reactuses/core",
  ],
};

export default nextConfig;

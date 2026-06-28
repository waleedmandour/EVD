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

  // Phase 2.1: Chromium 83 compatibility.
  // JavaScript transpilation target is controlled by the `browserslist` field
  // in package.json (set to "chrome >= 83"). This tells SWC to transpile
  // ES2021+ features (??=, ||=, &&=, etc.) down to ES2020, which Chromium 83
  // (BYD DiLink 3.0, June 2020) supports. Without this, modern syntax can
  // cause silent JavaScript parse failures → permanent black screen on BYD.
};

export default nextConfig;

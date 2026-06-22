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
};

export default nextConfig;

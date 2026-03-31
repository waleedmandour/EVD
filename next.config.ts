import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Required headers for Web Bluetooth API and PWA functionality
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            // Allow bluetooth, geolocation for OBD-II connectivity
            value: "bluetooth=(self), geolocation=(self), ambient-light-sensor=(), camera=(), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

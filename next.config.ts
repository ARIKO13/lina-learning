import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

// Mark which routes use server features (required for @cloudflare/next-on-pages)
export const experimental = {
  workerScripts: {},
};

// Required for @cloudflare/next-on-pages
export default nextConfig;

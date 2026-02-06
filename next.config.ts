import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Security: hide X-Powered-By header

  // Only enable in development
  ...(process.env.NODE_ENV === "development" && {
    allowedDevOrigins: ["*.ngrok-free.dev"],
  }),
};

export default nextConfig;

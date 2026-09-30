import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com', 'localhost:3000', '192.168.132.1:3000'],
  turbopack: {},
};

export default nextConfig;
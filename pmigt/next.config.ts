import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
};

export default nextConfig;

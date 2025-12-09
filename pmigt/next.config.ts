import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Configuration
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  
  // Image Configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // 允许 Supabase 的图片
      },
      {
        protocol: 'https',
        hostname: '**.volces.com', // 允许火山引擎的图片
      },
    ],
  },

  // Security Headers Configuration
  async headers() {
    return [
      {
        // source: '/:path*' 匹配所有路径 (包括 Pages 和 API Routes)
        source: '/:path*', 
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // 阻止 MIME 类型嗅探攻击
          },
        ],
      },
    ];
  },
};

export default nextConfig;
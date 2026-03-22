import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
  // 排除 Node.js 内置模块，避免客户端打包错误
  serverExternalPackages: ['child_process', 'fs', 'path', 'os'],
  // Next.js 16 默认使用 Turbopack，添加空配置消除警告
  turbopack: {},
  webpack: (config, { isServer }) => {
    // 在客户端构建时，将 Node.js 内置模块设为空
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;

import { NextResponse } from 'next/server';

/**
 * 桌面版下载配置 API
 * 
 * 下载链接优先级：
 * 1. 环境变量（推荐）：DESKTOP_DOWNLOAD_URL_MAC / DESKTOP_DOWNLOAD_URL_WIN / DESKTOP_DOWNLOAD_URL_LINUX
 * 2. 默认占位符（显示"即将推出"）
 * 
 * 部署步骤：
 * 1. 本地构建桌面端安装包：pnpm electron:build
 * 2. 上传安装包：POST /api/upload-desktop-client
 * 3. 将返回的 URL 配置到扣子环境变量中
 */

// 版本号（发布新版本时更新）
const VERSION = process.env.DESKTOP_VERSION || '1.0.0';
const RELEASE_DATE = process.env.DESKTOP_RELEASE_DATE || new Date().toISOString().split('T')[0];

// 从环境变量读取下载链接
const DOWNLOAD_URLS = {
  darwin: process.env.DESKTOP_DOWNLOAD_URL_MAC || null,
  win32: process.env.DESKTOP_DOWNLOAD_URL_WIN || null,
  linux: process.env.DESKTOP_DOWNLOAD_URL_LINUX || null,
};

const DOWNLOAD_CONFIG = {
  version: VERSION,
  releaseDate: RELEASE_DATE,
  platforms: {
    darwin: {
      name: 'macOS',
      url: DOWNLOAD_URLS.darwin || '#coming-soon',
      size: '85 MB',
      arch: ['x64', 'arm64'],
    },
    win32: {
      name: 'Windows',
      url: DOWNLOAD_URLS.win32 || '#coming-soon',
      size: '75 MB',
      arch: ['x64'],
    },
    linux: {
      name: 'Linux',
      url: DOWNLOAD_URLS.linux || '#coming-soon',
      size: '70 MB',
      arch: ['x64'],
    },
  },
  releaseNotes: [
    '首次发布',
    '支持免OAuth配置自动登录',
    '支持7大平台账号绑定',
    '本地加密存储账号信息',
  ],
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: DOWNLOAD_CONFIG,
  });
}

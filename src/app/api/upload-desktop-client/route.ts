/**
 * 桌面端安装包上传接口
 * 
 * 使用方法：
 * 1. 本地构建桌面端安装包（参考 docs/BUILD_ELECTRON.md）
 * 2. 调用此接口上传安装包
 * 3. 将返回的 URL 配置到环境变量中
 * 
 * 环境变量配置：
 * - DESKTOP_DOWNLOAD_URL_MAC: macOS 安装包下载链接
 * - DESKTOP_DOWNLOAD_URL_WIN: Windows 安装包下载链接
 * - DESKTOP_DOWNLOAD_URL_LINUX: Linux 安装包下载链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 平台文件扩展名映射
const PLATFORM_EXTENSIONS: Record<string, string[]> = {
  darwin: ['.dmg', '.zip'],
  win32: ['.exe', '.msi'],
  linux: ['.AppImage', '.deb', '.rpm'],
};

// 检测文件对应的平台
function detectPlatform(filename: string): string | null {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  for (const [platform, extensions] of Object.entries(PLATFORM_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return platform;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const version = formData.get('version') as string | '1.0.0';
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要上传的安装包文件' },
        { status: 400 }
      );
    }

    // 检测平台
    const platform = detectPlatform(file.name);
    if (!platform) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无法识别的安装包格式。支持的格式：.dmg, .exe, .AppImage' 
        },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);

    // 上传到对象存储
    const fileName = `desktop-client/v${version}/${file.name}`;
    const fileKey = await storage.uploadFile({
      fileContent,
      fileName,
      contentType: file.type || 'application/octet-stream',
    });

    // 生成签名 URL（有效期 1 年）
    const downloadUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 365 * 24 * 60 * 60, // 1 年
    });

    return NextResponse.json({
      success: true,
      data: {
        platform,
        fileKey,
        downloadUrl,
        fileName: file.name,
        fileSize: file.size,
        version,
        message: `上传成功！请将此 URL 配置到环境变量 DESKTOP_DOWNLOAD_URL_${platform === 'darwin' ? 'MAC' : platform === 'win32' ? 'WIN' : 'LINUX'} 中`,
      },
    });
  } catch (error) {
    console.error('上传安装包失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '上传失败' 
      },
      { status: 500 }
    );
  }
}

// 获取当前配置的下载链接
export async function GET() {
  const config = {
    darwin: process.env.DESKTOP_DOWNLOAD_URL_MAC || null,
    win32: process.env.DESKTOP_DOWNLOAD_URL_WIN || null,
    linux: process.env.DESKTOP_DOWNLOAD_URL_LINUX || null,
  };

  return NextResponse.json({
    success: true,
    data: {
      configured: {
        mac: !!config.darwin,
        windows: !!config.win32,
        linux: !!config.linux,
      },
      urls: config,
    },
  });
}

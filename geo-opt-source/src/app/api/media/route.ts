/**
 * 媒体上传API
 * 支持图片和视频上传到对象存储
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化存储客户端
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 支持的文件类型
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

// 文件大小限制（字节）
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

interface MediaFile {
  key: string;
  url: string;
  type: 'image' | 'video';
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * 获取媒体文件列表
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prefix = searchParams.get('prefix') || 'media/';
  const type = searchParams.get('type'); // 'image' | 'video'
  const maxKeys = parseInt(searchParams.get('maxKeys') || '50');
  const keys = searchParams.get('keys'); // 逗号分隔的key列表，用于批量获取URL

  try {
    // 批量获取签名URL
    if (keys) {
      const keyList = keys.split(',').filter(Boolean);
      const files: MediaFile[] = [];

      for (const key of keyList) {
        const url = await storage.generatePresignedUrl({
          key,
          expireTime: 86400, // 1天有效期
        });

        // 从key中提取文件名
        const filename = key.split('/').pop() || key;
        const mimeType = getMimeType(filename);

        files.push({
          key,
          url,
          type: mimeType.startsWith('video') ? 'video' : 'image',
          filename,
          size: 0,
          mimeType,
        });
      }

      return NextResponse.json({
        success: true,
        data: { files },
      });
    }

    // 列出文件
    const result = await storage.listFiles({
      prefix,
      maxKeys,
    });

    const files: MediaFile[] = [];

    for (const key of result.keys) {
      // 过滤类型
      const mimeType = getMimeType(key);
      const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

      if (type === 'image' && !isImage) continue;
      if (type === 'video' && !isVideo) continue;
      if (!isImage && !isVideo) continue;

      const url = await storage.generatePresignedUrl({
        key,
        expireTime: 86400,
      });

      const filename = key.split('/').pop() || key;

      files.push({
        key,
        url,
        type: isVideo ? 'video' : 'image',
        filename,
        size: 0,
        mimeType,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        files,
        isTruncated: result.isTruncated,
        nextToken: result.nextContinuationToken,
      },
    });
  } catch (error) {
    console.error('获取媒体文件失败:', error);
    return NextResponse.json(
      { success: false, error: '获取媒体文件失败' },
      { status: 500 }
    );
  }
}

/**
 * 上传媒体文件
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'media';
    const action = formData.get('action') as string;

    // 删除文件
    if (action === 'delete') {
      const key = formData.get('key') as string;
      if (!key) {
        return NextResponse.json(
          { success: false, error: '缺少文件key' },
          { status: 400 }
        );
      }

      const deleted = await storage.deleteFile({ fileKey: key });
      return NextResponse.json({ success: deleted });
    }

    // 获取签名URL（用于已上传的文件）
    if (action === 'getUrl') {
      const key = formData.get('key') as string;
      if (!key) {
        return NextResponse.json(
          { success: false, error: '缺少文件key' },
          { status: 400 }
        );
      }

      const expireTime = parseInt(formData.get('expireTime') as string) || 86400;
      const url = await storage.generatePresignedUrl({
        key,
        expireTime,
      });

      return NextResponse.json({
        success: true,
        data: { key, url },
      });
    }

    // 上传文件
    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到上传文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          success: false,
          error: `不支持的文件类型: ${file.type}。支持的类型: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 验证文件大小
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `文件过大，${isVideo ? '视频' : '图片'}最大支持 ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 生成文件名
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${folder}/${timestamp}_${safeName}`;

    // 上传到对象存储
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type,
    });

    // 生成签名URL
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 86400,
    });

    const result: MediaFile = {
      key,
      url,
      type: isVideo ? 'video' : 'image',
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('上传媒体文件失败:', error);
    return NextResponse.json(
      { success: false, error: '上传失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除媒体文件
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json(
      { success: false, error: '缺少文件key' },
      { status: 400 }
    );
  }

  try {
    const deleted = await storage.deleteFile({ fileKey: key });
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('删除媒体文件失败:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}

// 辅助函数：根据文件名推断MIME类型
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const mimeTypes: Record<string, string> = {
    // 图片
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // 视频
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

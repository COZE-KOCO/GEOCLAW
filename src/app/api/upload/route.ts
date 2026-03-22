import { NextRequest, NextResponse } from 'next/server';
import {
  uploadFile,
  getFileUrl,
  deleteFile,
  validateFileType,
  validateFileSize,
  uploadFromUrl,
} from '@/lib/storage';

/**
 * POST /api/upload
 * 上传文件到对象存储
 * 
 * 支持两种上传方式：
 * 1. FormData 上传文件
 * 2. JSON body 提供 URL 进行转存
 * 
 * Body:
 * - file: File (FormData)
 * - url: string (JSON, 用于转存第三方资源)
 * - folder: string (可选, 存储文件夹)
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // 处理 URL 转存
    if (contentType.includes('application/json')) {
      const body = await request.json();
      
      if (body.url) {
        const result = await uploadFromUrl(body.url, body.folder);
        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      // 获取已上传文件的访问 URL
      if (body.key) {
        const expireTime = body.expireTime || 86400;
        const url = await getFileUrl(body.key, expireTime);
        return NextResponse.json({
          success: true,
          data: { key: body.key, url },
        });
      }

      return NextResponse.json({ error: '缺少 url 或 key 参数' }, { status: 400 });
    }

    // 处理 FormData 文件上传
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;

    if (!file) {
      return NextResponse.json({ error: '未找到上传文件' }, { status: 400 });
    }

    // 验证文件类型
    const typeValidation = validateFileType(file.type);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}` },
        { status: 400 }
      );
    }

    // 验证文件大小
    const sizeValidation = validateFileSize(file.type, file.size);
    if (!sizeValidation.valid) {
      const maxSizeMB = Math.floor((sizeValidation.maxSize || 0) / (1024 * 1024));
      return NextResponse.json(
        { error: `文件大小超出限制，最大允许 ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传文件
    const result = await uploadFile(buffer, file.name, file.type, folder || undefined);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * 删除文件
 * Query params:
 * - key: 文件存储键
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: '缺少文件键' }, { status: 400 });
    }

    const success = await deleteFile(key);
    
    if (!success) {
      return NextResponse.json({ error: '删除文件失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json({ error: '删除文件失败' }, { status: 500 });
  }
}

/**
 * GET /api/upload
 * 获取文件访问 URL
 * Query params:
 * - key: 文件存储键
 * - expireTime: URL 有效期（秒），默认 1 天
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const expireTime = parseInt(searchParams.get('expireTime') || '86400');

    if (!key) {
      return NextResponse.json({ error: '缺少文件键' }, { status: 400 });
    }

    const url = await getFileUrl(key, expireTime);

    return NextResponse.json({
      success: true,
      data: { key, url, expireTime },
    });
  } catch (error) {
    console.error('获取文件URL失败:', error);
    return NextResponse.json({ error: '获取文件URL失败' }, { status: 500 });
  }
}

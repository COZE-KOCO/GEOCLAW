/**
 * 素材上传 API
 * 
 * POST: 上传文件到对象存储并保存素材记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';
import { createAsset, type CreateAssetInput } from '@/lib/asset-store';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 获取文件类型
function getAssetType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

// 获取图片尺寸
async function getImageDimensions(buffer: Buffer, mimeType: string): Promise<{ width?: number; height?: number }> {
  if (!mimeType.startsWith('image/')) {
    return {};
  }
  
  try {
    // 简单的图片尺寸检测（仅支持常见格式）
    // PNG
    if (mimeType === 'image/png' && buffer.length > 24) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      return { width, height };
    }
    // JPEG
    if (mimeType === 'image/jpeg' && buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 4) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
          const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
          return { width, height };
        }
        const length = (buffer[offset + 2] << 8) | buffer[offset + 3];
        offset += 2 + length;
      }
    }
  } catch (e) {
    console.error('获取图片尺寸失败:', e);
  }
  
  return {};
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;
    const folderId = formData.get('folderId') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }
    
    if (!businessId) {
      return NextResponse.json({ error: '缺少商家ID' }, { status: 400 });
    }
    
    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 生成文件名（使用时间戳和原始文件名）
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `assets/${businessId}/${timestamp}_${safeName}`;
    
    // 上传到对象存储
    const storageKey = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type || 'application/octet-stream',
    });
    
    // 生成访问 URL（有效期 30 天）
    const url = await storage.generatePresignedUrl({
      key: storageKey,
      expireTime: 2592000,
    });
    
    // 获取图片尺寸
    const dimensions = await getImageDimensions(buffer, file.type);
    
    // 创建素材记录
    const assetType = getAssetType(file.type);
    const input: CreateAssetInput = {
      businessId,
      folderId: folderId || undefined,
      name: file.name,
      originalName: file.name,
      type: assetType,
      mimeType: file.type,
      size: file.size,
      url,
      storageKey,
      width: dimensions.width,
      height: dimensions.height,
      tags: [],
    };
    
    const result = await createAsset(input);
    
    if (!result.asset) {
      // 检查是否是表不存在的错误
      if (result.error?.includes('does not exist') || result.error?.includes('Could not find')) {
        // 返回友好提示，引导用户初始化数据库
        return NextResponse.json({ 
          error: '素材表尚未初始化，请调用 /api/db/init 接口初始化数据库',
          needInit: true,
        }, { status: 500 });
      }
      
      // 如果数据库保存失败，尝试删除已上传的文件
      await storage.deleteFile({ fileKey: storageKey });
      return NextResponse.json({ 
        error: result.error || '保存素材记录失败' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      asset: {
        ...result.asset,
        url, // 返回签名 URL
      } 
    }, { status: 201 });
  } catch (error) {
    console.error('上传素材失败:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '上传失败' 
    }, { status: 500 });
  }
}

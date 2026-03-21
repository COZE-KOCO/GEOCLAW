import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储客户端
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 支持的 MIME 类型
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

// 文件类型映射
const MIME_TO_TYPE: Record<string, 'image' | 'video' | 'audio' | 'document'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/mpeg': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/aac': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'text/plain': 'document',
};

// 最大文件大小（字节）
const MAX_FILE_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 20 * 1024 * 1024, // 20MB
};

export interface UploadResult {
  key: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  size: number;
}

/**
 * 验证文件类型
 */
export function validateFileType(mimeType: string): { valid: boolean; type?: string } {
  for (const [type, mimeTypes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimeTypes.includes(mimeType)) {
      return { valid: true, type };
    }
  }
  return { valid: false };
}

/**
 * 获取文件类型
 */
export function getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  return MIME_TO_TYPE[mimeType] || 'document';
}

/**
 * 验证文件大小
 */
export function validateFileSize(mimeType: string, size: number): { valid: boolean; maxSize?: number } {
  const type = getFileType(mimeType);
  const maxSize = MAX_FILE_SIZES[type];
  
  if (size > maxSize) {
    return { valid: false, maxSize };
  }
  return { valid: true };
}

/**
 * 上传文件到对象存储
 */
export async function uploadFile(
  fileContent: Buffer,
  fileName: string,
  mimeType: string,
  folder?: string
): Promise<UploadResult> {
  // 生成文件路径
  const type = getFileType(mimeType);
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = folder 
    ? `${folder}/${timestamp}_${sanitizedFileName}`
    : `${type}s/${timestamp}_${sanitizedFileName}`;

  // 上传文件
  const key = await storage.uploadFile({
    fileContent,
    fileName: path,
    contentType: mimeType,
  });

  // 生成访问 URL
  const url = await storage.generatePresignedUrl({
    key,
    expireTime: 86400 * 7, // 7天有效期
  });

  return {
    key,
    url,
    type,
    mimeType,
    size: fileContent.length,
  };
}

/**
 * 获取文件访问 URL
 */
export async function getFileUrl(key: string, expireTime: number = 86400): Promise<string> {
  return storage.generatePresignedUrl({ key, expireTime });
}

/**
 * 删除文件
 */
export async function deleteFile(key: string): Promise<boolean> {
  return storage.deleteFile({ fileKey: key });
}

/**
 * 检查文件是否存在
 */
export async function fileExists(key: string): Promise<boolean> {
  return storage.fileExists({ fileKey: key });
}

/**
 * 从 URL 下载并上传
 */
export async function uploadFromUrl(url: string, folder?: string): Promise<UploadResult> {
  const key = await storage.uploadFromUrl({ url, timeout: 60000 });
  
  // 生成访问 URL
  const accessUrl = await storage.generatePresignedUrl({
    key,
    expireTime: 86400 * 7,
  });

  return {
    key,
    url: accessUrl,
    type: 'image', // 默认类型
    mimeType: 'image/jpeg',
    size: 0,
  };
}

export { storage };

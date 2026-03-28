/**
 * 素材库管理服务
 * 支持商家隔离
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储（用于生成签名 URL）
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

export type AssetType = 'image' | 'video' | 'audio' | 'document';
export type AssetStatus = 'active' | 'deleted' | 'processing';

export interface Asset {
  id: string;
  businessId: string;
  folderId?: string;
  
  // 文件信息
  name: string;
  originalName?: string;
  type: AssetType;
  mimeType?: string;
  size: number;
  
  // 存储信息
  url?: string;
  thumbnail?: string;
  storageKey?: string;
  
  // 元数据
  width?: number;
  height?: number;
  duration?: number;
  
  // 描述和标签
  description?: string;
  tags: string[];
  
  // 状态
  status: AssetStatus;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetFolder {
  id: string;
  businessId: string;
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssetInput {
  businessId: string;
  folderId?: string;
  name: string;
  originalName?: string;
  type: AssetType;
  mimeType?: string;
  size: number;
  url?: string;
  thumbnail?: string;
  storageKey?: string;
  width?: number;
  height?: number;
  duration?: number;
  description?: string;
  tags?: string[];
}

export interface CreateFolderInput {
  businessId: string;
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateAssetInput {
  name?: string;
  folderId?: string;
  description?: string;
  tags?: string[];
  status?: AssetStatus;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string;
  color?: string;
  icon?: string;
}

// ==================== 素材文件操作 ====================

/**
 * 获取商家的所有素材
 */
export async function getAssetsByBusiness(
  businessId: string,
  options?: {
    type?: AssetType;
    folderId?: string;
    status?: AssetStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Asset[]> {
  const client = getSupabaseClient();
  let query = client
    .from('assets')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }
  if (options?.folderId !== undefined) {
    if (options.folderId === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', options.folderId);
    }
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error('获取素材列表失败:', error);
    // 表不存在时返回空数组而不是抛出错误
    if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
      console.warn('assets 表不存在，请先创建数据库表');
      return [];
    }
    return [];
  }

  // 转换数据并动态生成签名 URL
  const assets = data.map(mapDbAssetToAsset);
  
  // 为有 storageKey 的素材生成签名 URL
  const assetsWithUrls = await Promise.all(
    assets.map(async (asset) => {
      if (asset.storageKey) {
        try {
          const signedUrl = await storage.generatePresignedUrl({
            key: asset.storageKey,
            expireTime: 86400, // 1 天有效期
          });
          return { ...asset, url: signedUrl };
        } catch (e) {
          console.error('生成签名 URL 失败:', e);
          return asset;
        }
      }
      return asset;
    })
  );

  return assetsWithUrls;
}

/**
 * 根据ID获取素材
 */
export async function getAssetById(id: string): Promise<Asset | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbAssetToAsset(data);
}

/**
 * 创建素材
 */
export async function createAsset(input: CreateAssetInput): Promise<{ asset: Asset | null; error?: string }> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assets')
    .insert({
      business_id: input.businessId,
      folder_id: input.folderId,
      name: input.name,
      original_name: input.originalName,
      type: input.type,
      mime_type: input.mimeType,
      size: input.size,
      url: input.url,
      thumbnail: input.thumbnail,
      storage_key: input.storageKey,
      width: input.width,
      height: input.height,
      duration: input.duration,
      description: input.description,
      tags: input.tags || [],
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('创建素材失败:', error);
    // 表不存在
    if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
      return { asset: null, error: '数据库表 assets 不存在，请先创建数据库表' };
    }
    return { asset: null, error: error.message };
  }

  return { asset: mapDbAssetToAsset(data) };
}

/**
 * 更新素材
 */
export async function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset | null> {
  const client = getSupabaseClient();
  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.folderId !== undefined) updateData.folder_id = input.folderId;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await client
    .from('assets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新素材失败:', error);
    return null;
  }

  return mapDbAssetToAsset(data);
}

/**
 * 删除素材（软删除）
 */
export async function deleteAsset(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('assets')
    .update({ status: 'deleted' })
    .eq('id', id);

  if (error) {
    console.error('删除素材失败:', error);
    return false;
  }

  return true;
}

/**
 * 批量删除素材
 */
export async function deleteAssets(ids: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('assets')
    .update({ status: 'deleted' })
    .in('id', ids);

  if (error) {
    console.error('批量删除素材失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取素材统计
 */
export async function getAssetStats(businessId: string): Promise<{
  total: number;
  byType: Record<AssetType, number>;
  totalSize: number;
}> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assets')
    .select('type, size')
    .eq('business_id', businessId)
    .eq('status', 'active');

  if (error || !data) {
    return { total: 0, byType: { image: 0, video: 0, audio: 0, document: 0 }, totalSize: 0 };
  }

  const stats = {
    total: data.length,
    byType: { image: 0, video: 0, audio: 0, document: 0 } as Record<AssetType, number>,
    totalSize: 0,
  };

  for (const item of data) {
    stats.byType[item.type as AssetType]++;
    stats.totalSize += item.size || 0;
  }

  return stats;
}

// ==================== 文件夹操作 ====================

/**
 * 获取商家的所有文件夹
 */
export async function getFoldersByBusiness(businessId: string): Promise<AssetFolder[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('asset_folders')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  if (error) {
    console.error('获取文件夹列表失败:', error);
    return [];
  }

  return data.map(mapDbFolderToFolder);
}

/**
 * 创建文件夹
 */
export async function createFolder(input: CreateFolderInput): Promise<AssetFolder | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('asset_folders')
    .insert({
      business_id: input.businessId,
      name: input.name,
      parent_id: input.parentId,
      color: input.color,
      icon: input.icon,
    })
    .select()
    .single();

  if (error) {
    console.error('创建文件夹失败:', error);
    return null;
  }

  return mapDbFolderToFolder(data);
}

/**
 * 更新文件夹
 */
export async function updateFolder(id: string, input: UpdateFolderInput): Promise<AssetFolder | null> {
  const client = getSupabaseClient();
  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.parentId !== undefined) updateData.parent_id = input.parentId;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.icon !== undefined) updateData.icon = input.icon;

  const { data, error } = await client
    .from('asset_folders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新文件夹失败:', error);
    return null;
  }

  return mapDbFolderToFolder(data);
}

/**
 * 删除文件夹
 */
export async function deleteFolder(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 先将文件夹内的素材移到根目录
  await client
    .from('assets')
    .update({ folder_id: null })
    .eq('folder_id', id);

  // 删除文件夹
  const { error } = await client
    .from('asset_folders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除文件夹失败:', error);
    return false;
  }

  return true;
}

// ==================== 映射函数 ====================

function mapDbAssetToAsset(dbAsset: Record<string, unknown>): Asset {
  return {
    id: dbAsset.id as string,
    businessId: dbAsset.business_id as string,
    folderId: dbAsset.folder_id as string | undefined,
    name: dbAsset.name as string,
    originalName: dbAsset.original_name as string | undefined,
    type: dbAsset.type as AssetType,
    mimeType: dbAsset.mime_type as string | undefined,
    size: dbAsset.size as number,
    url: dbAsset.url as string | undefined,
    thumbnail: dbAsset.thumbnail as string | undefined,
    storageKey: dbAsset.storage_key as string | undefined,
    width: dbAsset.width as number | undefined,
    height: dbAsset.height as number | undefined,
    duration: dbAsset.duration as number | undefined,
    description: dbAsset.description as string | undefined,
    tags: (dbAsset.tags as string[]) || [],
    status: dbAsset.status as AssetStatus,
    createdAt: new Date(dbAsset.created_at as string),
    updatedAt: new Date(dbAsset.updated_at as string),
  };
}

function mapDbFolderToFolder(dbFolder: Record<string, unknown>): AssetFolder {
  return {
    id: dbFolder.id as string,
    businessId: dbFolder.business_id as string,
    name: dbFolder.name as string,
    parentId: dbFolder.parent_id as string | undefined,
    color: dbFolder.color as string | undefined,
    icon: dbFolder.icon as string | undefined,
    createdAt: new Date(dbFolder.created_at as string),
    updatedAt: new Date(dbFolder.updated_at as string),
  };
}

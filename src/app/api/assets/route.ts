import { NextRequest, NextResponse } from 'next/server';
import {
  getAssetsByBusiness,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  deleteAssets,
  getAssetStats,
  type CreateAssetInput,
  type UpdateAssetInput,
} from '@/lib/asset-store';
import {
  getFoldersByBusiness,
  createFolder,
  updateFolder,
  deleteFolder,
  type CreateFolderInput,
  type UpdateFolderInput,
} from '@/lib/asset-store';

/**
 * GET /api/assets
 * 获取素材列表或单个素材
 * Query params:
 * - id: 素材ID（可选，获取单个素材）
 * - businessId: 商家ID（必填）
 * - type: 素材类型筛选
 * - folderId: 文件夹ID
 * - status: 状态筛选
 * - search: 搜索关键词
 * - stats: 是否获取统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');
    const getStats = searchParams.get('stats') === 'true';

    // 获取单个素材
    if (id) {
      const asset = await getAssetById(id);
      if (!asset) {
        return NextResponse.json({ error: '素材不存在' }, { status: 404 });
      }
      return NextResponse.json({ asset });
    }

    // 获取统计信息
    if (getStats && businessId) {
      const stats = await getAssetStats(businessId);
      return NextResponse.json({ stats });
    }

    // 获取素材列表
    if (!businessId) {
      return NextResponse.json({ error: '缺少商家ID' }, { status: 400 });
    }

    const options = {
      type: searchParams.get('type') as 'image' | 'video' | 'audio' | 'document' | undefined,
      folderId: searchParams.get('folderId') ?? undefined,
      status: searchParams.get('status') as 'active' | 'deleted' | 'processing' | undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    // 处理 folderId 为 'null' 的情况
    if (options.folderId === 'null') {
      options.folderId = null as unknown as undefined;
    }

    const assets = await getAssetsByBusiness(businessId, options);
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('获取素材数据失败:', error);
    return NextResponse.json({ error: '获取素材数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/assets
 * 创建素材或文件夹
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    // 创建文件夹
    if (action === 'createFolder') {
      const input: CreateFolderInput = {
        businessId: data.businessId,
        name: data.name,
        parentId: data.parentId,
        color: data.color,
        icon: data.icon,
      };

      const folder = await createFolder(input);
      if (!folder) {
        return NextResponse.json({ error: '创建文件夹失败' }, { status: 500 });
      }
      return NextResponse.json({ folder }, { status: 201 });
    }

    // 创建素材
    const input: CreateAssetInput = {
      businessId: data.businessId,
      folderId: data.folderId,
      name: data.name,
      originalName: data.originalName,
      type: data.type,
      mimeType: data.mimeType,
      size: data.size,
      url: data.url,
      thumbnail: data.thumbnail,
      storageKey: data.storageKey,
      width: data.width,
      height: data.height,
      duration: data.duration,
      description: data.description,
      tags: data.tags,
    };

    const asset = await createAsset(input);
    if (!asset) {
      return NextResponse.json({ error: '创建素材失败' }, { status: 500 });
    }
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('创建素材失败:', error);
    return NextResponse.json({ error: '创建素材失败' }, { status: 500 });
  }
}

/**
 * PUT /api/assets
 * 更新素材或文件夹
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    // 更新文件夹
    if (action === 'updateFolder') {
      const input: UpdateFolderInput = {
        name: data.name,
        parentId: data.parentId,
        color: data.color,
        icon: data.icon,
      };

      const folder = await updateFolder(id, input);
      if (!folder) {
        return NextResponse.json({ error: '更新文件夹失败' }, { status: 500 });
      }
      return NextResponse.json({ folder });
    }

    // 更新素材
    const input: UpdateAssetInput = {
      name: data.name,
      folderId: data.folderId,
      description: data.description,
      tags: data.tags,
      status: data.status,
    };

    const asset = await updateAsset(id, input);
    if (!asset) {
      return NextResponse.json({ error: '更新素材失败' }, { status: 500 });
    }
    return NextResponse.json({ asset });
  } catch (error) {
    console.error('更新素材失败:', error);
    return NextResponse.json({ error: '更新素材失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/assets
 * 删除素材或文件夹
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids');
    const action = searchParams.get('action');

    // 删除文件夹
    if (action === 'deleteFolder' && id) {
      const success = await deleteFolder(id);
      if (!success) {
        return NextResponse.json({ error: '删除文件夹失败' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // 批量删除
    if (ids) {
      const idList = ids.split(',');
      const success = await deleteAssets(idList);
      if (!success) {
        return NextResponse.json({ error: '批量删除素材失败' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // 删除单个素材
    if (!id) {
      return NextResponse.json({ error: '缺少素材ID' }, { status: 400 });
    }

    const success = await deleteAsset(id);
    if (!success) {
      return NextResponse.json({ error: '删除素材失败' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除素材失败:', error);
    return NextResponse.json({ error: '删除素材失败' }, { status: 500 });
  }
}

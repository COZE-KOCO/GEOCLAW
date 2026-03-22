import { NextRequest, NextResponse } from 'next/server';
import {
  getKeywordLibrariesByBusiness,
  getKeywordLibraryById,
  createKeywordLibrary,
  updateKeywordLibrary,
  deleteKeywordLibrary,
  addKeywordsToLibrary,
  removeKeywordFromLibrary,
  getKeywordLibraryStats,
  type CreateKeywordLibraryInput,
  type UpdateKeywordLibraryInput,
} from '@/lib/keyword-store';

/**
 * GET /api/keywords
 * 获取关键词库列表或单个关键词库
 * Query params:
 * - id: 关键词库ID（可选，获取单个）
 * - businessId: 商家ID（必填）
 * - stats: 是否获取统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');
    const getStats = searchParams.get('stats') === 'true';

    // 获取单个关键词库
    if (id) {
      const library = await getKeywordLibraryById(id);
      if (!library) {
        return NextResponse.json({ error: '关键词库不存在' }, { status: 404 });
      }
      return NextResponse.json({ library });
    }

    // 获取统计信息
    if (getStats && businessId) {
      const stats = await getKeywordLibraryStats(businessId);
      return NextResponse.json({ stats });
    }

    // 获取关键词库列表
    if (!businessId) {
      return NextResponse.json({ error: '缺少商家ID' }, { status: 400 });
    }

    const libraries = await getKeywordLibrariesByBusiness(businessId);
    return NextResponse.json({ libraries });
  } catch (error) {
    console.error('获取关键词库数据失败:', error);
    return NextResponse.json({ error: '获取关键词库数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/keywords
 * 创建关键词库
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const input: CreateKeywordLibraryInput = {
      businessId: body.businessId,
      name: body.name,
      description: body.description,
      keywords: body.keywords,
    };

    const library = await createKeywordLibrary(input);
    if (!library) {
      return NextResponse.json({ error: '创建关键词库失败' }, { status: 500 });
    }
    return NextResponse.json({ library }, { status: 201 });
  } catch (error) {
    console.error('创建关键词库失败:', error);
    return NextResponse.json({ error: '创建关键词库失败' }, { status: 500 });
  }
}

/**
 * PUT /api/keywords
 * 更新关键词库
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, keyword, keywords, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少关键词库ID' }, { status: 400 });
    }

    // 添加关键词
    if (action === 'addKeywords' && keywords) {
      const library = await addKeywordsToLibrary(id, keywords);
      if (!library) {
        return NextResponse.json({ error: '添加关键词失败' }, { status: 500 });
      }
      return NextResponse.json({ library });
    }

    // 删除单个关键词
    if (action === 'removeKeyword' && keyword) {
      const library = await removeKeywordFromLibrary(id, keyword);
      if (!library) {
        return NextResponse.json({ error: '删除关键词失败' }, { status: 500 });
      }
      return NextResponse.json({ library });
    }

    // 更新关键词库信息
    const input: UpdateKeywordLibraryInput = {
      name: data.name,
      description: data.description,
      keywords: data.keywords,
    };

    const library = await updateKeywordLibrary(id, input);
    if (!library) {
      return NextResponse.json({ error: '更新关键词库失败' }, { status: 500 });
    }
    return NextResponse.json({ library });
  } catch (error) {
    console.error('更新关键词库失败:', error);
    return NextResponse.json({ error: '更新关键词库失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/keywords
 * 删除关键词库
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少关键词库ID' }, { status: 400 });
    }

    const success = await deleteKeywordLibrary(id);
    if (!success) {
      return NextResponse.json({ error: '删除关键词库失败' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除关键词库失败:', error);
    return NextResponse.json({ error: '删除关键词库失败' }, { status: 500 });
  }
}

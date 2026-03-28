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
import { getCurrentUser, validateBusinessOwnership } from '@/lib/user-auth';
import { getBusinessesByOwner } from '@/lib/business-store';

/**
 * 获取用户的默认企业ID
 */
async function getUserBusinessId(userId: string): Promise<{ businessId: string } | { needsCreateBusiness: true }> {
  const businesses = await getBusinessesByOwner(userId);
  if (businesses.length === 0) {
    return { needsCreateBusiness: true };
  }
  return { businessId: businesses[0].id };
}

/**
 * GET /api/keywords
 * 获取关键词库列表或单个关键词库
 * 注意：用户只能获取自己所属企业的关键词库
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

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
      // 验证关键词库是否属于用户的企业
      const hasAccess = await validateBusinessOwnership(user.id, library.businessId);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限访问该关键词库' }, { status: 403 });
      }
      return NextResponse.json({ library });
    }

    // 验证并获取用户的企业ID
    let targetBusinessId: string | null = null;
    
    if (businessId) {
      // 前端传递了 businessId，验证用户是否拥有该商家
      const hasAccess = await validateBusinessOwnership(user.id, businessId);
      if (!hasAccess) {
        // 返回空数据而不是错误
        return NextResponse.json({ 
          libraries: [],
          needsCreateBusiness: true 
        });
      }
      targetBusinessId = businessId;
    } else {
      // 没有传递 businessId，获取用户的第一个商家
      const result = await getUserBusinessId(user.id);
      if ('needsCreateBusiness' in result) {
        // 返回空数据而不是错误
        if (getStats) {
          return NextResponse.json({ 
            stats: { total: 0, totalKeywords: 0 },
            needsCreateBusiness: true 
          });
        }
        return NextResponse.json({ 
          libraries: [],
          needsCreateBusiness: true 
        });
      }
      targetBusinessId = result.businessId;
    }

    // 获取统计信息
    if (getStats) {
      const stats = await getKeywordLibraryStats(targetBusinessId);
      return NextResponse.json({ stats });
    }

    // 获取关键词库列表
    const libraries = await getKeywordLibrariesByBusiness(targetBusinessId);
    return NextResponse.json({ libraries });
  } catch (error) {
    console.error('获取关键词库数据失败:', error);
    return NextResponse.json({ error: '获取关键词库数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/keywords
 * 创建关键词库 - 只能为用户自己的企业创建
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    
    // 验证并获取用户的企业ID
    let targetBusinessId: string;
    
    if (body.businessId) {
      // 前端传递了 businessId，验证用户是否拥有该商家
      const hasAccess = await validateBusinessOwnership(user.id, body.businessId);
      if (!hasAccess) {
        return NextResponse.json({ 
          error: '请先创建企业',
          needsCreateBusiness: true 
        });
      }
      targetBusinessId = body.businessId;
    } else {
      // 没有传递 businessId，获取用户的第一个商家
      const result = await getUserBusinessId(user.id);
      if ('needsCreateBusiness' in result) {
        return NextResponse.json({ 
          error: '请先创建企业',
          needsCreateBusiness: true 
        });
      }
      targetBusinessId = result.businessId;
    }

    const input: CreateKeywordLibraryInput = {
      businessId: targetBusinessId,
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
 * 更新关键词库 - 只能更新自己企业的关键词库
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, keyword, keywords, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少关键词库ID' }, { status: 400 });
    }

    // 验证关键词库是否属于用户的企业
    const existingLibrary = await getKeywordLibraryById(id);
    if (!existingLibrary) {
      return NextResponse.json({ error: '关键词库不存在' }, { status: 404 });
    }
    const hasAccess = await validateBusinessOwnership(user.id, existingLibrary.businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: '您没有权限修改该关键词库' }, { status: 403 });
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
 * 删除关键词库 - 只能删除自己企业的关键词库
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少关键词库ID' }, { status: 400 });
    }

    // 验证关键词库是否属于用户的企业
    const existingLibrary = await getKeywordLibraryById(id);
    if (!existingLibrary) {
      return NextResponse.json({ error: '关键词库不存在' }, { status: 404 });
    }
    const hasAccess = await validateBusinessOwnership(user.id, existingLibrary.businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: '您没有权限删除该关键词库' }, { status: 403 });
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

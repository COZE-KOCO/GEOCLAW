import { NextRequest, NextResponse } from 'next/server';
import {
  getContentDraftsByBusiness,
  getContentDraftById,
  createContentDraft,
  updateContentDraft,
  deleteContentDraft,
  getContentDraftStats,
  type CreateContentDraftInput,
  type UpdateContentDraftInput,
} from '@/lib/content-draft-store';
import { getCurrentUser, validateBusinessOwnership } from '@/lib/user-auth';
import { getBusinessesByOwner } from '@/lib/business-store';

/**
 * 获取用户的商家ID（支持前端传递或使用默认）
 */
async function resolveBusinessId(
  userId: string, 
  requestBusinessId?: string | null
): Promise<{ businessId: string } | { needsCreateBusiness: true }> {
  if (requestBusinessId) {
    // 前端传递了 businessId，验证用户是否拥有该商家
    const hasAccess = await validateBusinessOwnership(userId, requestBusinessId);
    if (!hasAccess) {
      return { needsCreateBusiness: true };
    }
    return { businessId: requestBusinessId };
  }
  
  // 没有传递 businessId，获取用户的第一个商家
  const businesses = await getBusinessesByOwner(userId);
  if (businesses.length === 0) {
    return { needsCreateBusiness: true };
  }
  return { businessId: businesses[0].id };
}

/**
 * GET /api/content-drafts
 * 获取文章列表或单篇文章
 * 注意：用户只能获取自己所属企业的文章
 * Query params:
 * - id: 文章ID（可选，获取单篇）
 * - status: 状态筛选 (draft | ready | published)
 * - stats: 是否获取统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const getStats = searchParams.get('stats') === 'true';
    const requestBusinessId = searchParams.get('businessId');

    // 获取单篇文章
    if (id) {
      const draft = await getContentDraftById(id);
      if (!draft) {
        return NextResponse.json({ error: '文章不存在' }, { status: 404 });
      }
      // 验证文章是否属于用户的企业
      const hasAccess = await validateBusinessOwnership(user.id, draft.businessId);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限访问该文章' }, { status: 403 });
      }
      return NextResponse.json({ draft });
    }

    // 获取用户的商家ID
    const result = await resolveBusinessId(user.id, requestBusinessId);
    
    // 如果用户没有企业，返回空数据
    if ('needsCreateBusiness' in result) {
      if (getStats) {
        return NextResponse.json({ 
          stats: { total: 0, draft: 0, ready: 0, published: 0 },
          needsCreateBusiness: true 
        });
      }
      return NextResponse.json({ 
        drafts: [],
        needsCreateBusiness: true 
      });
    }

    // 获取统计信息
    if (getStats) {
      const stats = await getContentDraftStats(result.businessId);
      return NextResponse.json({ stats });
    }

    // 获取文章列表 - 只返回用户企业的文章
    const options = {
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const drafts = await getContentDraftsByBusiness(result.businessId, options);
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('获取文章数据失败:', error);
    return NextResponse.json({ error: '获取文章数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/content-drafts
 * 创建文章 - 只能为用户自己的企业创建
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();

    // 获取用户的商家ID
    const result = await resolveBusinessId(user.id, body.businessId);
    
    // 如果用户没有企业，返回错误提示
    if ('needsCreateBusiness' in result) {
      return NextResponse.json({ 
        error: '请先创建企业',
        needsCreateBusiness: true 
      });
    }
    
    const input: CreateContentDraftInput = {
      businessId: result.businessId,
      title: body.title,
      content: body.content,
      distillationWords: body.distillationWords,
      outline: body.outline,
      seoScore: body.seoScore,
      targetModel: body.targetModel,
      articleType: body.articleType,
      status: body.status,
    };

    const draft = await createContentDraft(input);
    if (!draft) {
      return NextResponse.json({ error: '创建文章失败' }, { status: 500 });
    }
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json({ error: '创建文章失败' }, { status: 500 });
  }
}

/**
 * PUT /api/content-drafts
 * 更新文章 - 只能更新自己企业的文章
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少文章ID' }, { status: 400 });
    }

    // 验证文章是否属于用户的企业
    const existingDraft = await getContentDraftById(id);
    if (!existingDraft) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    if (existingDraft.businessId !== user.businessId) {
      return NextResponse.json({ error: '您没有权限修改该文章' }, { status: 403 });
    }

    const input: UpdateContentDraftInput = {
      title: data.title,
      content: data.content,
      distillationWords: data.distillationWords,
      outline: data.outline,
      seoScore: data.seoScore,
      targetModel: data.targetModel,
      articleType: data.articleType,
      status: data.status,
    };

    const draft = await updateContentDraft(id, input);
    if (!draft) {
      return NextResponse.json({ error: '更新文章失败' }, { status: 500 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    console.error('更新文章失败:', error);
    return NextResponse.json({ error: '更新文章失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/content-drafts
 * 删除文章 - 只能删除自己企业的文章
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
      return NextResponse.json({ error: '缺少文章ID' }, { status: 400 });
    }

    // 验证文章是否属于用户的企业
    const existingDraft = await getContentDraftById(id);
    if (!existingDraft) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    if (existingDraft.businessId !== user.businessId) {
      return NextResponse.json({ error: '您没有权限删除该文章' }, { status: 403 });
    }

    const success = await deleteContentDraft(id);
    if (!success) {
      return NextResponse.json({ error: '删除文章失败' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除文章失败:', error);
    return NextResponse.json({ error: '删除文章失败' }, { status: 500 });
  }
}

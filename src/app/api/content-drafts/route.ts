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

/**
 * GET /api/content-drafts
 * 获取文章列表或单篇文章
 * Query params:
 * - id: 文章ID（可选，获取单篇）
 * - businessId: 商家ID（必填）
 * - status: 状态筛选 (draft | ready | published)
 * - stats: 是否获取统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');
    const getStats = searchParams.get('stats') === 'true';

    // 获取单篇文章
    if (id) {
      const draft = await getContentDraftById(id);
      if (!draft) {
        return NextResponse.json({ error: '文章不存在' }, { status: 404 });
      }
      return NextResponse.json({ draft });
    }

    // 获取统计信息
    if (getStats && businessId) {
      const stats = await getContentDraftStats(businessId);
      return NextResponse.json({ stats });
    }

    // 获取文章列表
    if (!businessId) {
      return NextResponse.json({ error: '缺少商家ID' }, { status: 400 });
    }

    const options = {
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    const drafts = await getContentDraftsByBusiness(businessId, options);
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('获取文章数据失败:', error);
    return NextResponse.json({ error: '获取文章数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/content-drafts
 * 创建文章
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const input: CreateContentDraftInput = {
      businessId: body.businessId,
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
 * 更新文章
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少文章ID' }, { status: 400 });
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
 * 删除文章
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少文章ID' }, { status: 400 });
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

import { NextRequest, NextResponse } from 'next/server';
import { 
  getContentDraftsByBusiness, 
  getAllContentDrafts,
  getContentDraftById,
  createContentDraft, 
  updateContentDraft, 
  deleteContentDraft,
  getContentDraftStats,
  type CreateContentDraftInput,
  type UpdateContentDraftInput
} from '@/lib/content-draft-store';

/**
 * GET /api/content-drafts
 * 获取文章列表
 * Query params:
 * - id: 文章ID（可选，获取单篇文章）
 * - businessId: 企业ID（筛选该企业的文章）
 * - status: 状态筛选 (draft, ready, published)
 * - stats: 是否包含统计信息
 * - limit: 返回数量限制
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const includeStats = searchParams.get('stats') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // 获取单篇文章
    if (id) {
      const draft = await getContentDraftById(id);
      if (!draft) {
        return NextResponse.json({ error: '文章不存在' }, { status: 404 });
      }
      return NextResponse.json({ draft });
    }

    // 获取企业文章
    if (businessId) {
      const drafts = await getContentDraftsByBusiness(businessId, { status: status || undefined, limit });
      
      if (includeStats) {
        const stats = await getContentDraftStats(businessId);
        return NextResponse.json({ drafts, stats });
      }
      
      return NextResponse.json({ drafts });
    }

    // 获取所有文章（支持筛选）
    const options = {
      status: status || undefined,
      businessId: businessId || undefined,
      limit,
    };
    
    const drafts = await getAllContentDrafts(options);
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('获取文章数据失败:', error);
    return NextResponse.json({ error: '获取文章数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/content-drafts
 * 创建新文章
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.businessId) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    if (!body.title || !body.content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    const input: CreateContentDraftInput = {
      businessId: body.businessId,
      title: body.title,
      content: body.content,
      distillationWords: body.distillationWords || [],
      outline: body.outline,
      seoScore: body.seoScore || 0,
      targetModel: body.targetModel,
      articleType: body.articleType,
      status: body.status || 'draft',
    };

    const draft = await createContentDraft(input);
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少文章ID' }, { status: 400 });
    }

    const draft = await updateContentDraft(id, updateData as UpdateContentDraftInput);
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

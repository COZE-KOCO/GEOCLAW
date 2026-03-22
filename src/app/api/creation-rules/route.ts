import { NextRequest, NextResponse } from 'next/server';
import {
  getCreationRulesByBusiness,
  getCreationRuleById,
  createCreationRule,
  updateCreationRule,
  deleteCreationRule,
  incrementRuleUseCount,
  getCreationRuleStats,
  type CreateCreationRuleInput,
  type UpdateCreationRuleInput,
} from '@/lib/creation-rule-store';

/**
 * GET /api/creation-rules
 * 获取创作规则列表或单个规则
 * Query params:
 * - id: 规则ID（可选，获取单个）
 * - businessId: 商家ID（必填）
 * - type: 规则类型筛选 (article | image-text)
 * - stats: 是否获取统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');
    const getStats = searchParams.get('stats') === 'true';

    // 获取单个规则
    if (id) {
      const rule = await getCreationRuleById(id);
      if (!rule) {
        return NextResponse.json({ error: '创作规则不存在' }, { status: 404 });
      }
      return NextResponse.json({ rule });
    }

    // 获取统计信息
    if (getStats && businessId) {
      const stats = await getCreationRuleStats(businessId);
      return NextResponse.json({ stats });
    }

    // 获取规则列表
    if (!businessId) {
      return NextResponse.json({ error: '缺少商家ID' }, { status: 400 });
    }

    const options = {
      type: searchParams.get('type') as 'article' | 'image-text' | undefined,
    };

    const rules = await getCreationRulesByBusiness(businessId, options);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('获取创作规则数据失败:', error);
    return NextResponse.json({ error: '获取创作规则数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/creation-rules
 * 创建创作规则
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const input: CreateCreationRuleInput = {
      businessId: body.businessId,
      name: body.name,
      description: body.description,
      type: body.type || 'article',
      config: body.config,
    };

    const rule = await createCreationRule(input);
    if (!rule) {
      return NextResponse.json({ error: '创建创作规则失败' }, { status: 500 });
    }
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('创建创作规则失败:', error);
    return NextResponse.json({ error: '创建创作规则失败' }, { status: 500 });
  }
}

/**
 * PUT /api/creation-rules
 * 更新创作规则
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });
    }

    // 增加使用次数
    if (action === 'incrementUse') {
      await incrementRuleUseCount(id);
      return NextResponse.json({ success: true });
    }

    // 更新规则
    const input: UpdateCreationRuleInput = {
      name: data.name,
      description: data.description,
      config: data.config,
    };

    const rule = await updateCreationRule(id, input);
    if (!rule) {
      return NextResponse.json({ error: '更新创作规则失败' }, { status: 500 });
    }
    return NextResponse.json({ rule });
  } catch (error) {
    console.error('更新创作规则失败:', error);
    return NextResponse.json({ error: '更新创作规则失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/creation-rules
 * 删除创作规则
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });
    }

    const success = await deleteCreationRule(id);
    if (!success) {
      return NextResponse.json({ error: '删除创作规则失败' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除创作规则失败:', error);
    return NextResponse.json({ error: '删除创作规则失败' }, { status: 500 });
  }
}

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
    const hasAccess = await validateBusinessOwnership(userId, requestBusinessId);
    if (!hasAccess) {
      return { needsCreateBusiness: true };
    }
    return { businessId: requestBusinessId };
  }
  
  const businesses = await getBusinessesByOwner(userId);
  if (businesses.length === 0) {
    return { needsCreateBusiness: true };
  }
  return { businessId: businesses[0].id };
}

/**
 * GET /api/creation-rules
 * 获取创作规则列表或单个规则
 * 注意：用户只能获取自己所属企业的创作规则
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

    // 获取单个规则
    if (id) {
      const rule = await getCreationRuleById(id);
      if (!rule) {
        return NextResponse.json({ error: '创作规则不存在' }, { status: 404 });
      }
      // 验证规则是否属于用户的企业
      const hasAccess = await validateBusinessOwnership(user.id, rule.businessId);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限访问该规则' }, { status: 403 });
      }
      return NextResponse.json({ rule });
    }

    // 获取用户的商家ID
    const result = await resolveBusinessId(user.id, requestBusinessId);
    
    // 如果用户没有企业，返回空数据
    if ('needsCreateBusiness' in result) {
      if (getStats) {
        return NextResponse.json({ 
          stats: { total: 0, article: 0, imageText: 0 },
          needsCreateBusiness: true 
        });
      }
      return NextResponse.json({ 
        rules: [],
        needsCreateBusiness: true 
      });
    }

    // 获取统计信息
    if (getStats) {
      const stats = await getCreationRuleStats(result.businessId);
      return NextResponse.json({ stats });
    }

    // 获取规则列表
    const options = {
      type: searchParams.get('type') as 'article' | 'image-text' | undefined,
    };

    const rules = await getCreationRulesByBusiness(result.businessId, options);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('获取创作规则数据失败:', error);
    return NextResponse.json({ error: '获取创作规则数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/creation-rules
 * 创建创作规则 - 只能为用户自己的企业创建
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
    
    const input: CreateCreationRuleInput = {
      businessId: result.businessId,
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
 * 更新创作规则 - 只能更新自己企业的规则
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });
    }

    // 验证规则是否属于用户的企业
    const existingRule = await getCreationRuleById(id);
    if (!existingRule) {
      return NextResponse.json({ error: '创作规则不存在' }, { status: 404 });
    }
    if (existingRule.businessId !== user.businessId) {
      return NextResponse.json({ error: '您没有权限修改该规则' }, { status: 403 });
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
 * 删除创作规则 - 只能删除自己企业的规则
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
      return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });
    }

    // 验证规则是否属于用户的企业
    const existingRule = await getCreationRuleById(id);
    if (!existingRule) {
      return NextResponse.json({ error: '创作规则不存在' }, { status: 404 });
    }
    if (existingRule.businessId !== user.businessId) {
      return NextResponse.json({ error: '您没有权限删除该规则' }, { status: 403 });
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

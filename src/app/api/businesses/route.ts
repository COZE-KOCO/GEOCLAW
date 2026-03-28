import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllBusinesses, 
  getBusinessById, 
  createBusiness, 
  updateBusiness, 
  deleteBusiness,
  deactivateBusiness,
  activateBusiness,
  getBusinessStats,
  getBusinessesByOwner,
  countBusinessesByOwner,
  type CreateBusinessInput,
  type UpdateBusinessInput
} from '@/lib/business-store';
import { getCurrentUser, validateBusinessOwnership, getMaxBusinesses } from '@/lib/user-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/businesses
 * 获取企业列表或单个企业详情
 * 用户只能获取自己创建的企业
 * Query params:
 * - id: 企业ID（可选，获取单个企业）
 * - stats: 是否包含统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前登录用户
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeStats = searchParams.get('stats') === 'true';

    // 获取单个企业
    if (id) {
      // 验证用户是否有权访问该企业
      const hasAccess = await validateBusinessOwnership(user.id, id);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限访问该企业的数据' }, { status: 403 });
      }

      const business = await getBusinessById(id);
      if (!business) {
        return NextResponse.json({ error: '企业不存在' }, { status: 404 });
      }

      if (includeStats) {
        const stats = await getBusinessStats(id);
        return NextResponse.json({ business, stats });
      }

      return NextResponse.json({ business });
    }

    // 获取企业列表 - 用户只能看到自己创建的企业
    const businesses = await getBusinessesByOwner(user.id);
    
    if (businesses.length > 0) {
      // 检查状态筛选
      const statusFilter = searchParams.get('status');
      const filteredBusinesses = statusFilter 
        ? businesses.filter(b => b.status === statusFilter)
        : businesses;

      if (includeStats && filteredBusinesses.length > 0) {
        const stats = await getBusinessStats(filteredBusinesses[0].id);
        return NextResponse.json({ businesses: filteredBusinesses, stats });
      }

      return NextResponse.json({ businesses: filteredBusinesses });
    }

    // 用户没有企业
    return NextResponse.json({ 
      businesses: [],
      needsCreateBusiness: true,
      message: '您还没有创建企业，请先创建企业'
    });
  } catch (error) {
    console.error('获取企业数据失败:', error);
    return NextResponse.json({ error: '获取企业数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/businesses
 * 创建新企业
 * - 用户可以创建企业
 * - 创建后自动关联到用户账户
 * - 根据套餐限制创建数量
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    
    // 检查用户是否已有企业（根据套餐限制）
    const maxBusinesses = getMaxBusinesses(user.role);
    const currentCount = await countBusinessesByOwner(user.id);
    
    // 如果已有企业且达到限制
    if (user.businessId && maxBusinesses !== -1 && currentCount >= maxBusinesses) {
      return NextResponse.json({ 
        error: `您的套餐最多只能创建 ${maxBusinesses} 个企业`,
        maxBusinesses,
        currentCount
      }, { status: 400 });
    }

    // 创建企业
    const input: CreateBusinessInput = {
      name: body.name,
      type: body.type || 'store',
      industry: body.industry || '',
      subIndustry: body.subIndustry,
      description: body.description,
      logo: body.logo,
      website: body.website,
      address: body.address,
      city: body.city,
      district: body.district,
      latitude: body.latitude,
      longitude: body.longitude,
      phone: body.phone,
      businessHours: body.businessHours,
      brandKeywords: body.brandKeywords || [],
      targetKeywords: body.targetKeywords || [],
      competitorKeywords: body.competitorKeywords || [],
      contactName: body.contactName,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      ownerId: user.id, // 设置所有者为当前用户
    };

    const business = await createBusiness(input);
    
    // 更新用户的 businessId（如果用户还没有关联企业）
    if (!user.businessId) {
      const supabase = getSupabaseClient();
      await supabase
        .from('user_accounts')
        .update({ business_id: business.id })
        .eq('id', user.id);
    }

    return NextResponse.json({ 
      business,
      message: '企业创建成功'
    }, { status: 201 });
  } catch (error) {
    console.error('创建企业失败:', error);
    return NextResponse.json({ error: '创建企业失败' }, { status: 500 });
  }
}

/**
 * PUT /api/businesses
 * 更新企业信息 - 只能更新自己的企业
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    // 验证用户是否有权修改该企业
    const hasAccess = await validateBusinessOwnership(user.id, id);
    if (!hasAccess) {
      return NextResponse.json({ error: '您没有权限修改该企业' }, { status: 403 });
    }

    const business = await updateBusiness(id, updateData as UpdateBusinessInput);
    if (!business) {
      return NextResponse.json({ error: '更新企业失败' }, { status: 500 });
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('更新企业失败:', error);
    return NextResponse.json({ error: '更新企业失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/businesses
 * 删除企业 - 只有 enterprise 用户可以删除企业
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 只有企业版用户可以删除企业
    if (user.role !== 'enterprise') {
      return NextResponse.json({ error: '只有企业版用户可以删除企业' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    // 验证用户是否有权删除该企业
    const hasAccess = await validateBusinessOwnership(user.id, id);
    if (!hasAccess) {
      return NextResponse.json({ error: '您没有权限删除该企业' }, { status: 403 });
    }

    const result = await deleteBusiness(id);
    if (!result.success) {
      return NextResponse.json({ error: '删除企业失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: '企业已删除'
    });
  } catch (error) {
    console.error('删除企业失败:', error);
    return NextResponse.json({ error: '删除企业失败' }, { status: 500 });
  }
}

/**
 * PATCH /api/businesses
 * 切换企业状态 - 只有 enterprise 用户可以操作
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 只有企业版用户可以切换企业状态
    if (user.role !== 'enterprise') {
      return NextResponse.json({ error: '只有企业版用户可以执行此操作' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json({ error: '无效的操作类型' }, { status: 400 });
    }

    // 验证用户是否有权操作该企业
    const hasAccess = await validateBusinessOwnership(user.id, id);
    if (!hasAccess) {
      return NextResponse.json({ error: '您没有权限操作该企业' }, { status: 403 });
    }

    const business = action === 'activate' 
      ? await activateBusiness(id)
      : await deactivateBusiness(id);

    if (!business) {
      return NextResponse.json({ error: '操作失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      business,
      message: action === 'activate' ? '企业已启用' : '企业已停用'
    });
  } catch (error) {
    console.error('更新企业状态失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

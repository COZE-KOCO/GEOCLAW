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
  type CreateBusinessInput,
  type UpdateBusinessInput
} from '@/lib/business-store';

/**
 * GET /api/businesses
 * 获取企业列表或单个企业详情
 * Query params:
 * - id: 企业ID（可选，获取单个企业）
 * - type: 企业类型筛选
 * - industry: 行业筛选
 * - city: 城市筛选
 * - status: 状态筛选
 * - stats: 是否包含统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const includeStats = searchParams.get('stats') === 'true';

    // 获取单个企业
    if (id) {
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

    // 获取企业列表
    const options = {
      type: searchParams.get('type') as any,
      industry: searchParams.get('industry') || undefined,
      city: searchParams.get('city') || undefined,
      status: searchParams.get('status') || undefined,
    };

    const businesses = await getAllBusinesses(options);
    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('获取企业数据失败:', error);
    return NextResponse.json({ error: '获取企业数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/businesses
 * 创建新企业
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
    };

    const business = await createBusiness(input);
    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error('创建企业失败:', error);
    return NextResponse.json({ error: '创建企业失败' }, { status: 500 });
  }
}

/**
 * PUT /api/businesses
 * 更新企业信息
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
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
 * 删除企业（级联删除关联数据）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    const result = await deleteBusiness(id);
    if (!result.success) {
      return NextResponse.json({ error: '删除企业失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      deletedCounts: result.deletedCounts 
    });
  } catch (error) {
    console.error('删除企业失败:', error);
    return NextResponse.json({ error: '删除企业失败' }, { status: 500 });
  }
}

/**
 * PATCH /api/businesses
 * 切换企业状态（停用/启用）
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json({ error: '无效的操作类型' }, { status: 400 });
    }

    const business = action === 'activate' 
      ? await activateBusiness(id)
      : await deactivateBusiness(id);

    if (!business) {
      return NextResponse.json({ error: '操作失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      business,
      message: action === 'activate' ? '商家已启用' : '商家已停用'
    });
  } catch (error) {
    console.error('更新企业状态失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

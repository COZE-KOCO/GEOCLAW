import { NextRequest, NextResponse } from 'next/server';
import { 
  getAccountsByBusiness, 
  getAllAccounts, 
  getAccountsByPlatform,
  getAccountById,
  createAccount, 
  updateAccount, 
  deleteAccount,
  getAccountStatsByBusiness,
  getAccountsByCategory,
  getGeoAccountsByModel,
  getOfficialSiteAccounts,
  type CreateAccountInput,
  type UpdateAccountInput
} from '@/lib/account-store';
import { PlatformCategory, AIModel } from '@/config/platforms';
import { getCurrentUser, validateBusinessOwnership } from '@/lib/user-auth';
import { getBusinessesByOwner } from '@/lib/business-store';

/**
 * GET /api/accounts
 * 获取账号列表
 * 注意：用户只能获取自己所属企业的账号
 * Query params:
 * - id: 账号ID（可选，获取单个账号）
 * - businessId: 企业ID（筛选该企业的账号）
 * - platform: 平台筛选
 * - status: 状态筛选
 * - category: 平台分类筛选 (platform/geo_platform/official_site)
 * - aiModel: AI模型筛选（仅GEO平台）
 * - stats: 是否包含统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const category = searchParams.get('category') as PlatformCategory | null;
    const aiModel = searchParams.get('aiModel') as AIModel | null;
    const includeStats = searchParams.get('stats') === 'true';

    // 获取单个账号
    if (id) {
      const account = await getAccountById(id);
      if (!account) {
        return NextResponse.json({ error: '账号不存在' }, { status: 404 });
      }
      // 验证账号所属企业是否属于用户
      const hasAccess = await validateBusinessOwnership(user.id, account.businessId);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限访问该账号' }, { status: 403 });
      }
      return NextResponse.json({ account });
    }

    // 获取前端传递的 businessId
    const requestBusinessId = searchParams.get('businessId');

    // 获取用户的企业列表
    const businesses = await getBusinessesByOwner(user.id);
    if (businesses.length === 0) {
      return NextResponse.json({ 
        accounts: [],
        needsCreateBusiness: true,
        message: '您还没有创建企业，请先创建企业'
      });
    }

    // 确定要使用的 businessId
    let businessId: string;
    
    if (requestBusinessId) {
      // 前端传递了 businessId，验证用户是否拥有该商家
      const hasAccess = await validateBusinessOwnership(user.id, requestBusinessId);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限访问该商家的数据' }, { status: 403 });
      }
      businessId = requestBusinessId;
    } else {
      // 没有传递 businessId，使用用户第一个商家作为默认
      businessId = businesses[0].id;
    }

    // 按平台分类获取
    if (category) {
      let accounts;
      if (category === PlatformCategory.GEO_PLATFORM && aiModel) {
        accounts = await getGeoAccountsByModel(businessId, aiModel);
      } else if (category === PlatformCategory.OFFICIAL_SITE) {
        accounts = await getOfficialSiteAccounts(businessId);
      } else {
        accounts = await getAccountsByCategory(businessId, category);
      }
      
      if (includeStats) {
        const stats = await getAccountStatsByBusiness(businessId);
        return NextResponse.json({ accounts, stats });
      }
      
      return NextResponse.json({ accounts });
    }

    // 获取企业账号
    const accounts = await getAccountsByBusiness(businessId);
    
    if (includeStats) {
      const stats = await getAccountStatsByBusiness(businessId);
      return NextResponse.json({ accounts, stats });
    }
    
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('获取账号数据失败:', error);
    return NextResponse.json({ error: '获取账号数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/accounts
 * 创建新账号 - 只能为自己企业创建账号
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();

    // 确定要使用的 businessId
    let businessId: string;
    
    if (body.businessId) {
      // 前端传递了 businessId，验证用户是否拥有该商家
      const hasAccess = await validateBusinessOwnership(user.id, body.businessId);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限在该商家创建数据' }, { status: 403 });
      }
      businessId = body.businessId;
    } else {
      // 没有传递 businessId，获取用户的第一个商家
      const businesses = await getBusinessesByOwner(user.id);
      if (businesses.length === 0) {
        return NextResponse.json({ error: '请先创建企业' }, { status: 400 });
      }
      businessId = businesses[0].id;
    }

    const input: CreateAccountInput = {
      businessId: businessId,
      platform: body.platform,
      platformCategory: body.platformCategory,
      aiModel: body.aiModel,
      accountName: body.accountName || '',
      displayName: body.displayName || '',
      homepageUrl: body.homepageUrl,
      avatar: body.avatar,
      followers: body.followers || 0,
      status: body.status || 'active',
      metadata: body.metadata,
      webhookConfig: body.webhookConfig,
    };

    const account = await createAccount(input);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error('创建账号失败:', error);
    return NextResponse.json({ error: '创建账号失败' }, { status: 500 });
  }
}

/**
 * PUT /api/accounts
 * 更新账号信息 - 只能更新自己企业的账号
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
      return NextResponse.json({ error: '缺少账号ID' }, { status: 400 });
    }

    // 验证账号是否属于用户的企业
    const existingAccount = await getAccountById(id);
    if (!existingAccount) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }
    const hasAccess = await validateBusinessOwnership(user.id, existingAccount.businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: '您没有权限修改该账号' }, { status: 403 });
    }

    const account = await updateAccount(id, updateData as UpdateAccountInput);
    if (!account) {
      return NextResponse.json({ error: '更新账号失败' }, { status: 500 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error('更新账号失败:', error);
    return NextResponse.json({ error: '更新账号失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/accounts
 * 删除账号 - 只能删除自己企业的账号
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
      return NextResponse.json({ error: '缺少账号ID' }, { status: 400 });
    }

    // 验证账号是否属于用户的企业
    const existingAccount = await getAccountById(id);
    if (!existingAccount) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }
    const hasAccess = await validateBusinessOwnership(user.id, existingAccount.businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: '您没有权限删除该账号' }, { status: 403 });
    }

    const success = await deleteAccount(id);
    if (!success) {
      return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除账号失败:', error);
    return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
  }
}

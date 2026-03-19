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
  type CreateAccountInput,
  type UpdateAccountInput
} from '@/lib/account-store';

/**
 * GET /api/accounts
 * 获取账号列表
 * Query params:
 * - id: 账号ID（可选，获取单个账号）
 * - businessId: 企业ID（筛选该企业的账号）
 * - platform: 平台筛选
 * - status: 状态筛选
 * - stats: 是否包含统计信息
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const includeStats = searchParams.get('stats') === 'true';

    // 获取单个账号
    if (id) {
      const account = await getAccountById(id);
      if (!account) {
        return NextResponse.json({ error: '账号不存在' }, { status: 404 });
      }
      return NextResponse.json({ account });
    }

    // 获取企业账号
    if (businessId) {
      const accounts = await getAccountsByBusiness(businessId);
      
      if (includeStats) {
        const stats = await getAccountStatsByBusiness(businessId);
        return NextResponse.json({ accounts, stats });
      }
      
      return NextResponse.json({ accounts });
    }

    // 获取平台账号
    if (platform) {
      const accounts = await getAccountsByPlatform(platform);
      return NextResponse.json({ accounts });
    }

    // 获取所有账号（支持筛选）
    const options = {
      platform: platform || undefined,
      status: status || undefined,
      businessId: businessId || undefined,
    };
    
    const accounts = await getAllAccounts(options);
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('获取账号数据失败:', error);
    return NextResponse.json({ error: '获取账号数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/accounts
 * 创建新账号
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.businessId) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    const input: CreateAccountInput = {
      businessId: body.businessId,
      personaId: body.personaId,
      platform: body.platform,
      accountName: body.accountName || '',
      displayName: body.displayName || '',
      homepageUrl: body.homepageUrl,
      avatar: body.avatar,
      followers: body.followers || 0,
      status: body.status || 'active',
      metadata: body.metadata,
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
 * 更新账号信息
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少账号ID' }, { status: 400 });
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
 * 删除账号
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少账号ID' }, { status: 400 });
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

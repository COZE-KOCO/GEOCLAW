/**
 * Admin 用户管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { 
  getUserAccounts, 
  createUserAccount, 
  updateUserAccount, 
  deleteUserAccount,
  updateUserPassword 
} from '@/lib/admin-store';

/**
 * 获取用户列表
 * GET /api/admin/users?status=active&role=user&search=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const role = searchParams.get('role') || undefined;
    const search = searchParams.get('search') || undefined;

    const users = await getUserAccounts({ status, role, search });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建用户
 * POST /api/admin/users
 * Body: { name, email?, phone?, password, role?, status?, permissions?, packageId?, packageExpiresAt? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, password, role, status, permissions, packageId, packageExpiresAt } = body;

    if (!name || !password) {
      return NextResponse.json(
        { success: false, error: '姓名和密码为必填项' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: '邮箱或手机号至少填写一项' },
        { status: 400 }
      );
    }

    try {
      const user = await createUserAccount({
        name,
        email,
        phone,
        password,
        role,
        status,
        permissions,
        packageId,
        packageExpiresAt,
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: '创建用户失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: user });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '创建用户失败';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json(
      { success: false, error: '创建用户失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新用户
 * PUT /api/admin/users
 * Body: { id, status?, role?, permissions?, packageId?, packageExpiresAt?, name?, email?, phone? }
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { id, password, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 如果有密码更新
    if (password) {
      await updateUserPassword(id, password);
    }

    const user = await updateUserAccount(id, updates);

    if (!user) {
      return NextResponse.json(
        { success: false, error: '更新用户失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json(
      { success: false, error: '更新用户失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除用户
 * DELETE /api/admin/users?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    const success = await deleteUserAccount(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '删除用户失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
}

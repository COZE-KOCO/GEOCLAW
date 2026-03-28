/**
 * Admin 登录 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminLogin, createAdminToken } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const result = await verifyAdminLogin(username, password);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    const token = await createAdminToken(result.admin!);

    // 设置cookie
    const response = NextResponse.json({
      success: true,
      admin: result.admin,
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true, // 允许在 iframe 中设置独立的 Cookie
      maxAge: 24 * 60 * 60, // 24小时
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Admin Login] Error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}

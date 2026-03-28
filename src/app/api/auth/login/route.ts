/**
 * 用户登录 API
 * 
 * 注意：业务逻辑错误（如密码错误）返回 200 + success: false
 * 只有服务器内部错误才返回 5xx 状态码
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyUserLogin, createUserToken } from '@/lib/user-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account, password } = body;

    if (!account || !password) {
      return NextResponse.json(
        { success: false, error: '请输入账号和密码' }
      );
    }

    const result = await verifyUserLogin(account, password);

    if (!result.success) {
      // 业务错误返回 200，前端根据 success 字段判断
      return NextResponse.json(
        { success: false, error: result.error }
      );
    }

    const token = await createUserToken(result.user!);

    // 设置cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // 主 cookie：用于 Web 端（支持 iframe 场景）
    response.cookies.set('user_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true, // 允许在 iframe 中设置独立的 Cookie
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    // 备用 cookie：用于 Electron 桌面端（不使用 partitioned）
    // Electron 的 session API 可能无法正确获取 partitioned cookie
    // 所以额外设置一个非 partitioned 的 cookie 作为备用
    response.cookies.set('user_token_electron', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax', // Electron 环境下使用 lax 更安全
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[User Login] Error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}

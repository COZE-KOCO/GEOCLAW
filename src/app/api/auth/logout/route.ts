/**
 * 用户登出 API
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // 清除用户 token cookie - 与登录时保持一致的属性
  response.cookies.set('user_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
    expires: new Date(0),
  });
  
  return response;
}

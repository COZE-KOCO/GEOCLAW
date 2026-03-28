/**
 * 用户登出 API
 * 清除所有可能的用户认证 cookie 变体
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // 清除主用户 token cookie - 与登录时保持一致的属性
  // 注意：需要清除两种变体（partitioned 和非 partitioned）
  
  // 变体 1: partitioned cookie (Web 端)
  response.cookies.set('user_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
    expires: new Date(0),
  });
  
  // 变体 2: 非 partitioned cookie (可能是旧版本遗留)
  response.cookies.set('user_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  
  // 变体 3: Electron 专用 cookie
  response.cookies.set('user_token_electron', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  
  // 变体 4: Electron 专用 cookie (partitioned 版本，以防万一)
  response.cookies.set('user_token_electron', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
    expires: new Date(0),
  });
  
  return response;
}

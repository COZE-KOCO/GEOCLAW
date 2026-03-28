import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 公开路径（不需要登录）
const PUBLIC_PATHS = [
  '/login',
  '/admin/login',
  '/_next',
  '/favicon.ico',
];

// 静态文件扩展名
const STATIC_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.gz',
  '.zip',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 路由自己处理认证，不在 middleware 中处理
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 检查是否是静态文件
  const isStaticFile = STATIC_EXTENSIONS.some(ext => pathname.toLowerCase().endsWith(ext));
  if (isStaticFile) {
    return NextResponse.next();
  }

  // 检查是否是公开路径
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 检查是否有token
  const userToken = request.cookies.get('user_token');
  const adminToken = request.cookies.get('admin_token');

  // 如果是管理端路径（/admin 或 /admin/xxx）
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // 对于其他路径，检查用户token
  if (!userToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

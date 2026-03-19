/**
 * OAuth授权发起API
 * GET: 获取授权链接
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAuthUrl,
  isPlatformOAuthSupported,
  getSupportedOAuthPlatforms,
} from '@/lib/platform-oauth';

/**
 * GET /api/oauth/authorize
 * 获取OAuth授权链接
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');
  const businessId = searchParams.get('businessId');

  // 获取支持的平台列表
  if (!platform) {
    const platforms = getSupportedOAuthPlatforms();
    // 添加配置状态
    const platformsWithConfig = platforms.map(p => ({
      ...p,
      configured: !!(process.env[`${p.platform.toUpperCase().replace(/-/g, '_')}_APP_ID`] || 
                    process.env[`${p.platform.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`]),
    }));
    return NextResponse.json({
      success: true,
      data: platformsWithConfig,
    });
  }

  // 检查平台是否支持
  if (!isPlatformOAuthSupported(platform)) {
    return NextResponse.json(
      { success: false, error: '不支持的平台授权' },
      { status: 400 }
    );
  }

  if (!businessId) {
    return NextResponse.json(
      { success: false, error: '请提供企业ID' },
      { status: 400 }
    );
  }

  try {
    // 检查是否配置了OAuth凭证
    const clientId = process.env[`${platform.toUpperCase().replace(/-/g, '_')}_APP_ID`] || 
                     process.env[`${platform.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`];
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: '该平台OAuth凭证未配置，请联系管理员或手动配置',
        code: 'OAUTH_NOT_CONFIGURED',
      }, { status: 400 });
    }
    
    // 生成授权链接
    const authUrl = generateAuthUrl(platform, { businessId });
    
    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        platform,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '生成授权链接失败' },
      { status: 500 }
    );
  }
}

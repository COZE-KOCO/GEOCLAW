/**
 * OAuth回调处理API
 * 处理各平台的OAuth授权回调
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  fetchPlatformAccountInfo,
  getPlatformOAuthConfig,
} from '@/lib/platform-oauth';
import { createAccount, updateAccount, getAccountsByBusiness } from '@/lib/account-store';

/**
 * GET /api/oauth/callback/[platform]
 * 处理OAuth回调
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const searchParams = request.nextUrl.searchParams;
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  // 处理授权错误
  if (error) {
    const redirectUrl = new URL('/matrix', request.url);
    redirectUrl.searchParams.set('oauth_error', errorDesc || error);
    redirectUrl.searchParams.set('platform', platform);
    return NextResponse.redirect(redirectUrl);
  }

  // 检查授权码
  if (!code) {
    const redirectUrl = new URL('/matrix', request.url);
    redirectUrl.searchParams.set('oauth_error', '未收到授权码');
    redirectUrl.searchParams.set('platform', platform);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // 解析state参数
    let stateData: { businessId: string; platform: string; timestamp: number } | null = null;
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch (e) {
        console.error('解析state失败:', e);
      }
    }

    const businessId = stateData?.businessId;
    if (!businessId) {
      throw new Error('无效的授权状态');
    }

    // 获取平台配置
    const config = getPlatformOAuthConfig(platform);
    if (!config) {
      throw new Error('不支持的平台');
    }

    // 用授权码换取访问令牌
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const redirectUri = `${domain}${config.callbackPath}`;
    const tokens = await exchangeCodeForToken(platform, code, redirectUri);

    // 获取账号信息
    const accountInfo = await fetchPlatformAccountInfo(platform, tokens);

    // 检查账号是否已存在
    const existingAccounts = await getAccountsByBusiness(businessId);
    const existingAccount = existingAccounts.find(
      a => a.platform === platform && a.accountName === accountInfo.platformId
    );

    // 构建账号数据
    const accountData = {
      businessId,
      platform,
      accountName: accountInfo.platformId,
      displayName: accountInfo.displayName,
      avatar: accountInfo.avatar,
      followers: accountInfo.followers || 0,
      status: 'active' as const,
      metadata: {
        homepageUrl: accountInfo.profileUrl,
        authStatus: 'authorized',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt?.toISOString(),
        platformData: accountInfo.metadata,
      },
    };

    let account;
    if (existingAccount) {
      // 更新已有账号
      account = await updateAccount(existingAccount.id, {
        displayName: accountInfo.displayName,
        avatar: accountInfo.avatar,
        followers: accountInfo.followers,
        status: 'active',
        metadata: accountData.metadata,
      });
    } else {
      // 创建新账号
      account = await createAccount(accountData);
    }

    // 重定向到成功页面
    const redirectUrl = new URL('/matrix', request.url);
    redirectUrl.searchParams.set('oauth_success', 'true');
    redirectUrl.searchParams.set('platform', platform);
    redirectUrl.searchParams.set('account_name', accountInfo.displayName);
    
    return NextResponse.redirect(redirectUrl);
    
  } catch (error: any) {
    console.error('OAuth回调处理失败:', error);
    
    const redirectUrl = new URL('/matrix', request.url);
    redirectUrl.searchParams.set('oauth_error', error.message || '授权失败');
    redirectUrl.searchParams.set('platform', platform);
    
    return NextResponse.redirect(redirectUrl);
  }
}

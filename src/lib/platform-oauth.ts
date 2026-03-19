/**
 * 平台OAuth授权配置
 * 各平台的OAuth授权配置和账号信息获取
 */

// ==================== 类型定义 ====================

export interface OAuthConfig {
  platform: string;
  name: string;
  icon: string;
  color: string;
  
  // OAuth配置
  authUrl: string;
  tokenUrl: string;
  scope: string;
  
  // API端点
  userInfoUrl?: string;
  profileUrl?: string;
  
  // 支持的功能
  features: {
    autoPublish: boolean;      // 支持自动发布
    autoFetchInfo: boolean;    // 支持自动获取账号信息
    refreshable: boolean;      // 支持刷新token
  };
  
  // 回调路径
  callbackPath: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

export interface PlatformAccountInfo {
  platformId: string;        // 平台账号ID
  platformName: string;      // 平台账号名/昵称
  displayName: string;       // 显示名称
  avatar?: string;           // 头像URL
  followers?: number;        // 粉丝数
  verified?: boolean;        // 是否认证
  profileUrl?: string;       // 主页URL
  description?: string;      // 简介
  metadata?: Record<string, any>;
}

// ==================== 平台配置 ====================

/**
 * 微信公众号OAuth配置
 */
export const wechatOAuthConfig: OAuthConfig = {
  platform: 'wechat',
  name: '微信公众号',
  icon: '💚',
  color: '#07c160',
  
  authUrl: 'https://open.weixin.qq.com/connect/qrconnect',
  tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
  scope: 'snsapi_userinfo',
  
  userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
  profileUrl: 'https://api.weixin.qq.com/cgi-bin/user/info',
  
  features: {
    autoPublish: true,
    autoFetchInfo: true,
    refreshable: true,
  },
  
  callbackPath: '/api/oauth/callback/wechat',
};

/**
 * 知乎OAuth配置
 */
export const zhihuOAuthConfig: OAuthConfig = {
  platform: 'zhihu',
  name: '知乎',
  icon: '💡',
  color: '#0066ff',
  
  authUrl: 'https://www.zhihu.com/oauth2/authorize',
  tokenUrl: 'https://www.zhihu.com/oauth2/access_token',
  scope: 'read write',
  
  userInfoUrl: 'https://www.zhihu.com/api/v4/me',
  profileUrl: 'https://www.zhihu.com/api/v4/me',
  
  features: {
    autoPublish: true,
    autoFetchInfo: true,
    refreshable: true,
  },
  
  callbackPath: '/api/oauth/callback/zhihu',
};

/**
 * 微博OAuth配置
 */
export const weiboOAuthConfig: OAuthConfig = {
  platform: 'weibo',
  name: '微博',
  icon: '🔴',
  color: '#ff8200',
  
  authUrl: 'https://api.weibo.com/oauth2/authorize',
  tokenUrl: 'https://api.weibo.com/oauth2/access_token',
  scope: 'all',
  
  userInfoUrl: 'https://api.weibo.com/2/users/show.json',
  profileUrl: 'https://api.weibo.com/2/account/get_uid.json',
  
  features: {
    autoPublish: true,
    autoFetchInfo: true,
    refreshable: true,
  },
  
  callbackPath: '/api/oauth/callback/weibo',
};

/**
 * 今日头条OAuth配置
 */
export const toutiaoOAuthConfig: OAuthConfig = {
  platform: 'toutiao',
  name: '今日头条',
  icon: '📰',
  color: '#ff0000',
  
  authUrl: 'https://open.douyin.com/platform/oauth/connect',
  tokenUrl: 'https://open.douyin.com/oauth/access_token',
  scope: 'user_info,video.create',
  
  userInfoUrl: 'https://open.douyin.com/oauth/userinfo',
  
  features: {
    autoPublish: true,
    autoFetchInfo: true,
    refreshable: true,
  },
  
  callbackPath: '/api/oauth/callback/toutiao',
};

/**
 * B站OAuth配置
 */
export const bilibiliOAuthConfig: OAuthConfig = {
  platform: 'bilibili',
  name: 'B站',
  icon: '📺',
  color: '#00a1d6',
  
  authUrl: 'https://passport.bilibili.com/oauth2/authorize',
  tokenUrl: 'https://passport.bilibili.com/oauth2/access_token',
  scope: 'read write',
  
  userInfoUrl: 'https://api.bilibili.com/x/space/acc/info',
  
  features: {
    autoPublish: true,
    autoFetchInfo: true,
    refreshable: true,
  },
  
  callbackPath: '/api/oauth/callback/bilibili',
};

/**
 * 小红书OAuth配置
 * 注意：小红书开放平台需要申请
 */
export const xiaohongshuOAuthConfig: OAuthConfig = {
  platform: 'xiaohongshu',
  name: '小红书',
  icon: '📕',
  color: '#ff2442',
  
  authUrl: 'https://open.xiaohongshu.com/oauth/authorize',
  tokenUrl: 'https://open.xiaohongshu.com/oauth/token',
  scope: 'basic',
  
  userInfoUrl: 'https://open.xiaohongshu.com/api/v1/user/info',
  
  features: {
    autoPublish: true,
    autoFetchInfo: true,
    refreshable: true,
  },
  
  callbackPath: '/api/oauth/callback/xiaohongshu',
};

/**
 * 抖音OAuth配置
 */
export const douyinOAuthConfig: OAuthConfig = {
  platform: 'douyin',
  name: '抖音',
  icon: '🎵',
  color: '#000000',
  
  authUrl: 'https://open.douyin.com/platform/oauth/connect',
  tokenUrl: 'https://open.douyin.com/oauth/access_token',
  scope: 'user_info,video.create',
  
  userInfoUrl: 'https://open.douyin.com/oauth/userinfo',
  
  features: {
    autoPublish: true,
    autoFetchInfo: true,
    refreshable: true,
  },
  
  callbackPath: '/api/oauth/callback/douyin',
};

// ==================== 平台配置注册表 ====================

export const platformOAuthConfigs: Record<string, OAuthConfig> = {
  wechat: wechatOAuthConfig,
  zhihu: zhihuOAuthConfig,
  weibo: weiboOAuthConfig,
  toutiao: toutiaoOAuthConfig,
  bilibili: bilibiliOAuthConfig,
  xiaohongshu: xiaohongshuOAuthConfig,
  douyin: douyinOAuthConfig,
};

// ==================== 授权链接生成 ====================

/**
 * 生成OAuth授权链接
 */
export function generateAuthUrl(
  platform: string,
  options: {
    businessId: string;
    redirectUri?: string;
    state?: string;
  }
): string {
  const config = platformOAuthConfigs[platform];
  if (!config) {
    throw new Error(`不支持的平台: ${platform}`);
  }
  
  const clientId = getPlatformClientId(platform);
  const redirectUri = options.redirectUri || getCallbackUrl(platform);
  
  // 构建state参数（包含业务ID）
  const state = options.state || Buffer.from(JSON.stringify({
    businessId: options.businessId,
    platform,
    timestamp: Date.now(),
  })).toString('base64');
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  });
  
  // 微信特殊处理
  if (platform === 'wechat') {
    return `${config.authUrl}?${params.toString()}#wechat_redirect`;
  }
  
  return `${config.authUrl}?${params.toString()}`;
}

/**
 * 获取平台Client ID
 */
function getPlatformClientId(platform: string): string {
  const clientIds: Record<string, string> = {
    wechat: process.env.WECHAT_APP_ID || '',
    zhihu: process.env.ZHIHU_CLIENT_ID || '',
    weibo: process.env.WEIBO_APP_KEY || '',
    toutiao: process.env.TOUTIAO_APP_ID || '',
    bilibili: process.env.BILIBILI_APP_ID || '',
    xiaohongshu: process.env.XIAOHONGSHU_APP_ID || '',
    douyin: process.env.DOUYIN_APP_ID || '',
  };
  
  return clientIds[platform] || '';
}

/**
 * 检查平台OAuth凭证是否已配置
 */
export function isPlatformOAuthConfigured(platform: string): boolean {
  const clientId = getPlatformClientId(platform);
  const clientSecret = getPlatformClientSecret(platform);
  return !!(clientId && clientSecret);
}

/**
 * 获取未配置OAuth凭证的平台列表
 */
export function getUnconfiguredPlatforms(): string[] {
  const platforms = Object.keys(platformOAuthConfigs);
  return platforms.filter(p => !isPlatformOAuthConfigured(p));
}

/**
 * 获取已配置OAuth凭证的平台列表
 */
export function getConfiguredPlatforms(): string[] {
  const platforms = Object.keys(platformOAuthConfigs);
  return platforms.filter(p => isPlatformOAuthConfigured(p));
}

/**
 * 获取平台Client Secret
 */
export function getPlatformClientSecret(platform: string): string {
  const secrets: Record<string, string> = {
    wechat: process.env.WECHAT_APP_SECRET || '',
    zhihu: process.env.ZHIHU_CLIENT_SECRET || '',
    weibo: process.env.WEIBO_APP_SECRET || '',
    toutiao: process.env.TOUTIAO_APP_SECRET || '',
    bilibili: process.env.BILIBILI_APP_SECRET || '',
    xiaohongshu: process.env.XIAOHONGSHU_APP_SECRET || '',
    douyin: process.env.DOUYIN_APP_SECRET || '',
  };
  
  return secrets[platform] || '';
}

/**
 * 获取回调URL
 */
function getCallbackUrl(platform: string): string {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
  const config = platformOAuthConfigs[platform];
  return `${domain}${config.callbackPath}`;
}

// ==================== Token处理 ====================

/**
 * 用授权码换取访问令牌
 */
export async function exchangeCodeForToken(
  platform: string,
  code: string,
  redirectUri?: string
): Promise<OAuthTokens> {
  const config = platformOAuthConfigs[platform];
  if (!config) {
    throw new Error(`不支持的平台: ${platform}`);
  }
  
  const clientId = getPlatformClientId(platform);
  const clientSecret = getPlatformClientSecret(platform);
  const callbackUrl = redirectUri || getCallbackUrl(platform);
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
  });
  
  // 微博特殊处理
  let tokenUrl = config.tokenUrl;
  if (platform === 'weibo') {
    tokenUrl = `${config.tokenUrl}?${params.toString()}`;
  }
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params.toString(),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  // 计算过期时间
  const expiresAt = data.expires_in 
    ? new Date(Date.now() + data.expires_in * 1000)
    : undefined;
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    expiresAt,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

/**
 * 刷新访问令牌
 */
export async function refreshAccessToken(
  platform: string,
  refreshToken: string
): Promise<OAuthTokens> {
  const config = platformOAuthConfigs[platform];
  if (!config || !config.features.refreshable) {
    throw new Error(`平台不支持刷新令牌: ${platform}`);
  }
  
  const clientId = getPlatformClientId(platform);
  const clientSecret = getPlatformClientSecret(platform);
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params.toString(),
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
  
  const expiresAt = data.expires_in 
    ? new Date(Date.now() + data.expires_in * 1000)
    : undefined;
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    expiresAt,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

// ==================== 账号信息获取 ====================

/**
 * 获取平台账号信息
 */
export async function fetchPlatformAccountInfo(
  platform: string,
  tokens: OAuthTokens
): Promise<PlatformAccountInfo> {
  const config = platformOAuthConfigs[platform];
  if (!config || !config.userInfoUrl) {
    throw new Error(`平台不支持获取账号信息: ${platform}`);
  }
  
  switch (platform) {
    case 'wechat':
      return fetchWechatAccountInfo(tokens);
    case 'zhihu':
      return fetchZhihuAccountInfo(tokens);
    case 'weibo':
      return fetchWeiboAccountInfo(tokens);
    case 'bilibili':
      return fetchBilibiliAccountInfo(tokens);
    case 'xiaohongshu':
      return fetchXiaohongshuAccountInfo(tokens);
    case 'douyin':
      return fetchDouyinAccountInfo(tokens);
    default:
      throw new Error(`未实现的平台: ${platform}`);
  }
}

/**
 * 微信公众号账号信息
 */
async function fetchWechatAccountInfo(tokens: OAuthTokens): Promise<PlatformAccountInfo> {
  const response = await fetch(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${tokens.accessToken}&openid=`
  );
  
  const data = await response.json();
  
  if (data.errcode) {
    throw new Error(data.errmsg);
  }
  
  return {
    platformId: data.unionid || data.openid,
    platformName: data.nickname,
    displayName: data.nickname,
    avatar: data.headimgurl,
    followers: 0, // 公众号粉丝数需要通过其他API获取
    verified: false,
    profileUrl: '',
    description: '',
    metadata: {
      openid: data.openid,
      unionid: data.unionid,
      sex: data.sex,
      province: data.province,
      city: data.city,
      country: data.country,
    },
  };
}

/**
 * 知乎账号信息
 */
async function fetchZhihuAccountInfo(tokens: OAuthTokens): Promise<PlatformAccountInfo> {
  const response = await fetch('https://www.zhihu.com/api/v4/me', {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });
  
  const data = await response.json();
  
  return {
    platformId: data.id?.toString() || data.url_token,
    platformName: data.url_token,
    displayName: data.name,
    avatar: data.avatar_url,
    followers: data.follower_count || 0,
    verified: data.is_org || false,
    profileUrl: `https://www.zhihu.com/people/${data.url_token}`,
    description: data.headline || '',
    metadata: {
      urlToken: data.url_token,
      answerCount: data.answer_count,
      articlesCount: data.articles_count,
    },
  };
}

/**
 * 微博账号信息
 */
async function fetchWeiboAccountInfo(tokens: OAuthTokens): Promise<PlatformAccountInfo> {
  // 先获取uid
  const uidRes = await fetch(
    `https://api.weibo.com/2/account/get_uid.json?access_token=${tokens.accessToken}`
  );
  const uidData = await uidRes.json();
  
  if (uidData.error) {
    throw new Error(uidData.error);
  }
  
  // 获取用户信息
  const userRes = await fetch(
    `https://api.weibo.com/2/users/show.json?access_token=${tokens.accessToken}&uid=${uidData.uid}`
  );
  const userData = await userRes.json();
  
  if (userData.error) {
    throw new Error(userData.error);
  }
  
  return {
    platformId: userData.idstr || userData.id.toString(),
    platformName: userData.screen_name,
    displayName: userData.screen_name,
    avatar: userData.profile_image_url,
    followers: userData.followers_count || 0,
    verified: userData.verified || false,
    profileUrl: `https://weibo.com/u/${userData.id}`,
    description: userData.description || '',
    metadata: {
      screenName: userData.screen_name,
      statusesCount: userData.statuses_count,
      friendsCount: userData.friends_count,
    },
  };
}

/**
 * B站账号信息
 */
async function fetchBilibiliAccountInfo(tokens: OAuthTokens): Promise<PlatformAccountInfo> {
  const response = await fetch('https://api.bilibili.com/x/space/acc/info', {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });
  
  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(data.message);
  }
  
  const user = data.data;
  
  return {
    platformId: user.mid?.toString(),
    platformName: user.name,
    displayName: user.name,
    avatar: user.face,
    followers: user.fans || 0,
    verified: user.official?.type > 0,
    profileUrl: `https://space.bilibili.com/${user.mid}`,
    description: user.sign || '',
    metadata: {
      level: user.level,
      sex: user.sex,
      coins: user.coins,
    },
  };
}

/**
 * 小红书账号信息
 */
async function fetchXiaohongshuAccountInfo(tokens: OAuthTokens): Promise<PlatformAccountInfo> {
  const response = await fetch('https://open.xiaohongshu.com/api/v1/user/info', {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  const user = data.data;
  
  return {
    platformId: user.user_id,
    platformName: user.nickname,
    displayName: user.nickname,
    avatar: user.image,
    followers: user.followers || 0,
    verified: false,
    profileUrl: `https://www.xiaohongshu.com/user/profile/${user.user_id}`,
    description: user.desc || '',
    metadata: {
      notesCount: user.notes_count,
      likesCount: user.likes_count,
    },
  };
}

/**
 * 抖音账号信息
 */
async function fetchDouyinAccountInfo(tokens: OAuthTokens): Promise<PlatformAccountInfo> {
  const response = await fetch('https://open.douyin.com/oauth/userinfo/', {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });
  
  const data = await response.json();
  
  if (data.data?.error_code !== 0) {
    throw new Error(data.data?.description || '获取用户信息失败');
  }
  
  const user = data.data;
  
  return {
    platformId: user.open_id,
    platformName: user.nickname,
    displayName: user.nickname,
    avatar: user.avatar,
    followers: user.followers || 0,
    verified: false,
    profileUrl: '',
    description: '',
    metadata: {
      unionId: user.union_id,
    },
  };
}

// ==================== 辅助函数 ====================

/**
 * 获取所有支持的OAuth平台
 */
export function getSupportedOAuthPlatforms() {
  return Object.values(platformOAuthConfigs).map(config => ({
    platform: config.platform,
    name: config.name,
    icon: config.icon,
    color: config.color,
    features: config.features,
    callbackPath: config.callbackPath,
  }));
}

/**
 * 检查平台是否支持OAuth授权
 */
export function isPlatformOAuthSupported(platform: string): boolean {
  return platform in platformOAuthConfigs;
}

/**
 * 获取平台OAuth配置
 */
export function getPlatformOAuthConfig(platform: string): OAuthConfig | undefined {
  return platformOAuthConfigs[platform];
}

import { getSupabaseClient } from '@/storage/database/supabase-client';

// ==================== 类型定义 ====================

export interface AnalyticsStats {
  totalContent: number;
  publishedContent: number;
  totalReads: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgSeoScore: number;
  totalAccounts: number;
  activeAccounts: number;
}

export interface ContentTrend {
  date: string;
  content: number;
  published: number;
  reads: number;
}

export interface PlatformStat {
  platform: string;
  accountCount: number;
  contentCount: number;
  publishedCount: number;
  totalReads: number;
}

export interface TopContent {
  id: string;
  title: string;
  status: string;
  seoScore: number;
  createdAt: string;
  publishedUrl?: string;
  reads?: number;
}

export interface AccountPerformance {
  id: string;
  platform: string;
  accountName: string;
  displayName: string;
  followers: number;
  contentCount: number;
  publishedCount: number;
}

// ==================== 数据访问函数 ====================

/**
 * 获取商家分析统计数据
 */
export async function getAnalyticsStats(
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsStats> {
  const client = getSupabaseClient();

  // 获取内容统计
  let contentQuery = client
    .from('content_drafts')
    .select('id, status, seo_score', { count: 'exact' })
    .eq('business_id', businessId);

  if (startDate) {
    contentQuery = contentQuery.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    contentQuery = contentQuery.lte('created_at', endDate.toISOString());
  }

  const { data: contentData, count: totalContent } = await contentQuery;

  // 计算统计数据
  const publishedContent = contentData?.filter((c: any) => c.status === 'published').length || 0;
  const totalSeoScore = contentData?.reduce((sum: number, c: any) => sum + (c.seo_score || 0), 0) || 0;
  const avgSeoScore = contentData && contentData.length > 0 
    ? Math.round(totalSeoScore / contentData.length) 
    : 0;

  // 获取账号统计
  const { count: totalAccounts } = await client
    .from('matrix_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  const { count: activeAccounts } = await client
    .from('matrix_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('status', 'active');

  // 模拟互动数据（实际应从统计表获取）
  const totalReads = publishedContent * 150;
  const totalLikes = publishedContent * 25;
  const totalComments = publishedContent * 8;
  const totalShares = publishedContent * 3;

  return {
    totalContent: totalContent || 0,
    publishedContent,
    totalReads,
    totalLikes,
    totalComments,
    totalShares,
    avgSeoScore,
    totalAccounts: totalAccounts || 0,
    activeAccounts: activeAccounts || 0,
  };
}

/**
 * 获取内容趋势数据
 */
export async function getContentTrends(
  businessId: string,
  days: number = 7
): Promise<ContentTrend[]> {
  const client = getSupabaseClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await client
    .from('content_drafts')
    .select('created_at, status')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  // 按日期分组统计
  const trendMap = new Map<string, { content: number; published: number }>();

  // 初始化所有日期
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trendMap.set(dateStr, { content: 0, published: 0 });
  }

  // 统计数据
  if (data) {
    for (const item of data) {
      const dateStr = (item.created_at as string).split('T')[0];
      const existing = trendMap.get(dateStr);
      if (existing) {
        existing.content++;
        if (item.status === 'published') {
          existing.published++;
        }
      }
    }
  }

  // 转换为数组
  const result: ContentTrend[] = [];
  for (const [date, stats] of trendMap.entries()) {
    result.push({
      date,
      content: stats.content,
      published: stats.published,
      reads: stats.published * Math.floor(100 + Math.random() * 200), // 模拟阅读数据
    });
  }

  return result;
}

/**
 * 获取平台统计数据
 */
export async function getPlatformStats(
  businessId: string
): Promise<PlatformStat[]> {
  const client = getSupabaseClient();

  const { data: accounts } = await client
    .from('matrix_accounts')
    .select('platform, followers')
    .eq('business_id', businessId);

  // 按平台分组统计
  const platformMap = new Map<string, { accounts: number; followers: number }>();

  if (accounts) {
    for (const account of accounts) {
      const existing = platformMap.get(account.platform) || { accounts: 0, followers: 0 };
      existing.accounts++;
      existing.followers += account.followers || 0;
      platformMap.set(account.platform, existing);
    }
  }

  // 平台名称映射
  const platformNames: Record<string, string> = {
    'xiaohongshu': '小红书',
    'douyin': '抖音',
    'zhihu': '知乎',
    'wechat': '微信公众号',
    'weibo': '微博',
    'bilibili': 'B站',
  };

  // 转换为数组
  const result: PlatformStat[] = [];
  for (const [platform, data] of platformMap.entries()) {
    result.push({
      platform: platformNames[platform] || platform,
      accountCount: data.accounts,
      contentCount: Math.floor(data.accounts * 15 + Math.random() * 20),
      publishedCount: Math.floor(data.accounts * 10 + Math.random() * 15),
      totalReads: data.followers + Math.floor(Math.random() * 10000),
    });
  }

  // 如果没有数据，返回模拟数据
  if (result.length === 0) {
    return [
      { platform: '小红书', accountCount: 2, contentCount: 35, publishedCount: 28, totalReads: 12500 },
      { platform: '抖音', accountCount: 1, contentCount: 18, publishedCount: 15, totalReads: 8900 },
      { platform: '知乎', accountCount: 1, contentCount: 12, publishedCount: 10, totalReads: 5600 },
    ];
  }

  return result;
}

/**
 * 获取热门内容 TOP N
 */
export async function getTopContent(
  businessId: string,
  limit: number = 10
): Promise<TopContent[]> {
  const client = getSupabaseClient();

  const { data } = await client
    .from('content_drafts')
    .select('id, title, status, seo_score, created_at')
    .eq('business_id', businessId)
    .order('seo_score', { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((c: any) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    seoScore: c.seo_score || 0,
    createdAt: c.created_at,
    reads: Math.floor(500 + Math.random() * 5000), // 模拟阅读数据
  }));
}

/**
 * 获取账号表现排行
 */
export async function getAccountPerformance(
  businessId: string
): Promise<AccountPerformance[]> {
  const client = getSupabaseClient();

  const { data } = await client
    .from('matrix_accounts')
    .select('id, platform, account_name, display_name, followers')
    .eq('business_id', businessId)
    .order('followers', { ascending: false });

  if (!data) return [];

  return data.map((a: any) => ({
    id: a.id,
    platform: a.platform,
    accountName: a.account_name,
    displayName: a.display_name,
    followers: a.followers || 0,
    contentCount: Math.floor(10 + Math.random() * 30), // 模拟数据
    publishedCount: Math.floor(8 + Math.random() * 25),
  }));
}

/**
 * 多平台账号管理系统
 * 支持矩阵号运营、一键发布、数据同步
 */

export interface PlatformAccount {
  id: string;
  platform: Platform;
  accountName: string;
  displayName: string;
  avatar?: string;
  description?: string;
  personId?: string; // 关联人设ID
  status: 'active' | 'inactive' | 'pending';
  followers?: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConfig {
  id: Platform;
  name: string;
  icon: string;
  category: 'content' | 'social' | 'video' | 'qa';
  maxTitleLength: number;
  maxContentLength: number;
  supportsImage: boolean;
  supportsVideo: boolean;
  apiEndpoint?: string;
  publishRules: PublishRule[];
}

export interface PublishRule {
  field: string;
  required: boolean;
  maxLength?: number;
  minLength?: number;
  format?: string;
  transform?: string;
}

export type Platform = 
  | 'zhihu'
  | 'xiaohongshu'
  | 'weixin'
  | 'toutiao'
  | 'baijiahao'
  | 'sohu'
  | 'jianshu'
  | 'bilibili'
  | 'douyin'
  | 'weibo'
  | 'kuaishou';

/**
 * 平台配置库
 */
export const platformConfigs: Record<Platform, PlatformConfig> = {
  zhihu: {
    id: 'zhihu',
    name: '知乎',
    icon: '📘',
    category: 'qa',
    maxTitleLength: 50,
    maxContentLength: 50000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 50 },
      { field: 'content', required: true, minLength: 100 },
      { field: 'topics', required: true },
    ],
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '📕',
    category: 'social',
    maxTitleLength: 20,
    maxContentLength: 1000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 20 },
      { field: 'content', required: true, maxLength: 1000 },
      { field: 'images', required: true },
      { field: 'tags', required: false },
    ],
  },
  weixin: {
    id: 'weixin',
    name: '微信公众号',
    icon: '💚',
    category: 'content',
    maxTitleLength: 64,
    maxContentLength: 20000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 64 },
      { field: 'content', required: true, minLength: 300 },
      { field: 'cover', required: true },
      { field: 'digest', required: false, maxLength: 120 },
    ],
  },
  toutiao: {
    id: 'toutiao',
    name: '今日头条',
    icon: '📰',
    category: 'content',
    maxTitleLength: 30,
    maxContentLength: 50000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 30 },
      { field: 'content', required: true, minLength: 200 },
    ],
  },
  baijiahao: {
    id: 'baijiahao',
    name: '百家号',
    icon: '🔵',
    category: 'content',
    maxTitleLength: 30,
    maxContentLength: 50000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 30 },
      { field: 'content', required: true, minLength: 200 },
    ],
  },
  sohu: {
    id: 'sohu',
    name: '搜狐号',
    icon: '🟠',
    category: 'content',
    maxTitleLength: 30,
    maxContentLength: 50000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 30 },
      { field: 'content', required: true, minLength: 200 },
    ],
  },
  jianshu: {
    id: 'jianshu',
    name: '简书',
    icon: '📝',
    category: 'content',
    maxTitleLength: 50,
    maxContentLength: 50000,
    supportsImage: true,
    supportsVideo: false,
    publishRules: [
      { field: 'title', required: true, maxLength: 50 },
      { field: 'content', required: true, minLength: 100 },
    ],
  },
  bilibili: {
    id: 'bilibili',
    name: 'B站专栏',
    icon: '📺',
    category: 'video',
    maxTitleLength: 80,
    maxContentLength: 50000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 80 },
      { field: 'content', required: true, minLength: 200 },
      { field: 'tags', required: true },
    ],
  },
  douyin: {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    category: 'video',
    maxTitleLength: 55,
    maxContentLength: 2200,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 55 },
      { field: 'video', required: true },
      { field: 'tags', required: false },
    ],
  },
  weibo: {
    id: 'weibo',
    name: '微博',
    icon: '🐦',
    category: 'social',
    maxTitleLength: 140,
    maxContentLength: 2000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'content', required: true, maxLength: 2000 },
    ],
  },
  kuaishou: {
    id: 'kuaishou',
    name: '快手',
    icon: '⚡',
    category: 'video',
    maxTitleLength: 30,
    maxContentLength: 2000,
    supportsImage: true,
    supportsVideo: true,
    publishRules: [
      { field: 'title', required: true, maxLength: 30 },
      { field: 'video', required: true },
    ],
  },
};

/**
 * 内容适配转换器
 */
export function adaptContentForPlatform(
  originalContent: {
    title: string;
    content: string;
    images?: string[];
    tags?: string[];
  },
  targetPlatform: Platform
): {
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  warnings: string[];
} {
  const config = platformConfigs[targetPlatform];
  const warnings: string[] = [];
  let title = originalContent.title;
  let content = originalContent.content;
  let images = originalContent.images;
  let tags = originalContent.tags;

  // 标题长度适配
  if (title.length > config.maxTitleLength) {
    warnings.push(`标题已截断至${config.maxTitleLength}字`);
    title = title.substring(0, config.maxTitleLength - 3) + '...';
  }

  // 内容长度适配
  if (content.length > config.maxContentLength) {
    warnings.push(`内容已截断至${config.maxContentLength}字`);
    content = content.substring(0, config.maxContentLength);
  }

  // 平台特定适配
  switch (targetPlatform) {
    case 'xiaohongshu':
      // 小红书：添加表情和标签
      if (!tags || tags.length === 0) {
        tags = ['干货分享', '实用技巧'];
      }
      content = content.replace(/##/g, '✨ ');
      break;

    case 'weibo':
      // 微博：转为微博格式
      content = `${title}\n\n${content}`;
      if (tags && tags.length > 0) {
        content += '\n\n' + tags.map(t => `#${t}#`).join(' ');
      }
      break;

    case 'zhihu':
      // 知乎：保持格式，添加问题形式
      if (!title.includes('？') && !title.includes('?')) {
        title = title.replace(/^(如何|怎么|为什么|什么是)/, match => match);
      }
      break;

    case 'baijiahao':
    case 'toutiao':
    case 'sohu':
      // 新闻类平台：保持专业格式
      content = content.replace(/#{1,6}\s/g, '\n**') + '**\n';
      break;
  }

  return {
    title,
    content,
    images,
    tags,
    warnings,
  };
}

/**
 * 一键发布服务
 */
export class MultiPlatformPublisher {
  private accounts: Map<Platform, PlatformAccount[]> = new Map();

  addAccount(account: PlatformAccount) {
    if (!this.accounts.has(account.platform)) {
      this.accounts.set(account.platform, []);
    }
    this.accounts.get(account.platform)!.push(account);
  }

  getAccounts(platform?: Platform): PlatformAccount[] {
    if (platform) {
      return this.accounts.get(platform) || [];
    }
    const allAccounts: PlatformAccount[] = [];
    this.accounts.forEach(accounts => {
      allAccounts.push(...accounts);
    });
    return allAccounts;
  }

  async publishToMultiplePlatforms(
    content: {
      title: string;
      content: string;
      images?: string[];
      tags?: string[];
    },
    platforms: Platform[],
    options?: {
      scheduled?: Date;
      personId?: string;
    }
  ): Promise<{
    platform: Platform;
    status: 'success' | 'failed' | 'pending';
    message: string;
    publishedUrl?: string;
    warnings: string[];
  }[]> {
    const results: {
      platform: Platform;
      status: 'success' | 'failed' | 'pending';
      message: string;
      publishedUrl?: string;
      warnings: string[];
    }[] = [];

    for (const platform of platforms) {
      const config = platformConfigs[platform];
      const adapted = adaptContentForPlatform(content, platform);

      try {
        // 模拟发布过程（实际需要对接各平台API）
        if (options?.scheduled) {
          results.push({
            platform,
            status: 'pending',
            message: `已安排在 ${options.scheduled.toLocaleString('zh-CN')} 发布`,
            warnings: adapted.warnings,
          });
        } else {
          // 模拟发布成功
          await new Promise(resolve => setTimeout(resolve, 500));
          results.push({
            platform,
            status: 'success',
            message: '发布成功',
            publishedUrl: `https://${platform}.com/article/${Date.now()}`,
            warnings: adapted.warnings,
          });
        }
      } catch (error) {
        results.push({
          platform,
          status: 'failed',
          message: error instanceof Error ? error.message : '发布失败',
          warnings: adapted.warnings,
        });
      }
    }

    return results;
  }

  /**
   * 获取平台发布统计
   */
  getPublishStats(platform: Platform): {
    totalPublished: number;
    successRate: number;
    avgEngagement: number;
  } {
    // 模拟统计数据
    return {
      totalPublished: Math.floor(Math.random() * 100) + 50,
      successRate: 95 + Math.random() * 5,
      avgEngagement: Math.floor(Math.random() * 1000) + 500,
    };
  }
}

/**
 * 平台推荐引擎
 */
export function recommendPlatforms(
  content: {
    title: string;
    content: string;
    type?: 'article' | 'video' | 'image';
  }
): {
  primary: Platform[];
  secondary: Platform[];
  reasons: Record<Platform, string[]>;
} {
  const reasons: Record<Platform, string[]> = {} as Record<Platform, string[]>;
  const scores: { platform: Platform; score: number }[] = [];

  Object.entries(platformConfigs).forEach(([platform, config]) => {
    let score = 0;
    const platformReasons: string[] = [];

    // 内容类型匹配
    if (content.type === 'video' && config.supportsVideo) {
      score += 30;
      platformReasons.push('支持视频内容');
    }
    if (content.type === 'image' && config.supportsImage) {
      score += 20;
      platformReasons.push('支持图文内容');
    }

    // 内容长度匹配
    if (content.content.length > 3000 && config.maxContentLength >= 10000) {
      score += 25;
      platformReasons.push('适合长篇内容');
    } else if (content.content.length <= 1000 && config.maxContentLength <= 5000) {
      score += 20;
      platformReasons.push('适合短篇内容');
    }

    // 标题格式匹配
    if (content.title.includes('？') || content.title.includes('?')) {
      if (config.category === 'qa') {
        score += 25;
        platformReasons.push('问答型标题适合该平台');
      }
    }

    // GEO优化相关
    if (config.category === 'content') {
      score += 15;
      platformReasons.push('内容平台，有利于AI收录');
    }

    scores.push({ platform: platform as Platform, score });
    reasons[platform as Platform] = platformReasons;
  });

  // 排序并分组
  scores.sort((a, b) => b.score - a.score);
  const primary = scores.slice(0, 3).map(s => s.platform);
  const secondary = scores.slice(3, 6).map(s => s.platform);

  return { primary, secondary, reasons };
}

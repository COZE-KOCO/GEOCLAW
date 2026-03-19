/**
 * 自动化发布执行器
 * 实现真正的自动化发布功能
 */

import { 
  getPublishTaskById, 
  updatePublishTask, 
  startPublishTask,
  completePublishTask,
  failPublishTask,
  updateTaskProgress,
  type PublishTask,
  type PublishResult,
} from './publish-task-store';
import { getAccountById } from './account-store';

// ==================== 平台发布适配器 ====================

/**
 * 平台发布适配器接口
 */
export interface PlatformPublisher {
  platform: string;
  name: string;
  
  /**
   * 检查是否支持自动发布
   * - api: 通过官方API自动发布
   * - automation: 通过浏览器自动化发布
   * - manual: 不支持自动，需要手动操作
   */
  autoPublishType: 'api' | 'automation' | 'manual';
  
  /**
   * 检查账号授权状态
   */
  checkAuth(account: any): Promise<{ valid: boolean; message?: string }>;
  
  /**
   * 执行自动发布
   */
  publish(account: any, content: PublishContent): Promise<PublishResult>;
}

export interface PublishContent {
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

// ==================== 平台适配器实现 ====================

/**
 * 微信公众号发布适配器
 * 通过微信公众号API实现自动发布
 */
export const wechatPublisher: PlatformPublisher = {
  platform: 'wechat',
  name: '微信公众号',
  autoPublishType: 'api',
  
  async checkAuth(account: any): Promise<{ valid: boolean; message?: string }> {
    const metadata = account.metadata || {};
    if (!metadata.appId || !metadata.appSecret) {
      return { 
        valid: false, 
        message: '请配置微信公众号AppID和AppSecret' 
      };
    }
    return { valid: true };
  },
  
  async publish(account: any, content: PublishContent): Promise<PublishResult> {
    const metadata = account.metadata || {};
    
    try {
      // 1. 获取access_token
      const tokenRes = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${metadata.appId}&secret=${metadata.appSecret}`
      );
      const tokenData = await tokenRes.json();
      
      if (tokenData.errcode) {
        return {
          platform: 'wechat',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: `获取access_token失败: ${tokenData.errmsg}`,
        };
      }
      
      const accessToken = tokenData.access_token;
      
      // 2. 创建草稿
      const draftRes = await fetch(
        `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articles: [{
              title: content.title,
              content: content.content,
              thumb_media_id: content.images?.[0] || '',
              author: metadata.author || '',
              digest: content.content.substring(0, 120),
              content_source_url: '',
              need_open_comment: 0,
            }],
          }),
        }
      );
      
      const draftData = await draftRes.json();
      
      if (draftData.errcode) {
        return {
          platform: 'wechat',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: `创建草稿失败: ${draftData.errmsg}`,
        };
      }
      
      // 3. 发布草稿
      const publishRes = await fetch(
        `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_id: draftData.media_id,
          }),
        }
      );
      
      const publishData = await publishRes.json();
      
      if (publishData.errcode) {
        return {
          platform: 'wechat',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: `发布失败: ${publishData.errmsg}`,
        };
      }
      
      return {
        platform: 'wechat',
        accountId: account.id,
        accountName: account.displayName,
        status: 'success',
        publishedUrl: `https://mp.weixin.qq.com/s/${publishData.publish_id}`,
        publishedAt: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        platform: 'wechat',
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: error.message || '发布异常',
      };
    }
  },
};

/**
 * 知乎专栏发布适配器
 * 通过知乎API实现自动发布
 */
export const zhihuPublisher: PlatformPublisher = {
  platform: 'zhihu',
  name: '知乎',
  autoPublishType: 'api',
  
  async checkAuth(account: any): Promise<{ valid: boolean; message?: string }> {
    const metadata = account.metadata || {};
    if (!metadata.accessToken && !metadata.refreshToken) {
      return { 
        valid: false, 
        message: '请先授权知乎账号' 
      };
    }
    return { valid: true };
  },
  
  async publish(account: any, content: PublishContent): Promise<PublishResult> {
    const metadata = account.metadata || {};
    
    try {
      // 知乎专栏文章发布API
      const res = await fetch('https://www.zhihu.com/api/v4/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${metadata.accessToken}`,
          'x-api-version': '3.0.40',
        },
        body: JSON.stringify({
          title: content.title,
          content: content.content,
          excerpt: content.content.substring(0, 200),
          image_url: content.images?.[0] || '',
          topics: content.tags || [],
          column: metadata.columnId,
          comment_permission: 'all',
          disclaimer_type: 'none',
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        return {
          platform: 'zhihu',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: data.error.message || '发布失败',
        };
      }
      
      return {
        platform: 'zhihu',
        accountId: account.id,
        accountName: account.displayName,
        status: 'success',
        publishedUrl: data.url,
        publishedAt: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        platform: 'zhihu',
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: error.message || '发布异常',
      };
    }
  },
};

/**
 * 小红书发布适配器
 * 小红书暂无开放API，使用自动化方式
 */
export const xiaohongshuPublisher: PlatformPublisher = {
  platform: 'xiaohongshu',
  name: '小红书',
  autoPublishType: 'automation',
  
  async checkAuth(account: any): Promise<{ valid: boolean; message?: string }> {
    const metadata = account.metadata || {};
    if (!metadata.cookies && !metadata.sessionToken) {
      return { 
        valid: false, 
        message: '请先登录小红书创作者中心并保存登录状态' 
      };
    }
    return { valid: true };
  },
  
  async publish(account: any, content: PublishContent): Promise<PublishResult> {
    const metadata = account.metadata || {};
    
    try {
      // 调用自动化发布服务
      const res = await fetch(`${process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000'}/api/publish/automation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'xiaohongshu',
          account: {
            id: account.id,
            displayName: account.displayName,
            cookies: metadata.cookies,
            sessionToken: metadata.sessionToken,
          },
          content: {
            title: content.title,
            content: content.content,
            images: content.images,
            tags: content.tags,
          },
        }),
      });
      
      const data = await res.json();
      
      if (!data.success) {
        return {
          platform: 'xiaohongshu',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: data.error || '发布失败',
        };
      }
      
      return {
        platform: 'xiaohongshu',
        accountId: account.id,
        accountName: account.displayName,
        status: 'success',
        publishedUrl: data.url,
        publishedAt: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        platform: 'xiaohongshu',
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: error.message || '发布异常',
      };
    }
  },
};

/**
 * 抖音发布适配器
 * 抖音创作者平台API
 */
export const douyinPublisher: PlatformPublisher = {
  platform: 'douyin',
  name: '抖音',
  autoPublishType: 'automation',
  
  async checkAuth(account: any): Promise<{ valid: boolean; message?: string }> {
    const metadata = account.metadata || {};
    if (!metadata.cookies) {
      return { 
        valid: false, 
        message: '请先登录抖音创作者中心并保存登录状态' 
      };
    }
    return { valid: true };
  },
  
  async publish(account: any, content: PublishContent): Promise<PublishResult> {
    // 抖音需要上传视频，这里返回待上传状态
    return {
      platform: 'douyin',
      accountId: account.id,
      accountName: account.displayName,
      status: 'pending',
      error: '抖音发布需要先上传视频，请手动操作',
    };
  },
};

/**
 * 今日头条发布适配器
 */
export const toutiaoPublisher: PlatformPublisher = {
  platform: 'toutiao',
  name: '今日头条',
  autoPublishType: 'api',
  
  async checkAuth(account: any): Promise<{ valid: boolean; message?: string }> {
    const metadata = account.metadata || {};
    if (!metadata.accessToken) {
      return { 
        valid: false, 
        message: '请先授权头条号' 
      };
    }
    return { valid: true };
  },
  
  async publish(account: any, content: PublishContent): Promise<PublishResult> {
    const metadata = account.metadata || {};
    
    try {
      const res = await fetch('https://mp.toutiao.com/open/api/article/v2/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: metadata.accessToken,
          title: content.title,
          content: content.content,
          cover_image: content.images?.[0] || '',
          labels: content.tags?.join(',') || '',
        }),
      });
      
      const data = await res.json();
      
      if (data.code !== 0) {
        return {
          platform: 'toutiao',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: data.message || '发布失败',
        };
      }
      
      return {
        platform: 'toutiao',
        accountId: account.id,
        accountName: account.displayName,
        status: 'success',
        publishedUrl: `https://www.toutiao.com/article/${data.data.article_id}`,
        publishedAt: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        platform: 'toutiao',
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: error.message || '发布异常',
      };
    }
  },
};

/**
 * B站专栏发布适配器
 */
export const bilibiliPublisher: PlatformPublisher = {
  platform: 'bilibili',
  name: 'B站',
  autoPublishType: 'api',
  
  async checkAuth(account: any): Promise<{ valid: boolean; message?: string }> {
    const metadata = account.metadata || {};
    if (!metadata.cookies && !metadata.accessToken) {
      return { 
        valid: false, 
        message: '请先授权B站账号' 
      };
    }
    return { valid: true };
  },
  
  async publish(account: any, content: PublishContent): Promise<PublishResult> {
    const metadata = account.metadata || {};
    
    try {
      // B站专栏发布
      const res = await fetch('https://api.bilibili.com/x/article/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': metadata.cookies || '',
        },
        body: JSON.stringify({
          title: content.title,
          content: content.content,
          banner_url: content.images?.[0] || '',
          tags: content.tags?.join(',') || '',
          category: metadata.category || 0,
        }),
      });
      
      const data = await res.json();
      
      if (data.code !== 0) {
        return {
          platform: 'bilibili',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: data.message || '发布失败',
        };
      }
      
      return {
        platform: 'bilibili',
        accountId: account.id,
        accountName: account.displayName,
        status: 'success',
        publishedUrl: `https://www.bilibili.com/read/cv${data.data.aid}`,
        publishedAt: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        platform: 'bilibili',
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: error.message || '发布异常',
      };
    }
  },
};

/**
 * 微博发布适配器
 */
export const weiboPublisher: PlatformPublisher = {
  platform: 'weibo',
  name: '微博',
  autoPublishType: 'api',
  
  async checkAuth(account: any): Promise<{ valid: boolean; message?: string }> {
    const metadata = account.metadata || {};
    if (!metadata.accessToken) {
      return { 
        valid: false, 
        message: '请先授权微博账号' 
      };
    }
    return { valid: true };
  },
  
  async publish(account: any, content: PublishContent): Promise<PublishResult> {
    const metadata = account.metadata || {};
    
    try {
      // 微博发布API
      const params = new URLSearchParams({
        access_token: metadata.accessToken,
        status: content.content.substring(0, 2000), // 微博字数限制
      });
      
      const res = await fetch('https://api.weibo.com/2/statuses/share.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      
      const data = await res.json();
      
      if (data.error) {
        return {
          platform: 'weibo',
          accountId: account.id,
          accountName: account.displayName,
          status: 'failed',
          error: data.error_description || data.error,
        };
      }
      
      return {
        platform: 'weibo',
        accountId: account.id,
        accountName: account.displayName,
        status: 'success',
        publishedUrl: `https://weibo.com/${data.user?.id}/${data.midstr || data.id}`,
        publishedAt: new Date().toISOString(),
      };
      
    } catch (error: any) {
      return {
        platform: 'weibo',
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: error.message || '发布异常',
      };
    }
  },
};

// 平台适配器注册表
export const platformPublishers: Record<string, PlatformPublisher> = {
  wechat: wechatPublisher,
  zhihu: zhihuPublisher,
  xiaohongshu: xiaohongshuPublisher,
  douyin: douyinPublisher,
  toutiao: toutiaoPublisher,
  bilibili: bilibiliPublisher,
  weibo: weiboPublisher,
};

// ==================== 发布执行器 ====================

/**
 * 执行单个发布任务
 */
export async function executePublishTask(taskId: string): Promise<PublishResult[]> {
  const task = await getPublishTaskById(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }
  
  // 更新任务状态为运行中
  await startPublishTask(taskId);
  
  const results: PublishResult[] = [];
  const content: PublishContent = {
    title: task.title,
    content: task.content,
    images: task.images,
    tags: task.tags,
    metadata: task.metadata,
  };
  
  // 遍历目标平台执行发布
  for (let i = 0; i < task.targetPlatforms.length; i++) {
    const target = task.targetPlatforms[i];
    
    // 更新进度
    const progress = Math.round(((i) / task.targetPlatforms.length) * 100);
    await updateTaskProgress(taskId, progress);
    
    // 获取平台适配器
    const publisher = platformPublishers[target.platform];
    
    if (!publisher) {
      results.push({
        platform: target.platform,
        accountId: target.accountId,
        accountName: target.accountName,
        status: 'failed',
        error: '不支持的平台',
      });
      continue;
    }
    
    // 获取账号信息
    const account = await getAccountById(target.accountId);
    if (!account) {
      results.push({
        platform: target.platform,
        accountId: target.accountId,
        accountName: target.accountName,
        status: 'failed',
        error: '账号不存在',
      });
      continue;
    }
    
    // 检查授权状态
    const authCheck = await publisher.checkAuth(account);
    if (!authCheck.valid) {
      results.push({
        platform: target.platform,
        accountId: target.accountId,
        accountName: target.accountName,
        status: 'failed',
        error: authCheck.message || '账号未授权',
      });
      continue;
    }
    
    // 执行发布
    try {
      const result = await publisher.publish(account, content);
      results.push(result);
      
      // 更新进度
      await updateTaskProgress(taskId, Math.round(((i + 1) / task.targetPlatforms.length) * 100), result);
      
    } catch (error: any) {
      results.push({
        platform: target.platform,
        accountId: target.accountId,
        accountName: target.accountName,
        status: 'failed',
        error: error.message || '发布异常',
      });
    }
  }
  
  // 完成任务
  await completePublishTask(taskId, results);
  
  return results;
}

/**
 * 批量执行发布任务
 */
export async function batchExecutePublishTasks(taskIds: string[]): Promise<{
  taskId: string;
  success: boolean;
  results?: PublishResult[];
  error?: string;
}[]> {
  const results = [];
  
  for (const taskId of taskIds) {
    try {
      const taskResults = await executePublishTask(taskId);
      results.push({
        taskId,
        success: true,
        results: taskResults,
      });
    } catch (error: any) {
      results.push({
        taskId,
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
}

/**
 * 获取平台发布能力信息
 */
export function getPlatformPublishCapabilities(): {
  platform: string;
  name: string;
  autoPublishType: 'api' | 'automation' | 'manual';
  autoPublishTypeLabel: string;
}[] {
  return Object.values(platformPublishers).map(p => ({
    platform: p.platform,
    name: p.name,
    autoPublishType: p.autoPublishType,
    autoPublishTypeLabel: 
      p.autoPublishType === 'api' ? 'API自动发布' :
      p.autoPublishType === 'automation' ? '自动化发布' : '手动发布',
  }));
}

/**
 * 检查任务是否可以自动执行
 */
export async function checkTaskAutoPublishable(taskId: string): Promise<{
  canAutoPublish: boolean;
  platforms: {
    platform: string;
    accountName: string;
    canPublish: boolean;
    reason?: string;
  }[];
}> {
  const task = await getPublishTaskById(taskId);
  if (!task) {
    return {
      canAutoPublish: false,
      platforms: [],
    };
  }
  
  const platformChecks = [];
  
  for (const target of task.targetPlatforms) {
    const publisher = platformPublishers[target.platform];
    const account = await getAccountById(target.accountId);
    
    if (!publisher) {
      platformChecks.push({
        platform: target.platform,
        accountName: target.accountName || '',
        canPublish: false,
        reason: '不支持的平台',
      });
      continue;
    }
    
    if (!account) {
      platformChecks.push({
        platform: target.platform,
        accountName: target.accountName || '',
        canPublish: false,
        reason: '账号不存在',
      });
      continue;
    }
    
    if (publisher.autoPublishType === 'manual') {
      platformChecks.push({
        platform: target.platform,
        accountName: account.displayName,
        canPublish: false,
        reason: '该平台仅支持手动发布',
      });
      continue;
    }
    
    const authCheck = await publisher.checkAuth(account);
    if (!authCheck.valid) {
      platformChecks.push({
        platform: target.platform,
        accountName: account.displayName,
        canPublish: false,
        reason: authCheck.message || '账号未授权',
      });
      continue;
    }
    
    platformChecks.push({
      platform: target.platform,
      accountName: account.displayName,
      canPublish: true,
    });
  }
  
  return {
    canAutoPublish: platformChecks.every(p => p.canPublish),
    platforms: platformChecks,
  };
}

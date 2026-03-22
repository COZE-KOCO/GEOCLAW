/**
 * 发布执行器 - Web端存根
 * 
 * ⚠️ 重要说明：
 * Web端无法执行真实的发布操作（需要浏览器自动化）
 * 所有发布任务由桌面端 (Electron) 的 auto-publisher.ts 执行
 * 
 * 此文件仅提供类型定义和环境检测功能
 */

// ==================== 类型定义 ====================

/**
 * 发布内容
 */
export interface PublishContent {
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 发布结果
 */
export interface PublishResult {
  platform: string;
  accountId: string;
  accountName: string;
  status: 'success' | 'failed' | 'pending';
  publishedUrl?: string;
  publishedAt?: string;
  error?: string;
}

/**
 * 平台发布适配器接口
 */
export interface PlatformPublisher {
  platform: string;
  name: string;
  autoPublishType: 'api' | 'automation' | 'manual';
  checkAuth(account: any): Promise<{ valid: boolean; message?: string }>;
  publish(account: any, content: PublishContent): Promise<PublishResult>;
}

// ==================== 平台能力定义 ====================

/**
 * 平台发布能力配置
 * 仅用于前端展示，实际发布由桌面端执行
 */
export const PLATFORM_CAPABILITIES = {
  wechat: {
    platform: 'wechat',
    name: '微信公众号',
    autoPublishType: 'api' as const,
    autoPublishTypeLabel: 'API自动发布',
    requiresDesktop: true,
  },
  zhihu: {
    platform: 'zhihu',
    name: '知乎',
    autoPublishType: 'api' as const,
    autoPublishTypeLabel: 'API自动发布',
    requiresDesktop: true,
  },
  xiaohongshu: {
    platform: 'xiaohongshu',
    name: '小红书',
    autoPublishType: 'automation' as const,
    autoPublishTypeLabel: '自动化发布',
    requiresDesktop: true,
  },
  douyin: {
    platform: 'douyin',
    name: '抖音',
    autoPublishType: 'automation' as const,
    autoPublishTypeLabel: '自动化发布',
    requiresDesktop: true,
  },
  toutiao: {
    platform: 'toutiao',
    name: '今日头条',
    autoPublishType: 'api' as const,
    autoPublishTypeLabel: 'API自动发布',
    requiresDesktop: true,
  },
  bilibili: {
    platform: 'bilibili',
    name: 'B站',
    autoPublishType: 'api' as const,
    autoPublishTypeLabel: 'API自动发布',
    requiresDesktop: true,
  },
  weibo: {
    platform: 'weibo',
    name: '微博',
    autoPublishType: 'api' as const,
    autoPublishTypeLabel: 'API自动发布',
    requiresDesktop: true,
  },
} as const;

// ==================== 环境检测 ====================

/**
 * 检测是否在桌面端运行
 */
export function isDesktopEnvironment(): boolean {
  // 在Electron环境中会有特定的全局变量
  if (typeof window !== 'undefined') {
    return !!(window as any).electronAPI || !!(window as any).__ELECTRON__;
  }
  return false;
}

/**
 * 获取运行环境信息
 */
export function getEnvironmentInfo() {
  return {
    isDesktop: isDesktopEnvironment(),
    environment: isDesktopEnvironment() ? 'desktop' : 'web',
    message: isDesktopEnvironment() 
      ? '桌面端环境，支持自动发布' 
      : 'Web端环境，需要桌面客户端执行发布',
  };
}

// ==================== Web端存根函数 ====================

/**
 * Web端执行发布任务 - 返回提示信息
 * 实际发布由桌面端 auto-publisher.ts 执行
 */
export async function executePublishTask(taskId: string): Promise<PublishResult[]> {
  return [{
    platform: 'unknown',
    accountId: '',
    accountName: '',
    status: 'failed',
    error: 'Web端无法执行发布操作，请使用桌面客户端',
  }];
}

/**
 * Web端批量执行 - 返回提示信息
 */
export async function batchExecutePublishTasks(taskIds: string[]): Promise<{
  taskId: string;
  success: boolean;
  results?: PublishResult[];
  error?: string;
}[]> {
  return taskIds.map(taskId => ({
    taskId,
    success: false,
    error: 'Web端无法执行发布操作，请使用桌面客户端',
  }));
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
  return Object.values(PLATFORM_CAPABILITIES).map(p => ({
    platform: p.platform,
    name: p.name,
    autoPublishType: p.autoPublishType,
    autoPublishTypeLabel: p.autoPublishTypeLabel,
  }));
}

/**
 * 检查任务是否可自动发布 - Web端始终返回false
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
  return {
    canAutoPublish: false,
    platforms: [{
      platform: 'unknown',
      accountName: '',
      canPublish: false,
      reason: 'Web端无法执行发布操作，请使用桌面客户端',
    }],
  };
}

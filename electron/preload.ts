import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的API
const electronAPI = {
  // 检测是否在Electron环境
  isElectron: (): Promise<boolean> => {
    return ipcRenderer.invoke('is-electron');
  },

  // ====== 网络请求 API ======
  // 使用渲染进程的 fetch 发送请求（绕过 electron.net 的问题）
  fetchAPI: async (url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}): Promise<{
    success: boolean;
    status: number;
    data: any;
    error?: string;
  }> => {
    try {
      const controller = new AbortController();
      const timeout = options.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // 添加防缓存参数
      const urlWithCache = url.includes('?') 
        ? `${url}&_t=${Date.now()}` 
        : `${url}?_t=${Date.now()}`;
      
      const response = await fetch(urlWithCache, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      
      return {
        success: response.ok,
        status: response.status,
        data,
        error: response.ok ? undefined : (data.error || `HTTP ${response.status}`),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 0,
        data: null,
        error: error.name === 'AbortError' ? '请求超时' : (error.message || '网络请求失败'),
      };
    }
  },

  // 获取版本信息
  getVersion: (): Promise<{
    version: string;
    isDev: boolean;
    platform: string;
    arch: string;
  }> => {
    return ipcRenderer.invoke('get-version');
  },

  // 设置businessId（用于数据隔离）
  setBusinessId: (businessId: string): Promise<boolean> => {
    return ipcRenderer.invoke('set-business-id', businessId);
  },

  // 平台登录
  platformLogin: (platform: string, businessId?: string): Promise<{
    success: boolean;
    account?: {
      id: string;
      platform: string;
      platformName: string;
      name: string;
      avatar?: string;
      fansCount?: number;
      createdAt: number;
    };
    error?: string;
  }> => {
    return ipcRenderer.invoke('platform-login', platform, businessId);
  },

  // 获取已保存账号（从服务器API获取，与Web版共享）
  getSavedAccounts: (businessId?: string): Promise<Record<string, any[]>> => {
    return ipcRenderer.invoke('get-saved-accounts', businessId);
  },

  // 删除账号
  removeAccount: (platform: string, accountId: string): Promise<boolean> => {
    return ipcRenderer.invoke('remove-account', platform, accountId);
  },

  // 监听账号更新
  onAccountUpdated: (callback: (account: any) => void) => {
    ipcRenderer.on('account-updated', (_, account) => callback(account));
    return () => {
      ipcRenderer.removeListener('account-updated', callback as any);
    };
  },

  // 手动确认登录成功（在登录窗口中调用）
  manualConfirmLogin: (platform: string): Promise<{ success: boolean; account?: any; error?: string }> => {
    return ipcRenderer.invoke('login-confirm', platform);
  },

  // 打开账号后台
  openAccountBackend: (accountId: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('open-account-backend', accountId);
  },

  // 平台配置
  platforms: {
    wechat: { name: '微信公众号', iconUrl: 'https://img.icons8.com/color/48/weixin.png' },
    zhihu: { name: '知乎', iconUrl: 'https://img.icons8.com/color/48/zhihu.png' },
    weibo: { name: '微博', iconUrl: 'https://img.icons8.com/color/48/weibo.png' },
    toutiao: { name: '今日头条', iconUrl: 'https://img.icons8.com/color/48/toutiao.png' },
    bilibili: { name: 'B站', iconUrl: 'https://img.icons8.com/color/48/bilibili.png' },
    xiaohongshu: { name: '小红书', iconUrl: 'https://img.icons8.com/color/48/xiaohongshu.png' },
    douyin: { name: '抖音', iconUrl: 'https://img.icons8.com/color/48/tiktok.png' },
  },

  // ====== 自动更新相关 ======
  
  // 检查更新
  checkForUpdates: (): Promise<{
    available: boolean;
    currentVersion?: string;
    latestVersion?: string;
    releaseNotes?: any;
    error?: string;
  }> => {
    return ipcRenderer.invoke('check-for-updates');
  },

  // 下载更新
  downloadUpdate: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('download-update');
  },

  // 安装更新
  installUpdate: (): void => {
    ipcRenderer.invoke('install-update');
  },

  // 监听下载进度
  onUpdateProgress: (callback: (progress: {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  }) => void) => {
    ipcRenderer.on('update-progress', (_, progress) => callback(progress));
    return () => {
      ipcRenderer.removeListener('update-progress', callback as any);
    };
  },

  // 监听更新下载完成
  onUpdateDownloaded: (callback: (info: {
    version: string;
    releaseDate: string;
    releaseNotes?: any;
  }) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info));
    return () => {
      ipcRenderer.removeListener('update-downloaded', callback as any);
    };
  },

  // 监听更新错误
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_, error) => callback(error));
    return () => {
      ipcRenderer.removeListener('update-error', callback as any);
    };
  },

  // ====== 发布任务调度器相关 ======

  // 获取调度器状态
  getSchedulerStatus: (): Promise<{
    isRunning: boolean;
    currentTask: {
      taskId: string;
      taskName: string;
      status: string;
      progress: number;
      results: any[];
    } | null;
  }> => {
    return ipcRenderer.invoke('scheduler-status');
  },

  // 手动触发检查
  triggerSchedulerCheck: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('scheduler-trigger');
  },

  // 启停调度器
  toggleScheduler: (enable: boolean): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('scheduler-toggle', enable);
  },

  // 监听调度器状态变化
  onSchedulerStatus: (callback: (status: { status: string; checkInterval?: number }) => void) => {
    ipcRenderer.on('scheduler-status', (_, status) => callback(status));
    return () => {
      ipcRenderer.removeListener('scheduler-status', callback as any);
    };
  },

  // 监听调度器检查
  onSchedulerChecking: (callback: (data: { time: string }) => void) => {
    ipcRenderer.on('scheduler-checking', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('scheduler-checking', callback as any);
    };
  },

  // 监听待执行任务
  onPendingTasks: (callback: (data: { count: number; tasks: any[] }) => void) => {
    ipcRenderer.on('pending-tasks', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('pending-tasks', callback as any);
    };
  },

  // 监听任务开始
  onTaskStarted: (callback: (data: {
    taskId: string;
    taskName: string;
    title: string;
    targetPlatforms: any[];
  }) => void) => {
    ipcRenderer.on('task-started', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('task-started', callback as any);
    };
  },

  // 监听任务完成
  onTaskCompleted: (callback: (data: {
    taskId: string;
    taskName: string;
    success: boolean;
    results: any[];
    completedAt: string;
  }) => void) => {
    ipcRenderer.on('task-completed', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('task-completed', callback as any);
    };
  },

  // 监听任务失败
  onTaskFailed: (callback: (data: {
    taskId: string;
    taskName: string;
    error: string;
  }) => void) => {
    ipcRenderer.on('task-failed', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('task-failed', callback as any);
    };
  },

  // 监听调度器错误
  onSchedulerError: (callback: (data: { error: string }) => void) => {
    ipcRenderer.on('scheduler-error', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('scheduler-error', callback as any);
    };
  },

  // ====== 创作调度器相关 ======

  // 获取创作调度器状态
  getCreationSchedulerStatus: (): Promise<{
    isRunning: boolean;
    currentProgress: {
      planId: string;
      planName: string;
      status: string;
      progress: number;
      createdCount: number;
      totalCount: number;
    } | null;
  }> => {
    return ipcRenderer.invoke('creation-scheduler-status');
  },

  // 手动触发创作检查
  triggerCreationSchedulerCheck: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('creation-scheduler-trigger');
  },

  // 启停创作调度器
  toggleCreationScheduler: (enable: boolean): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('creation-scheduler-toggle', enable);
  },

  // 监听创作调度器状态变化
  onCreationSchedulerStatus: (callback: (status: { status: string; checkInterval?: number }) => void) => {
    ipcRenderer.on('creation-scheduler-status', (_, status) => callback(status));
    return () => {
      ipcRenderer.removeListener('creation-scheduler-status', callback as any);
    };
  },

  // 监听创作计划开始
  onCreationPlanStarted: (callback: (data: {
    planId: string;
    planName: string;
    totalCount: number;
  }) => void) => {
    ipcRenderer.on('creation-plan-started', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('creation-plan-started', callback as any);
    };
  },

  // 监听创作任务进度
  onCreationTaskProgress: (callback: (data: {
    planId: string;
    current: number;
    total: number;
    keyword: string;
  }) => void) => {
    ipcRenderer.on('creation-task-progress', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('creation-task-progress', callback as any);
    };
  },

  // 监听创作计划完成
  onCreationPlanCompleted: (callback: (data: {
    planId: string;
    planName: string;
    createdCount: number;
    totalCount: number;
    completedAt: string;
  }) => void) => {
    ipcRenderer.on('creation-plan-completed', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('creation-plan-completed', callback as any);
    };
  },

  // 监听创作计划失败
  onCreationPlanFailed: (callback: (data: {
    planId: string;
    planName: string;
    error: string;
  }) => void) => {
    ipcRenderer.on('creation-plan-failed', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('creation-plan-failed', callback as any);
    };
  },

  // 监听发布任务进度
  onPublishTaskProgress: (callback: (data: {
    planId: string;
    taskId: string;
    current: number;
    total: number;
    articleTitle?: string;
    platform?: string;
    status: 'pending' | 'publishing' | 'completed' | 'failed';
    message?: string;
  }) => void) => {
    ipcRenderer.on('publish-task-progress', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('publish-task-progress', callback as any);
    };
  },

  // ====== 创作计划调度管理 ======

  // 通知调度器计划已创建
  notifyCreationPlanCreated: (planId: string, planName: string, executeTime: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('creation-plan-created', { planId, planName, executeTime });
  },

  // 通知调度器计划已删除
  notifyCreationPlanDeleted: (planId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('creation-plan-deleted', { planId });
  },

  // 通知调度器计划已更新
  notifyCreationPlanUpdated: (planId: string, planName: string, executeTime: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('creation-plan-updated', { planId, planName, executeTime });
  },

  // 刷新创作调度器
  refreshCreationScheduler: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('refresh-creation-scheduler');
  },

  // 获取已调度的计划列表
  getScheduledPlans: (): Promise<Array<{ planId: string; planName: string; executeTime: string }>> => {
    return ipcRenderer.invoke('get-scheduled-plans');
  },

  // 监听调度器更新
  onCreationSchedulerUpdated: (callback: (data: {
    action: 'add' | 'remove' | 'rescheduleAll';
    planId?: string;
    planName?: string;
    executeTime?: string;
    scheduledCount: number;
    plans?: Array<{ planId: string; planName: string; executeTime: string }>;
  }) => void) => {
    ipcRenderer.on('creation-scheduler-updated', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('creation-scheduler-updated', callback as any);
    };
  },

  // ====== 立即执行任务 ======

  // 立即执行指定发布任务
  executeTaskImmediately: (taskId: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('execute-task-immediately', taskId);
  },

  // ====== 发布计划调度器相关 ======

  // 获取发布计划调度器状态
  getPublishPlanSchedulerStatus: (): Promise<{
    isRunning: boolean;
    progress: {
      status: string;
      message?: string;
      processedCount: number;
      createdTasks: string[];
      errors: string[];
      lastCheckAt?: string;
    } | null;
  }> => {
    return ipcRenderer.invoke('publish-plan-scheduler-status');
  },

  // 手动触发发布计划检查
  triggerPublishPlanSchedulerCheck: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('publish-plan-scheduler-trigger');
  },

  // 监听发布计划调度器状态
  onPublishPlanSchedulerStatus: (callback: (status: { status: string; checkInterval?: number }) => void) => {
    ipcRenderer.on('publish-plan-scheduler-status', (_, status) => callback(status));
    return () => {
      ipcRenderer.removeListener('publish-plan-scheduler-status', callback as any);
    };
  },

  // 监听待执行的发布计划
  onPendingPublishPlans: (callback: (data: { count: number; plans: any[] }) => void) => {
    ipcRenderer.on('pending-publish-plans', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('pending-publish-plans', callback as any);
    };
  },

  // 监听发布计划调度器完成
  onPublishPlanSchedulerCompleted: (callback: (data: {
    processedCount: number;
    createdTasks: number;
    errors: number;
  }) => void) => {
    ipcRenderer.on('publish-plan-scheduler-completed', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('publish-plan-scheduler-completed', callback as any);
    };
  },

  // ====== 可视化选择器相关 ======

  // 启动选择器捕获
  startSelectorPicker: (url: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('selector-picker:start', url);
  },

  // 停止选择器捕获
  stopSelectorPicker: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('selector-picker:stop');
  },

  // 监听元素选中
  onSelectorPicked: (callback: (data: {
    elementInfo: {
      tagName: string;
      id?: string;
      name?: string;
      className?: string;
      type?: string;
      placeholder?: string;
      text?: string;
    };
    selectors: Array<{
      selector: string;
      type: string;
      priority: number;
      description: string;
      uniqueness: number;
      validation: {
        isValid: boolean;
        count: number;
        uniqueness: number;
      };
    }>;
    timestamp: number;
  }) => void) => {
    ipcRenderer.on('selector-picker:selected', (_, data) => callback(data));
    return () => {
      ipcRenderer.removeListener('selector-picker:selected', callback as any);
    };
  },

  // 监听选择器取消
  onSelectorPickerCancelled: (callback: () => void) => {
    ipcRenderer.on('selector-picker:cancelled', () => callback());
    return () => {
      ipcRenderer.removeListener('selector-picker:cancelled', callback as any);
    };
  },
};

// 暴露API到window
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型定义
export type ElectronAPI = typeof electronAPI;

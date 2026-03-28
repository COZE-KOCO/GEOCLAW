// Electron API 类型定义
// 在Electron环境中，window.electronAPI会自动注入

export interface PlatformAccount {
  id: string;
  platform: string;
  platformName: string;
  name: string;
  avatar?: string;
  fansCount?: number;
  createdAt: number;
  lastUsed?: number;
}

export interface PlatformConfig {
  name: string;
  iconUrl: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface SchedulerStatus {
  isRunning: boolean;
  currentTask: {
    taskId: string;
    taskName: string;
    status: string;
    progress: number;
    results: any[];
  } | null;
}

export interface TaskStartedData {
  taskId: string;
  taskName: string;
  title: string;
  targetPlatforms: Array<{
    platform: string;
    accountId: string;
    accountName?: string;
  }>;
}

export interface TaskCompletedData {
  taskId: string;
  taskName: string;
  success: boolean;
  results: any[];
  completedAt: string;
}

export interface TaskFailedData {
  taskId: string;
  taskName: string;
  error: string;
}

export interface LoginAPI {
  confirmLogin: (platform: string) => Promise<{ success: boolean; error?: string }>;
  fetchAPI: (url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }) => Promise<any>;
}

export interface ElectronAPI {
  isElectron: () => Promise<boolean>;
  
  getVersion: () => Promise<{
    version: string;
    isDev: boolean;
    platform: string;
    arch: string;
  }>;
  
  setBusinessId: (businessId: string) => Promise<boolean>;
  
  platformLogin: (platform: string, businessId?: string) => Promise<{
    success: boolean;
    account?: PlatformAccount;
    error?: string;
  }>;
  
  getSavedAccounts: (businessId?: string) => Promise<Record<string, PlatformAccount[]>>;
  
  removeAccount: (platform: string, accountId: string) => Promise<boolean>;
  
  onAccountUpdated: (callback: (account: PlatformAccount) => void) => () => void;
  
  // 打开账号后台
  openAccountBackend: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  
  // fetchAPI: 使用渲染进程的 fetch 发送请求
  fetchAPI: (url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }) => Promise<any>;
  
  platforms: Record<string, PlatformConfig>;
  
  // 自动更新相关
  checkForUpdates: () => Promise<{
    available: boolean;
    currentVersion?: string;
    latestVersion?: string;
    releaseNotes?: any;
    error?: string;
  }>;
  
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  
  installUpdate: () => void;
  
  onUpdateProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  
  onUpdateDownloaded: (callback: (info: {
    version: string;
    releaseDate: string;
    releaseNotes?: any;
  }) => void) => () => void;
  
  onUpdateError: (callback: (error: string) => void) => () => void;
  
  // 发布任务调度器相关
  getSchedulerStatus: () => Promise<SchedulerStatus>;
  
  triggerSchedulerCheck: () => Promise<{ success: boolean }>;
  
  toggleScheduler: (enable: boolean) => Promise<{ success: boolean }>;
  
  onSchedulerStatus: (callback: (status: { status: string; checkInterval?: number }) => void) => () => void;
  
  onSchedulerChecking: (callback: (data: { time: string }) => void) => () => void;
  
  onPendingTasks: (callback: (data: { count: number; tasks: any[] }) => void) => () => void;
  
  onTaskStarted: (callback: (data: TaskStartedData) => void) => () => void;
  
  onTaskCompleted: (callback: (data: TaskCompletedData) => void) => () => void;
  
  onTaskFailed: (callback: (data: TaskFailedData) => void) => () => void;
  
  onSchedulerError: (callback: (data: { error: string }) => void) => () => void;
  
  // 立即执行任务
  executeTaskImmediately: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  
  // 创作调度器相关
  getCreationSchedulerStatus: () => Promise<{
    isRunning: boolean;
    currentProgress: {
      planId: string;
      planName: string;
      status: string;
      progress: number;
      createdCount: number;
      totalCount: number;
    } | null;
    scheduledCount?: number;
    lastRescheduleTime?: string | null;
  }>;
  
  triggerCreationSchedulerCheck: () => Promise<{ success: boolean }>;
  
  toggleCreationScheduler: (enable: boolean) => Promise<{ success: boolean }>;
  
  onCreationSchedulerStatus: (callback: (status: { status: string; checkInterval?: number }) => void) => () => void;
  
  onCreationPlanStarted: (callback: (data: {
    planId: string;
    planName: string;
    totalCount: number;
  }) => void) => () => void;
  
  onCreationTaskProgress: (callback: (data: {
    planId: string;
    current: number;
    total: number;
    keyword: string;
  }) => void) => () => void;
  
  onCreationPlanCompleted: (callback: (data: {
    planId: string;
    planName: string;
    createdCount: number;
    totalCount: number;
    completedAt: string;
  }) => void) => () => void;
  
  onCreationPlanFailed: (callback: (data: {
    planId: string;
    planName: string;
    error: string;
  }) => void) => () => void;
  
  onPublishTaskProgress: (callback: (data: {
    planId: string;
    taskId: string;
    current: number;
    total: number;
    articleTitle?: string;
    platform?: string;
    status: 'pending' | 'publishing' | 'completed' | 'failed';
    message?: string;
  }) => void) => () => void;
  
  // 创作计划调度管理
  notifyCreationPlanCreated: (planId: string, planName: string, executeTime: string) => Promise<{ success: boolean }>;
  
  notifyCreationPlanDeleted: (planId: string) => Promise<{ success: boolean }>;
  
  notifyCreationPlanUpdated: (planId: string, planName: string, executeTime: string) => Promise<{ success: boolean }>;
  
  refreshCreationScheduler: () => Promise<{ success: boolean }>;
  
  getScheduledPlans: () => Promise<Array<{ planId: string; planName: string; executeTime: string }>>;
  
  onCreationSchedulerUpdated: (callback: (data: {
    action: 'add' | 'remove' | 'rescheduleAll';
    planId?: string;
    planName?: string;
    executeTime?: string;
    scheduledCount: number;
    plans?: Array<{ planId: string; planName: string; executeTime: string }>;
  }) => void) => () => void;
}

// 扩展Window接口
interface WindowElectronAPI {
  electronAPI?: ElectronAPI;
  loginAPI?: LoginAPI;
}

// 合并到全局Window类型
declare global {
  interface Window extends WindowElectronAPI {}
}

export {};

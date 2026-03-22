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
}

// 扩展Window接口
interface WindowElectronAPI {
  electronAPI?: ElectronAPI;
}

// 合并到全局Window类型
declare global {
  interface Window extends WindowElectronAPI {}
}

export {};

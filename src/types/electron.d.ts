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

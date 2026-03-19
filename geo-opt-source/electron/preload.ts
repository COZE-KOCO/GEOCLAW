import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的API
const electronAPI = {
  // 检测是否在Electron环境
  isElectron: (): Promise<boolean> => {
    return ipcRenderer.invoke('is-electron');
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
};

// 暴露API到window
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型定义
export type ElectronAPI = typeof electronAPI;

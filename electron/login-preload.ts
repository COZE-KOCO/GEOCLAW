/**
 * 登录窗口专用 Preload 脚本
 * 提供手动确认登录的通信能力
 */

import { contextBridge, ipcRenderer } from 'electron';

// 登录窗口 API
const loginWindowAPI = {
  // 手动确认登录成功
  confirmLogin: (platform: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('login-confirm', platform);
  },

  // 通知主进程页面已加载
  notifyPageLoaded: (url: string, title: string): void => {
    ipcRenderer.send('login-page-loaded', { url, title });
  },

  // 通知主进程检测到登录成功
  notifyLoginDetected: (platform: string, method: string): void => {
    ipcRenderer.send('login-detected', { platform, method });
  },
};

// 暴露到 window
contextBridge.exposeInMainWorld('loginAPI', loginWindowAPI);

// 类型定义
export type LoginWindowAPI = typeof loginWindowAPI;

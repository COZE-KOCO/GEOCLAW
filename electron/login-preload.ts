/**
 * 登录窗口专用 Preload 脚本
 * 提供手动确认登录的通信能力和网络请求能力
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
};

// 暴露到 window
contextBridge.exposeInMainWorld('loginAPI', loginWindowAPI);

// 类型定义
export type LoginWindowAPI = typeof loginWindowAPI;

/**
 * 桌面端发布任务调度器
 * 负责定时检查并执行发布任务，支持全自动发布
 */

import { BrowserWindow, ipcMain } from 'electron';
import * as https from 'https';
import * as http from 'http';
import { AutoPublisher, PublishContent, PublishResult, AccountInfo } from './auto-publisher';

interface PublishTask {
  id: string;
  businessId: string;
  planId?: string;
  taskName: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  targetPlatforms: Array<{
    platform: string;
    accountId: string;
    accountName?: string;
  }>;
  scheduledAt?: Date;
  status: string;
  priority: number;
}

interface TaskProgress {
  taskId: string;
  taskName: string;
  status: 'checking' | 'running' | 'completed' | 'failed';
  progress: number;
  currentPlatform?: string;
  results: Array<{
    platform: string;
    accountName?: string;
    status: 'success' | 'failed';
    publishedUrl?: string;
    error?: string;
  }>;
  startedAt?: Date;
  completedAt?: Date;
}

export class PublishScheduler {
  private mainWindow: BrowserWindow | null = null;
  private apiBaseUrl: string;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private currentTask: TaskProgress | null = null;
  private checkIntervalMs: number;
  private autoPublisher: AutoPublisher | null = null;

  constructor(mainWindow: BrowserWindow | null, apiBaseUrl: string, checkIntervalMs: number = 60000) {
    this.mainWindow = mainWindow;
    this.apiBaseUrl = apiBaseUrl;
    this.checkIntervalMs = checkIntervalMs;
    
    // 初始化自动发布器
    if (mainWindow) {
      this.autoPublisher = new AutoPublisher(mainWindow, apiBaseUrl);
    }
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
    if (window && !this.autoPublisher) {
      this.autoPublisher = new AutoPublisher(window, this.apiBaseUrl);
    }
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('[PublishScheduler] 调度器已在运行');
      return;
    }

    console.log(`[PublishScheduler] 启动调度器，检查间隔: ${this.checkIntervalMs}ms`);
    this.isRunning = true;

    // 立即执行一次检查
    this.checkAndExecute();

    // 定时检查
    this.intervalId = setInterval(() => {
      this.checkAndExecute();
    }, this.checkIntervalMs);

    // 发送调度器启动通知
    this.sendToRenderer('scheduler-status', { 
      status: 'running', 
      checkInterval: this.checkIntervalMs 
    });
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[PublishScheduler] 调度器已停止');

    // 停止所有自动发布
    if (this.autoPublisher) {
      this.autoPublisher.stop();
    }

    this.sendToRenderer('scheduler-status', { status: 'stopped' });
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean; currentTask: TaskProgress | null } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
    };
  }

  /**
   * 手动触发检查
   */
  async triggerCheck(): Promise<void> {
    console.log('[PublishScheduler] 手动触发检查');
    await this.checkAndExecute();
  }

  /**
   * 立即执行指定任务（手动触发）
   */
  async executeTaskImmediately(taskId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[PublishScheduler] 立即执行任务: ${taskId}`);

    if (this.currentTask && this.currentTask.status === 'running') {
      return { success: false, error: '当前有任务正在执行中，请稍后再试' };
    }

    try {
      // 获取任务详情
      const task = await this.getTaskById(taskId);
      
      if (!task) {
        return { success: false, error: '任务不存在' };
      }

      // 执行任务
      await this.executeTask(task);
      
      return { success: true };
    } catch (error: any) {
      console.error(`[PublishScheduler] 立即执行任务失败: ${taskId}`, error);
      return { success: false, error: error.message || '执行失败' };
    }
  }

  /**
   * 根据ID获取任务详情
   */
  private async getTaskById(taskId: string): Promise<PublishTask | null> {
    return new Promise((resolve) => {
      const url = new URL(`/api/publish-tasks/${taskId}`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const req = lib.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.data) {
              const task = json.data;
              resolve({
                id: task.id,
                businessId: task.businessId,
                planId: task.planId,
                taskName: task.taskName || task.planName,
                title: task.title,
                content: task.content,
                images: task.images || [],
                tags: task.tags || [],
                targetPlatforms: task.targetPlatforms || task.targetAccount || [],
                scheduledAt: task.scheduledAt,
                status: task.status,
                priority: task.priority || 5,
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            console.error('[PublishScheduler] 解析任务数据失败:', e);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.error('[PublishScheduler] 获取任务失败:', error);
        resolve(null);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    });
  }

  /**
   * 检查并执行待执行任务
   */
  private async checkAndExecute(): Promise<void> {
    if (!this.mainWindow) {
      console.log('[PublishScheduler] 主窗口不可用，跳过检查');
      return;
    }

    try {
      // 发送检查开始通知
      this.sendToRenderer('scheduler-checking', { time: new Date().toISOString() });

      // 获取待执行的任务
      const pendingTasks = await this.fetchPendingTasks();

      if (pendingTasks.length === 0) {
        console.log('[PublishScheduler] 没有待执行的任务');
        return;
      }

      console.log(`[PublishScheduler] 发现 ${pendingTasks.length} 个待执行任务`);

      // 通知渲染进程有任务待执行
      this.sendToRenderer('pending-tasks', { 
        count: pendingTasks.length,
        tasks: pendingTasks.map(t => ({
          id: t.id,
          name: t.taskName,
          scheduledAt: t.scheduledAt,
        }))
      });

      // 执行第一个优先级最高的任务
      const task = pendingTasks[0];
      await this.executeTask(task);

    } catch (error) {
      console.error('[PublishScheduler] 检查任务失败:', error);
      this.sendToRenderer('scheduler-error', { 
        error: error instanceof Error ? error.message : '检查任务失败' 
      });
    }
  }

  /**
   * 从API获取待执行任务
   */
  private async fetchPendingTasks(): Promise<PublishTask[]> {
    return new Promise((resolve, reject) => {
      const url = new URL('/api/publish-tasks/pending', this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.tasks || []);
          } catch (e) {
            console.error('[PublishScheduler] 解析任务数据失败:', e);
            resolve([]);
          }
        });
      });

      req.on('error', (error) => {
        console.error('[PublishScheduler] 获取任务失败:', error);
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.end();
    });
  }

  /**
   * 执行发布任务 - 使用自动发布
   */
  private async executeTask(task: PublishTask): Promise<void> {
    console.log(`[PublishScheduler] 开始执行任务: ${task.taskName} (${task.id})`);

    // 初始化任务进度
    this.currentTask = {
      taskId: task.id,
      taskName: task.taskName,
      status: 'running',
      progress: 0,
      results: [],
      startedAt: new Date(),
    };

    // 通知渲染进程任务开始
    this.sendToRenderer('task-started', {
      taskId: task.id,
      taskName: task.taskName,
      title: task.title,
      targetPlatforms: task.targetPlatforms,
    });

    const results: PublishResult[] = [];
    const totalPlatforms = task.targetPlatforms.length;

    try {
      // 遍历每个目标平台执行发布
      for (let i = 0; i < task.targetPlatforms.length; i++) {
        const target = task.targetPlatforms[i];
        
        console.log(`[PublishScheduler] 发布到 ${target.platform} (${target.accountName})...`);
        
        // 更新当前平台
        this.currentTask.currentPlatform = target.platform;
        this.currentTask.progress = Math.round((i / totalPlatforms) * 100);
        
        // 通知进度
        this.sendToRenderer('task-progress', {
          taskId: task.id,
          platform: target.platform,
          accountName: target.accountName,
          progress: this.currentTask.progress,
        });

        try {
          // 获取账号信息
          const account = await this.getAccountInfo(target.accountId);
          
          if (!account) {
            throw new Error(`账号不存在: ${target.accountId}`);
          }

          // 准备发布内容
          const content: PublishContent = {
            title: task.title,
            content: task.content,
            images: task.images || [],
            tags: task.tags || [],
          };

          // 执行自动发布
          let result: PublishResult;
          
          if (this.autoPublisher && AutoPublisher.getPlatformConfig(target.platform)) {
            // 使用自动发布引擎
            console.log(`[PublishScheduler] 使用自动发布引擎发布到 ${target.platform}`);
            result = await this.autoPublisher.publish(target.platform, account, content);
          } else {
            // 平台不支持自动发布，调用API（可能是API发布）
            console.log(`[PublishScheduler] ${target.platform} 不支持自动发布，尝试API发布`);
            result = await this.publishViaAPI(task.id, target.platform, target.accountId);
          }

          results.push(result);
          
        } catch (error: any) {
          console.error(`[PublishScheduler] 发布到 ${target.platform} 失败:`, error);
          results.push({
            platform: target.platform,
            accountId: target.accountId,
            accountName: target.accountName || '',
            status: 'failed',
            error: error.message || '发布失败',
          });
        }

        // 平台间间隔，避免频繁操作
        if (i < task.targetPlatforms.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // 更新任务状态
      const successCount = results.filter(r => r.status === 'success').length;
      const allSuccess = successCount === results.length;
      
      this.currentTask.status = allSuccess ? 'completed' : 'failed';
      this.currentTask.progress = 100;
      this.currentTask.results = results.map(r => ({
        platform: r.platform,
        accountName: r.accountName,
        status: r.status === 'pending' ? 'failed' : r.status,
        publishedUrl: r.publishedUrl,
        error: r.error,
      }));
      this.currentTask.completedAt = new Date();

      // 更新任务到服务器
      await this.updateTaskStatus(task.id, this.currentTask.status, results);

      // 通知渲染进程任务完成
      this.sendToRenderer('task-completed', {
        taskId: task.id,
        taskName: task.taskName,
        success: allSuccess,
        results: results,
        completedAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error(`[PublishScheduler] 执行任务失败: ${task.id}`, error);

      this.currentTask.status = 'failed';
      this.currentTask.completedAt = new Date();

      this.sendToRenderer('task-failed', {
        taskId: task.id,
        taskName: task.taskName,
        error: error instanceof Error ? error.message : '执行失败',
      });
    }
  }

  /**
   * 获取账号信息
   */
  private async getAccountInfo(accountId: string): Promise<AccountInfo | null> {
    return new Promise((resolve) => {
      const url = new URL(`/api/accounts/${accountId}`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      console.log(`[PublishScheduler] 获取账号信息: ${accountId}`);

      const req = lib.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.account) {
              const accountInfo: AccountInfo = {
                id: json.account.id,
                platform: json.account.platform,
                displayName: json.account.displayName || json.account.accountName,
                cookies: json.account.metadata?.platformData || {},
                metadata: json.account.metadata,
              };
              console.log(`[PublishScheduler] 账号信息获取成功: ${accountInfo.platform}, cookies 数量: ${Object.keys(accountInfo.cookies).length}`);
              resolve(accountInfo);
            } else {
              console.log(`[PublishScheduler] 账号不存在: ${accountId}`);
              resolve(null);
            }
          } catch (e) {
            console.error(`[PublishScheduler] 解析账号信息失败:`, e);
            resolve(null);
          }
        });
      });

      req.on('error', (e) => {
        console.error(`[PublishScheduler] 获取账号信息失败:`, e);
        resolve(null);
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  /**
   * 通过API发布（用于支持API发布的平台）
   */
  private async publishViaAPI(taskId: string, platform: string, accountId: string): Promise<PublishResult> {
    return new Promise((resolve, reject) => {
      const url = new URL(`/api/publish-tasks/${taskId}/publish`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const req = lib.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.result || {
              platform,
              accountId,
              accountName: '',
              status: json.success ? 'success' : 'failed',
              error: json.error,
            });
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('发布超时'));
      });

      req.write(JSON.stringify({ platform, accountId }));
      req.end();
    });
  }

  /**
   * 更新任务状态到服务器
   */
  private async updateTaskStatus(taskId: string, status: string, results: any[]): Promise<void> {
    return new Promise((resolve) => {
      const url = new URL(`/api/publish-tasks/${taskId}/status`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const body = JSON.stringify({ status, results });

      const req = lib.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        res.on('end', resolve);
      });

      req.on('error', () => resolve());
      req.setTimeout(10000, () => {
        req.destroy();
        resolve();
      });
      req.write(body);
      req.end();
    });
  }

  /**
   * 发送消息到渲染进程
   */
  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

// 导出单例工厂函数
let schedulerInstance: PublishScheduler | null = null;

export function createPublishScheduler(
  mainWindow: BrowserWindow | null, 
  apiBaseUrl: string,
  checkIntervalMs?: number
): PublishScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PublishScheduler(mainWindow, apiBaseUrl, checkIntervalMs);
  } else {
    schedulerInstance.setMainWindow(mainWindow);
  }
  return schedulerInstance;
}

export function getPublishScheduler(): PublishScheduler | null {
  return schedulerInstance;
}

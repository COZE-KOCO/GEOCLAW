/**
 * 发布计划调度器
 * 负责定时检查发布计划，并创建发布任务
 * 
 * 调用 API:
 * - GET  /api/publish-plans?toExecute=true - 获取待执行计划
 * - POST /api/publish-tasks - 创建发布任务
 * - POST /api/publish-plans (action=recordExecution) - 记录执行
 */

import { BrowserWindow, ipcMain, session } from 'electron';
import * as https from 'https';
import * as http from 'http';

// 发布计划接口
interface PublishPlan {
  id: string;
  businessId: string;
  draftId?: string;
  planName: string;
  planType: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  scheduledTime: string;
  scheduledDays: number[];
  scheduledDates: number[];
  maxRuns: number;
  currentRuns: number;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  targetPlatforms: Array<{
    platform: string;
    accountId: string;
    accountName?: string;
  }>;
  priority: number;
  maxRetries: number;
  retryDelay: number;
  lastRunAt?: string;
  nextRunAt?: string;
}

// 调度进度
interface SchedulerProgress {
  status: 'checking' | 'creating_tasks' | 'completed' | 'error';
  message?: string;
  processedCount: number;
  createdTasks: string[];
  errors: string[];
  lastCheckAt?: Date;
}

export class PublishPlanScheduler {
  private mainWindow: BrowserWindow | null = null;
  private apiBaseUrl: string;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkIntervalMs: number;
  private progress: SchedulerProgress | null = null;

  constructor(mainWindow: BrowserWindow | null, apiBaseUrl: string, checkIntervalMs: number = 60000) {
    this.mainWindow = mainWindow;
    this.apiBaseUrl = apiBaseUrl;
    this.checkIntervalMs = checkIntervalMs;
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('[PublishPlanScheduler] 调度器已在运行');
      return;
    }

    console.log(`[PublishPlanScheduler] 启动调度器，检查间隔: ${this.checkIntervalMs}ms`);
    this.isRunning = true;

    // 立即执行一次检查
    this.checkAndExecute();

    // 定时检查
    this.intervalId = setInterval(() => {
      this.checkAndExecute();
    }, this.checkIntervalMs);

    // 发送调度器启动通知
    this.sendToRenderer('publish-plan-scheduler-status', { 
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
    console.log('[PublishPlanScheduler] 调度器已停止');

    this.sendToRenderer('publish-plan-scheduler-status', { status: 'stopped' });
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean; progress: SchedulerProgress | null } {
    return {
      isRunning: this.isRunning,
      progress: this.progress,
    };
  }

  /**
   * 手动触发检查
   */
  async triggerCheck(): Promise<void> {
    console.log('[PublishPlanScheduler] 手动触发检查');
    await this.checkAndExecute();
  }

  /**
   * 带重试的 HTTP 请求（自动携带认证 cookie）
   */
  private async fetchWithRetry(
    urlPath: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
      body?: any;
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const { maxRetries = 3, retryDelay = 2000, timeout = 30000, method = 'GET', body } = options;
    let lastError: string = '';
    
    // 从主窗口 session 获取认证 cookie
    let cookieHeader = '';
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        const mainSession = this.mainWindow.webContents.session;
        const cookies = await mainSession.cookies.get({});
        const userToken = cookies.find(c => c.name === 'user_token');
        if (userToken) {
          cookieHeader = `user_token=${userToken.value}`;
        }
      } catch (e) {
        console.warn('[PublishPlanScheduler] 获取认证 cookie 失败:', e);
      }
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
          const url = new URL(urlPath, this.apiBaseUrl);
          const isHttps = url.protocol === 'https:';
          const lib = isHttps ? https : http;

          const reqOptions = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
              ...(body ? { 'Content-Length': Buffer.byteLength(JSON.stringify(body)) } : {}),
            },
          };

          const req = lib.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                resolve({ success: res.statusCode! < 400, data: parsed });
              } catch {
                resolve({ success: false, error: '解析响应失败' });
              }
            });
          });

          req.on('error', (error) => {
            resolve({ success: false, error: error.message });
          });

          req.setTimeout(timeout, () => {
            req.destroy();
            resolve({ success: false, error: '请求超时' });
          });

          if (body) {
            req.write(JSON.stringify(body));
          }
          req.end();
        });
        
        if (result.success) {
          return result;
        }
        
        lastError = result.error || '未知错误';
        console.log(`[PublishPlanScheduler] 请求失败 (尝试 ${attempt}/${maxRetries}): ${urlPath}`, lastError);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`[PublishPlanScheduler] 请求异常 (尝试 ${attempt}/${maxRetries}): ${urlPath}`, lastError);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    return { success: false, error: lastError };
  }

  /**
   * 检查并执行待执行计划
   */
  private async checkAndExecute(): Promise<void> {
    try {
      // 发送检查开始通知
      this.sendToRenderer('publish-plan-scheduler-checking', { 
        time: new Date().toISOString() 
      });

      this.progress = {
        status: 'checking',
        processedCount: 0,
        createdTasks: [],
        errors: [],
      };

      // 获取待执行的发布计划
      const result = await this.fetchWithRetry('/api/publish-plans?toExecute=true');
      
      if (!result.success || !result.data) {
        console.error('[PublishPlanScheduler] 获取计划失败:', result.error);
        this.progress.status = 'error';
        this.progress.message = result.error;
        return;
      }

      // API 返回 { success: true, data: plans }，fetchWithRetry 已经包装了一层
      const plans: PublishPlan[] = result.data.data || result.data || [];
      
      if (plans.length === 0) {
        console.log('[PublishPlanScheduler] 没有待执行的发布计划');
        this.progress.status = 'completed';
        this.progress.lastCheckAt = new Date();
        return;
      }

      console.log(`[PublishPlanScheduler] 发现 ${plans.length} 个待执行计划`);

      // 通知渲染进程有计划待执行
      this.sendToRenderer('pending-publish-plans', { 
        count: plans.length,
        plans: plans.map(p => ({
          id: p.id,
          name: p.planName,
          nextRunAt: p.nextRunAt,
        }))
      });

      this.progress.status = 'creating_tasks';

      // 为每个计划创建发布任务
      for (const plan of plans) {
        try {
          console.log(`[PublishPlanScheduler] 为计划 ${plan.id} (${plan.planName}) 创建发布任务`);
          
          // 创建发布任务
          const taskResult = await this.fetchWithRetry('/api/publish-tasks', {
            method: 'POST',
            body: {
              businessId: plan.businessId,
              planId: plan.id,
              draftId: plan.draftId,
              taskName: `${plan.planName} - 自动执行`,
              taskType: 'scheduled',
              priority: plan.priority,
              title: plan.title,
              content: plan.content,
              images: plan.images,
              tags: plan.tags,
              targetPlatforms: plan.targetPlatforms,
              maxRetries: plan.maxRetries,
              retryDelay: plan.retryDelay,
            },
          });

          if (taskResult.success && taskResult.data) {
            console.log(`[PublishPlanScheduler] 任务创建成功: ${taskResult.data.id}`);
            this.progress.createdTasks.push(taskResult.data.id);
            
            // 记录计划执行
            await this.fetchWithRetry('/api/publish-plans', {
              method: 'POST',
              body: {
                action: 'recordExecution',
                data: { id: plan.id },
              },
            });
          } else {
            console.error(`[PublishPlanScheduler] 创建任务失败:`, taskResult.error);
            this.progress.errors.push(`计划 ${plan.planName}: ${taskResult.error}`);
          }
          
          this.progress.processedCount++;
          
        } catch (error) {
          console.error(`[PublishPlanScheduler] 处理计划 ${plan.id} 异常:`, error);
          this.progress.errors.push(`计划 ${plan.planName}: ${error}`);
        }
      }

      this.progress.status = 'completed';
      this.progress.lastCheckAt = new Date();

      // 通知渲染进程处理完成
      this.sendToRenderer('publish-plan-scheduler-completed', {
        processedCount: this.progress.processedCount,
        createdTasks: this.progress.createdTasks.length,
        errors: this.progress.errors.length,
      });

    } catch (error) {
      console.error('[PublishPlanScheduler] 检查计划失败:', error);
      
      if (this.progress) {
        this.progress.status = 'error';
        this.progress.message = error instanceof Error ? error.message : '检查失败';
      }
      
      this.sendToRenderer('publish-plan-scheduler-error', { 
        error: error instanceof Error ? error.message : '检查计划失败' 
      });
    }
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
let schedulerInstance: PublishPlanScheduler | null = null;

export function createPublishPlanScheduler(
  mainWindow: BrowserWindow | null, 
  apiBaseUrl: string,
  checkIntervalMs?: number
): PublishPlanScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PublishPlanScheduler(mainWindow, apiBaseUrl, checkIntervalMs);
  } else {
    schedulerInstance.setMainWindow(mainWindow);
  }
  return schedulerInstance;
}

export function getPublishPlanScheduler(): PublishPlanScheduler | null {
  return schedulerInstance;
}

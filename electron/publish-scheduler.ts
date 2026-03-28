/**
 * 桌面端发布任务调度器
 * 负责定时检查并执行发布任务，支持全自动发布
 * 
 * 注意：只处理浏览器自动化发布，Webhook推送由服务端独立执行
 */

import { BrowserWindow, ipcMain, session } from 'electron';
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
  // 原始目标平台列表
  targetPlatforms: Array<{
    platform: string;
    accountId: string;
    accountName?: string;
    platformCategory?: string; // 'platform' | 'geo_platform' | 'official_site'
  }>;
  // 浏览器发布目标（桌面端执行）
  browserTargets?: Array<{
    platform: string;
    accountId: string;
    accountName?: string;
  }>;
  // Webhook推送目标（服务端执行）
  webhookTargets?: Array<{
    accountId: string;
    accountName?: string;
    webhookConfig?: any;
  }>;
  // 发布状态
  browserStatus?: string;
  webhookStatus?: string;
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
  private isExecuting = false;  // 执行锁，防止并发执行
  private currentTask: TaskProgress | null = null;
  private checkIntervalMs: number;
  private autoPublisher: AutoPublisher | null = null;
  
  // 智能调度相关属性
  private nextCheckTimer: NodeJS.Timeout | null = null;  // 精确定时器
  private nextRunTime: Date | null = null;               // 下次执行时间
  private fallbackInterval: NodeJS.Timeout | null = null; // 兜底检查定时器
  
  // 多定时器管理：每个任务一个定时器
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map();
  private taskExecutionTimes: Map<string, Date> = new Map();
  private taskNames: Map<string, string> = new Map();
  private lastRescheduleTime: Date | null = null;

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
   * 获取认证 cookie
   */
  private async getAuthCookie(): Promise<string> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return '';
    }
    try {
      const mainSession = this.mainWindow.webContents.session;
      const cookies = await mainSession.cookies.get({});
      const userToken = cookies.find(c => c.name === 'user_token');
      if (userToken) {
        return `user_token=${userToken.value}`;
      }
    } catch (e) {
      console.warn('[PublishScheduler] 获取认证 cookie 失败:', e);
    }
    return '';
  }

  /**
   * 通用 HTTP 请求方法（带认证）
   */
  private async makeRequest(
    urlPath: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: any;
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; data?: any; error?: string; statusCode?: number }> {
    const { method = 'GET', body, timeout = 30000 } = options;
    
    const cookieHeader = await this.getAuthCookie();
    
    return new Promise((resolve) => {
      const url = new URL(urlPath, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions: any = {
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
            resolve({ 
              success: (res.statusCode ?? 500) < 400, 
              data: parsed, 
              statusCode: res.statusCode 
            });
          } catch {
            resolve({ success: false, error: '解析响应失败', statusCode: res.statusCode });
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
  }

  /**
   * 启动调度器（智能调度模式）
   */
  start(): void {
    if (this.isRunning) {
      console.log('[PublishScheduler] 调度器已在运行');
      return;
    }

    console.log(`[PublishScheduler] 启动智能调度器`);
    this.isRunning = true;

    // 1. 立即加载所有任务并设置定时器
    this.rescheduleAll();
    
    // 2. 启动兜底检查（每5分钟）
    this.fallbackInterval = setInterval(() => {
      this.healthCheck();
    }, 5 * 60 * 1000);

    // 发送调度器启动通知
    this.sendToRenderer('scheduler-status', { 
      status: 'running', 
      mode: 'smart',
      scheduledCount: this.scheduledTimers.size,
    });
  }
  
  /**
   * 添加单个任务的定时器
   */
  addTaskTimer(taskId: string, taskName: string, executeTime: Date): void {
    // 如果该任务已有定时器，先清除
    this.removeTaskTimer(taskId);
    
    const now = new Date();
    const delay = Math.max(0, executeTime.getTime() - now.getTime());
    
    console.log(`[PublishScheduler] 添加任务定时器: ${taskName} (${taskId}), ${Math.round(delay/1000)}秒后执行`);
    
    // 存储执行时间和任务名称
    this.taskExecutionTimes.set(taskId, executeTime);
    this.taskNames.set(taskId, taskName);
    
    // 设置定时器
    const timer = setTimeout(() => {
      this.executeTaskById(taskId, taskName);
    }, delay);
    
    this.scheduledTimers.set(taskId, timer);
    
    // 发送状态更新
    this.sendToRenderer('publish-scheduler-updated', {
      action: 'add',
      taskId,
      taskName,
      executeTime: executeTime.toISOString(),
      scheduledCount: this.scheduledTimers.size,
    });
  }

  /**
   * 移除单个任务的定时器
   */
  removeTaskTimer(taskId: string): boolean {
    const timer = this.scheduledTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTimers.delete(taskId);
      this.taskExecutionTimes.delete(taskId);
      const taskName = this.taskNames.get(taskId);
      this.taskNames.delete(taskId);
      console.log(`[PublishScheduler] 已移除任务定时器: ${taskName || taskId}`);
      
      // 发送状态更新
      this.sendToRenderer('publish-scheduler-updated', {
        action: 'remove',
        taskId,
        taskName,
        scheduledCount: this.scheduledTimers.size,
      });
      
      return true;
    }
    return false;
  }

  /**
   * 重新调度所有任务（从数据库重新加载）
   */
  async rescheduleAll(): Promise<void> {
    console.log('[PublishScheduler] 重新调度所有任务');
    
    // 1. 清除所有现有定时器
    this.scheduledTimers.forEach((timer, taskId) => {
      clearTimeout(timer);
    });
    this.scheduledTimers.clear();
    this.taskExecutionTimes.clear();
    this.taskNames.clear();
    
    try {
      // 2. 查询所有待执行任务
      const tasks = await this.fetchAllPendingTasks();
      
      const now = new Date();
      let immediateCount = 0;
      let scheduledCount = 0;
      
      // 3. 为每个任务设置定时器或立即执行
      for (const task of tasks) {
        if (task.scheduledAt) {
          const executeTime = new Date(task.scheduledAt);
          
          if (executeTime > now) {
            // 未来任务：设置定时器
            this.addTaskTimer(task.id, task.taskName, executeTime);
            scheduledCount++;
          } else {
            // 已到时间：立即执行
            console.log(`[PublishScheduler] 任务已到执行时间，立即执行: ${task.taskName} (${task.id})`);
            // 异步执行，不阻塞循环
            this.executeTaskById(task.id, task.taskName).catch(err => {
              console.error(`[PublishScheduler] 立即执行任务失败: ${task.taskName}`, err);
            });
            immediateCount++;
          }
        }
      }
      
      this.lastRescheduleTime = new Date();
      console.log(`[PublishScheduler] 已调度 ${scheduledCount} 个定时任务，立即执行 ${immediateCount} 个任务`);
      
      // 发送状态更新
      this.sendToRenderer('publish-scheduler-updated', {
        action: 'rescheduleAll',
        scheduledCount: this.scheduledTimers.size,
        tasks: this.getScheduledTasks(),
      });
      
    } catch (error) {
      console.error('[PublishScheduler] 重新调度失败:', error);
    }
  }

  /**
   * 执行指定任务
   */
  private async executeTaskById(taskId: string, taskName: string): Promise<void> {
    console.log(`[PublishScheduler] 定时器触发，执行任务: ${taskName} (${taskId})`);
    
    // 执行时清理定时器
    this.scheduledTimers.delete(taskId);
    this.taskExecutionTimes.delete(taskId);
    this.taskNames.delete(taskId);
    
    // 获取任务详情并执行
    try {
      const task = await this.getTaskById(taskId);
      
      if (task) {
        await this.executeTask(task);
      } else {
        console.error(`[PublishScheduler] 获取任务详情失败: ${taskId}`);
      }
    } catch (error) {
      console.error(`[PublishScheduler] 执行任务异常: ${taskId}`, error);
    }
  }

  /**
   * 获取调度状态（供前端查看）
   */
  getScheduledTasks(): Array<{ taskId: string; taskName: string; executeTime: string }> {
    return Array.from(this.scheduledTimers.keys()).map(taskId => ({
      taskId,
      taskName: this.taskNames.get(taskId) || 'unknown',
      executeTime: this.taskExecutionTimes.get(taskId)?.toISOString() || '',
    }));
  }
  
  /**
   * 获取调度器详细状态
   */
  getStatus(): { 
    isRunning: boolean; 
    currentTask: TaskProgress | null;
    scheduledCount: number;
    lastRescheduleTime: string | null;
  } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      scheduledCount: this.scheduledTimers.size,
      lastRescheduleTime: this.lastRescheduleTime?.toISOString() || null,
    };
  }
  
  /**
   * 获取所有待执行任务（从API）
   */
  private async fetchAllPendingTasks(): Promise<PublishTask[]> {
    const result = await this.makeRequest('/api/publish-tasks/pending');
    
    if (result.success && result.data?.tasks) {
      return result.data.tasks.map((t: any) => ({
        id: t.id,
        businessId: t.business_id || t.businessId,
        planId: t.plan_id || t.planId,
        taskName: t.task_name || t.taskName || '未命名任务',
        title: t.title || '',
        content: t.content || '',
        images: t.images || [],
        tags: t.tags || [],
        targetPlatforms: t.target_platforms || t.targetPlatforms || [],
        browserTargets: t.browser_targets || t.browserTargets || [],
        webhookTargets: t.webhook_targets || t.webhookTargets || [],
        browserStatus: t.browser_status || t.browserStatus,
        webhookStatus: t.webhook_status || t.webhookStatus,
        scheduledAt: t.scheduled_at || t.scheduledAt,
        status: t.status || 'pending',
        priority: t.priority || 5,
      }));
    }
    return [];
  }

  /**
   * 智能调度：根据任务的执行时间设置定时器
   */
  private async scheduleNextCheck(): Promise<void> {
    // 清除现有定时器
    if (this.nextCheckTimer) {
      clearTimeout(this.nextCheckTimer);
      this.nextCheckTimer = null;
    }

    // 利用内存状态判断是否需要延迟调度
    if (this.currentTask && this.currentTask.status === 'running') {
      console.log('[PublishScheduler] 正在发布中，延迟调度');
      this.nextCheckTimer = setTimeout(() => this.scheduleNextCheck(), 60 * 1000);
      return;
    }

    try {
      // 查询最近的待执行任务
      const result = await this.findEarliestTask();
      
      if (!result || !result.task) {
        // 无任务，5分钟后重试
        console.log('[PublishScheduler] 无待执行任务，5分钟后重试');
        this.nextRunTime = null;
        this.nextCheckTimer = setTimeout(() => this.scheduleNextCheck(), 5 * 60 * 1000);
        return;
      }

      const nextTask = result.task;
      const nextTime = new Date(nextTask.scheduledAt);
      const now = new Date();
      const delay = Math.max(0, nextTime.getTime() - now.getTime());

      this.nextRunTime = nextTime;
      console.log(`[PublishScheduler] 下次执行: ${nextTask.taskName}, ${Math.round(delay / 1000)}秒后`);

      // 设置精确定时器
      this.nextCheckTimer = setTimeout(() => {
        this.checkAndExecute();
      }, delay);
      
    } catch (error) {
      console.error('[PublishScheduler] 智能调度失败:', error);
      // 失败时回退到固定间隔
      this.nextCheckTimer = setTimeout(() => this.scheduleNextCheck(), 60 * 1000);
    }
  }

  /**
   * 查询最近的待执行任务
   */
  private async findEarliestTask(): Promise<{ task: any } | null> {
    const result = await this.makeRequest('/api/publish-tasks/earliest');
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  }

  /**
   * 健康检查：确保定时器正常工作，并定期重新加载任务
   */
  private healthCheck(): void {
    const now = new Date();
    
    // 1. 检查是否有定时器
    if (this.scheduledTimers.size === 0) {
      console.warn('[PublishScheduler] 健康检查：无活动定时器，重新调度');
      this.rescheduleAll();
      return;
    }
    
    // 2. 定期重新调度（每2分钟检查一次数据库变化）
    if (!this.lastRescheduleTime || 
        now.getTime() - this.lastRescheduleTime.getTime() > 2 * 60 * 1000) {
      console.log('[PublishScheduler] 健康检查：定期重新调度');
      this.rescheduleAll();
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    // 清理所有任务定时器
    this.scheduledTimers.forEach((timer, taskId) => {
      clearTimeout(timer);
    });
    this.scheduledTimers.clear();
    this.taskExecutionTimes.clear();
    this.taskNames.clear();
    
    // 清理智能调度定时器
    if (this.nextCheckTimer) {
      clearTimeout(this.nextCheckTimer);
      this.nextCheckTimer = null;
    }
    
    // 清理兜底检查定时器
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    
    // 清理旧的轮询定时器（兼容）
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    this.nextRunTime = null;
    this.lastRescheduleTime = null;
    console.log('[PublishScheduler] 调度器已停止');

    // 停止所有自动发布
    if (this.autoPublisher) {
      this.autoPublisher.stop();
    }

    this.sendToRenderer('scheduler-status', { 
      status: 'stopped',
      scheduledCount: 0,
    });
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
    const result = await this.makeRequest(`/api/publish-tasks?id=${taskId}`);
    
    if (result.success && result.data?.data) {
      const task = result.data.data;
      return {
        id: task.id,
        businessId: task.businessId || task.business_id,
        planId: task.planId || task.plan_id,
        taskName: task.taskName || task.task_name || task.planName,
        title: task.title,
        content: task.content,
        images: task.images || [],
        tags: task.tags || [],
        targetPlatforms: task.targetPlatforms || task.target_platforms || task.targetAccount || [],
        browserTargets: task.browserTargets || task.browser_targets || [],
        webhookTargets: task.webhookTargets || task.webhook_targets || [],
        browserStatus: task.browserStatus || task.browser_status,
        webhookStatus: task.webhookStatus || task.webhook_status,
        scheduledAt: task.scheduledAt || task.scheduled_at,
        status: task.status,
        priority: task.priority || 5,
      };
    }
    return null;
  }

  /**
   * 检查并执行待执行任务
   * 优化版本：利用内存状态跳过无效查询，支持多任务顺序执行
   */
  private async checkAndExecute(): Promise<void> {
    // 第1层：利用内存进度状态跳过数据库查询
    if (this.currentTask && this.currentTask.status === 'running') {
      console.log(`[PublishScheduler] 正在发布中 (${this.currentTask.progress}%)，跳过数据库查询`);
      return;
    }
    
    // 第2层：执行锁检查：如果已经在执行中，跳过本次检查
    if (this.isExecuting) {
      console.log('[PublishScheduler] 已有任务执行中，跳过本次检查');
      return;
    }
    
    // 设置执行锁
    this.isExecuting = true;

    try {
      // 发送检查开始通知
      this.sendToRenderer('scheduler-checking', { time: new Date().toISOString() });

      // 并行执行：检查浏览器发布任务 + 触发 Webhook 任务执行
      const [pendingTasks] = await Promise.all([
        this.fetchPendingTasks(),
        this.triggerWebhookTasks(), // 触发服务端 Webhook 任务执行
      ]);

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

      // 执行所有待执行任务（顺序执行）
      for (let i = 0; i < pendingTasks.length; i++) {
        const task = pendingTasks[i];
        console.log(`[PublishScheduler] 执行任务 ${i + 1}/${pendingTasks.length}: ${task.taskName}`);
        await this.executeTask(task);
        
        // 任务之间间隔一段时间，避免资源竞争
        if (i < pendingTasks.length - 1) {
          console.log('[PublishScheduler] 等待 3 秒后执行下一个任务...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

    } catch (error) {
      console.error('[PublishScheduler] 检查任务失败:', error);
      this.sendToRenderer('scheduler-error', { 
        error: error instanceof Error ? error.message : '检查任务失败' 
      });
    } finally {
      // 释放执行锁
      this.isExecuting = false;
      console.log('[PublishScheduler] 执行完成，释放锁');
      
      // 执行完成后，重新调度下次检查
      this.scheduleNextCheck();
    }
  }

  /**
   * 触发服务端执行 Webhook 任务
   */
  private async triggerWebhookTasks(): Promise<void> {
    return new Promise((resolve) => {
      const url = new URL('/api/webhook/tasks', this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const body = JSON.stringify({ executeAll: true });

      const req = lib.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.executed > 0) {
              console.log(`[PublishScheduler] 触发了 ${json.executed} 个 Webhook 任务执行`);
            }
          } catch (e) {
            // 忽略解析错误
          }
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error('[PublishScheduler] 触发 Webhook 任务失败:', error);
        resolve(); // 不阻塞主流程
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve();
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * 从API获取待执行任务
   */
  /**
   * 获取最早待执行任务（优化版）
   * 调用新的 earliest 端点，只返回最早的一个待执行任务
   */
  private async fetchPendingTasks(): Promise<PublishTask[]> {
    return new Promise((resolve, reject) => {
      const url = new URL('/api/publish-tasks/earliest', this.apiBaseUrl);
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
            // earliest 端点返回单个任务或 null
            if (json.task) {
              console.log(`[PublishScheduler] 最早待执行任务: ${json.task.taskName}, 计划时间: ${json.task.scheduledAt}`);
              resolve([json.task]);
            } else {
              // 没有待执行任务，记录下次检查时间
              if (json.nextCheckTime) {
                this.nextRunTime = new Date(json.nextCheckTime);
                console.log(`[PublishScheduler] 无待执行任务，下次检查时间: ${this.nextRunTime.toLocaleString()}`);
              }
              resolve([]);
            }
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
   * 执行发布任务 - 只处理浏览器自动化发布
   * Webhook推送由服务端独立执行
   */
  private async executeTask(task: PublishTask): Promise<void> {
    console.log(`[PublishScheduler] 开始执行任务: ${task.taskName} (${task.id})`);

    // 确定要发布的平台目标
    // 优先使用 browserTargets（新字段），否则从 targetPlatforms 过滤掉官网类型
    const browserTargets = task.browserTargets && task.browserTargets.length > 0
      ? task.browserTargets
      : (task.targetPlatforms || []).filter(t => 
          t.platformCategory !== 'official_site' && 
          t.platform !== 'official_site'
        );

    // 如果没有浏览器发布目标，跳过
    if (browserTargets.length === 0) {
      console.log(`[PublishScheduler] 任务 ${task.id} 没有浏览器发布目标，跳过`);
      return;
    }

    // 如果任务已有 Webhook 目标，提示服务端将处理
    const webhookCount = task.webhookTargets?.length || 0;
    if (webhookCount > 0) {
      console.log(`[PublishScheduler] 任务 ${task.id} 有 ${webhookCount} 个Webhook推送目标，将由服务端处理`);
    }

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
      targetPlatforms: browserTargets,
      webhookCount: webhookCount,
    });

    const results: PublishResult[] = [];
    const totalPlatforms = browserTargets.length;

    // 更新浏览器发布状态为运行中
    await this.updateBrowserStatus(task.id, 'running');

    try {
      // 遍历每个目标平台执行发布
      for (let i = 0; i < browserTargets.length; i++) {
        const target = browserTargets[i];
        
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
        
        // 同时发送 publish-task-progress 事件（供计划页面使用）
        this.sendToRenderer('publish-task-progress', {
          planId: task.planId || '',
          taskId: task.id,
          current: i + 1,
          total: totalPlatforms,
          articleTitle: task.title,
          platform: target.platform,
          status: 'publishing',
          message: `正在发布到 ${target.platform} (${i + 1}/${totalPlatforms})...`,
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
        if (i < browserTargets.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // 更新浏览器发布状态
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

      // 更新浏览器发布状态到服务器
      await this.updateBrowserStatus(task.id, allSuccess ? 'completed' : 'failed', results);
      
      // 更新计划的发布统计
      if (task.planId && allSuccess) {
        await this.updatePlanPublishedStats(task.planId);
      }

      // 通知渲染进程任务完成
      this.sendToRenderer('task-completed', {
        taskId: task.id,
        taskName: task.taskName,
        success: allSuccess,
        results: results,
        completedAt: new Date().toISOString(),
        // 提示Webhook将由服务端处理
        webhookCount: webhookCount,
        webhookMessage: webhookCount > 0 
          ? `${webhookCount} 个官网推送将由服务端处理` 
          : undefined,
      });
      
      // 同时发送 publish-task-progress 完成事件
      this.sendToRenderer('publish-task-progress', {
        planId: task.planId || '',
        taskId: task.id,
        current: totalPlatforms,
        total: totalPlatforms,
        articleTitle: task.title,
        status: 'completed',
        message: allSuccess 
          ? `浏览器发布成功 (${totalPlatforms} 个平台)${webhookCount > 0 ? `，${webhookCount}个官网推送将由服务端处理` : ''}`
          : `浏览器发布完成 (${successCount}/${totalPlatforms} 成功)`,
      });

    } catch (error) {
      console.error(`[PublishScheduler] 执行任务失败: ${task.id}`, error);

      this.currentTask.status = 'failed';
      this.currentTask.completedAt = new Date();

      // 更新浏览器发布状态为失败
      await this.updateBrowserStatus(task.id, 'failed');

      this.sendToRenderer('task-failed', {
        taskId: task.id,
        taskName: task.taskName,
        error: error instanceof Error ? error.message : '执行失败',
      });
    }
  }

  /**
   * 更新浏览器发布状态到服务器
   */
  private async updateBrowserStatus(
    taskId: string, 
    status: string, 
    results?: PublishResult[]
  ): Promise<void> {
    return new Promise((resolve) => {
      const url = new URL(`/api/publish-tasks/${taskId}/browser-status`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const body = JSON.stringify({ 
        browserStatus: status, 
        browserResults: results,
        browserProgress: 100,
        ...(status === 'running' ? { browserStartedAt: new Date().toISOString() } : {}),
        ...(status === 'completed' || status === 'failed' ? { browserCompletedAt: new Date().toISOString() } : {}),
      });

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
        resolve();
      });

      req.on('error', (error) => {
        console.error('[PublishScheduler] 更新浏览器发布状态失败:', error);
        resolve();
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve();
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * 更新计划的发布统计
   */
  private async updatePlanPublishedStats(planId: string): Promise<void> {
    return new Promise((resolve) => {
      const url = new URL(`/api/creation-plans/${planId}/stats`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const body = JSON.stringify({ totalPublished: 1 });

      const req = lib.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[PublishScheduler] 更新计划发布统计成功: planId=${planId}`);
          resolve();
        });
      });

      req.on('error', (error) => {
        console.error('[PublishScheduler] 更新计划发布统计失败:', error);
        resolve();
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve();
      });

      req.write(body);
      req.end();
    });
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
              publishedUrl: json.publishedUrl || json.url || json.result?.publishedUrl || null,
              publishedAt: new Date().toISOString(),
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

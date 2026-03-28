/**
 * 创作任务调度器
 * 负责定时检查并执行创作计划，自动生成内容并创建发布任务
 * 
 * 调用 API:
 * - GET  /api/creation-plans/pending - 获取待执行计划
 * - POST /api/content/generate - 生成内容
 * - POST /api/publish-tasks - 创建发布任务
 * - PATCH /api/creation-plans/[id]/stats - 更新计划统计
 */

import { BrowserWindow, ipcMain, session } from 'electron';
import * as https from 'https';
import * as http from 'http';
import type { GenerationConfig, ModelSelectionMode } from '../src/lib/types/generation-config';

// 创作计划接口 - 与前端类型保持一致
interface CreationPlan {
  id: string;
  businessId: string;
  planName: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  frequency: 'daily' | 'weekly' | 'monthly' | 'hourly';
  articlesPerRun: number;
  scheduledTime: string;
  scheduledDays: number[];
  scheduledDates: number[];
  // 使用完整的 GenerationConfig
  contentConfig: {
    ruleId?: string;
    generateMethod: 'keyword' | 'keyword-library' | 'title' | 'description';
    keywords: string;
    includeKeywords: string;
    keywordLibraryId: string;
    keywordSelectMode: 'top5' | 'top10' | 'top20' | 'top50' | 'all' | 'random';
    keywordCount: number;
    description: string;
    articleType: 'what' | 'how' | 'top' | 'normal';
    articleTypeRatio: number;
    enableThumbnail: boolean;
    enableContentImages: boolean;
    language: string;
    targetCountry: string;
    creativityLevel: number;
    tone: string;
    perspective: string;
    formality: string;
    customInstructions: string;
    contentIncludeKeywords: string;
    replacements: { find: string; replace: string }[];
    enableWebSearch: boolean;
    knowledgeBaseId?: string;
    enableBold: boolean;
    enableItalic: boolean;
    enableTable: boolean;
    enableQuote: boolean;
    ctaUrl: string;
    enableSummary: boolean;
    enableConclusion: boolean;
    enableFaq: boolean;
    articleSize: string;
    enableAutoTitle: boolean;
    customTitle: string;
    sitemaps: string[];
    filterMode: string;
    excludeMode: string;
    internalLinksPerH2: number;
    externalLinks: { url: string; anchor: string }[];
    enableAutoExternalLinks: boolean;
    enableFixedIntro: boolean;
    fixedIntro: string;
    enableFixedOutro: boolean;
    fixedOutro: string;
    model: string;
    modelSelectionMode?: ModelSelectionMode;
    modelPool?: string[];
    modelWeights?: Record<string, number>;
    articleCount: number;
  };
  publishConfig: {
    autoPublish: boolean;
    publishDelay: number;
    targetPlatforms: Array<{
      platform: string;
      accountId: string;
      accountName?: string;
    }>;
    publishStrategy: 'immediate' | 'scheduled' | 'distributed';
    publishTimeSlots: string[];
    articleDistribution: 'broadcast' | 'distribute';
  };
  stats: {
    totalCreated: number;
    totalPublished: number;
    successRate: number;
    lastRunAt?: string;
    nextRunAt?: string;
  };
  // 关键词进度追踪
  lastKeywordIndex?: number;  // 上次执行到第几个关键词（从0开始）
}

// 创作任务接口
interface CreationTask {
  id: string;
  planId: string;
  businessId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  params: {
    generateMethod: string;
    keyword?: string;
    keywords?: string[];
    keywordLibraryId?: string;
    articleType: string;
    ruleConfig?: Record<string, any>;
  };
  result?: {
    draftId: string;
    title: string;
    content: string;
    seoScore: number;
  };
  publishTaskId?: string;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// 创作进度
interface CreationProgress {
  planId: string;
  planName: string;
  status: 'checking' | 'creating' | 'publishing' | 'completed' | 'failed';
  progress: number;
  currentTask?: string;
  createdCount: number;
  totalCount: number;
  results: Array<{
    title: string;
    status: 'success' | 'failed';
    publishedUrl?: string;
    error?: string;
  }>;
  startedAt?: Date;
  completedAt?: Date;
}

export class CreationScheduler {
  private mainWindow: BrowserWindow | null = null;
  private apiBaseUrl: string;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isExecuting = false;  // 执行锁，防止并发执行
  private currentProgress: CreationProgress | null = null;
  private checkIntervalMs: number;
  
  // 智能调度相关属性
  private nextCheckTimer: NodeJS.Timeout | null = null;  // 精确定时器
  private nextRunTime: Date | null = null;               // 下次执行时间
  private fallbackInterval: NodeJS.Timeout | null = null; // 兜底检查定时器
  
  // 多定时器管理：每个计划一个定时器
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map();
  private planExecutionTimes: Map<string, Date> = new Map();
  private planNames: Map<string, string> = new Map();  // 存储 planId -> planName 映射
  private lastRescheduleTime: Date | null = null;  // 上次重新调度时间

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
   * 启动调度器（智能调度模式）
   */
  start(): void {
    if (this.isRunning) {
      console.log('[CreationScheduler] 调度器已在运行');
      return;
    }

    console.log(`[CreationScheduler] 启动智能调度器`);
    this.isRunning = true;

    // 1. 立即加载所有计划并设置定时器
    this.rescheduleAll();
    
    // 2. 启动兜底检查（每5分钟）
    this.fallbackInterval = setInterval(() => {
      this.healthCheck();
    }, 5 * 60 * 1000);

    // 发送调度器启动通知
    this.sendToRenderer('creation-scheduler-status', { 
      status: 'running', 
      checkInterval: this.checkIntervalMs,
      mode: 'smart',
      scheduledCount: this.scheduledTimers.size,
    });
  }
  
  /**
   * 添加单个计划的定时器
   */
  addPlanTimer(planId: string, planName: string, executeTime: Date): void {
    // 如果该计划已有定时器，先清除（静默清除，不输出警告）
    const existingTimer = this.scheduledTimers.get(planId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.scheduledTimers.delete(planId);
      this.planExecutionTimes.delete(planId);
      const existingPlanName = this.planNames.get(planId);
      this.planNames.delete(planId);
      console.log(`[CreationScheduler] 已覆盖旧定时器: ${existingPlanName || planId}`);
    }
    
    const now = new Date();
    const delay = Math.max(0, executeTime.getTime() - now.getTime());
    
    console.log(`[CreationScheduler] 添加计划定时器: ${planName} (${planId}), ${Math.round(delay/1000)}秒后执行`);
    
    // 存储执行时间和计划名称
    this.planExecutionTimes.set(planId, executeTime);
    this.planNames.set(planId, planName);
    
    // 设置定时器
    const timer = setTimeout(() => {
      this.executePlanById(planId, planName);
    }, delay);
    
    this.scheduledTimers.set(planId, timer);
    console.log(`[CreationScheduler] 定时器添加成功，当前共 ${this.scheduledTimers.size} 个定时器`);
    
    // 发送状态更新
    this.sendToRenderer('creation-scheduler-updated', {
      action: 'add',
      planId,
      planName,
      executeTime: executeTime.toISOString(),
      scheduledCount: this.scheduledTimers.size,
    });
  }

  /**
   * 移除单个计划的定时器
   */
  removePlanTimer(planId: string): boolean {
    const timer = this.scheduledTimers.get(planId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTimers.delete(planId);
      this.planExecutionTimes.delete(planId);
      const planName = this.planNames.get(planId);
      this.planNames.delete(planId);
      console.log(`[CreationScheduler] 已移除计划定时器: ${planName || planId}`);
      
      // 发送状态更新
      this.sendToRenderer('creation-scheduler-updated', {
        action: 'remove',
        planId,
        planName,
        scheduledCount: this.scheduledTimers.size,
      });
      
      return true;
    }
    
    // 定时器不存在，输出警告帮助诊断
    const scheduledIds = Array.from(this.scheduledTimers.keys());
    console.warn(`[CreationScheduler] 移除定时器失败: 计划 ${planId} 不存在于调度器中`);
    console.warn(`[CreationScheduler] 当前已调度的计划: ${scheduledIds.length > 0 ? scheduledIds.join(', ') : '无'}`);
    
    return false;
  }

  /**
   * 重新调度所有计划（从数据库重新加载）
   */
  async rescheduleAll(): Promise<void> {
    console.log('[CreationScheduler] 重新调度所有计划');
    
    // 1. 清除所有现有定时器
    this.scheduledTimers.forEach((timer, planId) => {
      clearTimeout(timer);
    });
    this.scheduledTimers.clear();
    this.planExecutionTimes.clear();
    this.planNames.clear();
    
    try {
      // 2. 查询所有活跃计划
      const result = await this.fetchWithRetry('/api/creation-plans/all-active', {
        method: 'GET',
        timeout: 10000,
      });
      
      if (result.success && result.data?.plans) {
        // 3. 为每个计划设置定时器
        for (const plan of result.data.plans) {
          if (plan.nextExecutionTime) {
            this.addPlanTimer(plan.id, plan.planName, new Date(plan.nextExecutionTime));
          }
        }
      }
      
      this.lastRescheduleTime = new Date();
      console.log(`[CreationScheduler] 已调度 ${this.scheduledTimers.size} 个计划`);
      
      // 发送状态更新
      this.sendToRenderer('creation-scheduler-updated', {
        action: 'rescheduleAll',
        scheduledCount: this.scheduledTimers.size,
        plans: this.getScheduledPlans(),
      });
      
    } catch (error) {
      console.error('[CreationScheduler] 重新调度失败:', error);
    }
  }

  /**
   * 执行指定计划
   */
  private async executePlanById(planId: string, planName: string): Promise<void> {
    console.log(`[CreationScheduler] 定时器触发，执行计划: ${planName} (${planId})`);
    
    // 执行时清理定时器
    this.scheduledTimers.delete(planId);
    this.planExecutionTimes.delete(planId);
    
    // 获取计划详情并执行
    try {
      const result = await this.fetchWithRetry(`/api/creation-plans?id=${planId}`, {
        method: 'GET',
        timeout: 10000,
      });
      
      if (result.success && result.data?.success && result.data?.data) {
        await this.executePlan(result.data.data);
      } else {
        console.error(`[CreationScheduler] 获取计划详情失败: ${planId}`, result.data);
      }
    } catch (error) {
      console.error(`[CreationScheduler] 执行计划异常: ${planId}`, error);
    }
  }

  /**
   * 获取调度状态（供前端查看）
   */
  getScheduledPlans(): Array<{ planId: string; planName: string; executeTime: string }> {
    return Array.from(this.scheduledTimers.keys()).map(planId => ({
      planId,
      planName: this.planNames.get(planId) || 'unknown',
      executeTime: this.planExecutionTimes.get(planId)?.toISOString() || '',
    }));
  }
  
  /**
   * 获取调度器详细状态
   */
  getStatus(): { 
    isRunning: boolean; 
    currentProgress: CreationProgress | null;
    scheduledCount: number;
    lastRescheduleTime: string | null;
  } {
    return {
      isRunning: this.isRunning,
      currentProgress: this.currentProgress,
      scheduledCount: this.scheduledTimers.size,
      lastRescheduleTime: this.lastRescheduleTime?.toISOString() || null,
    };
  }

  /**
   * 智能调度：根据计划的执行时间设置定时器
   */
  private async scheduleNextCheck(): Promise<void> {
    // 清除现有定时器
    if (this.nextCheckTimer) {
      clearTimeout(this.nextCheckTimer);
      this.nextCheckTimer = null;
    }

    // 利用内存状态判断是否需要延迟调度
    if (this.currentProgress && ['creating', 'publishing'].includes(this.currentProgress.status)) {
      console.log('[CreationScheduler] 正在执行中，延迟调度');
      this.nextCheckTimer = setTimeout(() => this.scheduleNextCheck(), 60 * 1000);
      return;
    }

    try {
      // 查询最近的待执行计划
      const result = await this.findEarliestPlan();
      
      if (!result || !result.plan) {
        // 无计划，5分钟后重试
        console.log('[CreationScheduler] 无待执行计划，5分钟后重试');
        this.nextRunTime = null;
        this.nextCheckTimer = setTimeout(() => this.scheduleNextCheck(), 5 * 60 * 1000);
        return;
      }

      const nextPlan = result.plan;
      const nextTime = new Date(nextPlan.nextExecutionTime);
      const now = new Date();
      const delay = Math.max(0, nextTime.getTime() - now.getTime());

      this.nextRunTime = nextTime;
      console.log(`[CreationScheduler] 下次执行: ${nextPlan.planName}, ${Math.round(delay / 1000)}秒后`);

      // 设置精确定时器
      this.nextCheckTimer = setTimeout(() => {
        this.checkAndExecute();
      }, delay);
      
    } catch (error) {
      console.error('[CreationScheduler] 智能调度失败:', error);
      // 失败时回退到固定间隔
      this.nextCheckTimer = setTimeout(() => this.scheduleNextCheck(), 60 * 1000);
    }
  }

  /**
   * 查询最近的待执行计划
   */
  private async findEarliestPlan(): Promise<{ plan: any } | null> {
    const result = await this.fetchWithRetry('/api/creation-plans/earliest', {
      method: 'GET',
      timeout: 10000,
    });
    
    if (result.success && result.data) {
      return result.data;
    }
    
    return null;
  }

  /**
   * 健康检查：确保定时器正常工作，并定期重新加载计划
   */
  private healthCheck(): void {
    const now = new Date();
    
    // 1. 检查是否有定时器
    if (this.scheduledTimers.size === 0) {
      console.warn('[CreationScheduler] 健康检查：无活动定时器，重新调度');
      this.rescheduleAll();
      return;
    }
    
    // 2. 定期重新调度（每2分钟检查一次数据库变化）
    if (!this.lastRescheduleTime || 
        now.getTime() - this.lastRescheduleTime.getTime() > 2 * 60 * 1000) {
      console.log('[CreationScheduler] 健康检查：定期重新调度');
      this.rescheduleAll();
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    // 清理所有计划定时器
    this.scheduledTimers.forEach((timer, planId) => {
      clearTimeout(timer);
    });
    this.scheduledTimers.clear();
    this.planExecutionTimes.clear();
    this.planNames.clear();
    
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
    console.log('[CreationScheduler] 调度器已停止');

    this.sendToRenderer('creation-scheduler-status', { 
      status: 'stopped',
      scheduledCount: 0,
    });
  }

  /**
   * 带重试的 HTTP 请求
   * 用于提高网络抖动或临时不可用情况下的稳定性
   * 自动从主窗口 session 获取认证 cookie
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
        
        // 优先使用 user_token_electron（Electron 兼容），其次 user_token
        const userToken = cookies.find(c => c.name === 'user_token_electron') || 
                          cookies.find(c => c.name === 'user_token');
        
        if (userToken) {
          cookieHeader = `${userToken.name}=${userToken.value}`;
        } else {
          console.warn('[CreationScheduler] 未找到认证 cookie，可用:', cookies.map(c => c.name).join(', '));
        }
      } catch (e) {
        console.warn('[CreationScheduler] 获取认证 cookie 失败:', e);
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
                // 正确提取错误信息：优先使用响应体中的 error 字段
                const errorMsg = parsed.error || parsed.message || '未知错误';
                resolve({ 
                  success: res.statusCode! < 400, 
                  data: parsed,
                  error: res.statusCode! >= 400 ? errorMsg : undefined 
                });
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
        console.log(`[CreationScheduler] 请求失败 (尝试 ${attempt}/${maxRetries}): ${urlPath}`, lastError);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`[CreationScheduler] 请求异常 (尝试 ${attempt}/${maxRetries}): ${urlPath}`, lastError);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    return { success: false, error: lastError };
  }

  /**
   * 手动触发检查
   */
  async triggerCheck(): Promise<void> {
    console.log('[CreationScheduler] 手动触发检查');
    await this.checkAndExecute();
  }

  /**
   * 检查并执行待执行计划
   * 优化版本：利用内存状态跳过无效查询，支持多计划顺序执行
   */
  private async checkAndExecute(): Promise<void> {
    // 第1层：利用内存进度状态跳过数据库查询
    if (this.currentProgress) {
      const { status } = this.currentProgress;
      if (status === 'creating' || status === 'publishing') {
        console.log(`[CreationScheduler] 正在执行中 (${status})，跳过数据库查询`);
        return;
      }
    }
    
    // 第2层：执行锁检查：如果已经在执行中，跳过本次检查
    if (this.isExecuting) {
      console.log('[CreationScheduler] 已有执行任务在进行中，跳过本次检查');
      return;
    }
    
    // 设置执行锁
    this.isExecuting = true;

    try {
      // 发送检查开始通知
      this.sendToRenderer('creation-scheduler-checking', { 
        time: new Date().toISOString() 
      });

      // 获取待执行的创作计划
      const pendingPlans = await this.fetchPendingPlans();

      if (pendingPlans.length === 0) {
        console.log('[CreationScheduler] 没有待执行的创作计划');
        return;
      }

      console.log(`[CreationScheduler] 发现 ${pendingPlans.length} 个待执行计划`);

      // 通知渲染进程有计划待执行
      this.sendToRenderer('pending-creation-plans', { 
        count: pendingPlans.length,
        plans: pendingPlans.map(p => ({
          id: p.id,
          name: p.planName,
          articlesPerRun: p.articlesPerRun,
        }))
      });

      // 执行所有待执行计划（顺序执行）
      for (let i = 0; i < pendingPlans.length; i++) {
        const plan = pendingPlans[i];
        console.log(`[CreationScheduler] 执行计划 ${i + 1}/${pendingPlans.length}: ${plan.planName}`);
        await this.executePlan(plan);
        
        // 计划之间间隔一段时间，避免资源竞争
        if (i < pendingPlans.length - 1) {
          console.log('[CreationScheduler] 等待 5 秒后执行下一个计划...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

    } catch (error) {
      console.error('[CreationScheduler] 检查计划失败:', error);
      this.sendToRenderer('creation-scheduler-error', { 
        error: error instanceof Error ? error.message : '检查计划失败' 
      });
    } finally {
      // 释放执行锁
      this.isExecuting = false;
      console.log('[CreationScheduler] 执行完成，释放锁');
      
      // 执行完成后重新调度
      await this.scheduleNextCheck();
    }
  }

  /**
   * 从API获取待执行的创作计划（带重试）
   */
  private async fetchPendingPlans(): Promise<CreationPlan[]> {
    const result = await this.fetchWithRetry('/api/creation-plans/pending', {
      method: 'GET',
      timeout: 10000,
    });
    
    if (result.success && result.data) {
      return result.data.plans || [];
    }
    
    console.error('[CreationScheduler] 获取计划失败:', result.error);
    return [];
  }

  /**
   * 执行创作计划
   */
  private async executePlan(plan: CreationPlan): Promise<void> {
    console.log(`[CreationScheduler] 开始执行计划: ${plan.planName} (${plan.id})`);

    // ✅ 执行开始时立即更新 last_run_at，防止重复调度
    // 在数据库层面标记该计划正在执行，避免因执行时间超过调度间隔导致重复触发
    await this.updatePlanStats(plan.id, {
      lastRunAt: new Date().toISOString(),
    });

    // 初始化进度
    this.currentProgress = {
      planId: plan.id,
      planName: plan.planName,
      status: 'creating',
      progress: 0,
      createdCount: 0,
      totalCount: plan.articlesPerRun,
      results: [],
      startedAt: new Date(),
    };

    // 通知渲染进程计划开始执行
    this.sendToRenderer('creation-plan-started', {
      planId: plan.id,
      planName: plan.planName,
      totalCount: plan.articlesPerRun,
    });

    try {
      // 1. 获取关键词
      const keywords = await this.getKeywordsForPlan(plan);
      
      if (keywords.length === 0) {
        console.log(`[CreationScheduler] 计划 ${plan.id} 没有可用的关键词`);
        return;
      }
      
      // 2. 从上次执行位置继续
      const startIndex = plan.lastKeywordIndex || 0;
      console.log(`[CreationScheduler] 关键词总数: ${keywords.length}, 起始索引: ${startIndex}, 每次生成: ${plan.articlesPerRun}`);
      
      // 收集所有生成的文章，用于分发策略
      const generatedArticles: Array<{
        draftId: string;
        title: string;
        content: string;
      }> = [];
      
      // 3. 为每个关键词创建创作任务
      for (let i = 0; i < plan.articlesPerRun; i++) {
        // 循环使用关键词
        const keywordIndex = (startIndex + i) % keywords.length;
        const keyword = keywords[keywordIndex];
        
        // 根据模型选择模式选择要使用的模型
        const selectedModel = this.selectModel(plan.contentConfig, i);
        
        this.currentProgress.currentTask = keyword;
        this.currentProgress.progress = Math.round(((i + 1) / plan.articlesPerRun) * 50);
        
        this.sendToRenderer('creation-task-progress', {
          planId: plan.id,
          current: i + 1,
          total: plan.articlesPerRun,
          keyword,
          keywordIndex: keywordIndex + 1,
          totalKeywords: keywords.length,
          selectedModel,
        });

        // 调用API生成内容（传入选中的模型）
        const result = await this.generateContent(plan, keyword, selectedModel);
        
        if (result.success) {
          this.currentProgress.createdCount++;
          this.currentProgress.results.push({
            title: result.title || '生成成功',
            status: 'success',
          });
          
          // 收集生成的文章
          if (result.draftId && result.title && result.content) {
            generatedArticles.push({
              draftId: result.draftId,
              title: result.title,
              content: result.content,
            });
          }
        } else {
          this.currentProgress.results.push({
            title: keyword,
            status: 'failed',
            error: result.error,
          });
        }
      }
      
      // 4. 根据分发策略创建发布任务
      if (plan.publishConfig.autoPublish && generatedArticles.length > 0) {
        await this.createPublishTasksWithDistribution(plan, generatedArticles);
      }

      // 5. 更新关键词进度索引（循环）
      const newKeywordIndex = (startIndex + plan.articlesPerRun) % keywords.length;

      // 计算下次执行时间
      const nextRunAt = this.calculateNextRunAt(plan);

      // 6. 更新计划统计
      this.currentProgress.status = 'completed';
      this.currentProgress.progress = 100;
      this.currentProgress.completedAt = new Date();

      // 通知渲染进程计划执行完成
      this.sendToRenderer('creation-plan-completed', {
        planId: plan.id,
        planName: plan.planName,
        createdCount: this.currentProgress.createdCount,
        totalCount: plan.articlesPerRun,
        completedAt: new Date().toISOString(),
        nextKeywordIndex: newKeywordIndex,
        nextRunAt: nextRunAt.toISOString(),
      });

      // 更新计划的运行时间、关键词进度和下次执行时间
      // 注意：totalCreated 只传入本次创建的数量，由 API 负责累加
      await this.updatePlanStats(plan.id, {
        totalCreated: this.currentProgress.createdCount,
        lastRunAt: new Date().toISOString(),
        lastKeywordIndex: newKeywordIndex,
        nextRunAt: nextRunAt.toISOString(),
      });

    } catch (error) {
      console.error(`[CreationScheduler] 执行计划失败: ${plan.id}`, error);

      this.currentProgress.status = 'failed';
      this.currentProgress.completedAt = new Date();

      // 失败时也更新 next_run_at，确保下次能正确调度
      const nextRunAt = this.calculateNextRunAt(plan);
      await this.updatePlanStats(plan.id, {
        nextRunAt: nextRunAt.toISOString(),
      });

      this.sendToRenderer('creation-plan-failed', {
        planId: plan.id,
        planName: plan.planName,
        error: error instanceof Error ? error.message : '执行失败',
      });
    }
  }

  /**
   * 获取计划的关键词
   */
  private async getKeywordsForPlan(plan: CreationPlan): Promise<string[]> {
    const { contentConfig } = plan;
    
    if (contentConfig.generateMethod === 'keyword-library' && contentConfig.keywordLibraryId) {
      // 从关键词库获取关键词
      return this.fetchKeywordsFromLibrary(contentConfig.keywordLibraryId);
    } else if (contentConfig.generateMethod === 'keyword' && contentConfig.keywords) {
      // 修复：按换行符分割字符串，每行一个关键词
      return contentConfig.keywords.split('\n').filter(k => k.trim());
    } else if (contentConfig.generateMethod === 'title' && contentConfig.keywords) {
      // 标题方式：每行一个标题作为关键词
      return contentConfig.keywords.split('\n').filter(k => k.trim());
    }
    
    return [];
  }

  /**
   * 从关键词库获取关键词（带重试）
   */
  private async fetchKeywordsFromLibrary(libraryId: string): Promise<string[]> {
    const result = await this.fetchWithRetry(`/api/keywords?id=${libraryId}`, {
      method: 'GET',
      timeout: 5000,
    });
    
    if (result.success && result.data) {
      return result.data.library?.keywords?.map((k: any) => k.word || k) || [];
    }
    
    return [];
  }

  /**
   * 调用API生成内容（带重试）
   * 发送完整的 GenerationConfig 给 API
   */
  private async generateContent(
    plan: CreationPlan, 
    keyword: string,
    selectedModel?: string
  ): Promise<{ success: boolean; draftId?: string; title?: string; content?: string; seoScore?: number; error?: string }> {
    const result = await this.fetchWithRetry('/api/content/generate', {
      method: 'POST',
      body: {
        businessId: plan.businessId,
        planId: plan.id,
        keyword, // 当前处理的关键词
        config: {
          ...plan.contentConfig,
          // 使用选中的模型覆盖配置中的模型
          model: selectedModel || plan.contentConfig.model,
        }, // 完整的 GenerationConfig
        ruleId: plan.contentConfig.ruleId,
      },
      timeout: 120000, // 2分钟超时（内容生成需要较长时间）
    });
    
    if (result.success && result.data) {
      return {
        success: result.data.success,
        draftId: result.data.data?.draftId,
        title: result.data.data?.title,
        content: result.data.data?.content,
        error: result.data.error,
      };
    }
    
    return { success: false, error: result.error };
  }

  /**
   * 根据类型分布随机选择文章类型
   */
  private selectArticleType(distribution: { what: number; how: number; top: number; normal: number }): string {
    const rand = Math.random() * 100;
    let cumulative = 0;

    if (distribution.what > 0) {
      cumulative += distribution.what;
      if (rand < cumulative) return 'what';
    }
    if (distribution.how > 0) {
      cumulative += distribution.how;
      if (rand < cumulative) return 'how';
    }
    if (distribution.top > 0) {
      cumulative += distribution.top;
      if (rand < cumulative) return 'top';
    }

    return 'normal';
  }

  /**
   * 根据模型选择模式获取要使用的模型
   * 
   * @param config 内容配置
   * @param articleIndex 文章索引（用于随机模式的一致性）
   * @returns 模型ID
   */
  private selectModel(
    config: {
      model: string;
      modelSelectionMode?: ModelSelectionMode;
      modelPool?: string[];
      modelWeights?: Record<string, number>;
    },
    articleIndex?: number
  ): string {
    const { model, modelSelectionMode, modelPool, modelWeights } = config;
    
    switch (modelSelectionMode) {
      case 'fixed':
        // 固定模式：始终使用指定模型
        return model;
        
      case 'random':
        // 随机模式：从模型池随机选择
        if (modelPool && modelPool.length > 0) {
          const randomIndex = articleIndex !== undefined
            ? (articleIndex + Math.floor(Math.random() * 1000)) % modelPool.length
            : Math.floor(Math.random() * modelPool.length);
          return modelPool[randomIndex];
        }
        return model;
        
      case 'weighted':
        // 加权模式：按权重随机选择
        if (modelWeights && Object.keys(modelWeights).length > 0) {
          const entries = Object.entries(modelWeights);
          const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
          let random = Math.random() * totalWeight;
          
          for (const [modelId, weight] of entries) {
            random -= weight;
            if (random <= 0) {
              return modelId;
            }
          }
          return entries[0][0];
        }
        return model;
        
      default:
        // 默认使用固定模式
        return model;
    }
  }

  /**
   * 计算发布时间（根据发布策略）
   * @param plan 创作计划
   * @param slotIndex 时间段索引（用于 distributed 策略的均衡分配）
   */
  private calculatePublishTime(plan: CreationPlan, slotIndex?: number): Date {
    const { publishStrategy, publishDelay, publishTimeSlots } = plan.publishConfig;
    const now = new Date();
    
    switch (publishStrategy) {
      case 'immediate':
        // 立即发布 + 可选延迟
        return new Date(now.getTime() + publishDelay * 60 * 1000);
        
      case 'scheduled':
        // 定时发布：使用第一个时间段
        const scheduledTime = publishTimeSlots[0] || '09:00';
        const [schedHour, schedMin] = scheduledTime.split(':').map(Number);
        const scheduled = new Date(now);
        scheduled.setHours(schedHour, schedMin, 0, 0);
        // 如果已过今天的时间，推到明天
        if (scheduled <= now) {
          scheduled.setDate(scheduled.getDate() + 1);
        }
        return scheduled;
        
      case 'distributed':
        // 分散发布：均衡轮换分配到时间段
        const slots = publishTimeSlots.length > 0 ? publishTimeSlots : ['09:00', '12:00', '18:00'];
        // 使用 slotIndex 进行均衡轮换，而非随机
        const targetSlotIndex = slotIndex !== undefined ? slotIndex % slots.length : 0;
        const targetSlot = slots[targetSlotIndex];
        const [targetHour, targetMin] = targetSlot.split(':').map(Number);
        const distributed = new Date(now);
        distributed.setHours(targetHour, targetMin, 0, 0);
        // 添加小幅度随机偏移（±15分钟），避免整点集中发布
        distributed.setMinutes(distributed.getMinutes() + Math.floor(Math.random() * 30) - 15);
        // 如果已过今天的时间，推到明天
        if (distributed <= now) {
          distributed.setDate(distributed.getDate() + 1);
        }
        return distributed;
        
      default:
        // 默认：延迟发布
        return new Date(now.getTime() + publishDelay * 60 * 1000);
    }
  }

  /**
   * 获取发布策略描述
   */
  private getPublishStrategyDesc(
    publishStrategy: string, 
    publishDelay: number, 
    timeSlots: string[]
  ): string {
    switch (publishStrategy) {
      case 'immediate':
        return publishDelay > 0 
          ? `延迟 ${publishDelay} 分钟后发布` 
          : '立即发布';
      case 'scheduled':
        return `定时发布，计划 ${timeSlots[0] || '09:00'} 执行`;
      case 'distributed':
        return `分散发布，时间段 ${timeSlots.join('、')} 轮换`;
      default:
        return '发布';
    }
  }

  /**
   * 创建发布任务（带重试）
   * @param plan 创作计划
   * @param content 文章内容
   * @param targetPlatforms 目标平台（可选，默认使用计划中的全部）
   * @param publishAt 发布时间（可选，默认根据策略计算）
   */
  private async createPublishTask(
    plan: CreationPlan, 
    content: { draftId: string; title: string; content: string },
    targetPlatforms?: Array<{ platform: string; accountId: string; accountName?: string }>,
    publishAt?: Date
  ): Promise<void> {
    // 使用传入的目标平台，或使用计划中的全部平台
    const platforms = targetPlatforms || plan.publishConfig.targetPlatforms;
    
    // 使用传入的发布时间，或根据策略计算
    const scheduledTime = publishAt || this.calculatePublishTime(plan);

    const result = await this.fetchWithRetry('/api/publish-tasks', {
      method: 'POST',
      body: {
        action: 'create',  // 必需：指定操作类型
        data: {            // 必需：包装为 data 对象
          businessId: plan.businessId,
          planId: plan.id,
          draftId: content.draftId,
          taskName: `自动发布: ${content.title}`,
          taskType: 'scheduled',
          title: content.title,
          content: content.content,
          targetPlatforms: platforms,
          scheduledAt: scheduledTime.toISOString(),
        },
      },
      timeout: 10000,
    });
    
    if (!result.success) {
      console.error('[CreationScheduler] 创建发布任务失败:', result.error);
    }
  }

  /**
   * 根据文章分发策略和发布时间策略创建发布任务
   * 
   * 策略组合逻辑：
   * - broadcast + distributed: 每篇文章发所有账号，时间轮换分配
   * - distribute + distributed: 每篇文章发一个账号，账号和时间同步轮换（推荐）
   * - broadcast + scheduled/immediate: 每篇文章发所有账号，统一时间
   * - distribute + scheduled/immediate: 每篇文章发一个账号，统一时间
   */
  private async createPublishTasksWithDistribution(
    plan: CreationPlan,
    articles: Array<{ draftId: string; title: string; content: string }>
  ): Promise<void> {
    const { articleDistribution, targetPlatforms, publishStrategy, publishDelay, publishTimeSlots } = plan.publishConfig;
    
    if (targetPlatforms.length === 0) {
      console.log('[CreationScheduler] 没有目标平台，跳过发布任务创建');
      return;
    }
    
    const timeSlots = publishTimeSlots.length > 0 ? publishTimeSlots : ['09:00', '12:00', '18:00'];
    const totalArticles = articles.length;
    
    console.log(`[CreationScheduler] 创建发布任务，分发策略: ${articleDistribution}, 发布策略: ${publishStrategy}, 文章数: ${totalArticles}, 账号数: ${targetPlatforms.length}, 时间段数: ${timeSlots.length}`);
    
    // 发送发布开始通知
    this.sendToRenderer('publish-task-progress', {
      planId: plan.id,
      taskId: '',
      current: 0,
      total: totalArticles,
      status: 'pending',
      message: `准备创建 ${totalArticles} 个发布任务...`,
    });
    
    let createdCount = 0;
    
    switch (articleDistribution) {
      case 'broadcast':
        // 广播模式：每篇文章发布到所有账号
        for (let i = 0; i < articles.length; i++) {
          // 时间分配：均衡轮换
          const slotIndex = i % timeSlots.length;
          const publishAt = this.calculatePublishTime(plan, slotIndex);
          
          // 发送发布进度通知
          this.sendToRenderer('publish-task-progress', {
            planId: plan.id,
            taskId: '',
            current: i + 1,
            total: totalArticles,
            articleTitle: articles[i].title,
            status: 'pending',
            message: `正在创建发布任务 ${i + 1}/${totalArticles}...`,
          });
          
          await this.createPublishTask(plan, articles[i], targetPlatforms, publishAt);
          createdCount++;
        }
        console.log(`[CreationScheduler] 广播模式：创建了 ${articles.length} 个发布任务，每个任务发到 ${targetPlatforms.length} 个账号，${this.getPublishStrategyDesc(publishStrategy, publishDelay, timeSlots)}`);
        break;
        
      case 'distribute':
        // 分发模式：每篇文章只发布到一个账号，账号和时间同步轮换
        for (let i = 0; i < articles.length; i++) {
          // 账号分配：均衡轮换
          const platformIndex = i % targetPlatforms.length;
          const platform = targetPlatforms[platformIndex];
          
          // 时间分配：同步均衡轮换（账号和时间一一对应）
          const slotIndex = i % timeSlots.length;
          const publishAt = this.calculatePublishTime(plan, slotIndex);
          
          // 发送发布进度通知
          this.sendToRenderer('publish-task-progress', {
            planId: plan.id,
            taskId: '',
            current: i + 1,
            total: totalArticles,
            articleTitle: articles[i].title,
            platform: platform.platform,
            status: 'pending',
            message: `正在创建发布任务 ${i + 1}/${totalArticles} -> ${platform.platform}...`,
          });
          
          await this.createPublishTask(plan, articles[i], [platform], publishAt);
          createdCount++;
        }
        console.log(`[CreationScheduler] 分发模式：创建了 ${articles.length} 个发布任务，账号均衡分配到 ${targetPlatforms.length} 个账号，${this.getPublishStrategyDesc(publishStrategy, publishDelay, timeSlots)}`);
        break;
        
      default:
        // 默认使用广播模式
        for (let i = 0; i < articles.length; i++) {
          const slotIndex = i % timeSlots.length;
          const publishAt = this.calculatePublishTime(plan, slotIndex);
          
          // 发送发布进度通知
          this.sendToRenderer('publish-task-progress', {
            planId: plan.id,
            taskId: '',
            current: i + 1,
            total: totalArticles,
            articleTitle: articles[i].title,
            status: 'pending',
            message: `正在创建发布任务 ${i + 1}/${totalArticles}...`,
          });
          
          await this.createPublishTask(plan, articles[i], targetPlatforms, publishAt);
          createdCount++;
        }
    }
    
    // 发送发布任务创建完成通知
    const publishMessage = publishStrategy === 'immediate' 
      ? `发布任务创建完成，正在等待发布调度器执行...`
      : publishStrategy === 'scheduled' || publishStrategy === 'distributed'
      ? `发布任务已安排至 ${timeSlots.join('、')} 执行`
      : `发布任务创建完成`;
    
    this.sendToRenderer('publish-task-progress', {
      planId: plan.id,
      taskId: '',
      current: createdCount,
      total: totalArticles,
      status: 'completed',
      message: publishMessage,
    });
    
    // 通知发布调度器重新调度（如果有新任务创建）
    if (createdCount > 0) {
      this.notifyPublishScheduler();
    }
  }

  /**
   * 通知发布调度器有新任务
   */
  private async notifyPublishScheduler(): Promise<void> {
    try {
      // 通过 API 获取发布调度器的重新调度接口
      const result = await this.fetchWithRetry('/api/publish-tasks?action=earliest');
      
      // 动态导入发布调度器模块并获取实例
      const { getPublishScheduler } = await import('./publish-scheduler');
      const publishScheduler = getPublishScheduler();
      
      if (publishScheduler) {
        console.log('[CreationScheduler] 通知发布调度器重新调度');
        // 调用发布调度器的重新调度方法
        if (result.success && result.data) {
          // 如果有最早的任务，立即重新调度
          publishScheduler.rescheduleAll();
        }
      }
    } catch (error) {
      console.warn('[CreationScheduler] 通知发布调度器失败:', error);
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRunAt(plan: CreationPlan): Date {
    const now = new Date();
    const [hour, minute] = plan.scheduledTime.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);
    
    switch (plan.frequency) {
      case 'hourly':
        // 每小时执行，下次是 1 小时后
        nextRun.setHours(nextRun.getHours() + 1);
        break;
        
      case 'daily':
        // 每天执行，下次是明天同一时间
        nextRun.setDate(nextRun.getDate() + 1);
        break;
        
      case 'weekly':
        // 每周执行，下次是 7 天后
        nextRun.setDate(nextRun.getDate() + 7);
        break;
        
      case 'monthly':
        // 每月执行，下次是下月同一天
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
        
      default:
        // 默认明天
        nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }

  /**
   * 更新计划统计（带重试）
   */
  private async updatePlanStats(
    planId: string, 
    stats: { totalCreated?: number; lastRunAt?: string; lastKeywordIndex?: number; nextRunAt?: string }
  ): Promise<void> {
    console.log('[CreationScheduler] 更新计划统计:', { planId, stats });
    
    const result = await this.fetchWithRetry(`/api/creation-plans/${planId}/stats`, {
      method: 'PATCH',
      body: stats,
      timeout: 5000,
    });
    
    if (!result.success) {
      console.error('[CreationScheduler] 更新计划统计失败:', result.error);
    } else {
      console.log('[CreationScheduler] 更新计划统计成功');
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
let schedulerInstance: CreationScheduler | null = null;

export function createCreationScheduler(
  mainWindow: BrowserWindow | null, 
  apiBaseUrl: string,
  checkIntervalMs?: number
): CreationScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new CreationScheduler(mainWindow, apiBaseUrl, checkIntervalMs);
  } else {
    schedulerInstance.setMainWindow(mainWindow);
  }
  return schedulerInstance;
}

export function getCreationScheduler(): CreationScheduler | null {
  return schedulerInstance;
}

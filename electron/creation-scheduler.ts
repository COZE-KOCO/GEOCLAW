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

import { BrowserWindow, ipcMain } from 'electron';
import * as https from 'https';
import * as http from 'http';

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
    personaId?: string;
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
    publishStrategy: string;
    publishTimeSlots: string[];
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
  private currentProgress: CreationProgress | null = null;
  private checkIntervalMs: number;

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
      console.log('[CreationScheduler] 调度器已在运行');
      return;
    }

    console.log(`[CreationScheduler] 启动调度器，检查间隔: ${this.checkIntervalMs}ms`);
    this.isRunning = true;

    // 立即执行一次检查
    this.checkAndExecute();

    // 定时检查
    this.intervalId = setInterval(() => {
      this.checkAndExecute();
    }, this.checkIntervalMs);

    // 发送调度器启动通知
    this.sendToRenderer('creation-scheduler-status', { 
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
    console.log('[CreationScheduler] 调度器已停止');

    this.sendToRenderer('creation-scheduler-status', { status: 'stopped' });
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean; currentProgress: CreationProgress | null } {
    return {
      isRunning: this.isRunning,
      currentProgress: this.currentProgress,
    };
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
   */
  private async checkAndExecute(): Promise<void> {
    if (!this.mainWindow) {
      console.log('[CreationScheduler] 主窗口不可用，跳过检查');
      return;
    }

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

      // 执行第一个计划
      const plan = pendingPlans[0];
      await this.executePlan(plan);

    } catch (error) {
      console.error('[CreationScheduler] 检查计划失败:', error);
      this.sendToRenderer('creation-scheduler-error', { 
        error: error instanceof Error ? error.message : '检查计划失败' 
      });
    }
  }

  /**
   * 从API获取待执行的创作计划
   */
  private async fetchPendingPlans(): Promise<CreationPlan[]> {
    return new Promise((resolve, reject) => {
      const url = new URL('/api/creation-plans/pending', this.apiBaseUrl);
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
            resolve(json.plans || []);
          } catch (e) {
            console.error('[CreationScheduler] 解析计划数据失败:', e);
            resolve([]);
          }
        });
      });

      req.on('error', (error) => {
        console.error('[CreationScheduler] 获取计划失败:', error);
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
   * 执行创作计划
   */
  private async executePlan(plan: CreationPlan): Promise<void> {
    console.log(`[CreationScheduler] 开始执行计划: ${plan.planName} (${plan.id})`);

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
      
      // 3. 为每个关键词创建创作任务
      for (let i = 0; i < plan.articlesPerRun; i++) {
        // 循环使用关键词
        const keywordIndex = (startIndex + i) % keywords.length;
        const keyword = keywords[keywordIndex];
        
        this.currentProgress.currentTask = keyword;
        this.currentProgress.progress = Math.round(((i + 1) / plan.articlesPerRun) * 50);
        
        this.sendToRenderer('creation-task-progress', {
          planId: plan.id,
          current: i + 1,
          total: plan.articlesPerRun,
          keyword,
          keywordIndex: keywordIndex + 1,
          totalKeywords: keywords.length,
        });

        // 调用API生成内容
        const result = await this.generateContent(plan, keyword);
        
        if (result.success) {
          this.currentProgress.createdCount++;
          this.currentProgress.results.push({
            title: result.title || '生成成功',
            status: 'success',
          });

          // 4. 如果配置了自动发布，创建发布任务
          if (plan.publishConfig.autoPublish && result.draftId && result.title && result.content) {
            await this.createPublishTask(plan, {
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

      // 5. 更新关键词进度索引（循环）
      const newKeywordIndex = (startIndex + plan.articlesPerRun) % keywords.length;

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
      });

      // 更新计划的运行时间和关键词进度
      await this.updatePlanStats(plan.id, {
        totalCreated: plan.stats.totalCreated + this.currentProgress.createdCount,
        lastRunAt: new Date().toISOString(),
        lastKeywordIndex: newKeywordIndex,
      });

    } catch (error) {
      console.error(`[CreationScheduler] 执行计划失败: ${plan.id}`, error);

      this.currentProgress.status = 'failed';
      this.currentProgress.completedAt = new Date();

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
   * 从关键词库获取关键词
   */
  private async fetchKeywordsFromLibrary(libraryId: string): Promise<string[]> {
    return new Promise((resolve) => {
      const url = new URL(`/api/keywords/${libraryId}`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const req = lib.request(url.toString(), (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.keywords?.map((k: any) => k.word || k) || []);
          } catch (e) {
            resolve([]);
          }
        });
      });

      req.on('error', () => resolve([]));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve([]);
      });
      req.end();
    });
  }

  /**
   * 调用API生成内容
   * 发送完整的 GenerationConfig 给 API
   */
  private async generateContent(
    plan: CreationPlan, 
    keyword: string
  ): Promise<{ success: boolean; draftId?: string; title?: string; content?: string; seoScore?: number; error?: string }> {
    return new Promise((resolve) => {
      const url = new URL('/api/content/generate', this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      // 发送完整的配置和关键词
      const body = JSON.stringify({
        businessId: plan.businessId,
        planId: plan.id,
        keyword, // 当前处理的关键词
        config: plan.contentConfig, // 完整的 GenerationConfig
        ruleId: plan.contentConfig.ruleId,
      });

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              success: json.success,
              draftId: json.data?.draftId,
              title: json.data?.title,
              content: json.data?.content,
              error: json.error,
            });
          } catch (e) {
            resolve({ success: false, error: '解析响应失败' });
          }
        });
      });

      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      req.setTimeout(120000, () => {  // 2分钟超时
        req.destroy();
        resolve({ success: false, error: '生成超时' });
      });

      req.write(body);
      req.end();
    });
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
   * 创建发布任务
   */
  private async createPublishTask(
    plan: CreationPlan, 
    content: { draftId: string; title: string; content: string }
  ): Promise<void> {
    return new Promise((resolve) => {
      const url = new URL('/api/publish-tasks', this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      // 计算发布时间
      const publishAt = new Date(Date.now() + plan.publishConfig.publishDelay * 60 * 1000);

      const body = JSON.stringify({
        businessId: plan.businessId,
        planId: plan.id,
        draftId: content.draftId,
        taskName: `自动发布: ${content.title}`,
        taskType: 'scheduled',
        title: content.title,
        content: content.content,
        targetPlatforms: plan.publishConfig.targetPlatforms,
        scheduledAt: publishAt.toISOString(),
      });

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve();
        });
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
   * 更新计划统计
   */
  private async updatePlanStats(
    planId: string, 
    stats: { totalCreated?: number; lastRunAt?: string; lastKeywordIndex?: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      const url = new URL(`/api/creation-plans/${planId}/stats`, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const body = JSON.stringify(stats);

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve());
      });

      req.on('error', () => resolve());
      req.setTimeout(5000, () => {
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

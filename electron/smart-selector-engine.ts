/**
 * 智能选择器匹配引擎
 * 
 * 功能：
 * 1. 从 API 获取平台选择器配置
 * 2. 按优先级和成功率智能排序选择器
 * 3. 自动降级尝试备选选择器
 * 4. 记录执行结果更新成功率统计
 */

import { BrowserWindow } from 'electron';

// 选择器项
interface SelectorItem {
  selector: string;
  priority: number;
  description: string;
  successRate: number;
  totalAttempts: number;
  successfulAttempts: number;
  lastSuccess?: string;
  lastFailure?: string;
  isEnabled: boolean;
}

// 选择器配置
interface SelectorConfig {
  titleInput: SelectorItem[];
  contentEditor: SelectorItem[];
  imageUpload: SelectorItem[];
  publishButton: SelectorItem[];
  successIndicator: SelectorItem[];
  tagInput?: SelectorItem[];
  coverUpload?: SelectorItem[];
}

// 执行设置
interface ExecutionSettings {
  waitForImageUpload: boolean;
  imageUploadWait: number;
  publishWait: number;
  pageLoadWait: number;
  retryCount: number;
  retryDelay: number;
  uploadedImageUrlSelector?: string;
}

// 平台配置
interface PlatformConfig {
  id: string;
  platform: string;
  platformName: string;
  version: string;
  publishUrl: string;
  selectors: SelectorConfig;
  settings: ExecutionSettings;
  prepareScript?: string;
  verifyScript?: string;
}

// API 响应
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 匹配结果
interface MatchResult {
  success: boolean;
  selector: string;
  element?: any;
  executionTime: number;
  error?: string;
}

// 匹配选项
interface MatchOptions {
  preferHighSuccessRate: boolean;
  skipDisabled: boolean;
  maxAttempts: number;
  recordResult: boolean;
}

const DEFAULT_OPTIONS: MatchOptions = {
  preferHighSuccessRate: true,
  skipDisabled: true,
  maxAttempts: 5,
  recordResult: true,
};

export class SmartSelectorEngine {
  private apiBaseUrl: string;
  private configCache: Map<string, PlatformConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * 获取平台配置
   */
  async getConfig(platform: string): Promise<PlatformConfig | null> {
    // 检查缓存
    const cached = this.configCache.get(platform);
    const expiry = this.cacheExpiry.get(platform);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // 从 API 获取
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/selectors/${platform}?default=true`);
      const result = await response.json() as ApiResponse<PlatformConfig>;

      if (result.success && result.data) {
        this.configCache.set(platform, result.data);
        this.cacheExpiry.set(platform, Date.now() + this.CACHE_TTL);
        return result.data;
      }

      console.warn(`[SmartSelector] 未找到平台 ${platform} 的配置，使用内置配置`);
      return this.getBuiltInConfig(platform);
    } catch (error) {
      console.error(`[SmartSelector] 获取配置失败:`, error);
      return this.getBuiltInConfig(platform);
    }
  }

  /**
   * 获取内置配置（降级方案）
   */
  private getBuiltInConfig(platform: string): PlatformConfig | null {
    const builtInConfigs: Record<string, PlatformConfig> = {
      toutiao: {
        id: 'built-in-toutiao',
        platform: 'toutiao',
        platformName: '今日头条',
        version: 'built-in',
        publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
        selectors: {
          titleInput: [
            { selector: '#title', priority: 1, description: 'ID选择器', successRate: 0.98, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
            { selector: 'input[name="title"]', priority: 2, description: 'name属性', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
            { selector: 'input[placeholder*="标题"]', priority: 3, description: 'placeholder', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          contentEditor: [
            { selector: '.public-DraftEditor-content', priority: 1, description: 'Draft.js编辑器', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
            { selector: '[contenteditable="true"][class*="editor"]', priority: 2, description: '可编辑区域', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          publishButton: [
            { selector: '[data-e2e="publish"]', priority: 1, description: 'E2E选择器', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
            { selector: 'button[class*="publish"]', priority: 2, description: 'class包含publish', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          successIndicator: [
            { selector: '.toast-success', priority: 1, description: '成功Toast', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          imageUpload: [
            { selector: '.image-upload input[type="file"]', priority: 1, description: '图片上传', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
        },
        settings: {
          waitForImageUpload: true,
          imageUploadWait: 5000,
          publishWait: 5000,
          pageLoadWait: 3000,
          retryCount: 3,
          retryDelay: 1000,
        },
        prepareScript: `
          await new Promise(r => setTimeout(r, 3000));
          const closeBtns = document.querySelectorAll('.close-btn, .modal-close, [class*="close"]');
          closeBtns.forEach(btn => { try { btn.click(); } catch(e) {} });
        `,
      },
      xiaohongshu: {
        id: 'built-in-xiaohongshu',
        platform: 'xiaohongshu',
        platformName: '小红书',
        version: 'built-in',
        publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
        selectors: {
          titleInput: [
            { selector: '.c-input__inner input', priority: 1, description: '组件库输入框', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
            { selector: 'input[placeholder*="填写标题"]', priority: 2, description: 'placeholder', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          contentEditor: [
            { selector: '#post-textarea', priority: 1, description: '正文输入框', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
            { selector: 'textarea[placeholder*="填写正文"]', priority: 2, description: 'placeholder', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          publishButton: [
            { selector: '.publishBtn', priority: 1, description: '发布按钮', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          successIndicator: [
            { selector: '.publish-success', priority: 1, description: '成功标识', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
          imageUpload: [
            { selector: '.upload-btn input[type="file"]', priority: 1, description: '上传按钮', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
          ],
        },
        settings: {
          waitForImageUpload: true,
          imageUploadWait: 5000,
          publishWait: 5000,
          pageLoadWait: 3000,
          retryCount: 3,
          retryDelay: 1000,
        },
      },
    };

    return builtInConfigs[platform] || null;
  }

  /**
   * 智能匹配元素
   * 按优先级和成功率排序选择器，自动降级尝试
   */
  async findElement(
    window: BrowserWindow,
    targetType: keyof SelectorConfig,
    config: PlatformConfig,
    options: Partial<MatchOptions> = {}
  ): Promise<MatchResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const items = config.selectors[targetType];

    if (!items || items.length === 0) {
      return {
        success: false,
        selector: '',
        executionTime: 0,
        error: `没有配置 ${targetType} 的选择器`,
      };
    }

    // 排序选择器：综合考虑优先级和成功率
    const sortedItems = this.sortSelectors(items, opts.preferHighSuccessRate);
    
    console.log(`[SmartSelector] ${targetType} 选择器排序结果:`);
    sortedItems.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.selector} (优先级:${item.priority}, 成功率:${(item.successRate * 100).toFixed(0)}%)`);
    });

    const startTime = Date.now();
    let attempts = 0;

    for (const item of sortedItems) {
      if (opts.skipDisabled && !item.isEnabled) {
        continue;
      }

      if (attempts >= opts.maxAttempts) {
        break;
      }

      attempts++;
      console.log(`[SmartSelector] 尝试选择器 #${attempts}: ${item.selector}`);

      try {
        const script = this.buildMatchScript(item.selector, targetType);
        const result = await window.webContents.executeJavaScript(script);

        if (result.found) {
          const executionTime = Date.now() - startTime;
          console.log(`[SmartSelector] ✅ 匹配成功: ${item.selector} (耗时:${executionTime}ms)`);

          // 记录成功
          if (opts.recordResult) {
            this.recordResult(config.id, targetType, item.selector, true, executionTime);
          }

          return {
            success: true,
            selector: item.selector,
            element: result.elementInfo,
            executionTime,
          };
        } else {
          console.log(`[SmartSelector] ❌ 未匹配: ${item.selector}`);
        }
      } catch (error: any) {
        console.log(`[SmartSelector] ❌ 匹配异常: ${item.selector} - ${error.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    
    // 记录失败
    if (opts.recordResult && sortedItems.length > 0) {
      this.recordResult(config.id, targetType, sortedItems[0].selector, false, executionTime);
    }

    return {
      success: false,
      selector: sortedItems[0]?.selector || '',
      executionTime,
      error: `所有选择器都未能匹配到元素`,
    };
  }

  /**
   * 排序选择器
   */
  private sortSelectors(items: SelectorItem[], preferHighSuccessRate: boolean): SelectorItem[] {
    return [...items].sort((a, b) => {
      // 跳过禁用的
      if (!a.isEnabled && b.isEnabled) return 1;
      if (a.isEnabled && !b.isEnabled) return -1;

      // 综合评分：优先级权重 60%，成功率权重 40%
      const scoreA = a.priority * 0.6 + (1 - a.successRate) * 0.4;
      const scoreB = b.priority * 0.6 + (1 - b.successRate) * 0.4;

      // 如果优先考虑成功率，调整权重
      const finalScoreA = preferHighSuccessRate 
        ? a.priority * 0.4 + (1 - a.successRate) * 0.6
        : scoreA;
      const finalScoreB = preferHighSuccessRate 
        ? b.priority * 0.4 + (1 - b.successRate) * 0.6
        : scoreB;

      return finalScoreA - finalScoreB;
    });
  }

  /**
   * 构建匹配脚本
   */
  private buildMatchScript(selector: string, targetType: string): string {
    return `
      (function() {
        const selector = ${JSON.stringify(selector)};
        const targetType = ${JSON.stringify(targetType)};
        
        try {
          const el = document.querySelector(selector);
          
          if (!el) {
            return { found: false };
          }
          
          // 检查元素可见性
          const isVisible = el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0;
          
          // 检查元素类型
          let typeMatch = true;
          if (targetType === 'titleInput') {
            typeMatch = el.tagName === 'INPUT';
          } else if (targetType === 'contentEditor') {
            typeMatch = el.tagName === 'TEXTAREA' || el.contentEditable === 'true';
          } else if (targetType === 'publishButton') {
            typeMatch = el.tagName === 'BUTTON' || el.tagName === 'A' || el.type === 'submit';
          }
          
          if (!isVisible || !typeMatch) {
            return { found: false };
          }
          
          // 收集元素信息
          const elementInfo = {
            tagName: el.tagName.toLowerCase(),
            type: el.type || undefined,
            placeholder: el.placeholder || undefined,
            value: el.value || undefined,
            textContent: el.textContent?.substring(0, 50) || undefined,
          };
          
          return { found: true, elementInfo };
          
        } catch (e) {
          return { found: false, error: e.message };
        }
      })();
    `;
  }

  /**
   * 记录执行结果
   */
  private async recordResult(
    configId: string,
    targetType: string,
    selector: string,
    success: boolean,
    executionTime: number
  ): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/api/selectors/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId,
          platform: targetType,
          targetType,
          selector,
          success,
          found: true,
          filled: success,
          verified: success,
          executionTime,
        }),
      });
    } catch (error) {
      console.error('[SmartSelector] 记录结果失败:', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache(platform?: string): void {
    if (platform) {
      this.configCache.delete(platform);
      this.cacheExpiry.delete(platform);
    } else {
      this.configCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

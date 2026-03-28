/**
 * 自动化发布引擎
 * 使用 Electron BrowserWindow 实现全自动发布
 * 
 * 支持的功能：
 * - 自动填写标题、内容、标签
 * - 自动上传图片（通过 fetch 远程图片 + 注入 File 对象）
 * - 自动点击发布按钮
 * - 发布结果验证
 */

import { BrowserWindow, session, app, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// 发布内容接口
export interface PublishContent {
  title: string;
  content: string;
  html?: string; // HTML格式的内容（用于富文本编辑器）
  images: string[];
  tags?: string[];
  coverImage?: string;
  videoPath?: string; // 视频路径（用于抖音等视频平台）
}

// 发布结果
export interface PublishResult {
  platform: string;
  accountId: string;
  accountName: string;
  status: 'success' | 'failed' | 'pending';
  publishedUrl?: string;
  publishedAt?: string;
  error?: string;
}

// 账号信息
export interface AccountInfo {
  id: string;
  platform: string;
  displayName: string;
  cookies: Record<string, string>;
  metadata?: Record<string, any>;
}

// 平台选择器配置
export interface PlatformSelectors {
  publishUrl: string;
  titleInput: string | string[];
  contentEditor: string | string[];
  imageUpload: string | string[];
  publishButton: string | string[];
  successIndicator: string | string[];
  tagInput?: string | string[];
  coverUpload?: string | string[];
  [key: string]: string | string[] | undefined;
}

// 平台配置
interface PlatformConfig {
  name: string;
  publishUrl: string;
  selectors: PlatformSelectors;
  prepareScript?: string;
  verifyScript?: string;
  waitForImageUpload?: boolean;
  imageUploadWait?: number;
  publishWait?: number;
  // 图片上传后的 URL 获取选择器
  uploadedImageUrlSelector?: string;
  // 完整的动态选择器配置（包含 inputType 信息）
  dynamicSelectors?: DynamicSelectorConfig;
}

// 发布阶段枚举
export enum PublishStage {
  INITIALIZING = 'initializing',
  LOADING_PAGE = 'loading_page',
  EXECUTING_PREPARE = 'executing_prepare',
  UPLOADING_IMAGES = 'uploading_images',
  FILLING_TITLE = 'filling_title',
  FILLING_CONTENT = 'filling_content',
  FILLING_TAGS = 'filling_tags',
  EXECUTING_CLICKS = 'executing_clicks',
  CLICKING_PUBLISH = 'clicking_publish',
  WAITING_RESPONSE = 'waiting_response',
  VERIFYING_RESULT = 'verifying_result',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 选择器操作类型
export type SelectorInputType = 
  | 'text'      // 文本输入（标题、内容等）
  | 'click'     // 点击操作（发布按钮等）
  | 'upload'    // 文件上传（封面、图片等）
  | 'triggered-upload'  // 触发式上传（点击触发器→弹窗→上传）
  | 'select'    // 下拉选择（分区、分类等）
  | 'multi-select'; // 多选（标签等）

// 选择器项接口（与前端保持一致）
export interface SelectorItem {
  selector: string;
  priority: number;
  description: string;
  successRate: number;
  totalAttempts: number;
  successfulAttempts: number;
  isEnabled: boolean;
  inputType?: SelectorInputType;  // 选择器操作类型
}

// 动态选择器配置
export interface DynamicSelectorConfig {
  [key: string]: SelectorItem[];
}

// 从API获取的平台配置
export interface ApiPlatformConfig {
  platform: string;
  platformName: string;
  publishUrl: string;
  selectorTypes: string[];
  selectors: DynamicSelectorConfig;
  settings: Record<string, any>;
  prepareScript?: string;
}

// 各平台配置（本地兜底配置）
const PLATFORM_PUBLISH_CONFIG: Record<string, PlatformConfig> = {
  xiaohongshu: {
    name: '小红书',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    selectors: {
      publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
      titleInput: ['.c-input__inner input', 'input[placeholder*="填写标题"]', '#title-input', 'input[maxlength="20"]'],
      contentEditor: ['#post-textarea', 'textarea[placeholder*="填写正文"]', '.c-textarea__inner textarea', '#content-input'],
      imageUpload: ['.upload-btn input[type="file"]', 'input[type="file"]', '.upload-pic-input'],
      publishButton: ['.publishBtn', '.publish-btn', 'button[class*="publish"]', '.btn-publish'],
      successIndicator: ['.publish-success', '.success-tip', '.result-success', '[class*="success"]', '.toast-content'],
      tagInput: ['.tag-input input', 'input[placeholder*="标签"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 5000,
    uploadedImageUrlSelector: '.upload-item img, .preview-img img, [class*="image"] img',
    prepareScript: `
      // 等待页面加载
      await new Promise(r => setTimeout(r, 3000));
      
      // 关闭可能的弹窗
      const closeBtns = document.querySelectorAll('.close-btn, .modal-close, [class*="close"], .dialog-close');
      closeBtns.forEach(btn => { try { btn.click(); } catch(e) {} });
    `,
  },
  
  weibo: {
    name: '微博',
    publishUrl: 'https://weibo.com',
    selectors: {
      publishUrl: 'https://weibo.com',
      titleInput: [], // 微博没有标题
      contentEditor: ['.W_input', 'textarea[name="content"]', '#publisher_content', '.textarea-input'],
      imageUpload: ['.pic_input input[type="file"]', 'input[type="file"][accept*="image"]', '.upload-pic input'],
      publishButton: ['.W_btn_a', '.publish-btn', 'button[action-type="post"]', '.btn-send'],
      successIndicator: ['.send-success', '.W_layer_success', '[class*="success"]', '.toast-success'],
    },
    waitForImageUpload: true,
    imageUploadWait: 3000,
    publishWait: 3000,
    uploadedImageUrlSelector: '.pic_list img, .upload-img img',
    prepareScript: `
      // 等待页面加载
      await new Promise(r => setTimeout(r, 2000));
      
      // 点击发微博按钮（如果有）
      const postBtn = document.querySelector('[action-type="post"]', '.W_btn_a');
      if (postBtn) {
        // 可能需要先点击打开发布框
      }
    `,
  },
  
  bilibili: {
    name: 'B站',
    publishUrl: 'https://member.bilibili.com/platform/upload/text',
    selectors: {
      publishUrl: 'https://member.bilibili.com/platform/upload/text',
      titleInput: ['#title-input', 'input[placeholder*="标题"]', '.title-input input', 'input[name="title"]'],
      contentEditor: ['#content-editor', '.editor-content', 'textarea[placeholder*="内容"]', '.article-editor'],
      imageUpload: ['.image-upload input[type="file"]', 'input[type="file"]', '.upload-btn input'],
      publishButton: ['.submit-btn', '.publish-btn', 'button[class*="submit"]', '.btn-submit'],
      successIndicator: ['.success-tip', '.result-success', '[class*="success"]', '.toast-success'],
      coverUpload: ['.cover-upload input[type="file"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 5000,
    uploadedImageUrlSelector: '.image-preview img, .uploaded-img img',
  },
  
  toutiao: {
    name: '今日头条',
    // 直接使用文章发布页，而不是入口选择页
    publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
    selectors: {
      publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
      // 标题输入框 - 按优先级排列，更精确的在前
      titleInput: [
        '#title',                                    // ID 选择器，最精确
        'input[name="title"]',                       // name 属性
        'input[placeholder*="文章标题"]',             // placeholder 包含 "文章标题"
        'input[placeholder*="标题"]',                 // placeholder 包含 "标题"
        '.title-input input',                        // class 包裹
        '[class*="title"] input[type="text"]',       // class 包含 title 的文本输入框
      ],
      // 内容编辑器 - 头条使用 Slate.js 富文本编辑器
      contentEditor: [
        '.public-DraftEditor-content',              // Draft.js 编辑器
        '[contenteditable="true"][data-lexical-editor]', // Lexical 编辑器
        '[contenteditable="true"][class*="editor"]', // class 包含 editor 的可编辑区域
        '.slate-editor [contenteditable="true"]',   // Slate 编辑器
        '#content',                                 // ID 选择器
        '[contenteditable="true"]',                 // 通用可编辑区域（最后备选）
      ],
      imageUpload: [
        // 头条编辑器使用字节跳动组件，file input 通常在点击图片按钮后出现
        '[class*="ImageUpload"] input[type="file"]',
        '[class*="image-upload"] input[type="file"]',
        '[class*="upload-image"] input[type="file"]',
        '.byte-upload-input input[type="file"]',
        '[class*="byte"] input[type="file"][accept*="image"]',
        // 编辑器内的图片上传
        '.editor-toolbar input[type="file"]',
        '[class*="toolbar"] input[type="file"]',
        // 通用备选
        '.image-upload input[type="file"]',
        'input[type="file"][accept*="image"]',
        'input[type="file"]'
      ],
      // 发布按钮
      publishButton: [
        '[data-e2e="publish"]',                     // E2E 测试选择器
        'button[class*="publish"]',                 // class 包含 publish
        'button:contains("发布")',                  // 文本包含 "发布"
        '.publish-btn',
        '.submit-btn',
        'button[type="submit"]',
      ],
      // 成功标识
      successIndicator: [
        '.toast-success',                           // 成功 Toast
        '.ant-message-success',                     // Ant Design 成功消息
        '[class*="success-tip"]',                   // 成功提示
        '[class*="publish-success"]',               // 发布成功
      ],
      coverUpload: ['.cover-upload input[type="file"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 5000,
    uploadedImageUrlSelector: '.image-item img, .upload-preview img',
    prepareScript: `
      // 等待页面加载
      await new Promise(r => setTimeout(r, 3000));
      
      console.log('[AutoPublisher] 头条 prepareScript 开始执行');
      
      // 关闭可能的弹窗
      const closeBtns = document.querySelectorAll('.close-btn, .modal-close, [class*="close"], .ant-modal-close');
      closeBtns.forEach(btn => { 
        try { 
          btn.click(); 
          console.log('[AutoPublisher] 关闭弹窗按钮');
        } catch(e) {} 
      });
      
      // 等待编辑器加载完成
      await new Promise(r => setTimeout(r, 2000));
      
      // 打印页面状态用于调试 - 详细版本
      const titleInput = document.querySelector('#title, input[placeholder*="标题"]');
      const contentEditor = document.querySelector('[contenteditable="true"]');
      console.log('[AutoPublisher] 标题输入框存在:', !!titleInput, '内容编辑器存在:', !!contentEditor);
      
      // 打印页面上所有 input 元素（帮助调试）
      const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
      console.log('[AutoPublisher] 页面上找到', allInputs.length, '个文本输入框');
      allInputs.forEach((input, index) => {
        const el = input as HTMLInputElement;
        console.log('[AutoPublisher] Input', index + 1, '- id:', el.id, 'name:', el.name, 'placeholder:', el.placeholder, 'class:', el.className.substring(0, 50));
      });
      
      // 打印页面上所有可编辑元素
      const editables = document.querySelectorAll('[contenteditable="true"]');
      console.log('[AutoPublisher] 页面上找到', editables.length, '个可编辑元素');
      
      // 检查是否有 iframe
      const iframes = document.querySelectorAll('iframe');
      console.log('[AutoPublisher] 页面上找到', iframes.length, '个 iframe');
      
      console.log('[AutoPublisher] 头条 prepareScript 执行完成');
    `,
  },
  
  douyin: {
    name: '抖音',
    publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    selectors: {
      publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
      titleInput: [], // 抖音视频没有标题
      contentEditor: ['.editor-input textarea', 'textarea[placeholder*="描述"]', '.content-input', '[contenteditable="true"]'],
      imageUpload: [], // 抖音上传视频
      publishButton: ['.publish-btn', '.submit-btn', 'button[class*="publish"]', '.btn-submit'],
      successIndicator: ['.success-tip', '.result-success', '[class*="success"]', '.toast-success'],
    },
    waitForImageUpload: false,
    publishWait: 5000,
    prepareScript: `
      // 等待页面加载
      await new Promise(r => setTimeout(r, 3000));
      
      // 抖音需要上传视频，这里暂时不支持
      console.log('[AutoPublisher] 抖音需要上传视频文件');
    `,
  },
};

export class AutoPublisher {
  private mainWindow: BrowserWindow;
  private publishWindows: Map<string, BrowserWindow> = new Map();
  private apiBaseUrl: string;
  private configCache: Map<string, ApiPlatformConfig> = new Map();
  private progressCallback?: (platform: string, stage: PublishStage, message: string, progress?: number) => void;

  constructor(mainWindow: BrowserWindow, apiBaseUrl: string) {
    this.mainWindow = mainWindow;
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: (platform: string, stage: PublishStage, message: string, progress?: number) => void) {
    this.progressCallback = callback;
  }

  /**
   * 发送进度通知
   */
  private notifyProgress(platform: string, stage: PublishStage, message: string, progress?: number) {
    console.log(`[AutoPublisher] [${platform}] ${stage}: ${message}${progress ? ` (${progress}%)` : ''}`);
    if (this.progressCallback) {
      this.progressCallback(platform, stage, message, progress);
    }
    // 同时发送到渲染进程
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('publish-progress', {
        platform,
        stage,
        message,
        progress,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 从API获取平台配置
   */
  private async getPlatformConfig(platform: string): Promise<PlatformConfig | null> {
    // 检查缓存
    const cached = this.configCache.get(platform);
    if (cached) {
      return this.apiConfigToPlatformConfig(cached);
    }

    try {
      // 从API获取配置
      const response = await fetch(`${this.apiBaseUrl}/api/selectors/${platform}?default=true`);
      const result = await response.json() as { success: boolean; data?: ApiPlatformConfig };

      if (result.success && result.data) {
        this.configCache.set(platform, result.data);
        return this.apiConfigToPlatformConfig(result.data);
      }

      // API获取失败，使用本地兜底配置
      console.log(`[AutoPublisher] API获取配置失败，使用本地配置: ${platform}`);
      return PLATFORM_PUBLISH_CONFIG[platform] || null;
    } catch (error) {
      console.error(`[AutoPublisher] 获取平台配置失败:`, error);
      // 使用本地兜底配置
      return PLATFORM_PUBLISH_CONFIG[platform] || null;
    }
  }

  /**
   * 将API配置转换为本地配置格式
   */
  private apiConfigToPlatformConfig(apiConfig: ApiPlatformConfig): PlatformConfig {
    // 将动态选择器转换为旧格式
    const selectors: PlatformSelectors = {
      publishUrl: apiConfig.publishUrl,
      titleInput: this.extractSelectors(apiConfig.selectors, 'titleInput'),
      contentEditor: this.extractSelectors(apiConfig.selectors, 'contentEditor'),
      imageUpload: this.extractSelectors(apiConfig.selectors, 'imageUpload'),
      publishButton: this.extractSelectors(apiConfig.selectors, 'publishButton'),
      successIndicator: this.extractSelectors(apiConfig.selectors, 'successIndicator'),
      tagInput: this.extractSelectors(apiConfig.selectors, 'tagInput'),
      coverUpload: this.extractSelectors(apiConfig.selectors, 'coverUpload'),
    };

    // 添加其他动态选择器
    for (const [key, items] of Object.entries(apiConfig.selectors)) {
      if (!selectors[key] && items && items.length > 0) {
        selectors[key] = items.filter(i => i.isEnabled).map(i => i.selector);
      }
    }

    return {
      name: apiConfig.platformName,
      publishUrl: apiConfig.publishUrl,
      selectors,
      prepareScript: apiConfig.prepareScript,
      waitForImageUpload: apiConfig.settings?.waitForImageUpload ?? true,
      imageUploadWait: apiConfig.settings?.imageUploadWait ?? 5000,
      publishWait: apiConfig.settings?.publishWait ?? 5000,
      uploadedImageUrlSelector: apiConfig.settings?.uploadedImageUrlSelector,
      // 保存完整的动态选择器配置
      dynamicSelectors: apiConfig.selectors,
    };
  }

  /**
   * 从动态选择器配置中提取选择器字符串数组
   */
  private extractSelectors(selectors: DynamicSelectorConfig, key: string): string[] {
    const items = selectors[key];
    if (!items || !Array.isArray(items)) return [];
    return items
      .filter(item => item.isEnabled)
      .sort((a, b) => a.priority - b.priority)
      .map(item => item.selector);
  }

  /**
   * 清除配置缓存
   */
  clearConfigCache(platform?: string) {
    if (platform) {
      this.configCache.delete(platform);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * 执行自动发布
   */
  async publish(
    platform: string,
    account: AccountInfo,
    content: PublishContent
  ): Promise<PublishResult> {
    // 从API获取平台配置（支持动态选择器）
    const config = await this.getPlatformConfig(platform);
    if (!config) {
      this.notifyProgress(platform, PublishStage.FAILED, `不支持的平台: ${platform}`);
      return {
        platform,
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: `不支持的平台: ${platform}`,
      };
    }

    console.log(`[AutoPublisher] 开始发布到 ${config.name}...`);
    this.notifyProgress(platform, PublishStage.INITIALIZING, '正在初始化发布环境...', 0);

    try {
      // 创建发布窗口
      this.notifyProgress(platform, PublishStage.LOADING_PAGE, '正在创建发布窗口...', 5);
      const publishWindow = await this.createPublishWindow(platform, account);
      this.publishWindows.set(platform, publishWindow);

      // 加载发布页面
      this.notifyProgress(platform, PublishStage.LOADING_PAGE, `正在加载发布页面...`, 10);
      await publishWindow.loadURL(config.publishUrl);
      console.log(`[AutoPublisher] 已加载发布页面: ${config.publishUrl}`);

      // 等待页面加载
      await this.waitForPageLoad(publishWindow);
      this.notifyProgress(platform, PublishStage.LOADING_PAGE, '页面加载完成', 20);

      // 执行准备脚本
      if (config.prepareScript) {
        this.notifyProgress(platform, PublishStage.EXECUTING_PREPARE, '正在执行页面准备脚本...', 25);
        // 将脚本包装为异步 IIFE，确保 await 有效
        const wrappedScript = `(async () => { ${config.prepareScript} })()`;
        await publishWindow.webContents.executeJavaScript(wrappedScript);
      }

      // 处理内容中的图片 URL
      let processedContent = content.content;
      const imageUrls = content.images || [];
      
      // 从内容中提取图片 URL（Markdown 格式）
      const markdownImages = this.extractMarkdownImages(content.content);
      const allImages = [...new Set([...imageUrls, ...markdownImages.map(m => m.url)])];
      
      // 上传图片并获取 URL 映射
      let imageUrlMap: Record<string, string> = {};
      if (allImages.length > 0) {
        this.notifyProgress(platform, PublishStage.UPLOADING_IMAGES, `正在上传 ${allImages.length} 张图片...`, 30);
        const selectors = config.selectors.imageUpload;
        const selectorArray: string[] = Array.isArray(selectors) ? selectors : (selectors ? [selectors] : []);
        
        if (selectorArray.length > 0) {
          imageUrlMap = await this.uploadImagesFromUrl(publishWindow, config, allImages);
          
          // 替换内容中的图片 URL
          for (const [oldUrl, newUrl] of Object.entries(imageUrlMap)) {
            processedContent = processedContent.replace(
              new RegExp(this.escapeRegExp(oldUrl), 'g'),
              newUrl
            );
          }
        }
        this.notifyProgress(platform, PublishStage.UPLOADING_IMAGES, '图片上传完成', 40);
      }

      // 填写标题
      if (content.title && config.selectors.titleInput) {
        this.notifyProgress(platform, PublishStage.FILLING_TITLE, '正在填写标题...', 45);
        const titleSelectors = Array.isArray(config.selectors.titleInput) 
          ? config.selectors.titleInput 
          : [config.selectors.titleInput];
        if (titleSelectors.length > 0) {
          const titleFilled = await this.fillElement(publishWindow, titleSelectors, content.title);
          console.log(`[AutoPublisher] 标题填写结果: ${titleFilled ? '成功' : '失败'}`);
          
          // 验证标题是否填写成功
          await new Promise(r => setTimeout(r, 500));
          const titleVerified = await this.verifyElementValue(publishWindow, titleSelectors, content.title);
          if (!titleVerified) {
            console.error(`[AutoPublisher] 标题填写验证失败`);
          }
        }
      }

      // 填写内容（使用处理后的内容）
      if (processedContent && config.selectors.contentEditor) {
        this.notifyProgress(platform, PublishStage.FILLING_CONTENT, '正在填写内容...', 55);
        const contentSelectors = Array.isArray(config.selectors.contentEditor) 
          ? config.selectors.contentEditor 
          : [config.selectors.contentEditor];
        if (contentSelectors.length > 0) {
          // 将 Markdown 内容转换为 HTML（如果是富文本编辑器）
          const contentToFill = content.html || this.markdownToHtml(processedContent);
          const contentFilled = await this.fillElement(publishWindow, contentSelectors, contentToFill);
          console.log(`[AutoPublisher] 内容填写结果: ${contentFilled ? '成功' : '失败'}`);
        }
      }

      // 填写标签
      if (content.tags && content.tags.length > 0 && config.selectors.tagInput) {
        this.notifyProgress(platform, PublishStage.FILLING_TAGS, '正在填写标签...', 65);
        const tagSelectors = Array.isArray(config.selectors.tagInput) 
          ? config.selectors.tagInput 
          : [config.selectors.tagInput];
        await this.fillElement(publishWindow, tagSelectors, content.tags.join(' '));
        console.log(`[AutoPublisher] 已填写标签: ${content.tags.join(', ')}`);
      }

      // 执行 click 类型选择器（如封面类型选择、广告投放选择等）
      await this.executeClickSelectors(publishWindow, config);
      this.notifyProgress(platform, PublishStage.EXECUTING_CLICKS, '执行附加操作完成', 75);

      // 点击发布按钮
      this.notifyProgress(platform, PublishStage.CLICKING_PUBLISH, '正在点击发布按钮...', 80);
      await this.clickPublish(publishWindow, config);

      // 验证发布结果
      this.notifyProgress(platform, PublishStage.VERIFYING_RESULT, '正在验证发布结果...', 85);
      const success = await this.verifyPublish(publishWindow, config);

      // 获取发布后的 URL
      const publishedUrl = await this.getPublishedUrl(publishWindow, config);

      // 关闭窗口
      if (!publishWindow.isDestroyed()) {
        publishWindow.close();
      }
      this.publishWindows.delete(platform);

      // 发送最终状态通知
      if (success) {
        this.notifyProgress(platform, PublishStage.COMPLETED, '发布成功！', 100);
      } else {
        this.notifyProgress(platform, PublishStage.FAILED, '发布验证失败', 0);
      }

      return {
        platform,
        accountId: account.id,
        accountName: account.displayName,
        status: success ? 'success' : 'failed',
        publishedUrl,
        publishedAt: new Date().toISOString(),
        error: success ? undefined : '发布验证失败',
      };

    } catch (error: any) {
      console.error(`[AutoPublisher] 发布失败:`, error);
      this.notifyProgress(platform, PublishStage.FAILED, `发布异常: ${error.message || '未知错误'}`, 0);
      
      // 清理窗口
      const win = this.publishWindows.get(platform);
      if (win && !win.isDestroyed()) {
        win.close();
        this.publishWindows.delete(platform);
      }

      return {
        platform,
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: error.message || '发布异常',
      };
    }
  }

  /**
   * 创建发布窗口（使用账号独立 session）
   */
  private async createPublishWindow(platform: string, account: AccountInfo): Promise<BrowserWindow> {
    // 使用账号独立 session（每个账号保持自己的登录状态）
    const partition = `persist:account-${account.id}`;
    const ses = session.fromPartition(partition);

    console.log(`[AutoPublisher] 使用账号独立 session: ${partition}`);

    // 验证 session 中是否有 cookies
    const sessionCookies = await ses.cookies.get({});
    console.log(`[AutoPublisher] Session 中 Cookie 数量: ${sessionCookies.length}`);
    console.log(`[AutoPublisher] Session Cookie 列表: ${sessionCookies.map(c => c.name).join(', ')}`);

    if (sessionCookies.length === 0) {
      console.warn(`[AutoPublisher] 警告: Session 中没有 Cookie，发布可能失败`);
      // 可以选择使用 API 返回的 cookies 作为备用
      if (account.cookies && Object.keys(account.cookies).length > 0) {
        console.log(`[AutoPublisher] 尝试从 API 数据恢复 ${Object.keys(account.cookies).length} 个 Cookie`);
        // 这里可以选择注入 cookies，但通常 session 应该已经持久化了
      }
    }

    // 创建窗口
    const window = new BrowserWindow({
      width: 1200,
      height: 900,
      show: true, // 显示窗口，可视化发布过程，方便调试
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: ses,
        webSecurity: false, // 允许跨域上传图片
        javascript: true,
      },
    });

    return window;
  }

  /**
   * 等待页面加载
   */
  private async waitForPageLoad(window: BrowserWindow): Promise<void> {
    await new Promise<void>((resolve) => {
      const checkReady = () => {
        if (window.webContents.isLoading()) {
          setTimeout(checkReady, 100);
        } else {
          // 额外等待确保动态内容加载（增加到5秒）
          setTimeout(resolve, 5000);
        }
      };
      
      window.webContents.once('did-finish-load', () => {
        setTimeout(resolve, 2000);
      });
      
      // 超时保护
      setTimeout(resolve, 10000);
    });
  }

  /**
   * 填写元素内容
   * 支持 React/Vue 受控组件（使用 native setter）
   */
  private async fillElement(
    window: BrowserWindow,
    selectors: string[],
    value: string
  ): Promise<boolean> {
    // 转义特殊字符
    const escapedValue = value
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    const script = `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        const value = \`${escapedValue}\`;
        
        console.log('[AutoPublisher] fillElement 开始, 选择器数量:', selectors.length);
        console.log('[AutoPublisher] 要填写的值长度:', value.length);
        
        // 获取 React/Vue 受控组件的 native setter
        function getNativeSetter(element) {
          if (element.tagName === 'INPUT') {
            return Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          } else if (element.tagName === 'TEXTAREA') {
            return Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          }
          return null;
        }
        
        // 使用 native setter 设置值（解决 React/Vue 受控组件问题）
        function setNativeValue(element, value) {
          const nativeSetter = getNativeSetter(element);
          if (nativeSetter) {
            nativeSetter.call(element, value);
            return true;
          }
          element.value = value;
          return false;
        }
        
        for (const sel of selectors) {
          if (!sel) continue;
          try {
            const el = document.querySelector(sel);
            if (el) {
              console.log('[AutoPublisher] 找到元素:', sel, 'tagName:', el.tagName, 'type:', el.type, 'visible:', el.offsetParent !== null);
              
              // 处理不同类型的元素
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                // 原生输入框 - 使用 native setter 解决 React 受控组件问题
                el.focus();
                
                // 清空现有值
                setNativeValue(el, '');
                el.dispatchEvent(new Event('input', { bubbles: true }));
                
                // 设置新值
                setNativeValue(el, value);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                
                // 验证值是否设置成功
                const actualValue = el.value;
                console.log('[AutoPublisher] 填写后验证 - 期望长度:', value.length, '实际长度:', actualValue.length, '匹配:', actualValue === value);
                
                if (actualValue !== value) {
                  console.warn('[AutoPublisher] 值设置不匹配，尝试备用方案');
                  // 备用方案：逐字符输入模拟
                  el.value = value;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                console.log('[AutoPublisher] 已填写输入框:', sel, '值:', value.substring(0, 30) + '...');
                return true;
              } else if (el.contentEditable === 'true') {
                // 富文本编辑器
                el.focus();
                
                // 清空现有内容
                el.innerHTML = '';
                
                // 设置新内容
                el.innerHTML = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                
                // 尝试使用 execCommand
                if (document.execCommand) {
                  document.execCommand('selectAll', false, null);
                  document.execCommand('insertHTML', false, value);
                }
                
                // 验证内容是否设置成功
                const actualContent = el.innerText || el.textContent;
                console.log('[AutoPublisher] 富文本填写后验证 - 期望长度:', value.length, '实际长度:', actualContent.length);
                
                console.log('[AutoPublisher] 已填写富文本编辑器:', sel);
                return true;
              } else if (el.tagName === 'IFRAME') {
                // iframe 编辑器
                try {
                  const iframeDoc = el.contentDocument || el.contentWindow.document;
                  const body = iframeDoc.body;
                  if (body.contentEditable === 'true') {
                    body.innerHTML = value;
                    body.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log('[AutoPublisher] 已填写iframe编辑器:', sel);
                    return true;
                  }
                } catch (e) {
                  console.log('[AutoPublisher] 无法访问iframe:', e);
                }
              }
            } else {
              console.log('[AutoPublisher] 选择器未找到元素:', sel);
            }
          } catch (e) {
            console.log('[AutoPublisher] 选择器失败:', sel, e);
          }
        }
        
        // 所有选择器都失败，打印页面诊断信息
        console.error('[AutoPublisher] 所有选择器都未能成功填写');
        console.log('[AutoPublisher] === 页面诊断信息 ===');
        
        // 检查是否有遮罩层或弹窗
        const modals = document.querySelectorAll('.modal, .dialog, [class*="modal"], [role="dialog"]');
        console.log('[AutoPublisher] 检测到', modals.length, '个弹窗/遮罩层');
        
        // 检查是否有加载中的指示器
        const loadings = document.querySelectorAll('.loading, [class*="loading"], .spinner');
        console.log('[AutoPublisher] 检测到', loadings.length, '个加载指示器');
        
        // 再次打印所有输入框
        const inputs = document.querySelectorAll('input, textarea');
        console.log('[AutoPublisher] 页面共有', inputs.length, '个输入元素');
        
        return false;
      })();
    `;

    const result = await window.webContents.executeJavaScript(script);
    console.log(`[AutoPublisher] fillElement 结果: ${result ? '成功' : '失败'}`);
    return result;
  }

  /**
   * 验证元素值是否正确填写
   */
  private async verifyElementValue(
    window: BrowserWindow,
    selectors: string[],
    expectedValue: string
  ): Promise<boolean> {
    const script = `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        const expectedValue = \`${expectedValue.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        
        for (const sel of selectors) {
          if (!sel) continue;
          try {
            const el = document.querySelector(sel);
            if (el) {
              const actualValue = el.value || el.textContent || el.innerText || '';
              console.log('[AutoPublisher] 验证元素值 - 选择器:', sel);
              console.log('[AutoPublisher] 期望值长度:', expectedValue.length, '实际值长度:', actualValue.length);
              
              // 对于标题，只需要检查是否包含即可（可能有额外空格等）
              if (actualValue.includes(expectedValue) || expectedValue.includes(actualValue)) {
                console.log('[AutoPublisher] ✅ 元素值验证通过');
                return true;
              }
              
              // 检查是否完全匹配
              if (actualValue === expectedValue) {
                console.log('[AutoPublisher] ✅ 元素值完全匹配');
                return true;
              }
            }
          } catch (e) {
            console.log('[AutoPublisher] 验证选择器失败:', sel, e);
          }
        }
        
        console.log('[AutoPublisher] ❌ 元素值验证失败');
        return false;
      })();
    `;

    return window.webContents.executeJavaScript(script);
  }

  /**
   * 将 Markdown 转换为 HTML（基础转换）
   */
  private markdownToHtml(markdown: string): string {
    let html = markdown;
    
    // 转换图片 ![alt](url) -> <img src="url" alt="alt" />
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    
    // 转换链接 [text](url) -> <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 转换粗体 **text** -> <strong>text</strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // 转换斜体 *text* -> <em>text</em>
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // 转换段落（双换行）
    html = html.replace(/\n\n/g, '</p><p>');
    
    // 转换单换行
    html = html.replace(/\n/g, '<br />');
    
    // 包装在段落中
    html = `<p>${html}</p>`;
    
    return html;
  }

  /**
   * 从内容中提取 Markdown 图片
   */
  private extractMarkdownImages(content: string): Array<{ alt: string; url: string }> {
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: Array<{ alt: string; url: string }> = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      images.push({
        alt: match[1],
        url: match[2],
      });
    }
    
    return images;
  }

  /**
   * 上传图片（从远程 URL 直接 fetch 并注入）
   * 
   * 原理：
   * 1. 在目标平台页面中 fetch 远程图片（扣子存储已配置 CORS）
   * 2. 将响应转为 Blob
   * 3. 创建 File 对象
   * 4. 通过 DataTransfer 注入到文件输入控件
   * 5. 触发 change 事件
   */
  private async uploadImagesFromUrl(
    window: BrowserWindow,
    config: PlatformConfig,
    imageUrls: string[]
  ): Promise<Record<string, string>> {
    console.log(`[AutoPublisher] 开始上传 ${imageUrls.length} 张图片（粘贴模式）...`);
    
    const urlMap: Record<string, string> = {};

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`[AutoPublisher] 上传图片 ${i + 1}/${imageUrls.length}: ${imageUrl.substring(0, 50)}...`);

      try {
        // 使用 Electron 原生粘贴模式上传图片
        const safeImageUrl = JSON.stringify(imageUrl);
        const contentEditorSelectors = config.selectors.contentEditor || [];
        const safeEditorSelectors = JSON.stringify(Array.isArray(contentEditorSelectors) ? contentEditorSelectors : [contentEditorSelectors]);
        
        // ========== 阶段1: 在页面内准备图片并写入剪贴板 ==========
        const prepareResult = await window.webContents.executeJavaScript(`
          (async function() {
            const imageUrl = ${safeImageUrl};
            const editorSelectors = ${safeEditorSelectors};
            
            try {
              // 步骤1: fetch 远程图片
              console.log('[AutoPublisher] 开始fetch图片:', imageUrl);
              const response = await fetch(imageUrl, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
              });
              
              if (!response.ok) {
                throw new Error('fetch失败: ' + response.status);
              }
              
              const blob = await response.blob();
              console.log('[AutoPublisher] 图片大小:', blob.size, 'bytes, type:', blob.type);
              
              // 步骤2: 写入剪贴板（必须转换为 PNG）
              let pngBlob = blob;
              
              if (blob.type !== 'image/png') {
                console.log('[AutoPublisher] 将图片转换为 PNG 格式...');
                const img = await createImageBitmap(blob);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                pngBlob = await new Promise(function(resolve) {
                  canvas.toBlob(function(b) {
                    resolve(b);
                  }, 'image/png');
                });
                console.log('[AutoPublisher] 转换后 PNG 大小:', pngBlob.size, 'bytes');
              }
              
              // 写入剪贴板
              const clipboardItem = new ClipboardItem({
                'image/png': pngBlob
              });
              await navigator.clipboard.write([clipboardItem]);
              console.log('[AutoPublisher] 图片已写入剪贴板');
              
              // 步骤3: 找到并聚焦编辑器
              let editor = null;
              for (const sel of editorSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                  editor = el;
                  console.log('[AutoPublisher] 找到编辑器:', sel);
                  break;
                }
              }
              
              if (!editor) {
                editor = document.querySelector('[contenteditable="true"]');
                if (editor) {
                  console.log('[AutoPublisher] 使用 contenteditable 编辑器');
                }
              }
              
              if (!editor) {
                throw new Error('找不到编辑器');
              }
              
              editor.focus();
              console.log('[AutoPublisher] 编辑器已聚焦');
              
              return { success: true, editorFound: true };
              
            } catch (e) {
              console.error('[AutoPublisher] 准备阶段失败:', e);
              return { success: false, error: e.message };
            }
          })();
        `);

        if (!prepareResult.success) {
          console.error(`[AutoPublisher] 图片准备失败: ${prepareResult.error}`);
          continue;
        }

        // ========== 阶段2: 使用 Electron 原生 API 粘贴 ==========
        console.log('[AutoPublisher] 使用 Electron 原生 paste API...');
        
        // 等待编辑器聚焦生效
        await new Promise(r => setTimeout(r, 500));
        
        // 使用 Electron 原生粘贴 API
        window.webContents.paste();
        console.log('[AutoPublisher] 已执行原生粘贴');
        
        // ========== 阶段3: 等待上传并检测结果 ==========
        await new Promise(r => setTimeout(r, 3000));
        
        const detectResult = await window.webContents.executeJavaScript(`
          (async function() {
            const imageUrl = ${safeImageUrl};
            
            // 检查编辑器中是否有新图片
            const editor = document.querySelector('[contenteditable="true"]') || 
                          document.querySelector('.public-DraftEditor-content') ||
                          document.querySelector('.ProseMirror') ||
                          document.querySelector('[data-placeholder]');
            
            if (!editor) {
              return { success: false, error: '找不到编辑器' };
            }
            
            const imgs = editor.querySelectorAll('img');
            let uploadedUrl = null;
            
            for (const img of imgs) {
              // 检查是否是刚上传的图片（URL 不包含原始链接）
              if (img.src && !img.src.includes('coze-coding-project') && !img.src.includes(imageUrl)) {
                uploadedUrl = img.src;
                console.log('[AutoPublisher] 检测到上传后的图片:', uploadedUrl.substring(0, 80));
                break;
              }
            }
            
            if (uploadedUrl) {
              return { success: true, uploadedUrl: uploadedUrl };
            } else {
              // 再等待一段时间重试
              await new Promise(r => setTimeout(r, 2000));
              
              const imgs2 = editor.querySelectorAll('img');
              for (const img of imgs2) {
                if (img.src && !img.src.includes('coze-coding-project') && !img.src.includes(imageUrl)) {
                  uploadedUrl = img.src;
                  console.log('[AutoPublisher] 延迟检测到上传后的图片:', uploadedUrl.substring(0, 80));
                  break;
                }
              }
              
              if (uploadedUrl) {
                return { success: true, uploadedUrl: uploadedUrl };
              } else {
                console.log('[AutoPublisher] 未能检测到上传后的图片URL');
                // 返回当前编辑器中所有图片的数量，用于调试
                return { 
                  success: false, 
                  error: '未能检测到上传后的图片URL',
                  imgCount: imgs.length 
                };
              }
            }
          })();
        `);

        if (detectResult.success) {
          console.log(`[AutoPublisher] 图片上传成功，已获取上传后URL`);
          
          // 如果页面返回了上传后的 URL，直接使用
          if (detectResult.uploadedUrl) {
            urlMap[imageUrl] = detectResult.uploadedUrl;
            console.log(`[AutoPublisher] 页面返回的上传后URL: ${detectResult.uploadedUrl.substring(0, 50)}...`);
          } else {
            // 否则等待一段时间后尝试获取
            await new Promise(r => setTimeout(r, config.imageUploadWait || 2000));
            
            // 尝试获取上传后的图片 URL
            if (config.uploadedImageUrlSelector) {
              const uploadedUrl = await this.getUploadedImageUrl(window, config.uploadedImageUrlSelector);
              if (uploadedUrl) {
                urlMap[imageUrl] = uploadedUrl;
                console.log(`[AutoPublisher] 选择器获取的上传后URL: ${uploadedUrl.substring(0, 50)}...`);
              }
            }
          }
          
          // 如果没有获取到新 URL，保留原 URL（后续内容填充时会用到）
          if (!urlMap[imageUrl]) {
            console.log(`[AutoPublisher] 未获取到上传后的URL，保留原URL`);
            // 不添加到 urlMap，这样内容中的图片 URL 不会被替换
          }
        } else {
          console.error(`[AutoPublisher] 图片上传失败: ${detectResult.error}`);
        }
        
      } catch (error: any) {
        console.error(`[AutoPublisher] 图片上传异常:`, error);
      }
      
      // 图片间间隔，避免频率过高
      if (i < imageUrls.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return urlMap;
  }

  /**
   * 获取上传后的图片 URL
   */
  private async getUploadedImageUrl(
    window: BrowserWindow,
    selector: string
  ): Promise<string | null> {
    try {
      const script = `
        (function() {
          const el = document.querySelector('${selector}');
          if (el && el.src) {
            return el.src;
          }
          if (el && el.style && el.style.backgroundImage) {
            const match = el.style.backgroundImage.match(/url\\(["']?([^"')]+)["']?\\)/);
            if (match) return match[1];
          }
          return null;
        })();
      `;
      
      return await window.webContents.executeJavaScript(script);
    } catch (e) {
      return null;
    }
  }

  /**
   * 执行所有 click 类型的选择器
   * 用于处理单选按钮、复选框、普通按钮点击等操作
   */
  private async executeClickSelectors(window: BrowserWindow, config: PlatformConfig): Promise<void> {
    if (!config.dynamicSelectors) {
      console.log('[AutoPublisher] 没有动态选择器配置，跳过 click 选择器执行');
      return;
    }

    console.log('[AutoPublisher] 开始执行 click 类型选择器...');

    // 遍历所有选择器类型，找出 click 类型的
    for (const [key, items] of Object.entries(config.dynamicSelectors)) {
      if (!items || !Array.isArray(items) || items.length === 0) continue;

      // 检查是否有 inputType 为 click 的选择器
      const clickItems = items.filter(item => 
        item.isEnabled && (item.inputType === 'click' || this.isClickSelector(key))
      );

      if (clickItems.length === 0) continue;

      console.log(`[AutoPublisher] 执行 click 选择器: ${key} (${clickItems.length} 个)`);

      for (const item of clickItems) {
        const success = await this.executeSingleClick(window, item.selector, key);
        if (success) {
          console.log(`[AutoPublisher] click 选择器执行成功: ${key} -> ${item.selector}`);
          // 成功后跳出，避免重复点击
          break;
        } else {
          console.log(`[AutoPublisher] click 选择器执行失败: ${key} -> ${item.selector}`);
        }
      }
    }
  }

  /**
   * 判断选择器类型是否为点击类型
   */
  private isClickSelector(key: string): boolean {
    // 已知的点击类型选择器 key
    const clickKeys = [
      'publishButton',
      'coverType',        // 封面类型选择
      'adType',           // 广告类型选择
      'categorySelect',   // 分类选择
      'locationSelect',   // 位置选择
      'topicSelect',      // 话题选择
      'visibilitySelect', // 可见性选择
      'submitBtn',
      'confirmBtn',
    ];

    // 也包含包含 'click', 'btn', 'button' 的 key
    return clickKeys.some(k => key.toLowerCase().includes(k.toLowerCase())) ||
           key.toLowerCase().includes('click') ||
           key.toLowerCase().includes('btn') ||
           key.toLowerCase().includes('button') ||
           key.toLowerCase().includes('select') && !key.toLowerCase().includes('input');
  }

  /**
   * 执行单个点击操作
   */
  private async executeSingleClick(
    window: BrowserWindow, 
    selector: string, 
    key: string
  ): Promise<boolean> {
    const script = `
      (function() {
        const selector = ${JSON.stringify(selector)};
        const key = ${JSON.stringify(key)};
        
        console.log('[AutoPublisher] 执行单个点击:', key, selector);
        
        // 安全点击函数
        function safeClick(el) {
          if (!el) return false;
          try {
            // 1. 先聚焦
            el.focus();
            
            // 2. 检查是否是单选按钮或复选框
            if (el.type === 'radio' || el.type === 'checkbox') {
              // 如果已经选中，不需要再点击
              if (el.checked) {
                console.log('[AutoPublisher] 单选/复选框已选中，跳过');
                return true;
              }
              // 点击选中
              el.click();
              return true;
            }
            
            // 3. 检查是否是 label 关联的 input
            if (el.tagName === 'LABEL') {
              // 点击 label 会自动触发关联的 input
              el.click();
              return true;
            }
            
            // 4. 检查是否有 role="radio" 或 role="checkbox"
            const role = el.getAttribute('role');
            if (role === 'radio' || role === 'checkbox') {
              // 检查是否已选中
              const ariaChecked = el.getAttribute('aria-checked');
              if (ariaChecked === 'true') {
                console.log('[AutoPublisher] ARIA 单选/复选框已选中，跳过');
                return true;
              }
              el.click();
              return true;
            }
            
            // 5. 普通按钮点击
            el.click();
            
            // 6. 同时触发鼠标事件
            el.dispatchEvent(new MouseEvent('click', { 
              bubbles: true, 
              cancelable: true, 
              view: window 
            }));
            
            return true;
          } catch (e) {
            console.log('[AutoPublisher] 点击失败:', e);
            return false;
          }
        }
        
        // 1. 直接选择器匹配
        try {
          const el = document.querySelector(selector);
          if (el) {
            console.log('[AutoPublisher] 找到元素:', selector, 'tagName:', el.tagName);
            if (safeClick(el)) {
              return true;
            }
          }
        } catch (e) {
          console.log('[AutoPublisher] 选择器匹配失败:', e);
        }
        
        // 2. 尝试查找关联的 label
        try {
          // 如果选择器指向 input，尝试点击关联的 label
          const input = document.querySelector(selector);
          if (input && (input.type === 'radio' || input.type === 'checkbox')) {
            // 方式1: 通过 for 属性查找 label
            const label = document.querySelector(\`label[for="\${input.id}"]\`);
            if (label && safeClick(label)) {
              return true;
            }
            // 方式2: 查找父级 label
            const parentLabel = input.closest('label');
            if (parentLabel && safeClick(parentLabel)) {
              return true;
            }
          }
        } catch (e) {
          console.log('[AutoPublisher] 查找 label 失败:', e);
        }
        
        // 3. 通过文本内容查找（针对自定义单选组件）
        try {
          // 从选择器中提取可能的文本
          const textMatch = selector.match(/:contains\\("(.+)"\\)/);
          if (textMatch) {
            const targetText = textMatch[1];
            const elements = document.querySelectorAll('[role="radio"], [role="checkbox"], .radio, .checkbox, .option, [class*="option"]');
            for (const el of elements) {
              if (el.textContent && el.textContent.includes(targetText)) {
                console.log('[AutoPublisher] 通过文本找到元素:', targetText);
                if (safeClick(el)) {
                  return true;
                }
              }
            }
          }
        } catch (e) {
          console.log('[AutoPublisher] 通过文本查找失败:', e);
        }
        
        // 4. 尝试点击包含特定文本的元素
        const commonTexts = {
          'coverType': ['单图', '三图', '无封面', '单张', '多张'],
          'adType': ['投放广告', '不投放', '赚收益', '不投'],
          'visibilitySelect': ['公开', '私密', '仅自己可见', '好友可见'],
        };
        
        const textsToTry = commonTexts[key] || [];
        for (const text of textsToTry) {
          const elements = document.querySelectorAll('[role="radio"], [role="checkbox"], .radio-item, .checkbox-item, [class*="option-item"], label');
          for (const el of elements) {
            const elText = (el.textContent || '').trim();
            if (elText.includes(text)) {
              console.log('[AutoPublisher] 通过预设文本找到元素:', text);
              if (safeClick(el)) {
                return true;
              }
            }
          }
        }
        
        console.log('[AutoPublisher] 未找到可点击的元素');
        return false;
      })();
    `;

    try {
      const result = await window.webContents.executeJavaScript(script);
      return result as boolean;
    } catch (e) {
      console.error('[AutoPublisher] 执行点击脚本失败:', e);
      return false;
    }
  }

  /**
   * 点击发布按钮
   */
  private async clickPublish(window: BrowserWindow, config: PlatformConfig): Promise<void> {
    const selectors = Array.isArray(config.selectors.publishButton) 
      ? config.selectors.publishButton 
      : [config.selectors.publishButton];

    // 点击发布按钮的脚本
    const clickScript = `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        
        console.log('[AutoPublisher] 开始查找发布按钮...');
        
        // 辅助函数：通过文本内容查找按钮
        function findButtonByText(text) {
          const buttons = document.querySelectorAll('button, [role="button"], a.btn, .btn, input[type="submit"], [class*="btn"]');
          for (const btn of buttons) {
            if (btn.textContent && btn.textContent.includes(text)) {
              return btn;
            }
          }
          return null;
        }
        
        // 辅助函数：安全点击
        function safeClick(el) {
          if (!el) return false;
          try {
            el.focus();
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
          } catch (e) {
            console.log('[AutoPublisher] 点击失败:', e);
            return false;
          }
        }
        
        // 辅助函数：检查是否有确认弹窗
        function checkAndClickConfirm() {
          // 检查常见的确认弹窗
          const confirmSelectors = [
            '.ant-modal-confirm .ant-btn-primary',
            '.el-message-box .el-button--primary',
            '.modal .btn-primary',
            '.dialog .confirm-btn',
            'button[class*="confirm"]',
            'button[class*="ok"]',
            '.ant-modal button[type="submit"]',
            '[role="dialog"] button[class*="primary"]',
          ];
          
          for (const sel of confirmSelectors) {
            const btn = document.querySelector(sel);
            if (btn && btn.offsetParent !== null) {
              const text = btn.textContent || '';
              if (text.includes('确定') || text.includes('确认') || text.includes('发布') || text.includes('提交') || text.includes('OK')) {
                console.log('[AutoPublisher] 发现确认弹窗，点击确认按钮:', text);
                safeClick(btn);
                return true;
              }
            }
          }
          return false;
        }
        
        // 1. 尝试选择器匹配
        for (const sel of selectors) {
          if (!sel) continue;
          try {
            if (sel.includes(':contains(')) {
              const match = sel.match(/(.+):contains\\("(.+)"\\)/);
              if (match) {
                const baseSel = match[1];
                const text = match[2];
                
                if (baseSel.trim()) {
                  const elements = document.querySelectorAll(baseSel);
                  for (const el of elements) {
                    if (el.textContent && el.textContent.includes(text)) {
                      if (safeClick(el)) {
                        console.log('[AutoPublisher] 已点击按钮(contains):', text);
                        return { clicked: true, buttonText: text };
                      }
                    }
                  }
                } else {
                  const btn = findButtonByText(text);
                  if (btn && safeClick(btn)) {
                    console.log('[AutoPublisher] 已点击按钮(text):', text);
                    return { clicked: true, buttonText: text };
                  }
                }
              }
            } else {
              const el = document.querySelector(sel);
              if (el && !el.disabled && el.offsetParent !== null) {
                if (safeClick(el)) {
                  const text = el.textContent?.trim() || '';
                  console.log('[AutoPublisher] 已点击按钮:', sel, '文本:', text.substring(0, 20));
                  return { clicked: true, buttonText: text };
                }
              }
            }
          } catch (e) {
            console.log('[AutoPublisher] 选择器失败:', sel, e);
          }
        }
        
        // 2. 尝试通过常见发布文本查找
        const publishTexts = ['发布', '发表', '提交', 'Publish', 'Submit', '发送'];
        for (const text of publishTexts) {
          const btn = findButtonByText(text);
          if (btn && !btn.disabled && btn.offsetParent !== null && safeClick(btn)) {
            console.log('[AutoPublisher] 已点击发布按钮:', text);
            return { clicked: true, buttonText: text };
          }
        }
        
        // 3. 尝试查找表单提交按钮
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn && !submitBtn.disabled && submitBtn.offsetParent !== null && safeClick(submitBtn)) {
          console.log('[AutoPublisher] 已点击提交按钮');
          return { clicked: true, buttonText: 'submit' };
        }
        
        // 4. 列出页面上所有可能的按钮（调试用）
        const allButtons = document.querySelectorAll('button, [role="button"]');
        console.log('[AutoPublisher] 页面上的按钮数量:', allButtons.length);
        allButtons.forEach((btn, i) => {
          if (i < 10) {
            console.log('[AutoPublisher] 按钮', i, ':', btn.textContent?.trim().substring(0, 20), '| class:', btn.className?.substring(0, 30));
          }
        });
        
        console.log('[AutoPublisher] 未找到可点击的发布按钮');
        return { clicked: false, buttonText: '' };
      })();
    `;
    
    // 检查确认弹窗的脚本
    const checkConfirmScript = `
      (function() {
        // 检查是否有确认弹窗
        const confirmSelectors = [
          '.ant-modal-confirm .ant-btn-primary',
          '.el-message-box .el-button--primary',
          '.modal .btn-primary',
          '.dialog .confirm-btn',
          'button[class*="confirm"]',
          'button[class*="ok"]',
          '.ant-modal button[type="submit"]',
          '[role="dialog"] button[class*="primary"]',
          '.ant-modal .ant-btn-primary',
          '[class*="modal"] button[class*="primary"]',
        ];
        
        for (const sel of confirmSelectors) {
          const btn = document.querySelector(sel);
          if (btn && btn.offsetParent !== null) {
            const text = btn.textContent || '';
            if (text.includes('确定') || text.includes('确认') || text.includes('发布') || text.includes('提交') || text.includes('OK') || text.includes('是')) {
              console.log('[AutoPublisher] 发现确认弹窗，点击确认按钮:', text);
              btn.focus();
              btn.click();
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return { found: true, text: text };
            }
          }
        }
        return { found: false, text: '' };
      })();
    `;

    // 第一次点击发布按钮
    let result = await window.webContents.executeJavaScript(clickScript);
    console.log(`[AutoPublisher] 第一次点击发布按钮: ${result.clicked ? '成功' : '未找到'}, 按钮: ${result.buttonText}`);
    
    if (!result.clicked) {
      console.log('[AutoPublisher] 未找到发布按钮，发布失败');
      return;
    }
    
    // 等待一下，检查是否有确认弹窗
    await new Promise(r => setTimeout(r, 1000));
    
    // 检查并点击确认弹窗
    let confirmResult = await window.webContents.executeJavaScript(checkConfirmScript);
    if (confirmResult.found) {
      console.log(`[AutoPublisher] 已点击确认弹窗: ${confirmResult.text}`);
      // 点击确认后等待一下
      await new Promise(r => setTimeout(r, 1000));
      // 可能还有第二个确认弹窗
      confirmResult = await window.webContents.executeJavaScript(checkConfirmScript);
      if (confirmResult.found) {
        console.log(`[AutoPublisher] 已点击第二个确认弹窗: ${confirmResult.text}`);
      }
    }
    
    // 检查发布按钮是否还在（如果还在说明可能需要再点击一次）
    await new Promise(r => setTimeout(r, 1500));
    const checkButtonStillThere = await window.webContents.executeJavaScript(`
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        for (const sel of selectors) {
          if (!sel) continue;
          try {
            const el = document.querySelector(sel);
            if (el && !el.disabled && el.offsetParent !== null) {
              return { exists: true, text: el.textContent?.trim().substring(0, 20) };
            }
          } catch (e) {}
        }
        
        // 也检查常见的发布按钮
        const publishTexts = ['发布', '发表', '提交'];
        for (const text of publishTexts) {
          const buttons = document.querySelectorAll('button, [role="button"]');
          for (const btn of buttons) {
            if (btn.textContent && btn.textContent.includes(text) && !btn.disabled && btn.offsetParent !== null) {
              return { exists: true, text: text };
            }
          }
        }
        return { exists: false, text: '' };
      })();
    `);
    
    if (checkButtonStillThere.exists) {
      console.log(`[AutoPublisher] 发布按钮仍然存在: ${checkButtonStillThere.text}，尝试再次点击`);
      result = await window.webContents.executeJavaScript(clickScript);
      if (result.clicked) {
        console.log(`[AutoPublisher] 第二次点击发布按钮成功`);
        // 再次检查确认弹窗
        await new Promise(r => setTimeout(r, 1000));
        confirmResult = await window.webContents.executeJavaScript(checkConfirmScript);
        if (confirmResult.found) {
          console.log(`[AutoPublisher] 第二次点击后确认弹窗: ${confirmResult.text}`);
        }
      }
    }

    // 等待发布响应
    const initialWait = config.publishWait || 5000;
    console.log(`[AutoPublisher] 等待发布响应 ${initialWait}ms...`);
    await new Promise(r => setTimeout(r, initialWait));
  }

  /**
   * 验证发布结果
   * 严格验证：必须有明确的成功标志才算成功
   * 使用渐进式重试策略，最大等待时间 60 秒
   */
  private async verifyPublish(window: BrowserWindow, config: PlatformConfig): Promise<boolean> {
    const selectors = Array.isArray(config.selectors.successIndicator) 
      ? config.selectors.successIndicator 
      : [config.selectors.successIndicator];

    // 验证函数（返回 { success: boolean, reason: string, isDefinitive: boolean }）
    const runVerification = async (): Promise<{ success: boolean; reason: string; isDefinitive: boolean }> => {
      const script = `
        (function() {
          const selectors = ${JSON.stringify(selectors)};
          const publishBtnSelectors = ${JSON.stringify(config.selectors.publishButton || [])};
          
          console.log('[AutoPublisher] 开始验证发布结果...');
          console.log('[AutoPublisher] 当前URL:', window.location.href);
          
          // ========== 步骤1: 优先检测明确的错误状态 ==========
          
          // 1.1 检查错误提示 Toast/弹窗
          const errorSelectors = [
            '.toast-error', '.ant-message-error', '.el-message--error',
            '.error', '.alert-error', '[class*="error"]', '[class*="fail"]',
            '.notice-error', '[role="alert"][class*="error"]'
          ];
          
          for (const sel of errorSelectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              const text = el.textContent || '';
              if (text.trim()) {
                console.log('[AutoPublisher] ❌ 发现错误提示:', text.substring(0, 100));
                
                // 如果错误信息包含"已存在"，可能是因为重复发布
                if (text.includes('已存在') || text.includes('重复') || text.includes('already')) {
                  return { success: true, reason: '内容已存在，视为成功', isDefinitive: true };
                }
                
                return { success: false, reason: '发现错误提示: ' + text.substring(0, 100), isDefinitive: true };
              }
            }
          }
          
          // 1.2 检查标题为空的错误提示
          const titleErrorPatterns = ['请输入标题', '标题不能为空', '请填写标题', '标题必填'];
          const pageText = document.body.innerText;
          for (const pattern of titleErrorPatterns) {
            if (pageText.includes(pattern)) {
              console.log('[AutoPublisher] ❌ 发现标题错误:', pattern);
              return { success: false, reason: '标题未填写: ' + pattern, isDefinitive: true };
            }
          }
          
          // 1.3 检查内容为空的错误提示
          const contentErrorPatterns = ['请输入内容', '内容不能为空', '请填写正文', '正文必填'];
          for (const pattern of contentErrorPatterns) {
            if (pageText.includes(pattern)) {
              console.log('[AutoPublisher] ❌ 发现内容错误:', pattern);
              return { success: false, reason: '内容未填写: ' + pattern, isDefinitive: true };
            }
          }
          
          // 1.4 检查标题输入框是否仍然有值（如果填写成功但被清空说明发布成功，但如果还是空说明填写失败）
          const titleInput = document.querySelector('#title, input[name="title"], .title-input input, input[placeholder*="标题"]');
          if (titleInput && !titleInput.value) {
            // 标题为空，检查是否是因为发布成功清空
            // 如果页面还在发布页，说明填写失败
            const url = window.location.href;
            if (url.includes('publish') && !url.includes('success')) {
              console.log('[AutoPublisher] ❌ 标题输入框为空，且仍在发布页，填写可能失败');
              return { success: false, reason: '标题输入框为空，填写可能失败', isDefinitive: false };
            }
          }
          
          // ========== 步骤2: 检测明确的成功状态 ==========
          
          // 2.1 检查成功标识元素
          for (const sel of selectors) {
            if (!sel) continue;
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              const text = el.textContent || '';
              console.log('[AutoPublisher] ✅ 发现成功标识元素:', sel, '内容:', text.substring(0, 50));
              return { success: true, reason: '发现成功标识元素: ' + text.substring(0, 50), isDefinitive: true };
            }
          }
          
          // 2.2 检查 URL 变化（必须明确跳转到成功页/管理页）
          const url = window.location.href;
          const urlSuccessPatterns = [
            { pattern: 'success', name: '成功页' },
            { pattern: 'published', name: '发布成功页' },
            { pattern: 'manage', name: '管理页', exclude: 'publish' },
            { pattern: '/article/', name: '文章详情页' },
            { pattern: '/content/manage', name: '内容管理页' },
          ];
          
          for (const { pattern, name, exclude } of urlSuccessPatterns) {
            if (url.includes(pattern)) {
              if (exclude && url.includes(exclude)) continue;
              console.log('[AutoPublisher] ✅ URL跳转到', name);
              return { success: true, reason: 'URL跳转到: ' + name, isDefinitive: true };
            }
          }
          
          // 2.3 检查成功 Toast（必须明确包含成功关键词）
          const toastSelectors = [
            '.toast-success', '.ant-message-success', '.el-message--success',
            '.toast-content', '[role="alert"]', '.notice-bar'
          ];
          
          const successKeywords = ['发布成功', '已发布', '发布完成', '提交成功'];
          for (const sel of toastSelectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              const text = el.textContent || '';
              for (const keyword of successKeywords) {
                if (text.includes(keyword)) {
                  console.log('[AutoPublisher] ✅ 发现成功Toast:', text.substring(0, 50));
                  return { success: true, reason: '发现成功Toast: ' + text.substring(0, 50), isDefinitive: true };
                }
              }
            }
          }
          
          // 2.4 检查页面文本中的明确成功关键词（更严格）
          for (const keyword of successKeywords) {
            // 只检查特定区域的文本，避免误判
            const successAreas = document.querySelectorAll('.result, .status, .notice, .toast, [class*="result"], [class*="status"]');
            for (const area of successAreas) {
              if (area.textContent && area.textContent.includes(keyword)) {
                console.log('[AutoPublisher] ✅ 发现成功区域:', keyword);
                return { success: true, reason: '发现成功区域: ' + keyword, isDefinitive: true };
              }
            }
          }
          
          // 2.5 检查是否有文章链接出现
          const linkSelectors = [
            'a[href*="detail"]', 'a[href*="article"]', 'a[href*="post"]',
            '.published-url a', '.article-link'
          ];
          for (const sel of linkSelectors) {
            const el = document.querySelector(sel);
            if (el && el.href && el.offsetParent !== null) {
              // 确保链接指向文章详情而非发布页
              if (!el.href.includes('publish')) {
                console.log('[AutoPublisher] ✅ 发现文章链接:', el.href);
                return { success: true, reason: '发现文章链接: ' + el.href, isDefinitive: true };
              }
            }
          }
          
          // ========== 步骤2.6: 检测审核中/待审核状态（视为成功） ==========
          const reviewingKeywords = ['审核中', '审核通过', '待审核', '审核', 'reviewing', 'pending', '审核成功'];
          for (const keyword of reviewingKeywords) {
            // 检查 Toast/提示区域
            const toastAreas = document.querySelectorAll('.toast, .notice, .ant-message, .el-message, [role="alert"], .status-bar, .result-info');
            for (const area of toastAreas) {
              if (area.textContent && area.textContent.includes(keyword)) {
                console.log('[AutoPublisher] ✅ 发现审核状态:', keyword);
                return { success: true, reason: '内容已提交审核: ' + keyword, isDefinitive: true };
              }
            }
          }
          
          // ========== 步骤2.7: 检测发布按钮状态变化 ==========
          // 如果发布按钮变为禁用或消失，可能表示提交成功
          const publishBtn = document.querySelector(publishBtnSelectors.join(','));
          if (!publishBtn || publishBtn.disabled || publishBtn.style.display === 'none') {
            // 检查是否有"发布中"或"提交中"的提示
            const loadingTexts = ['发布中', '提交中', '上传中', '处理中', 'Publishing', 'Submitting', 'Loading'];
            for (const text of loadingTexts) {
              if (pageText.includes(text)) {
                console.log('[AutoPublisher] ⏳ 发布按钮已禁用，正在处理:', text);
                return { success: false, reason: '正在处理中: ' + text, isDefinitive: false };
              }
            }
            // 发布按钮消失但没有错误提示，可能是成功跳转中
            if (!publishBtn) {
              console.log('[AutoPublisher] ⏳ 发布按钮已消失，可能正在跳转');
              return { success: false, reason: '发布按钮已消失，等待页面跳转', isDefinitive: false };
            }
          }
          
          // ========== 步骤2.8: 检测页面跳转/加载状态 ==========
          // 如果页面正在加载新内容，等待
          if (document.readyState !== 'complete') {
            console.log('[AutoPublisher] ⏳ 页面正在加载');
            return { success: false, reason: '页面正在加载', isDefinitive: false };
          }
          
          // 检测 URL 中的成功标识
          const urlSuccessParams = ['id', 'article_id', 'post_id', 'content_id'];
          const urlParams = new URLSearchParams(window.location.search);
          for (const param of urlSuccessParams) {
            if (urlParams.get(param)) {
              console.log('[AutoPublisher] ✅ URL 包含内容ID:', param, '=', urlParams.get(param));
              return { success: true, reason: 'URL 包含内容标识: ' + param, isDefinitive: true };
            }
          }
          
          // ========== 步骤3: 未检测到明确结果 ==========
          console.log('[AutoPublisher] ⚠️ 未检测到明确的成功或失败标识');
          
          // 收集页面状态用于调试
          const debugInfo = {
            url: url,
            titleInputValue: titleInput?.value || '',
            hasPublishButton: !!document.querySelector(publishBtnSelectors.join(',')),
            visibleButtons: Array.from(document.querySelectorAll('button')).slice(0, 5).map(b => b.textContent?.trim().substring(0, 20))
          };
          console.log('[AutoPublisher] 页面状态:', JSON.stringify(debugInfo));
          
          return { success: false, reason: '未检测到明确的成功或失败标识', isDefinitive: false };
        })();
      `;

      return await window.webContents.executeJavaScript(script);
    };

    // 渐进式重试策略：总共最多等待 60 秒
    // 重试间隔：2s, 3s, 4s, 5s, 6s, 7s, 8s, 10s, 15s
    const retryDelays = [2000, 3000, 4000, 5000, 6000, 7000, 8000, 10000, 15000];
    let totalWaitTime = 0;
    const maxTotalWait = 60000; // 最大等待 60 秒

    for (let attempt = 1; attempt <= retryDelays.length; attempt++) {
      console.log(`[AutoPublisher] 验证尝试 ${attempt}/${retryDelays.length}`);
      
      try {
        const result = await runVerification();
        
        if (result.isDefinitive) {
          // 明确的结果，直接返回
          console.log(`[AutoPublisher] 验证结果(明确): ${result.success ? '成功' : '失败'} - ${result.reason}`);
          return result.success;
        }
        
        // 非明确结果，继续重试
        console.log(`[AutoPublisher] 验证结果(非明确): ${result.reason}`);
        
        if (attempt < retryDelays.length) {
          const delay = retryDelays[attempt - 1];
          totalWaitTime += delay;
          
          if (totalWaitTime > maxTotalWait) {
            console.log(`[AutoPublisher] 已达到最大等待时间 ${maxTotalWait}ms，停止重试`);
            break;
          }
          
          console.log(`[AutoPublisher] 等待 ${delay}ms 后重试... (已等待 ${totalWaitTime}ms)`);
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (e) {
        console.error(`[AutoPublisher] 验证脚本执行失败:`, e);
        // 出错时继续重试
        if (attempt < retryDelays.length) {
          const delay = retryDelays[attempt - 1];
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    // 所有重试后仍未检测到明确成功，返回失败
    console.log(`[AutoPublisher] 最终验证结果: 失败 - 未能确认发布成功`);
    return false;
  }

  /**
   * 获取发布后的 URL
   */
  private async getPublishedUrl(window: BrowserWindow, config: PlatformConfig): Promise<string | undefined> {
    try {
      console.log(`[AutoPublisher] 开始获取发布后的 URL...`);
      
      // 等待页面稳定
      await new Promise(r => setTimeout(r, 2000));
      
      const script = `
        (function() {
          console.log('[AutoPublisher] 开始从页面提取发布 URL...');
          
          // 获取当前页面 URL（可能是发布成功后的文章页）
          const currentUrl = window.location.href;
          console.log('[AutoPublisher] 当前页面 URL:', currentUrl);
          
          // 如果当前 URL 已经是文章详情页，直接返回
          const articlePatterns = [
            '/detail/',           // 头条百科
            '/article/',          // 通用文章页
            '/post/',             // 通用帖子页
            '/content/',          // 内容页
            '/a',                 // 头条文章
            'item.btime.com',     // 百家号
            'baike.toutiao.com',  // 头条百科
          ];
          
          for (const pattern of articlePatterns) {
            if (currentUrl.includes(pattern)) {
              console.log('[AutoPublisher] 当前 URL 包含文章模式:', pattern);
              // 排除发布页面本身
              if (!currentUrl.includes('/publish') && !currentUrl.includes('/create')) {
                console.log('[AutoPublisher] ✅ 返回当前页面 URL:', currentUrl);
                return currentUrl;
              }
            }
          }
          
          // 尝试从页面中提取发布后的链接
          const linkSelectors = [
            // 头条百科
            'a[href*="baike.toutiao.com/detail"]',
            'a[href*="detail"]',
            // 通用文章链接
            'a[href*="/article/"]',
            'a[href*="/post/"]',
            'a[href*="/content/"]',
            'a[href*="/a/"]',
            // 成功页面的链接
            '.published-url a',
            '.success-url a',
            '.article-link',
            '.post-link',
            // 结果区域的链接
            '[class*="result"] a',
            '[class*="success"] a',
            '[class*="link"] a',
            // 按钮形式的链接
            'a[href*="toutiao.com"]',
            'a[href*="baijiahao.baidu.com"]',
            'a[href*="weibo.com"]',
            'a[href*="xiaohongshu.com"]',
          ];
          
          for (const sel of linkSelectors) {
            try {
              const elements = document.querySelectorAll(sel);
              for (const el of elements) {
                if (el && el.href) {
                  // 排除发布相关页面
                  const href = el.href;
                  if (href.includes('/publish') || 
                      href.includes('/create') || 
                      href.includes('/edit') ||
                      href.includes('/draft')) {
                    continue;
                  }
                  console.log('[AutoPublisher] ✅ 找到发布链接:', sel, '->', href);
                  return href;
                }
              }
            } catch (e) {
              console.log('[AutoPublisher] 选择器查询失败:', sel, e);
            }
          }
          
          // 尝试从页面文本中查找 URL
          const urlPatterns = [
            /https?:\\/\\/baike\\.toutiao\\.com\\/detail\\/[^\\s<>"]+/g,
            /https?:\\/\\/www\\.toutiao\\.com\\/a\\d+/g,
            /https?:\\/\\/baijiahao\\.baidu\\.com\\/s\\?id=[^\\s<>"]+/g,
            /https?:\\/\\/weibo\\.com\\/\\d+\\/[^\\s<>"]+/g,
            /https?:\\/\\/www\\.xiaohongshu\\.com\\/explore\\/[^\\s<>"]+/g,
          ];
          
          const pageText = document.body.innerText;
          for (const pattern of urlPatterns) {
            const matches = pageText.match(pattern);
            if (matches && matches.length > 0) {
              console.log('[AutoPublisher] ✅ 从页面文本中找到 URL:', matches[0]);
              return matches[0];
            }
          }
          
          // 尝试从输入框或隐藏字段中获取
          const inputSelectors = [
            'input[name="url"]',
            'input[name="article_url"]',
            'input[name="post_url"]',
            'input[type="url"]',
          ];
          
          for (const sel of inputSelectors) {
            const input = document.querySelector(sel);
            if (input && input.value) {
              console.log('[AutoPublisher] ✅ 从输入框找到 URL:', input.value);
              return input.value;
            }
          }
          
          console.log('[AutoPublisher] ❌ 未能从页面提取到发布 URL');
          return null;
        })();
      `;
      
      const url = await window.webContents.executeJavaScript(script);
      console.log(`[AutoPublisher] 获取到的 URL: ${url || '无'}`);
      return url || undefined;
    } catch (e) {
      console.error('[AutoPublisher] 获取发布 URL 失败:', e);
      return undefined;
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 停止发布
   */
  stop(platform?: string): void {
    if (platform) {
      const win = this.publishWindows.get(platform);
      if (win && !win.isDestroyed()) {
        win.close();
        this.publishWindows.delete(platform);
      }
    } else {
      for (const [plat, win] of this.publishWindows) {
        if (!win.isDestroyed()) {
          win.close();
        }
      }
      this.publishWindows.clear();
    }
  }

  /**
   * 获取平台配置（静态方法，用于快速检查）
   * 注意：此方法返回本地兜底配置，实际发布时会优先使用API配置
   */
  static getPlatformConfig(platform: string): PlatformConfig | undefined {
    return PLATFORM_PUBLISH_CONFIG[platform];
  }

  /**
   * 获取所有支持的平台
   */
  static getSupportedPlatforms(): string[] {
    // 返回本地配置支持的平台
    // 实际支持的平台可能更多（来自API配置）
    return Object.keys(PLATFORM_PUBLISH_CONFIG);
  }
}

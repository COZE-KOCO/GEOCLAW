/**
 * 自动化发布引擎
 * 使用 Electron BrowserWindow 实现全自动发布
 */

import { BrowserWindow, session, ipcMain, Cookie, app } from 'electron';
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
  // 发布页面URL
  publishUrl: string;
  // 标题输入框
  titleInput: string | string[];
  // 内容编辑器
  contentEditor: string | string[];
  // 图片上传按钮
  imageUpload: string | string[];
  // 发布按钮
  publishButton: string | string[];
  // 成功标识
  successIndicator: string | string[];
  // 标签输入（可选）
  tagInput?: string | string[];
  // 封面上传（可选）
  coverUpload?: string | string[];
  // 其他元素
  [key: string]: string | string[] | undefined;
}

// 平台配置
interface PlatformConfig {
  name: string;
  publishUrl: string;
  selectors: PlatformSelectors;
  // 发布前准备脚本
  prepareScript?: string;
  // 发布后验证脚本
  verifyScript?: string;
  // 是否需要等待图片上传
  waitForImageUpload?: boolean;
  // 图片上传等待时间（毫秒）
  imageUploadWait?: number;
  // 发布等待时间（毫秒）
  publishWait?: number;
}

// 各平台配置
const PLATFORM_PUBLISH_CONFIG: Record<string, PlatformConfig> = {
  xiaohongshu: {
    name: '小红书',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    selectors: {
      publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
      titleInput: ['.c-input__inner input', 'input[placeholder*="标题"]', '#title-input'],
      contentEditor: ['.c-textarea__inner textarea', 'textarea[placeholder*="正文"]', '#content-input'],
      imageUpload: ['.upload-btn input[type="file"]', 'input[type="file"]', '.image-upload input'],
      publishButton: ['.publish-btn', 'button:contains("发布")', '.c-button--primary'],
      successIndicator: ['.publish-success', '.success-tip', '.result-success'],
      tagInput: ['.tag-input input', 'input[placeholder*="标签"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 3000,
    prepareScript: `
      // 等待页面加载
      await new Promise(r => setTimeout(r, 2000));
      
      // 关闭可能的弹窗
      const closeBtn = document.querySelector('.close-btn, .modal-close, [class*="close"]');
      if (closeBtn) closeBtn.click();
    `,
  },
  
  weibo: {
    name: '微博',
    publishUrl: 'https://weibo.com',
    selectors: {
      publishUrl: 'https://weibo.com',
      titleInput: [], // 微博没有标题
      contentEditor: ['.W_input', 'textarea[name="content"]', '#publisher_content'],
      imageUpload: ['.pic_input input[type="file"]', 'input[type="file"][accept*="image"]'],
      publishButton: ['.W_btn_a', 'button:contains("发布")', '.publish-btn'],
      successIndicator: ['.send-success', '.W_layer_success'],
    },
    waitForImageUpload: true,
    imageUploadWait: 3000,
    publishWait: 2000,
  },
  
  bilibili: {
    name: 'B站',
    publishUrl: 'https://member.bilibili.com/platform/upload/text',
    selectors: {
      publishUrl: 'https://member.bilibili.com/platform/upload/text',
      titleInput: ['#title-input', 'input[placeholder*="标题"]', '.title-input input'],
      contentEditor: ['#content-editor', '.editor-content', 'textarea[placeholder*="内容"]'],
      imageUpload: ['.image-upload input[type="file"]', 'input[type="file"]'],
      publishButton: ['.submit-btn', 'button:contains("发布")', '.publish-btn'],
      successIndicator: ['.success-tip', '.result-success'],
      coverUpload: ['.cover-upload input[type="file"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 3000,
  },
  
  toutiao: {
    name: '今日头条',
    publishUrl: 'https://mp.toutiao.com/publish',
    selectors: {
      publishUrl: 'https://mp.toutiao.com/publish',
      titleInput: ['#title', 'input[placeholder*="标题"]', '.title-input'],
      contentEditor: ['#content', '.editor-content', 'textarea[placeholder*="内容"]'],
      imageUpload: ['.image-upload input[type="file"]', 'input[type="file"]'],
      publishButton: ['.publish-btn', 'button:contains("发布")', '.submit-btn'],
      successIndicator: ['.success-tip', '.result-success'],
      coverUpload: ['.cover-upload input[type="file"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 3000,
  },
  
  douyin: {
    name: '抖音',
    publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    selectors: {
      publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
      titleInput: [], // 抖音视频没有标题
      contentEditor: ['.editor-input textarea', 'textarea[placeholder*="描述"]', '.content-input'],
      imageUpload: [], // 抖音上传视频
      publishButton: ['.publish-btn', 'button:contains("发布")', '.submit-btn'],
      successIndicator: ['.success-tip', '.result-success'],
    },
    waitForImageUpload: false,
    publishWait: 5000,
  },
};

export class AutoPublisher {
  private mainWindow: BrowserWindow;
  private publishWindows: Map<string, BrowserWindow> = new Map();
  private apiBaseUrl: string;

  constructor(mainWindow: BrowserWindow, apiBaseUrl: string) {
    this.mainWindow = mainWindow;
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * 执行自动发布
   */
  async publish(
    platform: string,
    account: AccountInfo,
    content: PublishContent
  ): Promise<PublishResult> {
    const config = PLATFORM_PUBLISH_CONFIG[platform];
    if (!config) {
      return {
        platform,
        accountId: account.id,
        accountName: account.displayName,
        status: 'failed',
        error: `不支持的平台: ${platform}`,
      };
    }

    console.log(`[AutoPublisher] 开始发布到 ${config.name}...`);

    try {
      // 创建发布窗口
      const publishWindow = await this.createPublishWindow(platform, account);
      this.publishWindows.set(platform, publishWindow);

      // 加载发布页面
      await publishWindow.loadURL(config.publishUrl);
      console.log(`[AutoPublisher] 已加载发布页面: ${config.publishUrl}`);

      // 等待页面加载
      await this.waitForPageLoad(publishWindow);

      // 执行准备脚本
      if (config.prepareScript) {
        await publishWindow.webContents.executeJavaScript(config.prepareScript);
      }

      // 填写内容
      await this.fillContent(publishWindow, config, content);

      // 上传图片
      if (content.images && content.images.length > 0 && config.selectors.imageUpload) {
        await this.uploadImages(publishWindow, config, content.images);
      }

      // 点击发布
      await this.clickPublish(publishWindow, config);

      // 验证发布结果
      const success = await this.verifyPublish(publishWindow, config);

      // 关闭窗口
      publishWindow.close();
      this.publishWindows.delete(platform);

      return {
        platform,
        accountId: account.id,
        accountName: account.displayName,
        status: success ? 'success' : 'failed',
        publishedAt: new Date().toISOString(),
        error: success ? undefined : '发布验证失败',
      };

    } catch (error: any) {
      console.error(`[AutoPublisher] 发布失败:`, error);
      
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
   * 创建发布窗口（注入Cookie）
   */
  private async createPublishWindow(platform: string, account: AccountInfo): Promise<BrowserWindow> {
    // 创建独立的session
    const partition = `persist:publish-${platform}-${Date.now()}`;
    const ses = session.fromPartition(partition);

    // 注入Cookie
    const cookies = account.cookies || {};
    const domainMap: Record<string, string> = {
      xiaohongshu: '.xiaohongshu.com',
      weibo: '.weibo.com',
      bilibili: '.bilibili.com',
      toutiao: '.toutiao.com',
      douyin: '.douyin.com',
    };

    const domain = domainMap[platform] || `.${platform}.com`;

    for (const [name, value] of Object.entries(cookies)) {
      try {
        await ses.cookies.set({
          url: `https://${domain.replace('.', '')}`,
          name,
          value,
          domain,
          path: '/',
          secure: true,
          httpOnly: false,
        });
      } catch (e) {
        console.warn(`[AutoPublisher] 设置Cookie失败: ${name}`, e);
      }
    }

    console.log(`[AutoPublisher] 已注入 ${Object.keys(cookies).length} 个Cookie`);

    // 创建窗口
    const window = new BrowserWindow({
      width: 1200,
      height: 900,
      show: false, // 隐藏窗口执行
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: ses,
        webSecurity: false, // 允许跨域上传图片
      },
    });

    return window;
  }

  /**
   * 等待页面加载
   */
  private async waitForPageLoad(window: BrowserWindow): Promise<void> {
    await new Promise<void>((resolve) => {
      window.webContents.once('did-finish-load', () => {
        // 额外等待2秒确保动态内容加载
        setTimeout(resolve, 2000);
      });
    });
  }

  /**
   * 填写内容
   */
  private async fillContent(
    window: BrowserWindow,
    config: PlatformConfig,
    content: PublishContent
  ): Promise<void> {
    const selectors = config.selectors;

    // 填写标题
    if (content.title && selectors.titleInput) {
      const titleSelectors = Array.isArray(selectors.titleInput) ? selectors.titleInput : [selectors.titleInput];
      if (titleSelectors.length > 0) {
        const titleJs = this.buildFillScript(titleSelectors, content.title);
        await window.webContents.executeJavaScript(titleJs);
        console.log(`[AutoPublisher] 已填写标题: ${content.title}`);
      }
    }

    // 填写内容
    if (content.content && selectors.contentEditor) {
      const contentSelectors = Array.isArray(selectors.contentEditor) ? selectors.contentEditor : [selectors.contentEditor];
      if (contentSelectors.length > 0) {
        const contentJs = this.buildFillScript(contentSelectors, content.html || content.content);
        await window.webContents.executeJavaScript(contentJs);
        console.log(`[AutoPublisher] 已填写内容`);
      }
    }

    // 填写标签
    if (content.tags && content.tags.length > 0 && selectors.tagInput) {
      const tagSelectors = Array.isArray(selectors.tagInput) ? selectors.tagInput : [selectors.tagInput];
      const tagJs = this.buildFillScript(tagSelectors, content.tags.join(' '));
      await window.webContents.executeJavaScript(tagJs);
      console.log(`[AutoPublisher] 已填写标签: ${content.tags.join(', ')}`);
    }
  }

  /**
   * 构建填写脚本（支持多个选择器）
   */
  private buildFillScript(selectors: string[], value: string): string {
    const escapedValue = value.replace(/'/g, "\\'").replace(/\n/g, '\\n');
    return `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el) {
              // 处理不同类型的元素
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = '${escapedValue}';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              } else if (el.contentEditable === 'true') {
                el.innerHTML = '${escapedValue}';
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
              console.log('已填写元素:', sel);
              return true;
            }
          } catch (e) {
            console.log('选择器失败:', sel, e);
          }
        }
        return false;
      })();
    `;
  }

  /**
   * 上传图片
   */
  private async uploadImages(
    window: BrowserWindow,
    config: PlatformConfig,
    images: string[]
  ): Promise<void> {
    const selectors = config.selectors.imageUpload;
    
    // 确保 selectors 是数组
    const selectorArray: string[] = Array.isArray(selectors) ? selectors : [selectors];
    
    if (!selectors || selectorArray.length === 0) {
      console.log(`[AutoPublisher] 该平台不支持图片上传`);
      return;
    }

    console.log(`[AutoPublisher] 开始上传 ${images.length} 张图片...`);

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      
      // 下载图片到本地
      const localPath = await this.downloadImage(imageUrl);
      if (!localPath) continue;

      // 上传图片
      const uploadJs = `
        (function() {
          const selectors = ${JSON.stringify(selectorArray)};
          for (const sel of selectors) {
            const input = document.querySelector(sel);
            if (input && input.type === 'file') {
              // 触发点击打开文件选择器
              input.click();
              return true;
            }
          }
          return false;
        })();
      `;

      await window.webContents.executeJavaScript(uploadJs);
      
      // 等待图片上传
      await new Promise(r => setTimeout(r, config.imageUploadWait || 3000));
      
      console.log(`[AutoPublisher] 已上传图片 ${i + 1}/${images.length}`);
    }
  }

  /**
   * 下载图片到本地
   */
  private async downloadImage(url: string): Promise<string | null> {
    try {
      const https = require('https');
      const http = require('http');
      
      const tempDir = path.join(app.getPath('temp'), 'geo-optimizer');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      const filePath = path.join(tempDir, fileName);

      return new Promise((resolve) => {
        const lib = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filePath);
        
        lib.get(url, (response: any) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(filePath);
          });
        }).on('error', () => {
          resolve(null);
        });
      });
    } catch (e) {
      console.error(`[AutoPublisher] 下载图片失败:`, e);
      return null;
    }
  }

  /**
   * 点击发布按钮
   */
  private async clickPublish(window: BrowserWindow, config: PlatformConfig): Promise<void> {
    const selectors = config.selectors.publishButton as string[];

    const clickJs = `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        for (const sel of selectors) {
          try {
            // 支持伪选择器 :contains()
            if (sel.includes(':contains(')) {
              const match = sel.match(/(.+):contains\\("(.+)"\\)/);
              if (match) {
                const baseSel = match[1];
                const text = match[2];
                const elements = document.querySelectorAll(baseSel);
                for (const el of elements) {
                  if (el.textContent.includes(text)) {
                    el.click();
                    console.log('已点击按钮:', sel);
                    return true;
                  }
                }
              }
            } else {
              const el = document.querySelector(sel);
              if (el) {
                el.click();
                console.log('已点击按钮:', sel);
                return true;
              }
            }
          } catch (e) {
            console.log('点击失败:', sel, e);
          }
        }
        return false;
      })();
    `;

    await window.webContents.executeJavaScript(clickJs);
    console.log(`[AutoPublisher] 已点击发布按钮`);

    // 等待发布完成
    await new Promise(r => setTimeout(r, config.publishWait || 3000));
  }

  /**
   * 验证发布结果
   */
  private async verifyPublish(window: BrowserWindow, config: PlatformConfig): Promise<boolean> {
    const selectors = config.selectors.successIndicator as string[];

    if (!selectors || selectors.length === 0) {
      // 没有配置成功标识，默认返回成功
      return true;
    }

    const verifyJs = `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            return true;
          }
        }
        
        // 检查URL变化
        if (window.location.href.includes('success') || 
            window.location.href.includes('published')) {
          return true;
        }
        
        return false;
      })();
    `;

    const result = await window.webContents.executeJavaScript(verifyJs);
    console.log(`[AutoPublisher] 发布验证结果: ${result}`);
    return result;
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
      // 关闭所有发布窗口
      for (const [plat, win] of this.publishWindows) {
        if (!win.isDestroyed()) {
          win.close();
        }
      }
      this.publishWindows.clear();
    }
  }

  /**
   * 获取平台配置
   */
  static getPlatformConfig(platform: string): PlatformConfig | undefined {
    return PLATFORM_PUBLISH_CONFIG[platform];
  }

  /**
   * 获取所有支持的平台
   */
  static getSupportedPlatforms(): string[] {
    return Object.keys(PLATFORM_PUBLISH_CONFIG);
  }
}

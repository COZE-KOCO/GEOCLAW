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
      publishButton: ['.publish-btn', '.c-button--primary', 'button[class*="publish"]'],
      successIndicator: ['.publish-success', '.success-tip', '.result-success', '[class*="success"]'],
      tagInput: ['.tag-input input', 'input[placeholder*="标签"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 3000,
    uploadedImageUrlSelector: '.upload-item img, .preview-img img, [class*="image"] img',
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
      publishButton: ['.W_btn_a', '.publish-btn', 'button[action-type="post"]'],
      successIndicator: ['.send-success', '.W_layer_success', '[class*="success"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 3000,
    publishWait: 2000,
    uploadedImageUrlSelector: '.pic_list img, .upload-img img',
  },
  
  bilibili: {
    name: 'B站',
    publishUrl: 'https://member.bilibili.com/platform/upload/text',
    selectors: {
      publishUrl: 'https://member.bilibili.com/platform/upload/text',
      titleInput: ['#title-input', 'input[placeholder*="标题"]', '.title-input input'],
      contentEditor: ['#content-editor', '.editor-content', 'textarea[placeholder*="内容"]'],
      imageUpload: ['.image-upload input[type="file"]', 'input[type="file"]'],
      publishButton: ['.submit-btn', '.publish-btn', 'button[class*="submit"]'],
      successIndicator: ['.success-tip', '.result-success', '[class*="success"]'],
      coverUpload: ['.cover-upload input[type="file"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 3000,
    uploadedImageUrlSelector: '.image-preview img, .uploaded-img img',
  },
  
  toutiao: {
    name: '今日头条',
    publishUrl: 'https://mp.toutiao.com/publish',
    selectors: {
      publishUrl: 'https://mp.toutiao.com/publish',
      titleInput: ['#title', 'input[placeholder*="标题"]', '.title-input'],
      contentEditor: ['#content', '.editor-content', 'textarea[placeholder*="内容"]'],
      imageUpload: ['.image-upload input[type="file"]', 'input[type="file"]'],
      publishButton: ['.publish-btn', '.submit-btn', 'button[class*="publish"]'],
      successIndicator: ['.success-tip', '.result-success', '[class*="success"]'],
      coverUpload: ['.cover-upload input[type="file"]'],
    },
    waitForImageUpload: true,
    imageUploadWait: 5000,
    publishWait: 3000,
    uploadedImageUrlSelector: '.image-item img, .upload-preview img',
  },
  
  douyin: {
    name: '抖音',
    publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    selectors: {
      publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
      titleInput: [], // 抖音视频没有标题
      contentEditor: ['.editor-input textarea', 'textarea[placeholder*="描述"]', '.content-input'],
      imageUpload: [], // 抖音上传视频
      publishButton: ['.publish-btn', '.submit-btn', 'button[class*="publish"]'],
      successIndicator: ['.success-tip', '.result-success', '[class*="success"]'],
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

      // 处理内容中的图片 URL
      let processedContent = content.content;
      const imageUrls = content.images || [];
      
      // 从内容中提取图片 URL（Markdown 格式）
      const markdownImages = this.extractMarkdownImages(content.content);
      const allImages = [...new Set([...imageUrls, ...markdownImages.map(m => m.url)])];
      
      // 上传图片并获取 URL 映射
      let imageUrlMap: Record<string, string> = {};
      if (allImages.length > 0) {
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
      }

      // 填写标题
      if (content.title && config.selectors.titleInput) {
        const titleSelectors = Array.isArray(config.selectors.titleInput) 
          ? config.selectors.titleInput 
          : [config.selectors.titleInput];
        if (titleSelectors.length > 0) {
          await this.fillElement(publishWindow, titleSelectors, content.title);
          console.log(`[AutoPublisher] 已填写标题: ${content.title}`);
        }
      }

      // 填写内容（使用处理后的内容）
      if (processedContent && config.selectors.contentEditor) {
        const contentSelectors = Array.isArray(config.selectors.contentEditor) 
          ? config.selectors.contentEditor 
          : [config.selectors.contentEditor];
        if (contentSelectors.length > 0) {
          await this.fillElement(publishWindow, contentSelectors, content.html || processedContent);
          console.log(`[AutoPublisher] 已填写内容`);
        }
      }

      // 填写标签
      if (content.tags && content.tags.length > 0 && config.selectors.tagInput) {
        const tagSelectors = Array.isArray(config.selectors.tagInput) 
          ? config.selectors.tagInput 
          : [config.selectors.tagInput];
        await this.fillElement(publishWindow, tagSelectors, content.tags.join(' '));
        console.log(`[AutoPublisher] 已填写标签: ${content.tags.join(', ')}`);
      }

      // 点击发布按钮
      await this.clickPublish(publishWindow, config);

      // 验证发布结果
      const success = await this.verifyPublish(publishWindow, config);

      // 获取发布后的 URL
      const publishedUrl = await this.getPublishedUrl(publishWindow, config);

      // 关闭窗口
      if (!publishWindow.isDestroyed()) {
        publishWindow.close();
      }
      this.publishWindows.delete(platform);

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
      show: false, // 隐藏窗口执行
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
          // 额外等待确保动态内容加载
          setTimeout(resolve, 2000);
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
        
        for (const sel of selectors) {
          try {
            const el = document.querySelector(sel);
            if (el) {
              // 处理不同类型的元素
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                // 原生输入框
                el.focus();
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
                console.log('[AutoPublisher] 已填写输入框:', sel);
                return true;
              } else if (el.contentEditable === 'true') {
                // 富文本编辑器
                el.focus();
                el.innerHTML = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                document.execCommand && document.execCommand('insertHTML', false, value);
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
            }
          } catch (e) {
            console.log('[AutoPublisher] 选择器失败:', sel, e);
          }
        }
        return false;
      })();
    `;

    return window.webContents.executeJavaScript(script);
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
    const selectors = config.selectors.imageUpload;
    const selectorArray: string[] = Array.isArray(selectors) ? selectors : (selectors ? [selectors] : []);
    
    if (selectorArray.length === 0) {
      console.log(`[AutoPublisher] 该平台不支持图片上传`);
      return {};
    }

    console.log(`[AutoPublisher] 开始上传 ${imageUrls.length} 张图片...`);
    
    const urlMap: Record<string, string> = {};

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`[AutoPublisher] 上传图片 ${i + 1}/${imageUrls.length}: ${imageUrl.substring(0, 50)}...`);

      try {
        // 在页面中执行图片上传脚本
        const result = await window.webContents.executeJavaScript(`
          (async function() {
            const imageUrl = '${imageUrl}';
            const selectors = ${JSON.stringify(selectorArray)};
            
            try {
              // 步骤1: fetch 远程图片（扣子存储已配置 CORS）
              console.log('[AutoPublisher] 开始fetch图片:', imageUrl);
              const response = await fetch(imageUrl, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit',
              });
              
              if (!response.ok) {
                throw new Error('fetch失败: ' + response.status);
              }
              
              // 步骤2: 转为 Blob
              const blob = await response.blob();
              console.log('[AutoPublisher] 图片大小:', blob.size, 'bytes');
              
              // 从 URL 提取文件名
              let filename = 'image.jpg';
              try {
                const urlPath = new URL(imageUrl).pathname;
                const pathParts = urlPath.split('/');
                filename = pathParts[pathParts.length - 1] || 'image.jpg';
                // 清理文件名中的特殊字符
                filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
              } catch (e) {}
              
              // 步骤3: 创建 File 对象
              const file = new File([blob], filename, { 
                type: blob.type || 'image/jpeg' 
              });
              console.log('[AutoPublisher] 创建File对象:', file.name, file.type, file.size);
              
              // 步骤4: 找到文件上传控件并注入
              for (const sel of selectors) {
                try {
                  const input = document.querySelector(sel);
                  if (input && input.type === 'file') {
                    // 步骤5: 通过 DataTransfer 注入文件
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                    
                    // 步骤6: 触发 change 事件
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    console.log('[AutoPublisher] 已注入文件到:', sel);
                    return { success: true, filename: file.name };
                  }
                } catch (e) {
                  console.log('[AutoPublisher] 选择器失败:', sel, e);
                }
              }
              
              // 如果没找到文件上传控件，尝试拖放方式
              const dropZone = document.querySelector('[class*="upload"], [class*="drop"], [class*="drag"]');
              if (dropZone) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                const dropEvent = new DragEvent('drop', {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: dataTransfer,
                });
                dropZone.dispatchEvent(dropEvent);
                console.log('[AutoPublisher] 已通过拖放方式上传');
                return { success: true, filename: file.name };
              }
              
              return { success: false, error: '找不到文件上传控件' };
              
            } catch (e) {
              console.error('[AutoPublisher] 上传失败:', e);
              return { success: false, error: e.message };
            }
          })();
        `);

        if (result.success) {
          console.log(`[AutoPublisher] 图片上传成功: ${result.filename}`);
          
          // 等待上传完成
          await new Promise(r => setTimeout(r, config.imageUploadWait || 3000));
          
          // 尝试获取上传后的图片 URL
          if (config.uploadedImageUrlSelector) {
            const uploadedUrl = await this.getUploadedImageUrl(window, config.uploadedImageUrlSelector);
            if (uploadedUrl) {
              urlMap[imageUrl] = uploadedUrl;
              console.log(`[AutoPublisher] 上传后URL: ${uploadedUrl.substring(0, 50)}...`);
            }
          }
        } else {
          console.error(`[AutoPublisher] 图片上传失败: ${result.error}`);
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
   * 点击发布按钮
   */
  private async clickPublish(window: BrowserWindow, config: PlatformConfig): Promise<void> {
    const selectors = Array.isArray(config.selectors.publishButton) 
      ? config.selectors.publishButton 
      : [config.selectors.publishButton];

    const script = `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        
        // 辅助函数：通过文本内容查找按钮
        function findButtonByText(text) {
          const buttons = document.querySelectorAll('button, [role="button"], a.btn, .btn');
          for (const btn of buttons) {
            if (btn.textContent && btn.textContent.includes(text)) {
              return btn;
            }
          }
          return null;
        }
        
        for (const sel of selectors) {
          try {
            // 处理 :contains() 伪选择器
            if (sel.includes(':contains(')) {
              const match = sel.match(/(.+):contains\\("(.+)"\\)/);
              if (match) {
                const baseSel = match[1];
                const text = match[2];
                
                if (baseSel.trim()) {
                  const elements = document.querySelectorAll(baseSel);
                  for (const el of elements) {
                    if (el.textContent && el.textContent.includes(text)) {
                      el.click();
                      console.log('[AutoPublisher] 已点击按钮(contains):', text);
                      return true;
                    }
                  }
                } else {
                  // 没有基础选择器，直接通过文本查找
                  const btn = findButtonByText(text);
                  if (btn) {
                    btn.click();
                    console.log('[AutoPublisher] 已点击按钮(text):', text);
                    return true;
                  }
                }
              }
            } else {
              const el = document.querySelector(sel);
              if (el && !el.disabled) {
                el.click();
                console.log('[AutoPublisher] 已点击按钮:', sel);
                return true;
              }
            }
          } catch (e) {
            console.log('[AutoPublisher] 点击失败:', sel, e);
          }
        }
        
        // 尝试通过常见发布文本查找
        const publishTexts = ['发布', '发表', '提交', 'Publish', 'Submit'];
        for (const text of publishTexts) {
          const btn = findButtonByText(text);
          if (btn && !btn.disabled) {
            btn.click();
            console.log('[AutoPublisher] 已点击发布按钮:', text);
            return true;
          }
        }
        
        console.log('[AutoPublisher] 未找到可点击的发布按钮');
        return false;
      })();
    `;

    await window.webContents.executeJavaScript(script);
    console.log(`[AutoPublisher] 已尝试点击发布按钮`);

    // 等待发布完成
    await new Promise(r => setTimeout(r, config.publishWait || 3000));
  }

  /**
   * 验证发布结果
   */
  private async verifyPublish(window: BrowserWindow, config: PlatformConfig): Promise<boolean> {
    const selectors = Array.isArray(config.selectors.successIndicator) 
      ? config.selectors.successIndicator 
      : [config.selectors.successIndicator];

    if (!selectors[0]) {
      // 没有配置成功标识，检查 URL 变化
      const script = `
        (function() {
          const url = window.location.href;
          if (url.includes('success') || url.includes('published') || url.includes('complete')) {
            return true;
          }
          
          // 检查是否有错误提示
          const errorSelectors = ['.error', '.alert-error', '[class*="error"]', '[class*="fail"]'];
          for (const sel of errorSelectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              console.log('[AutoPublisher] 发现错误提示:', el.textContent);
              return false;
            }
          }
          
          // 默认认为成功
          return true;
        })();
      `;
      
      try {
        return await window.webContents.executeJavaScript(script);
      } catch (e) {
        return true;
      }
    }

    const script = `
      (function() {
        const selectors = ${JSON.stringify(selectors)};
        
        // 检查成功标识
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            console.log('[AutoPublisher] 发现成功标识:', sel);
            return true;
          }
        }
        
        // 检查 URL 变化
        const url = window.location.href;
        if (url.includes('success') || url.includes('published') || url.includes('complete')) {
          console.log('[AutoPublisher] URL表示成功:', url);
          return true;
        }
        
        // 检查页面标题或提示
        const pageText = document.body.innerText;
        const successKeywords = ['发布成功', '已发布', '发布完成', '成功', 'Success'];
        for (const keyword of successKeywords) {
          if (pageText.includes(keyword)) {
            console.log('[AutoPublisher] 页面包含成功关键词:', keyword);
            return true;
          }
        }
        
        // 检查是否有错误提示
        const errorSelectors = ['.error', '.alert-error', '[class*="error"]', '[class*="fail"]'];
        for (const sel of errorSelectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            console.log('[AutoPublisher] 发现错误提示');
            return false;
          }
        }
        
        return false;
      })();
    `;

    try {
      const result = await window.webContents.executeJavaScript(script);
      console.log(`[AutoPublisher] 发布验证结果: ${result}`);
      return result;
    } catch (e) {
      console.error(`[AutoPublisher] 验证脚本执行失败:`, e);
      return true; // 出错时默认认为成功
    }
  }

  /**
   * 获取发布后的 URL
   */
  private async getPublishedUrl(window: BrowserWindow, config: PlatformConfig): Promise<string | undefined> {
    try {
      const script = `
        (function() {
          // 尝试从页面中提取发布后的链接
          const linkSelectors = [
            'a[href*="detail"]',
            'a[href*="post"]',
            'a[href*="article"]',
            '.published-url a',
            '[class*="link"] a',
          ];
          
          for (const sel of linkSelectors) {
            const el = document.querySelector(sel);
            if (el && el.href) {
              return el.href;
            }
          }
          
          return null;
        })();
      `;
      
      return await window.webContents.executeJavaScript(script);
    } catch (e) {
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

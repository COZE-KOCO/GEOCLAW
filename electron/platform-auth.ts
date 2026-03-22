import { BrowserWindow, session, Session, Cookie, app, ipcMain } from 'electron';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

// 平台登录配置
const PLATFORM_CONFIG = {
  wechat: {
    name: '微信公众号',
    loginUrl: 'https://mp.weixin.qq.com',
    loginSuccessUrl: 'mp.weixin.qq.com/cgi-bin/home',
    loginSuccessKeywords: ['首页', '新建图文', '素材管理'],
    iconUrl: 'https://img.icons8.com/color/48/weixin.png',
    cookieKeys: ['slave_sid', 'slave_user', 'wxtoken1', 'token', 'data_ticket'],
  },
  zhihu: {
    name: '知乎',
    loginUrl: 'https://www.zhihu.com/signin',
    loginSuccessUrl: 'zhihu.com/',
    loginSuccessKeywords: ['关注', '推荐', '热榜'],
    iconUrl: 'https://img.icons8.com/color/48/zhihu.png',
    cookieKeys: ['z_c0', '_zap', 'd_c0', 'q_c1'],
  },
  weibo: {
    name: '微博',
    loginUrl: 'https://weibo.com/newlogin',
    loginSuccessUrl: 'weibo.com/',
    loginSuccessKeywords: ['首页', '热门', '关注'],
    iconUrl: 'https://img.icons8.com/color/48/weibo.png',
    cookieKeys: ['SUB', 'SUBP', 'ALF', 'SINAGLOBAL'],
  },
  toutiao: {
    name: '今日头条',
    loginUrl: 'https://mp.toutiao.com/auth/page/login',
    loginSuccessUrl: 'mp.toutiao.com/',
    loginSuccessKeywords: ['创作', '发布', '内容管理'],
    iconUrl: 'https://img.icons8.com/color/48/toutiao.png',
    cookieKeys: ['sessionid', 'tt_webid', 'tt_csrf_token', 'ttwid', 'sso_uid_tt'],
  },
  bilibili: {
    name: 'B站',
    loginUrl: 'https://passport.bilibili.com/login',
    loginSuccessUrl: 'bilibili.com/',
    loginSuccessKeywords: ['动态', '消息', '收藏'],
    iconUrl: 'https://img.icons8.com/color/48/bilibili.png',
    cookieKeys: ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5'],
  },
  xiaohongshu: {
    name: '小红书',
    loginUrl: 'https://creator.xiaohongshu.com/login',
    loginSuccessUrl: 'creator.xiaohongshu.com/',
    loginSuccessKeywords: ['发布', '创作', '数据'],
    iconUrl: 'https://img.icons8.com/color/48/xiaohongshu.png',
    cookieKeys: ['web_session', 'webId', 'a1', 'websec_token'],
  },
  douyin: {
    name: '抖音',
    loginUrl: 'https://creator.douyin.com/login',
    loginSuccessUrl: 'creator.douyin.com/creator-micro',
    loginSuccessKeywords: ['发布', '创作', '数据'],
    iconUrl: 'https://img.icons8.com/color/48/tiktok.png',
    cookieKeys: ['sessionid', 'passport_csrf_token', 'sid_guard', 'uid_tt'],
  },
};

interface SavedAccount {
  id: string;
  platform: string;
  platformName: string;
  name: string;
  avatar?: string;
  fansCount?: number;
  cookies: Record<string, string>;
  createdAt: number;
  lastUsed: number;
}

interface AppConfig {
  apiBaseUrl: string;
}

export class PlatformAuthManager {
  private mainWindow: BrowserWindow;
  private session: typeof session;
  private apiBaseUrl: string;
  private loginWindows: Map<string, BrowserWindow> = new Map();
  private config: AppConfig;
  private currentBusinessId: string = 'default';
  private loginResolvers: Map<string, (result: { success: boolean; account?: SavedAccount; error?: string }) => void> = new Map();

  constructor(mainWindow: BrowserWindow, sessionModule: typeof session) {
    this.mainWindow = mainWindow;
    this.session = sessionModule;
    this.config = this.loadConfig();
    this.apiBaseUrl = this.config.apiBaseUrl;
    console.log('[Electron] API地址:', this.apiBaseUrl);
    this.registerHandlers();
  }

  // 注册 IPC 处理器
  private registerHandlers() {
    // 手动确认登录
    ipcMain.handle('login-confirm', async (_, platform: string) => {
      console.log(`[Electron] 收到 ${platform} 的手动确认登录请求`);
      return this.handleManualConfirm(platform);
    });

    // 页面加载通知
    ipcMain.on('login-page-loaded', (_, data: { url: string; title: string }) => {
      console.log(`[Electron] 登录页面加载: ${data.url}, 标题: ${data.title}`);
    });

    // 登录检测通知
    ipcMain.on('login-detected', (_, data: { platform: string; method: string }) => {
      console.log(`[Electron] 检测到登录: ${data.platform}, 方式: ${data.method}`);
    });
  }

  // 处理手动确认
  private async handleManualConfirm(platform: string): Promise<{ success: boolean; error?: string }> {
    const loginWindow = this.loginWindows.get(platform);
    if (!loginWindow || loginWindow.isDestroyed()) {
      return { success: false, error: '登录窗口已关闭' };
    }

    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    const ses = loginWindow.webContents.session;

    // 获取所有 Cookie
    const cookies = await ses.cookies.get({});
    console.log(`[Electron] ${platform} 当前Cookie数量: ${cookies.length}`);

    // 验证关键 Cookie
    const foundKeys = config.cookieKeys.filter(key =>
      cookies.some(c => c.name === key && c.value && c.value.length > 5)
    );

    if (foundKeys.length < 1) {
      return { success: false, error: '未检测到登录信息，请先完成登录' };
    }

    console.log(`[Electron] 发现关键Cookie: ${foundKeys.join(', ')}`);

    // 保存账号
    const account = await this.saveAccountToAPI(platform, cookies, this.currentBusinessId);

    // 解析 Promise
    const resolver = this.loginResolvers.get(platform);
    if (resolver) {
      resolver({ success: true, account });
      this.loginResolvers.delete(platform);
    }

    // 关闭窗口
    if (!loginWindow.isDestroyed()) {
      loginWindow.close();
    }

    return { success: true };
  }

  // 加载配置
  private loadConfig(): AppConfig {
    if (process.env.API_BASE_URL) {
      return { apiBaseUrl: process.env.API_BASE_URL };
    }

    const configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (config.apiBaseUrl) {
          return { apiBaseUrl: config.apiBaseUrl };
        }
      } catch (e) {
        console.warn('[Electron] 配置文件解析失败:', e);
      }
    }

    if (!app.isPackaged) {
      return { apiBaseUrl: 'http://localhost:5000' };
    }

    return { apiBaseUrl: 'http://localhost:5000' };
  }

  private getConfigPath(): string {
    return path.join(app.getPath('userData'), 'config.json');
  }

  static createExampleConfig(): void {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (!fs.existsSync(configPath)) {
      const exampleConfig = {
        apiBaseUrl: 'https://your-domain.com',
        _comment: '将apiBaseUrl修改为您的服务器地址',
      };
      fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
      console.log('[Electron] 已创建示例配置文件:', configPath);
    }
  }

  isPlatformLoginUrl(url: string): boolean {
    return Object.values(PLATFORM_CONFIG).some(config =>
      url.includes(config.loginUrl.replace('https://', '').replace('http://', ''))
    );
  }

  // 打开登录窗口 - B+C 方案实现
  async openLoginWindow(platform: string, businessId: string): Promise<{ success: boolean; account?: SavedAccount; error?: string }> {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) {
      return { success: false, error: '不支持的平台' };
    }

    this.currentBusinessId = businessId;

    return new Promise(async (resolve) => {
      // B 方案：使用固定的 session（平台专属，复用缓存）
      const partition = `persist:login-${platform}`;
      const ses = this.session.fromPartition(partition);

      let resolved = false;

      // 存储 resolver
      this.loginResolvers.set(platform, resolve);

      // 创建登录窗口
      const loginWindow = new BrowserWindow({
        width: 650,
        height: 850,
        parent: this.mainWindow,
        modal: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          session: ses,
          preload: path.join(__dirname, 'login-preload.js'), // 使用登录专用 preload
          webSecurity: true,
          javascript: true,
        },
        title: `登录 ${config.name}`,
      });

      this.loginWindows.set(platform, loginWindow);

      // C 方案：只清除认证 Cookie，不清除缓存
      try {
        const allCookies = await ses.cookies.get({});
        // 只清除该平台的认证 Cookie
        for (const cookie of allCookies) {
          if (config.cookieKeys.includes(cookie.name)) {
            try {
              await ses.cookies.remove(cookie.domain, cookie.name);
            } catch (e) {
              // 忽略删除失败
            }
          }
        }
        console.log(`[Electron] 已清除 ${platform} 的认证Cookie`);
      } catch (e) {
        console.warn(`[Electron] 清除Cookie失败:`, e);
      }

      // 验证登录成功的函数
      const checkLoginSuccess = async (): Promise<{ success: boolean; cookies: Cookie[]; reason: string }> => {
        const cookies = await ses.cookies.get({});
        const foundKeys = config.cookieKeys.filter(key =>
          cookies.some(c => c.name === key && c.value && c.value.length > 10)
        );

        if (foundKeys.length >= 2) {
          return { success: true, cookies, reason: `检测到关键Cookie: ${foundKeys.join(', ')}` };
        }

        return { success: false, cookies: [], reason: `关键Cookie不足: ${foundKeys.join(', ') || '无'}` };
      };

      // 检测页面内容是否包含登录成功关键词
      const checkPageContent = async (): Promise<boolean> => {
        try {
          const result = await loginWindow.webContents.executeJavaScript(`
            (function() {
              const keywords = ${JSON.stringify(config.loginSuccessKeywords)};
              const bodyText = document.body ? document.body.innerText : '';
              for (const keyword of keywords) {
                if (bodyText.includes(keyword)) {
                  return true;
                }
              }
              return false;
            })();
          `);
          return result;
        } catch (e) {
          return false;
        }
      };

      // 自动检测登录状态（定时检查）
      const checkInterval = setInterval(async () => {
        if (resolved || loginWindow.isDestroyed()) {
          clearInterval(checkInterval);
          return;
        }

        // 检查 Cookie
        const cookieResult = await checkLoginSuccess();
        if (cookieResult.success) {
          console.log(`[Electron] ${platform} Cookie检测登录成功: ${cookieResult.reason}`);
          resolved = true;
          clearInterval(checkInterval);

          const account = await this.saveAccountToAPI(platform, cookieResult.cookies, businessId);
          this.loginResolvers.delete(platform);

          if (!loginWindow.isDestroyed()) {
            loginWindow.close();
          }
          resolve({ success: true, account });
          return;
        }

        // 检查页面内容
        const contentMatch = await checkPageContent();
        if (contentMatch) {
          console.log(`[Electron] ${platform} 页面内容检测到登录成功关键词`);
          // 内容匹配后，等待 Cookie 写入
          await new Promise(r => setTimeout(r, 2000));
          const finalCheck = await checkLoginSuccess();
          if (finalCheck.success) {
            resolved = true;
            clearInterval(checkInterval);
            const account = await this.saveAccountToAPI(platform, finalCheck.cookies, businessId);
            this.loginResolvers.delete(platform);
            if (!loginWindow.isDestroyed()) {
              loginWindow.close();
            }
            resolve({ success: true, account });
          }
        }
      }, 2000); // 每2秒检查一次

      // URL 变化检测
      loginWindow.webContents.on('did-navigate', async (_, url) => {
        if (resolved) return;
        console.log(`[Electron] ${platform} 页面导航到: ${url}`);

        if (url.includes(config.loginSuccessUrl)) {
          console.log(`[Electron] ${platform} 到达登录成功URL`);
          // 等待页面完全加载和 Cookie 写入
          await new Promise(r => setTimeout(r, 3000));

          const result = await checkLoginSuccess();
          if (result.success) {
            resolved = true;
            clearInterval(checkInterval);
            const account = await this.saveAccountToAPI(platform, result.cookies, businessId);
            this.loginResolvers.delete(platform);
            if (!loginWindow.isDestroyed()) {
              loginWindow.close();
            }
            resolve({ success: true, account });
          }
        }
      });

      // 页面加载完成后注入确认按钮
      loginWindow.webContents.on('did-finish-load', () => {
        loginWindow.webContents.executeJavaScript(`
          (function() {
            // 移除旧按钮
            const old = document.getElementById('electron-login-bar');
            if (old) old.remove();

            // 创建底部确认栏
            const bar = document.createElement('div');
            bar.id = 'electron-login-bar';
            bar.style.cssText = \`
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              z-index: 2147483647;
              background: rgba(0, 0, 0, 0.9);
              padding: 15px 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
            \`;

            // 提示文字
            const tip = document.createElement('span');
            tip.style.cssText = \`
              color: #fff;
              font-size: 14px;
            \`;
            tip.textContent = '登录成功后请点击';

            // 确认按钮
            const btn = document.createElement('button');
            btn.id = 'electron-confirm-btn';
            btn.textContent = '确认登录成功';
            btn.style.cssText = \`
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 10px 28px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            \`;
            btn.onmouseenter = function() { this.style.transform = 'scale(1.05)'; };
            btn.onmouseleave = function() { this.style.transform = 'scale(1)'; };
            btn.onclick = async function() {
              this.textContent = '验证中...';
              this.disabled = true;
              this.style.opacity = '0.7';
              
              try {
                const result = await window.loginAPI.confirmLogin('${platform}');
                if (!result.success) {
                  this.textContent = result.error || '验证失败';
                  this.style.background = '#ef4444';
                  setTimeout(() => {
                    this.textContent = '确认登录成功';
                    this.disabled = false;
                    this.style.opacity = '1';
                    this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  }, 2000);
                }
              } catch (e) {
                this.textContent = '通信失败，请重试';
                this.style.background = '#ef4444';
                setTimeout(() => {
                  this.textContent = '确认登录成功';
                  this.disabled = false;
                  this.style.opacity = '1';
                  this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                }, 2000);
              }
            };

            bar.appendChild(tip);
            bar.appendChild(btn);
            document.body.appendChild(bar);

            // 调整页面底部边距
            document.body.style.paddingBottom = '70px';
          })();
        `).catch(() => {});
      });

      // 加载登录页面
      console.log(`[Electron] 加载 ${platform} 登录页面: ${config.loginUrl}`);
      loginWindow.loadURL(config.loginUrl).catch(err => {
        console.error(`[Electron] 加载登录页面失败:`, err);
      });

      // 窗口关闭处理
      loginWindow.on('closed', () => {
        clearInterval(checkInterval);
        this.loginWindows.delete(platform);
        if (!resolved) {
          this.loginResolvers.delete(platform);
          resolve({ success: false, error: '登录已取消' });
        }
      });
    });
  }

  // 保存账号到 API
  private async saveAccountToAPI(
    platform: string,
    cookies: Cookie[],
    businessId: string
  ): Promise<SavedAccount> {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];

    const cookieObj: Record<string, string> = {};
    cookies.forEach(c => {
      cookieObj[c.name] = c.value;
    });

    const accountId = crypto.randomUUID();
    const displayName = `${config.name}用户`;

    const accountData = {
      id: accountId,
      businessId: businessId,
      platform: platform,
      accountName: displayName,
      displayName: displayName,
      platformName: config.name,
      cookies: cookieObj,
      metadata: {
        platformData: cookieObj,
        loginTime: new Date().toISOString(),
      },
    };

    try {
      await this.callAPI('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', data: accountData }),
      });
      console.log(`[Electron] ${platform} 账号已保存到服务器`);
    } catch (e) {
      console.error('保存账号到服务器失败:', e);
    }

    const account: SavedAccount = {
      id: accountId,
      platform,
      platformName: config.name,
      name: displayName,
      cookies: cookieObj,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('account-updated', account);
    }

    return account;
  }

  // 获取已保存账号
  async getSavedAccounts(businessId: string): Promise<Record<string, SavedAccount[]>> {
    try {
      const data = await this.callAPI(`/api/accounts?businessId=${businessId}`, { method: 'GET' });

      const accountsByPlatform: Record<string, SavedAccount[]> = {};
      (data.accounts || []).forEach((acc: any) => {
        if (!accountsByPlatform[acc.platform]) {
          accountsByPlatform[acc.platform] = [];
        }
        accountsByPlatform[acc.platform].push({
          id: acc.id,
          platform: acc.platform,
          platformName: acc.platformName || PLATFORM_CONFIG[acc.platform as keyof typeof PLATFORM_CONFIG]?.name || acc.platform,
          name: acc.displayName || acc.accountName,
          avatar: acc.avatar,
          fansCount: acc.followers,
          cookies: acc.metadata?.platformData || {},
          createdAt: new Date(acc.createdAt).getTime(),
          lastUsed: new Date(acc.updatedAt).getTime(),
        });
      });

      return accountsByPlatform;
    } catch (e) {
      console.error('获取账号列表失败:', e);
      return {};
    }
  }

  // 删除账号
  async removeAccount(platform: string, accountId: string): Promise<boolean> {
    try {
      await this.callAPI('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', data: { id: accountId } }),
      });
      return true;
    } catch (e) {
      console.error('删除账号失败:', e);
      return false;
    }
  }

  // API 调用
  private callAPI(path: string, options: { method: string; body?: string }): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiBaseUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(options.body ? { 'Content-Length': Buffer.byteLength(options.body) } : {}),
        },
      };

      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }
}

import { BrowserWindow, session, Session, Cookie, app, ipcMain, globalShortcut, net, dialog } from 'electron';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// 平台登录配置
const PLATFORM_CONFIG = {
  wechat: {
    name: '微信公众号',
    loginUrl: 'https://mp.weixin.qq.com',
    iconUrl: 'https://img.icons8.com/color/48/weixin.png',
    cookieKeys: ['slave_sid', 'slave_user', 'wxtoken1', 'token', 'data_ticket'],
  },
  zhihu: {
    name: '知乎',
    loginUrl: 'https://www.zhihu.com/signin',
    iconUrl: 'https://img.icons8.com/color/48/zhihu.png',
    cookieKeys: ['z_c0', '_zap', 'd_c0', 'q_c1'],
  },
  weibo: {
    name: '微博',
    loginUrl: 'https://weibo.com/newlogin',
    iconUrl: 'https://img.icons8.com/color/48/weibo.png',
    cookieKeys: ['SUB', 'SUBP', 'ALF', 'SINAGLOBAL'],
  },
  toutiao: {
    name: '今日头条',
    loginUrl: 'https://mp.toutiao.com/auth/page/login',
    iconUrl: 'https://img.icons8.com/color/48/toutiao.png',
    cookieKeys: ['sessionid', 'tt_webid', 'tt_csrf_token', 'ttwid', 'sso_uid_tt'],
  },
  bilibili: {
    name: 'B站',
    loginUrl: 'https://passport.bilibili.com/login',
    iconUrl: 'https://img.icons8.com/color/48/bilibili.png',
    cookieKeys: ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5'],
  },
  xiaohongshu: {
    name: '小红书',
    loginUrl: 'https://creator.xiaohongshu.com/login',
    iconUrl: 'https://img.icons8.com/color/48/xiaohongshu.png',
    cookieKeys: ['web_session', 'webId', 'a1', 'websec_token'],
  },
  douyin: {
    name: '抖音',
    loginUrl: 'https://creator.douyin.com/login',
    iconUrl: 'https://img.icons8.com/color/48/tiktok.png',
    cookieKeys: ['sessionid', 'passport_csrf_token', 'sid_guard', 'uid_tt'],
  },
};

// 平台域名映射
const PLATFORM_DOMAINS: Record<string, string[]> = {
  wechat: ['weixin.qq.com', 'mp.weixin.qq.com'],
  zhihu: ['zhihu.com'],
  weibo: ['weibo.com'],
  toutiao: ['toutiao.com', 'mp.toutiao.com'],
  bilibili: ['bilibili.com'],
  xiaohongshu: ['xiaohongshu.com'],
  douyin: ['douyin.com', 'creator.douyin.com'],
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
  private logPath: string = '';

  constructor(mainWindow: BrowserWindow, sessionModule: typeof session) {
    this.mainWindow = mainWindow;
    this.session = sessionModule;
    this.config = this.loadConfig();
    this.apiBaseUrl = this.config.apiBaseUrl;
    this.logPath = path.join(app.getPath('userData'), 'account-bind.log');
    console.log('[Electron] PlatformAuthManager 初始化');
    console.log('[Electron] API地址:', this.apiBaseUrl);
    console.log('[Electron] 日志文件:', this.logPath);
    this.registerHandlers();
  }

  // 写入日志到文件
  private writeLog(message: string) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(message);
    try {
      fs.appendFileSync(this.logPath, logLine);
    } catch (e) {
      // 忽略写入失败
    }
  }

  // 注册 IPC 处理器
  private registerHandlers() {
    // 手动确认登录
    ipcMain.handle('login-confirm', async (_, platform: string) => {
      console.log(`[Electron] 收到 ${platform} 的手动确认登录请求`);
      return this.handleManualConfirm(platform);
    });

    // 打开账号后台
    ipcMain.handle('open-account-backend', async (_, accountId: string) => {
      return this.openAccountBackend(accountId);
    });

    // 获取账号 session（供发布模块使用）
    ipcMain.handle('get-account-session', async (_, accountId: string) => {
      return this.getAccountSessionCookies(accountId);
    });

    // 验证账号 session
    ipcMain.handle('verify-account-session', async (_, accountId: string) => {
      return this.verifyAccountSession(accountId);
    });
  }

  // 处理手动确认
  private async handleManualConfirm(platform: string): Promise<{ success: boolean; error?: string }> {
    this.writeLog(`[Electron] ========== 开始处理手动确认 ==========`);
    this.writeLog(`[Electron] 平台: ${platform}`);
    this.writeLog(`[Electron] 当前 businessId: ${this.currentBusinessId}`);
    
    const loginWindow = this.loginWindows.get(platform);
    if (!loginWindow || loginWindow.isDestroyed()) {
      this.writeLog(`[Electron] 错误: 登录窗口已关闭`);
      return { success: false, error: '登录窗口已关闭' };
    }

    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) {
      this.writeLog(`[Electron] 错误: 不支持的平台 ${platform}`);
      return { success: false, error: '不支持的平台' };
    }

    const tempSession = loginWindow.webContents.session;

    // 获取所有 Cookie
    const cookies = await tempSession.cookies.get({});
    this.writeLog(`[Electron] 当前 session 有 ${cookies.length} 个 Cookie`);
    this.writeLog(`[Electron] Cookie 列表: ${cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`).join(', ')}`);

    // 验证关键 Cookie
    const foundKeys = config.cookieKeys.filter(key =>
      cookies.some(c => c.name === key && c.value && c.value.length > 5)
    );

    this.writeLog(`[Electron] 需要的关键 Cookie: ${config.cookieKeys.join(', ')}`);
    this.writeLog(`[Electron] 找到的关键 Cookie: ${foundKeys.join(', ')}`);

    if (foundKeys.length < 1) {
      this.writeLog(`[Electron] 错误: 未检测到登录信息`);
      return { success: false, error: '未检测到登录信息，请先完成登录' };
    }

    this.writeLog(`[Electron] 关键 Cookie 验证通过，开始保存账号...`);

    // 保存账号 - 使用 electron.net 模块发送请求
    // 这样可以共享主窗口的 session，自动携带认证 cookie
    try {
      // 准备请求数据 - 符合 API 的 CreateAccountInput 格式
      const cookieObj: Record<string, string> = {};
      cookies.forEach(c => { cookieObj[c.name] = c.value; });
      
      // 获取真实用户信息 - 从登录窗口 DOM 中提取
      this.writeLog(`[Electron] 开始从登录窗口获取平台用户信息...`);
      const userInfo = await this.fetchPlatformUserInfo(loginWindow, platform);
      this.writeLog(`[Electron] 获取到的用户信息: ${JSON.stringify(userInfo)}`);
      
      // 如果获取到了用户名，使用真实用户名，否则使用默认名称
      const displayName = userInfo.name || `${config.name}用户`;
      const avatar = userInfo.avatar || undefined;
      const fansCount = userInfo.fansCount || 0;
      
      this.writeLog(`[Electron] 最终显示名称: ${displayName}`);
      
      const requestBody = JSON.stringify({
        businessId: this.currentBusinessId,
        platform: platform,
        accountName: displayName,
        displayName: displayName,
        avatar: avatar,
        followers: fansCount,
        status: 'active',
        metadata: {
          platformData: cookieObj,
          loginTime: new Date().toISOString(),
        },
      });

      this.writeLog(`[Electron] 准备调用 API 保存账号`);
      this.writeLog(`[Electron] API地址: ${this.apiBaseUrl}`);
      this.writeLog(`[Electron] 请求体: ${requestBody}`);

      // 调用 API 保存账号（需要认证）
      let response;
      try {
        response = await this.callAPI('/api/accounts', {
          method: 'POST',
          body: requestBody,
        });
        this.writeLog(`[Electron] API 调用成功`);
      } catch (apiError: any) {
        this.writeLog(`[Electron] API 调用失败: ${apiError.message}`);
        // 如果是认证错误，给用户明确提示
        if (apiError.message.includes('请先登录') || 
            apiError.message.includes('HTTP错误: 401') ||
            apiError.message.includes('未授权')) {
          return { 
            success: false, 
            error: '登录状态已过期，请刷新页面后重新登录' 
          };
        }
        throw apiError;
      }
      
      const account = response.account;  // API 返回 { account: {...} }
      
      this.writeLog(`[Electron] 账号保存成功: ${JSON.stringify(account)}`);

      // 将 cookie 复制到账号专属 session（持久化）
      await this.migrateCookiesToAccountSession(account.id, cookies, platform);
      this.writeLog(`[Electron] Cookie 已迁移到账号专属 session: persist:account-${account.id}`);

      // 解析 Promise - 转换为前端期望的格式
      const resolver = this.loginResolvers.get(platform);
      if (resolver) {
        resolver({ 
          success: true, 
          account: {
            id: account.id,
            platform: account.platform,
            platformName: config.name,
            name: account.displayName || account.accountName || '未知用户',
            cookies: cookieObj,
            createdAt: Date.now(),
            lastUsed: Date.now(),
          }
        });
        this.loginResolvers.delete(platform);
      }

      // 关闭登录窗口
      if (!loginWindow.isDestroyed()) {
        loginWindow.close();
      }

      this.writeLog(`[Electron] ========== 手动确认完成 ==========`);
      return { success: true };
    } catch (e: any) {
      this.writeLog(`[Electron] 保存账号失败: ${e.message || e}`);
      
      // 认证/权限相关错误不显示弹窗，让页面自然跳转或提示
      const silentErrors = [
        '请先登录',
        '未授权',
        '认证',
        '您没有权限',
        '没有创建企业',
        '请先创建企业',
        'HTTP错误: 401',
        'HTTP错误: 403'
      ];
      
      const errorMessage = e.message || '';
      const shouldSilent = silentErrors.some(err => errorMessage.includes(err));
      
      if (shouldSilent) {
        this.writeLog(`[Electron] 认证/权限相关错误，跳过显示错误弹窗: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
      
      // 其他错误才显示弹窗
      const fullErrorMessage = `保存账号失败！\n\n错误信息: ${errorMessage}\n\n平台: ${platform}\nBusinessId: ${this.currentBusinessId}\nAPI地址: ${this.apiBaseUrl}`;
      dialog.showErrorBox('账号绑定失败', fullErrorMessage);
      
      return { success: false, error: errorMessage || '保存账号失败' };
    }
  }

  // 将 cookie 迁移到账号专属 session
  private async migrateCookiesToAccountSession(accountId: string, cookies: Cookie[], platform: string): Promise<void> {
    const partition = `persist:account-${accountId}`;
    const accountSession = this.session.fromPartition(partition);

    this.writeLog(`[Electron] 开始迁移 Cookie 到 session: ${partition}`);
    this.writeLog(`[Electron] 待迁移 Cookie 数量: ${cookies.length}`);

    let successCount = 0;
    let failCount = 0;

    for (const cookie of cookies) {
      try {
        // 根据 cookie 的 domain 构造正确的 URL
        // domain 可能是 ".weixin.qq.com" 或 "weixin.qq.com"
        const cookieDomain = cookie.domain || '';
        // URL 需要是不带前导点的域名
        const urlDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
        const url = cookie.secure ? `https://${urlDomain}` : `http://${urlDomain}`;

        await accountSession.cookies.set({
          url: url,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || undefined,
          path: cookie.path || '/',
          secure: cookie.secure || false,
          httpOnly: cookie.httpOnly || false,
          expirationDate: cookie.expirationDate,
        });
        successCount++;
      } catch (e: any) {
        failCount++;
        this.writeLog(`[Electron] 设置 cookie 失败 ${cookie.name}: ${e.message}`);
      }
    }

    this.writeLog(`[Electron] Cookie 迁移完成: 成功 ${successCount}, 失败 ${failCount}`);

    // 验证迁移结果
    const migratedCookies = await accountSession.cookies.get({});
    this.writeLog(`[Electron] Session 中现有 Cookie 数量: ${migratedCookies.length}`);
    this.writeLog(`[Electron] Session Cookie 列表: ${migratedCookies.map(c => c.name).join(', ')}`);
  }

  // 打开账号后台
  async openAccountBackend(accountId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`[Electron] 打开账号后台: ${accountId}`);
    
    try {
      // 从服务器获取账号信息
      const accountData = await this.callAPI(`/api/accounts?id=${accountId}`, { method: 'GET' });
      if (!accountData.account) {
        return { success: false, error: '账号不存在' };
      }

      const account = accountData.account;
      const platform = account.platform;
      const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
      if (!config) {
        return { success: false, error: '不支持的平台' };
      }

      // 使用账号专属 session
      const partition = `persist:account-${accountId}`;
      const ses = this.session.fromPartition(partition);

      // 后台管理页面 URL
      const backendUrls: Record<string, string> = {
        wechat: 'https://mp.weixin.qq.com',
        zhihu: 'https://www.zhihu.com/creator',
        weibo: 'https://weibo.com',
        toutiao: 'https://mp.toutiao.com',
        bilibili: 'https://member.bilibili.com',
        xiaohongshu: 'https://creator.xiaohongshu.com',
        douyin: 'https://creator.douyin.com',
      };

      const backendUrl = backendUrls[platform] || config.loginUrl;

      // 创建后台窗口
      const backendWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        parent: this.mainWindow,
        modal: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          session: ses,
          webSecurity: true,
        },
        title: `${config.name} - ${account.displayName || account.accountName}`,
      });

      console.log(`[Electron] 加载后台页面: ${backendUrl}`);
      backendWindow.loadURL(backendUrl);

      return { success: true };
    } catch (e: any) {
      console.error(`[Electron] 打开账号后台失败:`, e);
      return { success: false, error: e.message || '打开失败' };
    }
  }

  // 获取账号 session 的 cookie（供发布模块使用）
  async getAccountSessionCookies(accountId: string): Promise<Record<string, string>> {
    const partition = `persist:account-${accountId}`;
    const ses = this.session.fromPartition(partition);
    const cookies = await ses.cookies.get({});
    
    console.log(`[Electron] 获取账号 session cookies: ${partition}`);
    console.log(`[Electron] Session 中 Cookie 数量: ${cookies.length}`);
    
    const cookieObj: Record<string, string> = {};
    cookies.forEach(c => {
      cookieObj[c.name] = c.value;
    });
    
    return cookieObj;
  }

  // 验证账号 session 是否有效
  async verifyAccountSession(accountId: string): Promise<{ valid: boolean; cookieCount: number; cookies: string[] }> {
    const partition = `persist:account-${accountId}`;
    const ses = this.session.fromPartition(partition);
    const cookies = await ses.cookies.get({});
    
    console.log(`[Electron] 验证账号 session: ${partition}`);
    console.log(`[Electron] Cookie 数量: ${cookies.length}`);
    
    return {
      valid: cookies.length > 0,
      cookieCount: cookies.length,
      cookies: cookies.map(c => c.name),
    };
  }
  // 加载配置
  private loadConfig(): AppConfig {
    // 优先使用环境变量 ELECTRON_SERVER_URL
    if (process.env.ELECTRON_SERVER_URL) {
      console.log('[Electron] 使用环境变量 ELECTRON_SERVER_URL:', process.env.ELECTRON_SERVER_URL);
      return { apiBaseUrl: process.env.ELECTRON_SERVER_URL };
    }

    // 兼容旧的环境变量名
    if (process.env.API_BASE_URL) {
      console.log('[Electron] 使用环境变量 API_BASE_URL:', process.env.API_BASE_URL);
      return { apiBaseUrl: process.env.API_BASE_URL };
    }

    const configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        // 忽略包含占位符的配置
        if (config.apiBaseUrl && !config.apiBaseUrl.includes('your-domain')) {
          console.log('[Electron] 使用配置文件 apiBaseUrl:', config.apiBaseUrl);
          return { apiBaseUrl: config.apiBaseUrl };
        } else {
          console.log('[Electron] 配置文件包含占位符，忽略');
        }
      } catch (e) {
        console.warn('[Electron] 配置文件解析失败:', e);
      }
    }

    if (!app.isPackaged) {
      console.log('[Electron] 开发环境，使用本地服务器');
      return { apiBaseUrl: 'http://localhost:5000' };
    }

    // 生产环境：使用远程服务器地址
    const prodUrl = 'https://geoclaw.coze.site';
    console.log('[Electron] 生产环境API地址:', prodUrl);
    return { apiBaseUrl: prodUrl };
  }

  private getConfigPath(): string {
    return path.join(app.getPath('userData'), 'config.json');
  }

  static createExampleConfig(): void {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (!fs.existsSync(configPath)) {
      // 使用正确的生产环境 API 地址
      const prodUrl = process.env.ELECTRON_SERVER_URL || 'https://geoclaw.coze.site';
      const exampleConfig = {
        apiBaseUrl: prodUrl,
        _comment: '这是自动生成的配置文件，如需修改请编辑 apiBaseUrl',
      };
      fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
      console.log('[Electron] 已创建配置文件:', configPath);
      console.log('[Electron] API地址:', prodUrl);
    }
  }

  isPlatformLoginUrl(url: string): boolean {
    return Object.values(PLATFORM_CONFIG).some(config =>
      url.includes(config.loginUrl.replace('https://', '').replace('http://', ''))
    );
  }

  // 检查 URL 是否属于某个平台的域名（用于安全策略白名单）
  isPlatformDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // 检查是否匹配任何平台的域名
      for (const domains of Object.values(PLATFORM_DOMAINS)) {
        if (domains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // 打开登录窗口 - 使用临时 session，登录成功后迁移到账号专属 session
  async openLoginWindow(platform: string, businessId: string): Promise<{ success: boolean; account?: SavedAccount; error?: string }> {
    console.log(`[Electron] ========== 打开登录窗口 ==========`);
    console.log(`[Electron] 平台: ${platform}`);
    console.log(`[Electron] businessId: ${businessId}`);
    
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) {
      return { success: false, error: '不支持的平台' };
    }

    // 验证 businessId
    if (!businessId || businessId === 'undefined' || businessId === 'null') {
      console.error('[Electron] 错误: businessId 无效');
      return { success: false, error: '请先选择企业/商家' };
    }

    this.currentBusinessId = businessId;

    return new Promise(async (resolve) => {
      // 使用临时 in-memory session（不持久化，每次都是全新状态）
      const partition = `temp-login-${platform}-${Date.now()}`;
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
          preload: path.join(__dirname, 'login-preload.js'),
          webSecurity: true,
          javascript: true,
        },
        title: `登录 ${config.name}`,
      });

      this.loginWindows.set(platform, loginWindow);

      // 页面加载完成后注入确认按钮
      loginWindow.webContents.on('did-finish-load', () => {
        console.log(`[Electron] 页面加载完成，注入确认按钮`);
        
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
                console.log('确认登录结果:', result);
                if (result.success) {
                  // 成功：显示成功提示，窗口会被主进程关闭
                  this.textContent = '绑定成功！';
                  this.style.background = '#22c55e';
                  // 不需要手动关闭窗口，主进程会处理
                } else {
                  // 失败：显示错误并恢复按钮
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
                console.error('确认登录错误:', e);
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
        `).catch((err) => {
          console.log(`[Electron] 注入按钮失败:`, err);
        });
      });

      // 加载登录页面
      console.log(`[Electron] 加载登录页面: ${config.loginUrl}`);
      loginWindow.loadURL(config.loginUrl).catch(err => {
        console.error(`[Electron] 加载登录页面失败:`, err);
      });

      // 注册登录窗口的快捷键（窗口获得焦点时生效）
      const registerShortcuts = () => {
        globalShortcut.register('F12', () => {
          if (!loginWindow.isDestroyed()) {
            loginWindow.webContents.toggleDevTools();
          }
        });
      };
      
      const unregisterShortcuts = () => {
        globalShortcut.unregister('F12');
      };
      
      // 窗口获得焦点时注册快捷键
      loginWindow.on('focus', registerShortcuts);
      // 窗口失去焦点时注销快捷键（避免影响主窗口）
      loginWindow.on('blur', unregisterShortcuts);
      
      // 初始注册（窗口创建后立即生效）
      registerShortcuts();

      // 窗口关闭处理
      loginWindow.on('closed', () => {
        console.log(`[Electron] 登录窗口已关闭`);
        // 注销快捷键
        unregisterShortcuts();
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
    console.log(`[Electron] ========== 保存账号到 API ==========`);
    console.log(`[Electron] 平台: ${platform}`);
    console.log(`[Electron] businessId: ${businessId}`);
    console.log(`[Electron] cookies 数量: ${cookies.length}`);
    
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];

    const cookieObj: Record<string, string> = {};
    cookies.forEach(c => {
      cookieObj[c.name] = c.value;
    });

    // 由于没有登录窗口，无法从 DOM 获取用户信息，使用默认名称
    console.log(`[Electron] 使用默认用户名称（无登录窗口）`);
    const displayName = `${config.name}用户`;
    const avatar = undefined;
    const fansCount = 0;
    
    console.log(`[Electron] 最终显示名称: ${displayName}`);

    let accountId = crypto.randomUUID();

    const accountData = {
      id: accountId,
      businessId: businessId,
      platform: platform,
      accountName: displayName,
      displayName: displayName,
      avatar: avatar,
      followers: fansCount,
      platformName: config.name,
      cookies: cookieObj,
      metadata: {
        platformData: cookieObj,
        loginTime: new Date().toISOString(),
      },
    };

    console.log(`[Electron] 准备发送的账号数据:`, JSON.stringify(accountData, null, 2));

    try {
      const result = await this.callAPI('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
      });
      console.log(`[Electron] API 返回结果:`, result);
      
      // 如果服务器返回了账号ID，使用服务器的ID
      if (result.account && result.account.id) {
        accountId = result.account.id;
        console.log(`[Electron] 使用服务器返回的 ID: ${accountId}`);
      }
      
      // 显示成功弹窗
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '账号绑定成功',
        message: `账号已成功保存到服务器！\n\n平台: ${config.name}\n用户名: ${displayName}\n账号ID: ${accountId}`,
        buttons: ['确定'],
      });
    } catch (e: any) {
      console.error('[Electron] 保存账号到服务器失败:', e);
      throw new Error(`保存账号失败: ${e.message || '未知错误'}`);
    }

    const account: SavedAccount = {
      id: accountId,
      platform,
      platformName: config.name,
      name: displayName,
      avatar: avatar,
      fansCount: fansCount,
      cookies: cookieObj,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // 通知主窗口
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('account-updated', account);
      console.log(`[Electron] 已通知主窗口账号更新`);
    }

    console.log(`[Electron] ========== 账号保存完成 ==========`);
    return account;
  }

  // 获取已保存账号
  async getSavedAccounts(businessId: string): Promise<Record<string, SavedAccount[]>> {
    console.log(`[Electron] 获取已保存账号, businessId: ${businessId}`);
    
    // 先检查是否有认证 token
    try {
      const mainSession = this.mainWindow.webContents.session;
      const cookies = await mainSession.cookies.get({});
      
      // 获取 API 的域名，用于精确匹配 cookie
      const apiHostname = new URL(this.apiBaseUrl).hostname;
      
      // 辅助函数：检查 cookie 域名是否匹配
      const isDomainMatch = (cookieDomain: string | undefined, targetDomain: string): boolean => {
        if (!cookieDomain) return false;
        const normalizedCookieDomain = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
        return normalizedCookieDomain === targetDomain || targetDomain.endsWith('.' + normalizedCookieDomain);
      };
      
      // 详细日志：列出所有相关 cookie
      console.log(`[Electron] API 域名: ${apiHostname}`);
      console.log(`[Electron] Session 中的 cookie 数量: ${cookies.length}`);
      const userTokens = cookies.filter(c => c.name === 'user_token' || c.name === 'user_token_electron');
      userTokens.forEach((c, i) => {
        const matches = isDomainMatch(c.domain, apiHostname);
        console.log(`[Electron] ${c.name}[${i}]: domain=${c.domain}, 匹配API域名=${matches}`);
      });
      
      // 优先使用与 API 域名匹配的 cookie
      let userToken = cookies.find(c => 
        (c.name === 'user_token_electron' || c.name === 'user_token') && isDomainMatch(c.domain, apiHostname)
      );
      
      if (!userToken) {
        // 如果没有匹配的，使用任意一个
        userToken = cookies.find(c => c.name === 'user_token_electron') || 
                    cookies.find(c => c.name === 'user_token');
      }
      
      if (!userToken) {
        console.log(`[Electron] 未找到有效的认证 cookie`);
        return {};
      }
      
      console.log(`[Electron] 使用 cookie: ${userToken.name}@${userToken.domain}`);
    } catch (e) {
      console.error('[Electron] 检查登录状态失败:', e);
      return {};
    }
    
    try {
      const data = await this.callAPI(`/api/accounts?businessId=${businessId}`, { method: 'GET' });
      console.log(`[Electron] API 返回账号数据:`, data);

      const accountsByPlatform: Record<string, SavedAccount[]> = {};
      (data.accounts || []).forEach((acc: any) => {
        if (!accountsByPlatform[acc.platform]) {
          accountsByPlatform[acc.platform] = [];
        }
        accountsByPlatform[acc.platform].push({
          id: acc.id,
          platform: acc.platform,
          platformName: PLATFORM_CONFIG[acc.platform as keyof typeof PLATFORM_CONFIG]?.name || acc.platform,
          name: acc.displayName || acc.accountName,
          avatar: acc.avatar,
          fansCount: acc.followers,
          cookies: acc.metadata?.platformData || {},
          createdAt: new Date(acc.createdAt).getTime(),
          lastUsed: new Date(acc.updatedAt).getTime(),
        });
      });

      console.log(`[Electron] 按平台分组的账号:`, accountsByPlatform);
      return accountsByPlatform;
    } catch (e: any) {
      console.error('[Electron] 获取账号列表失败:', e);
      
      // 以下情况不显示错误弹窗，静默返回空列表：
      // 1. 认证相关错误（401：未登录、token无效等）
      // 2. 权限相关错误（403：无权访问该商家数据）
      // 3. 企业相关错误（用户没有创建企业等）
      const silentErrors = [
        '请先登录',
        '未授权',
        '认证',
        '您没有权限',
        '没有创建企业',
        '请先创建企业',
        'HTTP错误: 401',
        'HTTP错误: 403'
      ];
      
      const errorMessage = e.message || '';
      const shouldSilent = silentErrors.some(err => errorMessage.includes(err));
      
      if (shouldSilent) {
        console.log(`[Electron] 认证/权限相关错误，跳过显示错误弹窗: ${errorMessage}`);
        return {};
      }
      
      // 其他错误（网络错误、服务器错误等）才显示弹窗
      dialog.showErrorBox('获取账号列表失败', `错误信息: ${errorMessage}\nBusinessId: ${businessId}\nAPI地址: ${this.apiBaseUrl}`);
      
      return {};
    }
  }

  // 删除账号
  async removeAccount(platform: string, accountId: string): Promise<boolean> {
    console.log(`[Electron] 删除账号: ${platform}, ${accountId}`);
    
    try {
      await this.callAPI(`/api/accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      console.log(`[Electron] 账号删除成功`);
      return true;
    } catch (e) {
      console.error('[Electron] 删除账号失败:', e);
      return false;
    }
  }

  // API 调用 - 使用 electron.net 模块
  // 自动从主窗口 session 获取认证 cookie，复用 Web 端的用户认证和商家隔离逻辑
  private async callAPI(path: string, options: { method: string; body?: string }): Promise<any> {
    // 从主窗口 session 获取认证 cookie
    let cookieHeader = '';
    try {
      const mainSession = this.mainWindow.webContents.session;
      const cookies = await mainSession.cookies.get({});
      
      // 获取 API 的域名，用于精确匹配 cookie
      const apiHostname = new URL(this.apiBaseUrl).hostname;
      console.log(`[Electron] API 域名: ${apiHostname}`);
      
      // 辅助函数：检查 cookie 域名是否匹配
      const isDomainMatch = (cookieDomain: string | undefined, targetDomain: string): boolean => {
        if (!cookieDomain) return false;
        // cookie 域名可能是 ".example.com" 或 "example.com" 格式
        const normalizedCookieDomain = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
        return normalizedCookieDomain === targetDomain || targetDomain.endsWith('.' + normalizedCookieDomain);
      };
      
      // 优先级 1: 找到与 API 域名匹配的 user_token_electron
      let userToken = cookies.find(c => 
        c.name === 'user_token_electron' && isDomainMatch(c.domain, apiHostname)
      );
      
      if (userToken) {
        cookieHeader = `user_token_electron=${userToken.value}`;
        console.log(`[Electron] 使用域名匹配的 user_token_electron cookie (domain: ${userToken.domain})`);
      } else {
        // 优先级 2: 找到与 API 域名匹配的 user_token
        userToken = cookies.find(c => 
          c.name === 'user_token' && isDomainMatch(c.domain, apiHostname)
        );
        
        if (userToken) {
          cookieHeader = `user_token=${userToken.value}`;
          console.log(`[Electron] 使用域名匹配的 user_token cookie (domain: ${userToken.domain})`);
        } else {
          // 优先级 3: 使用任意 user_token_electron
          userToken = cookies.find(c => c.name === 'user_token_electron');
          if (userToken) {
            cookieHeader = `user_token_electron=${userToken.value}`;
            console.log(`[Electron] 使用 user_token_electron cookie (domain: ${userToken.domain}, 未匹配 API 域名)`);
          } else {
            // 优先级 4: 使用任意 user_token
            userToken = cookies.find(c => c.name === 'user_token');
            if (userToken) {
              cookieHeader = `user_token=${userToken.value}`;
              console.log(`[Electron] 使用 user_token cookie (domain: ${userToken.domain}, 未匹配 API 域名)`);
            } else {
              console.log(`[Electron] 警告: 主窗口 session 中未找到 user_token 或 user_token_electron cookie`);
              console.log(`[Electron] 可用 cookies: ${cookies.map(c => `${c.name}@${c.domain}`).join(', ')}`);
            }
          }
        }
      }
      
      if (userToken) {
        console.log(`[Electron] 已获取认证 cookie: ${userToken.name}=${userToken.value.substring(0, 20)}...`);
      }
    } catch (e) {
      console.error(`[Electron] 获取认证 cookie 失败:`, e);
    }

    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiBaseUrl);
      
      console.log(`[Electron] API请求: ${options.method} ${url.toString()}`);
      if (options.body) {
        console.log(`[Electron] 请求体: ${options.body.substring(0, 500)}...`);
      }

      const request = net.request({
        method: options.method,
        url: url.toString(),
      });

      request.setHeader('Content-Type', 'application/json');
      if (cookieHeader) {
        request.setHeader('Cookie', cookieHeader);
      }

      request.on('response', (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        response.on('end', () => {
          const statusCode = response.statusCode;
          console.log(`[Electron] API响应状态码: ${statusCode}`);
          console.log(`[Electron] API响应内容: ${data.substring(0, 500)}`);
          
          // 检查 HTTP 状态码
          if (statusCode && statusCode >= 400) {
            try {
              const errorData = JSON.parse(data);
              reject(new Error(errorData.error || `HTTP错误: ${statusCode}`));
            } catch (e) {
              reject(new Error(`HTTP错误: ${statusCode}`));
            }
            return;
          }
          
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });

      request.on('error', (error) => {
        console.error(`[Electron] API请求失败:`, error);
        reject(new Error(`网络请求失败: ${error.message}\nURL: ${url.toString()}`));
      });

      // 设置超时（30秒）
      setTimeout(() => {
        request.abort();
        reject(new Error(`请求超时（30秒）\nURL: ${url.toString()}`));
      }, 30000);

      if (options.body) {
        request.write(options.body);
      }
      
      request.end();
    });
  }

  // 获取平台用户信息 - 从登录窗口 DOM 中提取
  // 使用 DOM 抓取方式，不依赖平台 API
  private async fetchPlatformUserInfo(
    loginWindow: BrowserWindow,
    platform: string
  ): Promise<{ name: string; avatar?: string; fansCount?: number }> {
    this.writeLog(`[Electron] 从登录窗口 DOM 获取平台用户信息: ${platform}`);
    
    if (!loginWindow || loginWindow.isDestroyed()) {
      this.writeLog(`[Electron] 登录窗口已关闭，无法获取用户信息`);
      return { name: '' };
    }

    try {
      // 平台特定的 DOM 选择器配置
      const platformSelectors: Record<string, { 
        nameSelectors: string[]; 
        avatarSelectors: string[];
      }> = {
        toutiao: {
          nameSelectors: [
            '.user-name', '.nickname', '.username',
            '[class*="user-name"]', '[class*="nickname"]',
            'header [class*="name"]', '.user-info-name',
            '.account-name', '.mp-name',
          ],
          avatarSelectors: [
            '.avatar img', '.user-avatar img', '.mp-avatar img',
            'img[class*="avatar"]', 'img[src*="avatar"]',
          ],
        },
        zhihu: {
          nameSelectors: [
            '.UserLink-name', '.ProfileHeader-name', '.name',
            '[class*="UserLink-name"]', '.css-1wqsp99',
            'header [class*="name"]',
          ],
          avatarSelectors: [
            '.Avatar img', '.ProfileHeader-avatar img',
            'img[class*="Avatar"]', 'img[class*="avatar"]',
          ],
        },
        weibo: {
          nameSelectors: [
            '.name', '.user-name', '.screen-name',
            '[class*="screen-name"]', '[class*="userName"]',
            'header [class*="name"]',
          ],
          avatarSelectors: [
            '.avatar img', '.user-avatar img', '.head_pic img',
            'img[class*="avatar"]', 'img[action-type="feed_list_avatar"]',
          ],
        },
        bilibili: {
          nameSelectors: [
            '.nickname', '.username', '.name',
            '[class*="nickname"]', '[class*="userName"]',
            '.header-entry-avatar', '.user-con .name',
          ],
          avatarSelectors: [
            '.avatar img', '.user-avatar img', '.nav-user-center img',
            'img[class*="avatar"]', 'img[class*="Avatar"]',
          ],
        },
        xiaohongshu: {
          nameSelectors: [
            '.user-name', '.name', '.nickname',
            '[class*="user-name"]', '[class*="userName"]',
            '.creator-name', '.account-name',
          ],
          avatarSelectors: [
            '.avatar img', '.user-avatar img', '.creator-avatar img',
            'img[class*="avatar"]', 'img[src*="avatar"]',
          ],
        },
        douyin: {
          nameSelectors: [
            '.user-name', '.name', '.nickname',
            '[class*="user-name"]', '[class*="userName"]',
            '.creator-name', '.account-name',
          ],
          avatarSelectors: [
            '.avatar img', '.user-avatar img', '.creator-avatar img',
            'img[class*="avatar"]', 'img[src*="avatar"]',
          ],
        },
        wechat: {
          nameSelectors: [
            '.weui-desktop-account__nickname', '.account_setting_item',
            '[class*="nickname"]', '.weui-desktop-account a',
            '.user-info .name', '.account-name',
          ],
          avatarSelectors: [
            '.weui-desktop-account__avatar img', '.weui-desktop-account img',
            'img[class*="avatar"]', '.head img',
          ],
        },
      };

      // 通用选择器（作为后备）
      const genericSelectors = {
        nameSelectors: [
          '.user-name', '.username', '.nickname', '.name',
          '[class*="user-name"]', '[class*="username"]', '[class*="nickname"]',
          'header [class*="name"]', 'nav [class*="user"]',
          '.user-info [class*="name"]', '.profile [class*="name"]',
        ],
        avatarSelectors: [
          '.avatar img', '.user-avatar img', '.profile-avatar img',
          'img[class*="avatar"]', 'img[src*="avatar"]',
          'img[alt*="avatar"]', 'img[alt*="头像"]',
        ],
      };

      const selectors = platformSelectors[platform] || genericSelectors;
      
      this.writeLog(`[Electron] 使用选择器: ${JSON.stringify(selectors)}`);

      // 在登录窗口中执行 JavaScript 提取用户信息
      const userInfo = await loginWindow.webContents.executeJavaScript(`
        (function() {
          const selectors = ${JSON.stringify(selectors)};
          
          let name = '';
          let avatar = '';
          
          // 尝试从 DOM 元素提取用户名
          for (const sel of selectors.nameSelectors) {
            try {
              const elements = document.querySelectorAll(sel);
              for (const el of elements) {
                const text = el.textContent?.trim() || el.getAttribute('title') || el.getAttribute('alt') || '';
                // 过滤掉太长的文本（可能是文章内容）
                if (text && text.length > 0 && text.length < 50) {
                  name = text;
                  console.log('[DOM] 找到用户名:', sel, '->', name);
                  break;
                }
              }
              if (name) break;
            } catch (e) {
              console.log('[DOM] 选择器失败:', sel, e);
            }
          }
          
          // 尝试从 DOM 元素提取头像
          for (const sel of selectors.avatarSelectors) {
            try {
              const img = document.querySelector(sel);
              if (img && img.src) {
                // 排除 data URI 和占位图
                if (!img.src.startsWith('data:') && !img.src.includes('default')) {
                  avatar = img.src;
                  console.log('[DOM] 找到头像:', sel, '->', avatar);
                  break;
                }
              }
            } catch (e) {
              console.log('[DOM] 选择器失败:', sel, e);
            }
          }
          
          // 尝试从全局变量提取（作为补充）
          if (!name) {
            try {
              // React/Redux 状态
              if (window.__INITIAL_STATE__) {
                name = window.__INITIAL_STATE__?.user?.name || 
                       window.__INITIAL_STATE__?.currentUser?.nickname ||
                       window.__INITIAL_STATE__?.userInfo?.nickname || '';
                avatar = window.__INITIAL_STATE__?.user?.avatar || 
                         window.__INITIAL_STATE__?.currentUser?.avatar || '';
              }
              // 平台特定全局变量
              if (!name && window.userInfo) {
                name = window.userInfo.nickname || window.userInfo.name || '';
                avatar = window.userInfo.avatar || window.userInfo.avatarUrl || '';
              }
              if (!name && window.currentUser) {
                name = window.currentUser.nickname || window.currentUser.name || '';
                avatar = window.currentUser.avatar || '';
              }
              if (!name && window.__USER_INFO__) {
                name = window.__USER_INFO__.nickname || window.__USER_INFO__.name || '';
                avatar = window.__USER_INFO__.avatar || '';
              }
            } catch (e) {
              console.log('[DOM] 全局变量提取失败:', e);
            }
          }
          
          // 尝试从页面标题提取（最后的手段）
          if (!name) {
            const title = document.title;
            // 常见的标题格式: "用户名 - 平台名" 或 "平台名 - 用户名"
            const titlePatterns = [
              /^(.+?)\\s*[-|]\\s*.+$/,  // "用户名 - 平台名"
              /^.+?\\s*[-|]\\s*(.+)$/,   // "平台名 - 用户名"
            ];
            for (const pattern of titlePatterns) {
              const match = title.match(pattern);
              if (match && match[1] && match[1].length < 20 && !match[1].includes('登录')) {
                name = match[1].trim();
                break;
              }
            }
          }
          
          return { name, avatar };
        })();
      `);

      this.writeLog(`[Electron] DOM 提取结果: ${JSON.stringify(userInfo)}`);
      
      return {
        name: userInfo.name || '',
        avatar: userInfo.avatar || undefined,
        fansCount: 0, // DOM 抓取无法获取粉丝数
      };

    } catch (error: any) {
      this.writeLog(`[Electron] 从 DOM 获取用户信息失败: ${error.message}`);
      return { name: '' };
    }
  }

  // 使用 Node.js 原生 https/http 模块发送请求
  // 这是最可靠的方式，不依赖 Electron 的网络层
  private sendHttpRequest(path: string, method: string, body?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const baseUrl = this.apiBaseUrl;
      const fullUrl = new URL(path, baseUrl);
      
      this.writeLog(`[Electron] Node.js HTTP请求: ${method} ${fullUrl.toString()}`);
      
      const isHttps = fullUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: fullUrl.hostname,
        port: fullUrl.port || (isHttps ? 443 : 80),
        path: fullUrl.pathname + fullUrl.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Content-Length': body ? Buffer.byteLength(body) : 0,
        },
        // 允许自签名证书（开发环境）
        rejectUnauthorized: false,
      };

      this.writeLog(`[Electron] 请求选项: ${JSON.stringify({
        hostname: options.hostname,
        port: options.port,
        path: options.path,
        method: options.method,
      })}`);

      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          this.writeLog(`[Electron] Node.js HTTP响应状态码: ${res.statusCode}`);
          this.writeLog(`[Electron] Node.js HTTP响应内容: ${data.substring(0, 1000)}`);
          
          if (res.statusCode && res.statusCode >= 400) {
            try {
              const errorData = JSON.parse(data);
              reject(new Error(errorData.error || `HTTP错误: ${res.statusCode}`));
            } catch (e) {
              reject(new Error(`HTTP错误: ${res.statusCode}: ${data}`));
            }
            return;
          }
          
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ raw: data });
          }
        });
      });

      req.on('error', (error) => {
        this.writeLog(`[Electron] Node.js HTTP请求失败: ${error.message}`);
        reject(new Error(`网络请求失败: ${error.message}`));
      });

      // 设置超时（30秒）
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('请求超时（30秒）'));
      });

      if (body) {
        req.write(body);
      }
      
      req.end();
    });
  }
}

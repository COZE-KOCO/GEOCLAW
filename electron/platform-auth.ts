import { BrowserWindow, session, Session, Cookie, app, ipcMain } from 'electron';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

// 平台登录配置 - 修正后的配置
const PLATFORM_CONFIG = {
  wechat: {
    name: '微信公众号',
    loginUrl: 'https://mp.weixin.qq.com',
    loginSuccessUrl: 'mp.weixin.qq.com/cgi-bin/home',
    loginSuccessText: '首页', // 页面中出现的成功标识文字
    iconUrl: 'https://img.icons8.com/color/48/weixin.png',
    cookieKeys: ['slave_sid', 'slave_user', 'wxtoken1', 'token', 'data_ticket'],
    requireManualConfirm: false,
  },
  zhihu: {
    name: '知乎',
    loginUrl: 'https://www.zhihu.com/signin',
    loginSuccessUrl: 'zhihu.com/',
    loginSuccessText: '关注',
    iconUrl: 'https://img.icons8.com/color/48/zhihu.png',
    cookieKeys: ['z_c0', '_zap', 'd_c0', 'q_c1'],
    requireManualConfirm: false,
  },
  weibo: {
    name: '微博',
    // 使用新版微博登录页面
    loginUrl: 'https://weibo.com/newlogin',
    loginSuccessUrl: 'weibo.com/',
    loginSuccessText: '首页',
    iconUrl: 'https://img.icons8.com/color/48/weibo.png',
    cookieKeys: ['SUB', 'SUBP', 'ALF', 'SINAGLOBAL'],
    requireManualConfirm: true, // 微博需要手动确认
  },
  toutiao: {
    name: '今日头条',
    loginUrl: 'https://mp.toutiao.com/auth/page/login',
    loginSuccessUrl: 'mp.toutiao.com/',
    loginSuccessText: '创作',
    iconUrl: 'https://img.icons8.com/color/48/toutiao.png',
    cookieKeys: ['sessionid', 'tt_webid', 'tt_csrf_token', 'ttwid', 'sso_uid_tt'],
    requireManualConfirm: true, // 头条需要手动确认
  },
  bilibili: {
    name: 'B站',
    loginUrl: 'https://passport.bilibili.com/login',
    loginSuccessUrl: 'bilibili.com/',
    loginSuccessText: '动态',
    iconUrl: 'https://img.icons8.com/color/48/bilibili.png',
    cookieKeys: ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5'],
    requireManualConfirm: false,
  },
  xiaohongshu: {
    name: '小红书',
    loginUrl: 'https://creator.xiaohongshu.com/login',
    loginSuccessUrl: 'creator.xiaohongshu.com/',
    loginSuccessText: '发布',
    iconUrl: 'https://img.icons8.com/color/48/xiaohongshu.png',
    cookieKeys: ['web_session', 'webId', 'a1', 'websec_token'],
    requireManualConfirm: true, // 小红书需要手动确认
  },
  douyin: {
    name: '抖音',
    // 使用正确的登录页面，而不是首页
    loginUrl: 'https://creator.douyin.com/login',
    loginSuccessUrl: 'creator.douyin.com/creator-micro',
    loginSuccessText: '发布',
    iconUrl: 'https://img.icons8.com/color/48/tiktok.png',
    // 抖音首页的ttwid不是登录态，需要sessionid才是真正的登录
    cookieKeys: ['sessionid', 'passport_csrf_token', 'sid_guard', 'uid_tt'],
    requireManualConfirm: true, // 抖音需要手动确认
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
  private loginResolvers: Map<string, (result: { success: boolean; account?: SavedAccount; error?: string }) => void> = new Map();

  constructor(mainWindow: BrowserWindow, sessionModule: typeof session) {
    this.mainWindow = mainWindow;
    this.session = sessionModule;
    
    // 加载配置（优先级：环境变量 > 配置文件 > 默认值）
    this.config = this.loadConfig();
    this.apiBaseUrl = this.config.apiBaseUrl;
    
    console.log('[Electron] API地址:', this.apiBaseUrl);
    
    // 注册手动确认登录的IPC处理器
    this.registerManualConfirmHandler();
  }

  // 注册手动确认处理器
  private registerManualConfirmHandler() {
    ipcMain.handle('manual-confirm-login', async (_, platform: string) => {
      console.log(`[Electron] 收到 ${platform} 的手动确认登录请求`);
      const loginWindow = this.loginWindows.get(platform);
      if (!loginWindow || loginWindow.isDestroyed()) {
        return { success: false, error: '登录窗口已关闭' };
      }
      
      // 获取窗口的session
      const ses = loginWindow.webContents.session;
      const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
      
      // 获取所有Cookie
      const cookies = await ses.cookies.get({});
      console.log(`[Electron] ${platform} 当前Cookie数量: ${cookies.length}`);
      
      // 检查是否有足够的Cookie（至少5个，因为登录后通常会有很多Cookie）
      if (cookies.length < 5) {
        return { success: false, error: '未检测到登录信息，请先完成登录' };
      }
      
      // 用户已手动确认，直接保存账号
      const businessId = await this.getCurrentBusinessId();
      const account = await this.saveAccountToAPI(platform, cookies, businessId);
      
      // 关闭窗口
      const resolver = this.loginResolvers.get(platform);
      if (resolver) {
        resolver({ success: true, account });
        this.loginResolvers.delete(platform);
      }
      
      loginWindow.close();
      return { success: true, account };
    });
  }

  // 获取当前businessId
  private currentBusinessId: string = 'default';
  
  private async getCurrentBusinessId(): Promise<string> {
    return this.currentBusinessId;
  }

  // 加载配置（支持多种方式）
  private loadConfig(): AppConfig {
    // 1. 优先使用环境变量
    if (process.env.API_BASE_URL) {
      return { apiBaseUrl: process.env.API_BASE_URL };
    }

    // 2. 尝试读取配置文件
    const configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (config.apiBaseUrl) {
          console.log('[Electron] 从配置文件加载API地址');
          return { apiBaseUrl: config.apiBaseUrl };
        }
      } catch (e) {
        console.warn('[Electron] 配置文件解析失败:', e);
      }
    }

    // 3. 开发模式使用localhost
    if (!app.isPackaged) {
      return { apiBaseUrl: 'http://localhost:5000' };
    }

    // 4. 生产模式：尝试从应用内置配置读取
    const bundledConfigPath = path.join(path.dirname(app.getAppPath()), 'config.json');
    if (fs.existsSync(bundledConfigPath)) {
      try {
        const configContent = fs.readFileSync(bundledConfigPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (config.apiBaseUrl) {
          return { apiBaseUrl: config.apiBaseUrl };
        }
      } catch (e) {
        console.warn('[Electron] 内置配置解析失败:', e);
      }
    }

    // 5. 默认值（生产环境应该配置）
    console.warn('[Electron] 未配置API地址，使用默认值。请设置环境变量API_BASE_URL或创建配置文件');
    return { apiBaseUrl: 'http://localhost:5000' };
  }

  // 获取配置文件路径
  private getConfigPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'config.json');
  }

  // 创建示例配置文件
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

  // 判断URL是否为平台登录URL
  isPlatformLoginUrl(url: string): boolean {
    return Object.values(PLATFORM_CONFIG).some(config => 
      url.includes(config.loginUrl.replace('https://', '').replace('http://', ''))
    );
  }

  // 打开登录窗口 - 重写版本
  async openLoginWindow(platform: string, businessId: string): Promise<{ success: boolean; account?: SavedAccount; error?: string }> {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) {
      return { success: false, error: '不支持的平台' };
    }

    this.currentBusinessId = businessId;

    return new Promise(async (resolve) => {
      // 创建隔离的session
      const partition = `persist:${platform}-${Date.now()}`;
      const ses = this.session.fromPartition(partition);

      // 标记是否已解析
      let resolved = false;
      // 记录窗口创建时间
      const windowCreatedAt = Date.now();

      // 存储resolver以便手动确认时使用
      this.loginResolvers.set(platform, resolve);

      const loginWindow = new BrowserWindow({
        width: 600,
        height: 800,
        parent: this.mainWindow,
        modal: false, // 改为非模态，方便用户操作
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          session: ses,
        },
        title: `登录 ${config.name} - 登录成功后请点击下方确认按钮`,
      });

      this.loginWindows.set(platform, loginWindow);

      // 清除该session的所有数据
      try {
        await ses.clearStorageData({
          storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers']
        });
        console.log(`[Electron] 已清除 ${platform} 登录session的缓存数据`);
      } catch (e) {
        console.warn(`[Electron] 清除缓存数据失败:`, e);
      }

      // 注入手动确认按钮的脚本（在每个页面加载后执行）
      loginWindow.webContents.on('did-finish-load', () => {
        loginWindow.webContents.executeJavaScript(`
          (function() {
            // 移除旧的确认按钮（如果存在）
            const oldBtn = document.getElementById('electron-login-confirm');
            if (oldBtn) oldBtn.remove();
            
            const oldContainer = document.getElementById('electron-login-container');
            if (oldContainer) oldContainer.remove();
            
            // 创建悬浮容器
            const container = document.createElement('div');
            container.id = 'electron-login-container';
            container.style.cssText = \`
              position: fixed;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 999999;
              display: flex;
              gap: 10px;
              align-items: center;
              background: rgba(0, 0, 0, 0.85);
              padding: 12px 24px;
              border-radius: 30px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            \`;
            
            // 提示文字
            const tip = document.createElement('span');
            tip.style.cssText = \`
              color: #fff;
              font-size: 14px;
              white-space: nowrap;
            \`;
            tip.textContent = '登录成功后请点击';
            
            // 确认按钮
            const btn = document.createElement('button');
            btn.id = 'electron-login-confirm';
            btn.textContent = '确认登录成功';
            btn.style.cssText = \`
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 10px 24px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.3s ease;
            \`;
            btn.onmouseover = function() {
              this.style.transform = 'scale(1.05)';
              this.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            };
            btn.onmouseout = function() {
              this.style.transform = 'scale(1)';
              this.style.boxShadow = 'none';
            };
            
            container.appendChild(tip);
            container.appendChild(btn);
            document.body.appendChild(container);
            
            // 点击事件
            btn.onclick = function() {
              this.textContent = '处理中...';
              this.disabled = true;
              window.electronAPI?.manualConfirmLogin('${platform}');
            };
            
            console.log('已注入登录确认按钮');
          })();
        `).catch(err => console.log('注入脚本失败:', err));
      });

      // 自动检测登录成功（辅助功能）
      const checkLoginSuccess = async (): Promise<{ success: boolean; cookies: Cookie[]; reason: string }> => {
        const cookies = await ses.cookies.get({});
        
        // 检查关键Cookie
        const foundKeys = config.cookieKeys.filter(key => 
          cookies.some((c: Cookie) => c.name === key && c.value && c.value.length > 10)
        );
        
        if (foundKeys.length >= 2) {
          return { success: true, cookies, reason: `检测到关键Cookie: ${foundKeys.join(', ')}` };
        }
        
        return { success: false, cookies: [], reason: `关键Cookie不足，已找到: ${foundKeys.join(', ') || '无'}` };
      };

      // URL变化检测
      loginWindow.webContents.on('did-navigate', async (_, url) => {
        if (resolved) return;
        
        console.log(`[Electron] ${platform} 页面导航到: ${url}`);
        
        // 检测是否到达登录成功页面
        if (url.includes(config.loginSuccessUrl)) {
          console.log(`[Electron] ${platform} 到达登录成功页面`);
          
          // 延迟2秒后检查Cookie（给页面时间写入Cookie）
          await new Promise(r => setTimeout(r, 2000));
          
          const result = await checkLoginSuccess();
          console.log(`[Electron] ${platform} Cookie检查结果:`, result.reason);
          
          // 如果自动检测成功且不需要手动确认
          if (result.success && !config.requireManualConfirm) {
            resolved = true;
            const account = await this.saveAccountToAPI(platform, result.cookies, businessId);
            this.loginResolvers.delete(platform);
            loginWindow.close();
            resolve({ success: true, account });
          }
        }
      });

      // 监听页面标题变化（辅助检测）
      loginWindow.on('page-title-updated', (_, title) => {
        console.log(`[Electron] ${platform} 页面标题: ${title}`);
      });

      // 加载登录页面
      console.log(`[Electron] 加载 ${platform} 登录页面: ${config.loginUrl}`);
      loginWindow.loadURL(config.loginUrl).catch(err => {
        console.error(`[Electron] 加载登录页面失败:`, err);
        // 尝试备用URL
        if (platform === 'weibo') {
          loginWindow.loadURL('https://login.sina.com.cn/signup/signin.php');
        }
      });

      // 窗口关闭处理
      loginWindow.on('closed', () => {
        this.loginWindows.delete(platform);
        if (!resolved) {
          this.loginResolvers.delete(platform);
          resolve({ success: false, error: '登录已取消' });
        }
      });

      // 页面加载错误处理
      loginWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[Electron] ${platform} 页面加载失败:`, errorCode, errorDescription);
        if (errorCode === -3) { // ERR_ABORTED
          // 忽略，通常是重定向
          return;
        }
      });
    });
  }

  // 通过API保存账号
  private async saveAccountToAPI(
    platform: string, 
    cookies: Cookie[],
    businessId: string
  ): Promise<SavedAccount> {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    
    // 将Cookie转换为对象
    const cookieObj: Record<string, string> = {};
    cookies.forEach((c: Cookie) => {
      cookieObj[c.name] = c.value;
    });

    // 尝试获取用户信息
    const userInfo = await this.fetchUserInfo(platform, cookieObj);
    
    const accountId = crypto.randomUUID();
    const displayName = userInfo.name || `${config.name}用户`;
    
    // 调用API保存账号
    const accountData = {
      id: accountId,
      businessId: businessId,
      platform: platform,
      accountName: displayName,
      displayName: displayName,
      platformName: config.name,
      cookies: cookieObj,
      avatar: userInfo.avatar,
      metadata: {
        platformData: cookieObj,
        loginTime: new Date().toISOString(),
      },
    };

    try {
      await this.callAPI('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          data: accountData,
        }),
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
      avatar: userInfo.avatar,
      cookies: cookieObj,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // 通知主窗口更新
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('account-updated', account);
    }

    return account;
  }

  // 获取用户信息（根据平台不同）
  private async fetchUserInfo(platform: string, cookies: Record<string, string>): Promise<{ name?: string; avatar?: string }> {
    // 各平台的用户信息接口
    const userApis: Record<string, { url: string; method: string; headers: Record<string, string> }> = {
      xiaohongshu: {
        url: 'https://creator.xiaohongshu.com/api/user/info',
        method: 'GET',
        headers: { 'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') }
      },
      // 可以添加其他平台的API
    };

    const apiConfig = userApis[platform];
    if (!apiConfig) {
      return {};
    }

    try {
      const data = await this.callAPIWithHeaders(apiConfig.url, {
        method: apiConfig.method,
        headers: apiConfig.headers,
      });
      
      // 解析用户信息（根据各平台API格式）
      if (platform === 'xiaohongshu' && data?.data?.user) {
        return {
          name: data.data.user.name || data.data.user.nickname,
          avatar: data.data.user.image,
        };
      }
    } catch (e) {
      console.log(`[Electron] 获取 ${platform} 用户信息失败:`, e);
    }

    return {};
  }

  // 带自定义headers的API调用
  private callAPIWithHeaders(url: string, options: { method: string; headers: Record<string, string> }): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? https : http;
      
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method,
        headers: options.headers,
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
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      req.end();
    });
  }

  // 通过API获取账号列表
  async getSavedAccounts(businessId: string): Promise<Record<string, SavedAccount[]>> {
    try {
      const data = await this.callAPI(`/api/accounts?businessId=${businessId}`, {
        method: 'GET',
      });
      
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

  // 通过API删除账号
  async removeAccount(platform: string, accountId: string): Promise<boolean> {
    try {
      await this.callAPI('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          data: { id: accountId },
        }),
      });
      return true;
    } catch (e) {
      console.error('删除账号失败:', e);
      return false;
    }
  }

  // 封装API调用
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

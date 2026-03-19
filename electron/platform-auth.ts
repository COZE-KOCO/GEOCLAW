import { BrowserWindow, session, Session, Cookie, app } from 'electron';
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
    iconUrl: 'https://img.icons8.com/color/48/weixin.png',
    cookieKeys: ['slave_sid', 'slave_user', 'wxtoken1', 'token'],
  },
  zhihu: {
    name: '知乎',
    loginUrl: 'https://www.zhihu.com/signin',
    loginSuccessUrl: 'zhihu.com/',
    iconUrl: 'https://img.icons8.com/color/48/zhihu.png',
    cookieKeys: ['z_c0', '_zap', 'd_c0'],
  },
  weibo: {
    name: '微博',
    loginUrl: 'https://weibo.com/login.php',
    loginSuccessUrl: 'weibo.com/u/',
    iconUrl: 'https://img.icons8.com/color/48/weibo.png',
    cookieKeys: ['SUB', 'SUBP', 'ALF'],
  },
  toutiao: {
    name: '今日头条',
    loginUrl: 'https://mp.toutiao.com/auth/page/login',
    loginSuccessUrl: 'mp.toutiao.com/',
    iconUrl: 'https://img.icons8.com/color/48/toutiao.png',
    cookieKeys: ['sessionid', 'tt_webid', 'tt_csrf_token'],
  },
  bilibili: {
    name: 'B站',
    loginUrl: 'https://passport.bilibili.com/login',
    loginSuccessUrl: 'bilibili.com/',
    iconUrl: 'https://img.icons8.com/color/48/bilibili.png',
    cookieKeys: ['SESSDATA', 'bili_jct', 'DedeUserID'],
  },
  xiaohongshu: {
    name: '小红书',
    loginUrl: 'https://creator.xiaohongshu.com/login',
    loginSuccessUrl: 'creator.xiaohongshu.com/',
    iconUrl: 'https://img.icons8.com/color/48/xiaohongshu.png',
    cookieKeys: ['web_session', 'webId', 'a1'],
  },
  douyin: {
    name: '抖音',
    loginUrl: 'https://creator.douyin.com/',
    loginSuccessUrl: 'creator.douyin.com/creator-micro',
    iconUrl: 'https://img.icons8.com/color/48/tiktok.png',
    cookieKeys: ['sessionid', 'passport_csrf_token', 'ttwid'],
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

  constructor(mainWindow: BrowserWindow, sessionModule: typeof session) {
    this.mainWindow = mainWindow;
    this.session = sessionModule;
    
    // 加载配置（优先级：环境变量 > 配置文件 > 默认值）
    this.config = this.loadConfig();
    this.apiBaseUrl = this.config.apiBaseUrl;
    
    console.log('[Electron] API地址:', this.apiBaseUrl);
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
    // macOS: ~/Library/Application Support/geo-optimizer/config.json
    // Windows: %APPDATA%/geo-optimizer/config.json
    // Linux: ~/.config/geo-optimizer/config.json
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

  // 打开登录窗口
  async openLoginWindow(platform: string, businessId: string): Promise<{ success: boolean; account?: SavedAccount; error?: string }> {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
    if (!config) {
      return { success: false, error: '不支持的平台' };
    }

    return new Promise((resolve) => {
      // 创建隔离的session
      const partition = `persist:${platform}-${Date.now()}`;
      const ses = this.session.fromPartition(partition);

      const loginWindow = new BrowserWindow({
        width: 500,
        height: 700,
        parent: this.mainWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          session: ses,
        },
        title: `登录 ${config.name}`,
      });

      this.loginWindows.set(platform, loginWindow);

      // 监听Cookie变化
      ses.cookies.on('changed', async (_, cookie, cause, removed) => {
        if (!removed && cause === 'explicit') {
          // 检测是否登录成功
          const cookies = await ses.cookies.get({});
          const hasAuthCookie = config.cookieKeys.some(key => 
            cookies.some((c: Cookie) => c.name === key)
          );
          
          if (hasAuthCookie) {
            // 提取Cookie并通过API保存
            const account = await this.saveAccountToAPI(platform, cookies, businessId);
            loginWindow.close();
            resolve({ success: true, account });
          }
        }
      });

      // 监听URL变化
      loginWindow.webContents.on('did-navigate', async (_, url) => {
        // 检测是否登录成功（通过URL判断）
        if (url.includes(config.loginSuccessUrl)) {
          const cookies = await ses.cookies.get({});
          if (cookies.length > 0) {
            const account = await this.saveAccountToAPI(platform, cookies, businessId);
            loginWindow.close();
            resolve({ success: true, account });
          }
        }
      });

      // 加载登录页面
      loginWindow.loadURL(config.loginUrl);

      // 窗口关闭处理
      loginWindow.on('closed', () => {
        this.loginWindows.delete(platform);
        resolve({ success: false, error: '登录已取消' });
      });
    });
  }

  // 通过API保存账号（数据存储在服务器数据库，与Web版共享）
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

    const accountId = crypto.randomUUID();
    
    // 调用API保存账号
    const accountData = {
      id: accountId,
      businessId: businessId,
      platform: platform,
      accountName: `${config.name}用户`,
      displayName: `${config.name}用户`,
      platformName: config.name,
      cookies: cookieObj,
    };

    try {
      await this.callAPI('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          data: accountData,
        }),
      });
    } catch (e) {
      console.error('保存账号到服务器失败:', e);
    }

    const account: SavedAccount = {
      id: accountId,
      platform,
      platformName: config.name,
      name: `${config.name}用户`,
      cookies: cookieObj,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // 通知主窗口更新
    this.mainWindow.webContents.send('account-updated', account);

    return account;
  }

  // 通过API获取账号列表（与Web版共享）
  async getSavedAccounts(businessId: string): Promise<Record<string, SavedAccount[]>> {
    try {
      const data = await this.callAPI(`/api/accounts?businessId=${businessId}`, {
        method: 'GET',
      });
      
      // 将API返回的账号列表按平台分组
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
      
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }
}

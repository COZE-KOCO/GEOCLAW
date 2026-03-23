import { app, BrowserWindow, ipcMain, session, shell, dialog, globalShortcut } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { autoUpdater } from 'electron-updater';
import { PlatformAuthManager } from './platform-auth';
import { createPublishScheduler, getPublishScheduler } from './publish-scheduler';
import { createCreationScheduler, getCreationScheduler } from './creation-scheduler';
import { createPublishPlanScheduler, getPublishPlanScheduler } from './publish-plan-scheduler';

let mainWindow: BrowserWindow | null = null;
let authManager: PlatformAuthManager;
let currentBusinessId: string = 'default';
let serverProcess: ChildProcess | null = null;

// 开发模式下加载localhost，生产模式启动本地服务器
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:5000';
const LOCAL_SERVER_PORT = 5000;
const LOCAL_SERVER_URL = `http://localhost:${LOCAL_SERVER_PORT}`;
// 远程服务器地址（扣子云端）
const REMOTE_SERVER_URL = process.env.ELECTRON_SERVER_URL || 'https://geoclaw.coze.site';
// 生产环境：优先使用远程服务器（云端API），确保能访问扣子内置数据库
const PROD_SERVER_URL = REMOTE_SERVER_URL;

// 配置自动更新
autoUpdater.autoDownload = false; // 不自动下载，让用户选择
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

// 启动本地 Next.js 服务器
function startLocalServer(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isDev) {
      console.log('开发模式，跳过启动本地服务器');
      resolve(true);
      return;
    }

    const serverPath = path.join(process.resourcesPath, 'server');
    const nextPath = path.join(serverPath, 'node_modules', 'next', 'dist', 'bin', 'next');
    
    console.log('正在启动本地服务器...', serverPath);
    
    // 设置环境变量
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: LOCAL_SERVER_PORT.toString(),
    };

    try {
      serverProcess = spawn('node', [nextPath, 'start', '--port', LOCAL_SERVER_PORT.toString()], {
        cwd: serverPath,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      serverProcess.stdout?.on('data', (data) => {
        console.log(`[Server] ${data}`);
      });

      serverProcess.stderr?.on('data', (data) => {
        console.error(`[Server Error] ${data}`);
      });

      serverProcess.on('error', (err) => {
        console.error('启动本地服务器失败:', err);
        resolve(false);
      });

      // 等待服务器启动
      setTimeout(() => {
        console.log('本地服务器启动完成');
        resolve(true);
      }, 3000);
    } catch (error) {
      console.error('启动本地服务器异常:', error);
      resolve(false);
    }
  });
}

// 停止本地服务器
function stopLocalServer() {
  if (serverProcess) {
    console.log('正在停止本地服务器...');
    serverProcess.kill();
    serverProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    title: 'GEO优化工具平台',
    show: false,
  });

  // 窗口准备好后再显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 加载应用
  if (isDev) {
    // 开发模式：加载本地开发服务器
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：直接加载远程服务器（扣子云端）
    // 这样可以确保访问扣子内置数据库和 AI 服务
    console.log('生产模式，连接远程服务器:', REMOTE_SERVER_URL);
    mainWindow.loadURL(REMOTE_SERVER_URL);
  }

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 允许在新窗口中打开登录页面
    if (authManager?.isPlatformLoginUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }
    // 其他外部链接用默认浏览器打开
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 监听URL变化，获取businessId
  mainWindow.webContents.on('did-navigate', (_, url) => {
    try {
      const urlObj = new URL(url);
      const businessId = urlObj.searchParams.get('businessId');
      if (businessId) {
        currentBusinessId = businessId;
      }
    } catch (e) {
      // URL解析失败，忽略
    }
  });

  // 注册快捷键：F12 或 Ctrl+Shift+I 打开开发者工具
  globalShortcut.register('F12', () => {
    mainWindow?.webContents.toggleDevTools();
  });
  
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools();
  });
  
  // 刷新页面快捷键
  globalShortcut.register('CommandOrControl+R', () => {
    mainWindow?.webContents.reload();
  });
  
  globalShortcut.register('F5', () => {
    mainWindow?.webContents.reload();
  });
}

// 初始化平台认证管理器
function initAuthManager() {
  authManager = new PlatformAuthManager(mainWindow!, session);
  
  // 监听平台登录请求
  ipcMain.handle('platform-login', async (_, platform: string, businessId?: string) => {
    const bid = businessId || currentBusinessId;
    return authManager.openLoginWindow(platform, bid);
  });

  // 监听获取已保存账号
  ipcMain.handle('get-saved-accounts', async (_, businessId?: string) => {
    const bid = businessId || currentBusinessId;
    return authManager.getSavedAccounts(bid);
  });

  // 监听删除账号
  ipcMain.handle('remove-account', async (_, platform: string, accountId: string) => {
    return authManager.removeAccount(platform, accountId);
  });

  // 设置businessId
  ipcMain.handle('set-business-id', async (_, businessId: string) => {
    currentBusinessId = businessId;
    return true;
  });

  // 检测是否在Electron环境
  ipcMain.handle('is-electron', () => true);
}

// 初始化自动更新
function initAutoUpdater() {
  if (isDev) {
    console.log('[Electron] 开发模式，跳过自动更新');
    return;
  }

  // 检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        available: result?.updateInfo?.version !== app.getVersion(),
        currentVersion: app.getVersion(),
        latestVersion: result?.updateInfo?.version,
        releaseNotes: result?.updateInfo?.releaseNotes,
      };
    } catch (error: any) {
      console.error('[Electron] 检查更新失败:', error);
      return { error: error.message };
    }
  });

  // 下载更新
  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      console.error('[Electron] 下载更新失败:', error);
      return { error: error.message };
    }
  });

  // 安装更新
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // 下载进度
  autoUpdater.on('download-progress', (progressInfo) => {
    mainWindow?.webContents.send('update-progress', {
      percent: progressInfo.percent,
      transferred: progressInfo.transferred,
      total: progressInfo.total,
      bytesPerSecond: progressInfo.bytesPerSecond,
    });
  });

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  // 错误处理
  autoUpdater.on('error', (error) => {
    console.error('[Electron] 自动更新错误:', error);
    mainWindow?.webContents.send('update-error', error.message);
  });

  // 应用启动后检查更新
  app.whenReady().then(() => {
    // 延迟3秒检查更新，避免影响启动速度
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(console.error);
    }, 3000);
  });
}

// 初始化发布任务调度器
function initPublishScheduler() {
  const serverUrl = isDev ? DEV_SERVER_URL : PROD_SERVER_URL;
  const scheduler = createPublishScheduler(mainWindow, serverUrl, 60000); // 每60秒检查一次

  // 启动调度器
  scheduler.start();
  console.log('[Electron] 发布任务调度器已启动');

  // IPC: 获取调度器状态
  ipcMain.handle('scheduler-status', () => {
    return scheduler.getStatus();
  });

  // IPC: 手动触发检查
  ipcMain.handle('scheduler-trigger', async () => {
    await scheduler.triggerCheck();
    return { success: true };
  });

  // IPC: 停止/启动调度器
  ipcMain.handle('scheduler-toggle', (_, enable: boolean) => {
    if (enable) {
      scheduler.start();
    } else {
      scheduler.stop();
    }
    return { success: true };
  });

  // IPC: 立即执行指定任务
  ipcMain.handle('execute-task-immediately', async (_, taskId: string) => {
    return scheduler.executeTaskImmediately(taskId);
  });
}

// 初始化创作任务调度器
function initCreationScheduler() {
  const serverUrl = isDev ? DEV_SERVER_URL : PROD_SERVER_URL;
  const scheduler = createCreationScheduler(mainWindow, serverUrl, 60000); // 每60秒检查一次

  // 启动调度器
  scheduler.start();
  console.log('[Electron] 创作任务调度器已启动');

  // IPC: 获取创作调度器状态
  ipcMain.handle('creation-scheduler-status', () => {
    return scheduler.getStatus();
  });

  // IPC: 手动触发创作检查
  ipcMain.handle('creation-scheduler-trigger', async () => {
    await scheduler.triggerCheck();
    return { success: true };
  });

  // IPC: 停止/启动创作调度器
  ipcMain.handle('creation-scheduler-toggle', (_, enable: boolean) => {
    if (enable) {
      scheduler.start();
    } else {
      scheduler.stop();
    }
    return { success: true };
  });
}

// 初始化发布计划调度器
function initPublishPlanScheduler() {
  const serverUrl = isDev ? DEV_SERVER_URL : PROD_SERVER_URL;
  const scheduler = createPublishPlanScheduler(mainWindow, serverUrl, 60000); // 每60秒检查一次

  // 启动调度器
  scheduler.start();
  console.log('[Electron] 发布计划调度器已启动');

  // IPC: 获取发布计划调度器状态
  ipcMain.handle('publish-plan-scheduler-status', () => {
    return scheduler.getStatus();
  });

  // IPC: 手动触发检查
  ipcMain.handle('publish-plan-scheduler-trigger', async () => {
    await scheduler.triggerCheck();
    return { success: true };
  });
}

app.whenReady().then(() => {
  // 创建示例配置文件（首次运行）
  PlatformAuthManager.createExampleConfig();
  
  createWindow();
  initAuthManager();
  initAutoUpdater();
  initPublishScheduler(); // 启动发布任务调度器
  initCreationScheduler(); // 启动创作任务调度器
  initPublishPlanScheduler(); // 启动发布计划调度器

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
  
  stopLocalServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全策略
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    // 允许的URL：
    // 1. 本地开发服务器
    // 2. file:// 协议
    // 3. 平台域名（登录窗口可能跳转到同域名的其他页面）
    const isAllowed = 
      url.startsWith(DEV_SERVER_URL) || 
      url.startsWith('file://') ||
      authManager?.isPlatformDomain(url);
    
    if (!isAllowed) {
      console.log('[Electron] 安全策略：阻止导航到', url);
      event.preventDefault();
    }
  });
});

// 获取版本信息
ipcMain.handle('get-version', () => {
  return {
    version: app.getVersion(),
    isDev: isDev,
    platform: process.platform,
    arch: process.arch,
  };
});

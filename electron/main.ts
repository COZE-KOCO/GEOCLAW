import { app, BrowserWindow, ipcMain, session, shell, dialog } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { PlatformAuthManager } from './platform-auth';

let mainWindow: BrowserWindow | null = null;
let authManager: PlatformAuthManager;
let currentBusinessId: string = 'default';

// 开发模式下加载localhost，生产模式加载打包后的文件
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:5000';

// 配置自动更新
autoUpdater.autoDownload = false; // 不自动下载，让用户选择
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

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
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
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

app.whenReady().then(() => {
  // 创建示例配置文件（首次运行）
  PlatformAuthManager.createExampleConfig();
  
  createWindow();
  initAuthManager();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全策略
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    // 防止导航到外部URL（登录窗口除外）
    const url = event.url;
    if (!url.startsWith(DEV_SERVER_URL) && !authManager?.isPlatformLoginUrl(url) && !url.startsWith('file://')) {
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

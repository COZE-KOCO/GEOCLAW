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

app.whenReady().then(() => {
  // 创建示例配置文件（首次运行）
  PlatformAuthManager.createExampleConfig();
  
  createWindow();
  initAuthManager();
  initAutoUpdater();
  initPublishScheduler(); // 启动发布任务调度器
  initCreationScheduler(); // 启动创作任务调度器

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

# 桌面版更新机制

## 概述

桌面版支持自动检测更新和增量更新，当Web版功能更新时，用户会收到更新提示。

## 更新流程

```
应用启动
    ↓
延迟3秒检查更新（不影响启动速度）
    ↓
发现新版本 → 弹窗提示用户
    ↓
用户选择"立即下载" → 后台下载更新
    ↓
下载完成 → 提示"重启并安装"
    ↓
用户确认 → 重启应用并安装更新
```

## 更新方式对比

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| **自动更新** | 应用内检测→下载→安装 | 小版本更新、Bug修复 |
| **手动更新** | 用户手动下载新版本覆盖安装 | 大版本更新、重大改动 |

## Web版功能更新如何同步到桌面版

### 场景1：纯前端功能更新

如果只是前端代码修改（如UI调整、新增页面）：

```
1. Web版更新部署完成
2. 桌面版用户下次启动时自动检查更新
3. 用户下载安装新版本
4. 新版本加载最新的静态资源（out目录）
```

**注意**：由于桌面版打包时会将前端代码打包进去，所以前端更新需要重新构建桌面版。

### 场景2：后端API更新

如果只是后端API修改：

```
1. 后端API更新部署完成
2. 桌面版无需更新，直接使用新API
3. 数据互通正常工作
```

### 场景3：Electron主进程更新

如果修改了Electron相关代码（如登录逻辑、平台配置）：

```
1. 修改 electron/ 目录下的代码
2. 重新构建桌面版：pnpm electron:build
3. 发布新版本
4. 用户收到自动更新提示
```

## 发布新版本流程

### 1. 更新版本号

编辑 `package.json`：

```json
{
  "version": "0.2.0"  // 从 0.1.0 升级到 0.2.0
}
```

### 2. 构建新版本

```bash
# 本地构建测试
pnpm electron:build

# 发布构建（会生成latest.yml等更新文件）
pnpm electron:build:publish
```

### 3. 部署更新文件

将 `release/` 目录下的文件部署到更新服务器：

```
更新服务器目录结构：
/updates/
├── latest.yml          # Windows更新配置
├── latest-mac.yml      # macOS更新配置
├── latest-linux.yml    # Linux更新配置
├── geo-optimizer-0.2.0.dmg
├── geo-optimizer-0.2.0-setup.exe
└── geo-optimizer-0.2.0.AppImage
```

### 4. 配置更新服务器URL

在 `package.json` 中配置：

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://your-domain.com/updates"
    }
  }
}
```

## 更新服务器配置

### 方式一：静态文件服务器

将构建产物放到Web服务器的静态目录：

```nginx
# Nginx配置示例
location /updates {
    alias /var/www/updates;
    autoindex on;
}
```

### 方式二：对象存储

将更新文件上传到对象存储（OSS/COS/S3）：

```json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/updates"
    }
  }
}
```

### 方式三：GitHub Releases

使用GitHub作为更新源：

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "geo-optimizer"
    }
  }
}
```

## 更新配置文件说明

### latest.yml（Windows）

```yaml
version: 0.2.0
releaseDate: '2024-03-19T12:00:00.000Z'
files:
  - url: geo-optimizer-0.2.0-setup.exe
    sha512: xxx
    size: 75000000
path: geo-optimizer-0.2.0-setup.exe
sha512: xxx
releaseNotes: |
  - 新增功能A
  - 修复Bug B
```

### latest-mac.yml（macOS）

```yaml
version: 0.2.0
releaseDate: '2024-03-19T12:00:00.000Z'
files:
  - url: geo-optimizer-0.2.0.dmg
    sha512: xxx
    size: 85000000
path: geo-optimizer-0.2.0.dmg
sha512: xxx
```

## 开发环境测试更新

开发模式下默认跳过自动更新。如需测试，可以：

```bash
# 强制启用更新检查
NODE_ENV=production pnpm electron:preview
```

或者在代码中临时移除开发模式检查：

```typescript
// electron/main.ts
// if (isDev) {
//   console.log('[Electron] 开发模式，跳过自动更新');
//   return;
// }
```

## 用户手动检查更新

用户可以在应用中手动触发更新检查：

1. 打开应用
2. 进入"关于"或"设置"页面
3. 点击"检查更新"按钮

## 更新提示文案

当检测到新版本时，显示以下信息：

```
发现新版本 v0.2.0
当前版本：v0.1.0

[稍后提醒] [立即下载]
```

下载中：

```
正在下载更新
[████████████░░░░░░░░] 65% · 5.2 MB/s

[下载中...]
```

下载完成：

```
更新已就绪
更新已下载完成，重启应用即可安装新版本。

[稍后安装] [重启并安装]
```

## 强制更新

对于重大安全更新或破坏性更新，可以配置为强制更新：

```typescript
// electron/main.ts
autoUpdater.autoDownload = true;  // 自动下载
// 用户无法跳过，必须更新才能继续使用
```

## 回滚机制

如果新版本出现问题，用户可以：

1. 卸载新版本
2. 从下载页面下载旧版本
3. 重新安装

或开发者可以发布修复版本（如 0.2.1）来修复问题。

## 注意事项

1. **版本号规范**：遵循语义化版本（SemVer）：主版本.次版本.修订版本
2. **更新频率**：建议小版本频繁更新，大版本谨慎发布
3. **测试流程**：发布前务必测试更新流程是否正常
4. **回滚方案**：保留旧版本安装包，以备回滚需要
5. **用户通知**：重大更新建议通过邮件或通知告知用户

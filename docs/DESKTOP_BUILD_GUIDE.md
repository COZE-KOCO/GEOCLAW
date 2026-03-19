# 桌面端安装包构建与部署指南

本文档说明如何使用 GitHub Actions 自动构建桌面端安装包，并配置下载链接。

## 方式一：GitHub Actions 自动构建（推荐）

### 1. 配置 GitHub 仓库

首先将代码推送到 GitHub 仓库：

```bash
# 初始化 Git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 关联远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. 更新 package.json 中的发布配置

编辑 `package.json`，更新 `build.publish` 配置：

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "COZE-KOCO",
      "repo": "geo-opt"
    }
  }
}
```

### 3. 触发构建

**方式 A：创建版本标签（推荐）**

```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

推送标签后，GitHub Actions 会自动：
- 在 macOS、Windows、Linux 三个环境并行构建
- 创建 GitHub Release
- 上传安装包到 Release

**方式 B：手动触发**

1. 进入 GitHub 仓库
2. 点击「Actions」选项卡
3. 选择「Build Desktop Client」工作流
4. 点击「Run workflow」

### 4. 获取下载链接

构建完成后（约 10-20 分钟）：

1. 进入仓库的「Releases」页面
2. 找到对应版本的 Release
3. 复制各平台安装包的下载链接

### 5. 配置环境变量

在扣子平台配置以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `DESKTOP_DOWNLOAD_URL_MAC` | macOS 安装包下载 URL |
| `DESKTOP_DOWNLOAD_URL_WIN` | Windows 安装包下载 URL |
| `DESKTOP_DOWNLOAD_URL_LINUX` | Linux 安装包下载 URL |
| `DESKTOP_VERSION` | 版本号（如 `1.0.0`） |
| `DESKTOP_RELEASE_DATE` | 发布日期（如 `2024-03-19`） |

### 6. 重新部署

配置完环境变量后，在扣子平台重新部署即可。

## 方式二：本地构建与上传（备用）

如果需要本地构建或手动上传安装包，请参考以下步骤。

### 1. 克隆项目并安装依赖

```bash
# 如果还没有项目代码，需要先获取
git clone <your-repo-url>
cd geo-optimizer

# 安装依赖
pnpm install
```

### 2. 构建 Next.js 应用

```bash
pnpm build
```

### 3. 编译 Electron 主进程

```bash
pnpm tsc -p tsconfig.electron.json
```

### 4. 构建 Electron 安装包

```bash
# 构建所有平台（如果在对应平台）
pnpm electron:build

# 或者指定平台
# macOS:
# pnpm electron:build --mac

# Windows:
# pnpm electron:build --win

# Linux:
# pnpm electron:build --linux
```

构建完成后，安装包位于 `release/` 目录：

```
release/
├── mac-arm64/           # macOS ARM 版
│   └── GEO优化工具平台-1.0.0-arm64.dmg
├── mac/                 # macOS Intel 版
│   └── GEO优化工具平台-1.0.0.dmg
├── win/                 # Windows 版
│   └── GEO优化工具平台 1.0.0.exe
└── linux/               # Linux 版
    └── geo-optimizer-1.0.0.AppImage
```

## 步骤二：上传安装包

使用 API 将安装包上传到对象存储：

### 上传 Windows 安装包

```bash
curl -X POST \
  -F "file=@release/win/GEO优化工具平台 1.0.0.exe" \
  -F "version=1.0.0" \
  https://geoclaw.coze.site/api/upload-desktop-client
```

### 上传 macOS 安装包

```bash
# Intel 版
curl -X POST \
  -F "file=@release/mac/GEO优化工具平台-1.0.0.dmg" \
  -F "version=1.0.0" \
  https://geoclaw.coze.site/api/upload-desktop-client

# ARM 版
curl -X POST \
  -F "file=@release/mac-arm64/GEO优化工具平台-1.0.0-arm64.dmg" \
  -F "version=1.0.0" \
  https://geoclaw.coze.site/api/upload-desktop-client
```

### 上传 Linux 安装包

```bash
curl -X POST \
  -F "file=@release/linux/geo-optimizer-1.0.0.AppImage" \
  -F "version=1.0.0" \
  https://geoclaw.coze.site/api/upload-desktop-client
```

**上传成功后，记录返回的 `downloadUrl`：**

```json
{
  "success": true,
  "data": {
    "platform": "win32",
    "downloadUrl": "https://xxx.oss-cn-beijing.aliyuncs.com/desktop-client/v1.0.0/xxx.exe?...",
    "message": "上传成功！请将此 URL 配置到环境变量 DESKTOP_DOWNLOAD_URL_WIN 中"
  }
}
```

## 步骤三：配置环境变量

在扣子平台配置环境变量：

1. 打开扣子项目设置
2. 找到「环境变量」设置
3. 添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `DESKTOP_DOWNLOAD_URL_MAC` | macOS 安装包的下载 URL |
| `DESKTOP_DOWNLOAD_URL_WIN` | Windows 安装包的下载 URL |
| `DESKTOP_DOWNLOAD_URL_LINUX` | Linux 安装包的下载 URL |
| `DESKTOP_VERSION` | 版本号，如 `1.0.0` |
| `DESKTOP_RELEASE_DATE` | 发布日期，如 `2024-03-19` |

## 步骤四：重新部署

1. 在扣子平台点击「部署」
2. 等待部署完成
3. 访问 `https://geoclaw.coze.site/download` 验证下载链接

## 验证

```bash
# 检查下载配置
curl https://geoclaw.coze.site/api/download

# 应该返回实际的下载链接，而不是 #coming-soon
```

## 常见问题

### Q: 为什么沙箱环境无法构建？

A: Electron 安装包需要在对应平台本地构建：
- macOS 安装包只能在 macOS 上构建
- Windows 安装包只能在 Windows 上构建
- Linux 安装包可以在 Linux 或 macOS 上构建

### Q: 构建失败怎么办？

A: 检查以下项目：
1. Node.js 版本是否 >= 18
2. 是否安装了所有依赖：`pnpm install`
3. 是否有足够的磁盘空间（构建产物较大）

### Q: 如何更新版本？

A: 
1. 更新 `package.json` 中的 `version`
2. 重新构建并上传
3. 更新扣子环境变量 `DESKTOP_VERSION`

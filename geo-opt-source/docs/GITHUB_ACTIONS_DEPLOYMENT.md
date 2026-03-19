# GitHub Actions 部署指南

## 概述

本项目使用 GitHub Actions 自动构建三个平台的桌面端安装包：
- macOS (.dmg)
- Windows (.exe)
- Linux (.AppImage)

## 前置条件

1. GitHub 仓库（免费账户即可）
2. 项目代码已推送到仓库
3. `package.json` 中已配置正确的版本号

## 配置步骤

### 1. 推送代码到 GitHub

```bash
# 如果还没有初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: 添加 GitHub Actions 自动构建配置"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 2. 更新 package.json 中的发布配置

编辑 `package.json`，找到 `build.publish` 部分：

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

将 `YOUR_GITHUB_USERNAME` 和 `YOUR_REPO_NAME` 替换为你的实际信息。

### 3. 触发构建

有两种方式触发构建：

#### 方式 A：创建版本标签（推荐）

```bash
# 确保版本号已更新
# 编辑 package.json 中的 version 字段，如 "version": "1.0.0"

# 提交版本更新
git add package.json
git commit -m "chore: bump version to 1.0.0"

# 创建标签
git tag v1.0.0

# 推送提交和标签
git push origin main
git push origin v1.0.0
```

推送标签后，GitHub Actions 会自动开始构建。

#### 方式 B：手动触发

1. 打开 GitHub 仓库
2. 点击「Actions」选项卡
3. 在左侧选择「Build Desktop Client」工作流
4. 点击右侧的「Run workflow」按钮
5. 选择分支（默认 main），点击绿色的「Run workflow」按钮

### 4. 查看构建进度

1. 进入 GitHub 仓库的「Actions」页面
2. 点击正在运行的工作流
3. 可以实时查看每个步骤的日志

构建大约需要 10-20 分钟，取决于项目大小和 GitHub 服务器负载。

### 5. 获取构建产物

构建完成后有两种获取方式：

#### 方式 A：从 Release 下载（推荐）

如果通过标签触发构建，GitHub Actions 会自动创建 Release：

1. 进入仓库的「Releases」页面
2. 找到对应版本（如 v1.0.0）
3. 展开「Assets」查看所有安装包
4. 点击下载或右键复制下载链接

#### 方式 B：从 Artifacts 下载

1. 进入 Actions 页面
2. 点击已完成的工作流
3. 在页面底部的「Artifacts」部分：
   - `mac-dmg`：macOS 安装包
   - `win-exe`：Windows 安装包
   - `linux-appimage`：Linux 安装包

### 6. 配置扣子环境变量

获取下载链接后，在扣子平台配置环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DESKTOP_DOWNLOAD_URL_MAC` | macOS 安装包下载链接 | `https://github.com/xxx/xxx/releases/download/v1.0.0/xxx.dmg` |
| `DESKTOP_DOWNLOAD_URL_WIN` | Windows 安装包下载链接 | `https://github.com/xxx/xxx/releases/download/v1.0.0/xxx.exe` |
| `DESKTOP_DOWNLOAD_URL_LINUX` | Linux 安装包下载链接 | `https://github.com/xxx/xxx/releases/download/v1.0.0/xxx.AppImage` |
| `DESKTOP_VERSION` | 版本号 | `1.0.0` |
| `DESKTOP_RELEASE_DATE` | 发布日期 | `2024-03-19` |

### 7. 验证

重新部署后，验证下载页面是否显示正确的下载链接：

```bash
curl https://你的域名.coze.site/api/download
```

应该返回实际的下载链接，而不是 `#coming-soon`。

## 发布新版本

当需要发布新版本时：

```bash
# 1. 更新 package.json 中的版本号
# "version": "1.1.0"

# 2. 提交更改
git add package.json
git commit -m "chore: bump version to 1.1.0"

# 3. 创建新标签
git tag v1.1.0

# 4. 推送
git push origin main
git push origin v1.1.0

# 5. 更新扣子环境变量中的版本号和下载链接
```

## 代码签名（可选）

默认情况下，构建的安装包没有代码签名。如果需要签名：

### macOS 签名

1. 获取 Apple Developer 证书
2. 在 GitHub 仓库设置中添加 Secrets：
   - `CSC_LINK`：Base64 编码的证书文件
   - `CSC_KEY_PASSWORD`：证书密码
3. 更新 `.github/workflows/build-desktop.yml`，移除 `CSC_LINK: ''` 环境变量

### Windows 签名

1. 获取代码签名证书
2. 在 GitHub 仓库设置中添加 Secrets：
   - `WIN_CSC_LINK`：Base64 编码的证书文件
   - `WIN_CSC_KEY_PASSWORD`：证书密码
3. 更新 `.github/workflows/build-desktop.yml`，移除 `WIN_CSC_LINK: ''` 环境变量

## 常见问题

### Q: 构建失败怎么办？

1. 查看 Actions 日志，找到失败的步骤
2. 常见原因：
   - 依赖安装失败：检查 `pnpm-lock.yaml` 是否最新
   - TypeScript 编译错误：运行 `pnpm tsc --noEmit` 检查
   - 找不到文件：检查 `tsconfig.electron.json` 配置

### Q: 为什么 Artifacts 为空？

可能原因：
1. 构建过程中出错，检查日志
2. 构建产物路径配置错误，检查 `release/` 目录

### Q: 如何查看实际生成的文件名？

在 Actions 日志中，查看「List all files」步骤的输出。

### Q: Release 没有自动创建？

确保：
1. 使用标签触发（`git tag v1.0.0` + `git push origin v1.0.0`）
2. 标签以 `v` 开头
3. GitHub Actions 有创建 Release 的权限（默认有）

### Q: 如何跳过某些平台？

编辑 `.github/workflows/build-desktop.yml`，在 `matrix.include` 中移除不需要的平台配置。

## 相关文件

- `.github/workflows/build-desktop.yml`：GitHub Actions 工作流配置
- `package.json`：electron-builder 构建配置
- `electron/main.ts`：Electron 主进程
- `tsconfig.electron.json`：Electron TypeScript 配置

# GEO 优化工具 - 桌面端构建指南

本文档说明如何使用此构建包在 GitHub 上自动构建 Windows 桌面端应用。

## 📦 构建包内容

```
geo-optimizer-desktop/
├── electron/                  # Electron 主进程源码
│   ├── main.ts               # 主进程入口
│   ├── preload.ts            # 预加载脚本
│   ├── creation-scheduler.ts # 创作调度器
│   ├── publish-scheduler.ts  # 发布调度器
│   └── auto-publisher.ts     # 自动发布器
├── src/                       # Next.js 应用源码
│   ├── app/                  # 页面和 API 路由
│   ├── components/           # UI 组件
│   ├── lib/                  # 工具库
│   ├── storage/              # 存储层
│   └── hooks/                # React Hooks
├── public/                    # 公共资源
├── scripts/                   # 构建脚本
├── supabase/                  # 数据库迁移
├── .github/workflows/         # GitHub Actions 工作流
├── tsconfig.json             # TypeScript 配置
├── tsconfig.electron.json    # Electron TypeScript 配置
├── next.config.ts            # Next.js 配置
├── package.json              # 项目配置 (含 electron-builder)
├── pnpm-lock.yaml            # 依赖锁定文件
└── DESKTOP_BUILD.md          # 本文档
```

## 🚀 快速开始

### 步骤 1：上传到 GitHub

```bash
# 解压构建包
unzip geo-optimizer-desktop-build-*.zip

# 进入目录
cd geo-optimizer-desktop

# 初始化 Git
git init
git add .
git commit -m "feat: 初始化桌面端构建项目"

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/geo-optimizer-desktop.git
git branch -M main
git push -u origin main
```

### 步骤 2：修改必要配置

**修改 package.json 中的发布目标**：
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "YOUR_GITHUB_USERNAME",
      "repo": "YOUR_REPO_NAME"
    }
  }
}
```

**修改 electron/main.ts 中的 API 地址**：
```typescript
const PRODUCTION_API_URL = 'https://your-api-domain.com';
```

### 步骤 3：触发构建

**方式一：创建 Tag 自动触发**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**方式二：手动触发**
1. 进入 GitHub 仓库 → Actions
2. 选择 "Build Desktop Client (Windows)"
3. 点击 "Run workflow"，输入版本标签

### 步骤 4：下载构建产物
- 构建完成后在 **Releases** 页面下载安装包

## 🔧 本地构建

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm electron:dev

# 构建 Windows EXE
pnpm electron:build
```

## ⚙️ 配置说明

### 修改应用图标
替换 `public/icon.png` 文件（推荐 512x512 像素）

### 修改应用名称
编辑 `package.json` 中的 `productName` 字段

## 📞 技术支持

如有问题，请提交 Issue 到 GitHub 仓库。

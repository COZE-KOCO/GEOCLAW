# Electron 桌面版使用指南

## 概述

GEO优化工具平台现已支持Electron桌面版，实现了**免OAuth凭证自动登录**和**Web/桌面数据互通**功能。

### 核心优势

| 对比项 | Web版 | Electron桌面版 |
|--------|-------|---------------|
| OAuth凭证配置 | 需要申请配置 | **无需配置** |
| 登录方式 | 跳转第三方授权 | **内置窗口登录** |
| Cookie管理 | 手动处理 | **自动提取保存** |
| 跨域限制 | 有 | **无限制** |
| 数据存储 | 云端数据库 | **云端数据库（共享）** |
| 数据同步 | 实时同步 | **实时同步** |

## 数据互通

**Web版和桌面版共享同一份数据！**

- 在Web版绑定的账号，桌面版自动可见
- 在桌面版绑定的账号，Web版自动可见
- 数据统一存储在云端数据库，无需手动同步

详细架构说明请参考 [DATA_SYNC.md](./DATA_SYNC.md)。

## 快速开始

### 开发模式

```bash
# 方式1: 同时启动Next.js和Electron
pnpm electron:dev

# 方式2: 分步启动
pnpm dev                           # 先启动Next.js
pnpm electron:preview              # 再启动Electron
```

### 构建生产版本

```bash
# 构建桌面应用
pnpm electron:build
```

构建产物位于 `release/` 目录。

## 功能说明

### 账号绑定流程

1. 打开应用，进入「账号管理」页面
2. 点击平台图标（如微信公众号）
3. 系统弹出登录窗口
4. 在窗口中正常登录（扫码/账号密码）
5. 登录成功后自动关闭窗口，账号自动同步到云端

### 支持的平台

| 平台 | 登录URL | 检测方式 |
|------|---------|---------|
| 微信公众号 | mp.weixin.qq.com | Cookie检测 |
| 知乎 | zhihu.com/signin | Cookie检测 |
| 微博 | weibo.com/login.php | Cookie检测 |
| 今日头条 | mp.toutiao.com | Cookie检测 |
| B站 | passport.bilibili.com | Cookie检测 |
| 小红书 | creator.xiaohongshu.com | Cookie检测 |
| 抖音 | creator.douyin.com | Cookie检测 |

## 技术架构

```
┌─────────────────────────────────────────────┐
│              Electron 主进程                  │
│  ┌─────────────────────────────────────┐    │
│  │     PlatformAuthManager             │    │
│  │  - 管理登录窗口                      │    │
│  │  - 拦截Cookie                       │    │
│  │  - 保存账号到本地                    │    │
│  └─────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│              渲染进程 (Next.js)              │
│  ┌─────────────────────────────────────┐    │
│  │     AccountManager 组件              │    │
│  │  - 检测Electron环境                  │    │
│  │  - 调用electronAPI                   │    │
│  │  - 统一UI展示                        │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## 文件结构

```
electron/
├── main.ts           # Electron主进程
├── preload.ts        # 预加载脚本（暴露API给渲染进程）
└── platform-auth.ts  # 平台认证管理器

src/
├── components/
│   └── account-manager.tsx  # 账号管理组件（支持Web和Electron）
└── types/
    └── electron.d.ts        # Electron API类型定义
```

## 注意事项

1. **首次运行**: 需要先安装依赖 `pnpm install`
2. **开发模式**: 需要先启动Next.js服务 `pnpm dev`
3. **生产构建**: 需要配置应用图标 `public/icon.png`
4. **数据存储**: 账号数据存储在本地 `~/.config/geo-optimizer/platform-accounts.json`

## 常见问题

### Q: 为什么Web版需要OAuth凭证？
A: Web版使用OAuth协议进行授权，需要在各平台申请App ID和App Secret。

### Q: Electron版为什么不需要？
A: Electron版使用内置浏览器窗口，用户直接在窗口中登录，系统自动提取Cookie并保存，无需OAuth凭证。

### Q: 账号数据安全吗？
A: 账号数据存储在本地，不会上传到服务器。Cookie已加密存储。

### Q: 支持哪些操作系统？
A: 支持 macOS、Windows、Linux。

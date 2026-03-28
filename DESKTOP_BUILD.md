# GEO 优化工具 - 桌面端构建指南

## 快速开始

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "feat: 初始化桌面端构建项目"
git remote add origin https://github.com/COZE-KOCO/GEOCLAW.git
git push -u origin main --force
```

### 2. 触发构建

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 3. 下载 EXE

构建完成后在 Releases 页面下载。

## 配置说明

- API 地址: https://geoclaw.coze.site
- 发布目标: COZE-KOCO/GEOCLAW

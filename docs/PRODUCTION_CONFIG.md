# 生产环境配置指南

## 概述

桌面版需要连接到服务器API才能实现数据互通。生产环境部署时，需要配置 `API_BASE_URL` 指向您的服务器地址。

## 配置方式（按优先级排序）

### 方式一：配置文件（推荐）

应用首次运行时，会自动在用户数据目录创建示例配置文件。

#### 配置文件位置

| 操作系统 | 配置文件路径 |
|----------|-------------|
| macOS | `~/Library/Application Support/geo-optimizer/config.json` |
| Windows | `%APPDATA%\geo-optimizer\config.json` |
| Linux | `~/.config/geo-optimizer/config.json` |

#### 配置步骤

1. 找到配置文件（首次运行后自动创建）
2. 编辑 `config.json`：

```json
{
  "apiBaseUrl": "https://your-domain.com",
  "_comment": "将apiBaseUrl修改为您的服务器地址"
}
```

3. 重启应用

**示例**：
```json
{
  "apiBaseUrl": "https://geo-optimizer.example.com"
}
```

> ⚠️ 注意：URL不要带尾部斜杠，且必须包含协议（http:// 或 https://）

---

### 方式二：环境变量

在启动应用前设置环境变量。

#### macOS / Linux

```bash
# 方式1：命令行启动
API_BASE_URL=https://your-domain.com /Applications/GEO优化工具平台.app/Contents/MacOS/GEO优化工具平台

# 方式2：创建启动脚本
echo '#!/bin/bash
export API_BASE_URL=https://your-domain.com
/Applications/GEO优化工具平台.app/Contents/MacOS/GEO优化工具平台' > start.sh
chmod +x start.sh
./start.sh
```

#### Windows

```cmd
# 方式1：命令行
set API_BASE_URL=https://your-domain.com
"GEO优化工具平台.exe"

# 方式2：批处理脚本
@echo off
set API_BASE_URL=https://your-domain.com
start "" "GEO优化工具平台.exe"
```

---

### 方式三：打包时注入（开发者）

在构建安装包时将配置打包进去。

#### 步骤

1. 创建 `build/config.json`：

```json
{
  "apiBaseUrl": "https://your-domain.com"
}
```

2. 修改 `package.json` 的 build 配置：

```json
{
  "build": {
    "extraResources": [
      {
        "from": "build/config.json",
        "to": "config.json"
      }
    ]
  }
}
```

3. 构建应用：

```bash
pnpm electron:build
```

打包后的配置文件位置：
- macOS: `GEO优化工具平台.app/Contents/Resources/config.json`
- Windows: `resources/config.json`
- Linux: `resources/config.json`

---

### 方式四：electron-builder 环境变量注入

在构建时通过环境变量注入。

#### 修改 package.json

```json
{
  "scripts": {
    "electron:build:prod": "API_BASE_URL=https://your-domain.com electron-builder"
  }
}
```

#### 或在 CI/CD 中配置

```yaml
# GitHub Actions 示例
- name: Build Electron
  env:
    API_BASE_URL: https://your-domain.com
  run: pnpm electron:build
```

---

## 配置优先级

应用按以下顺序查找配置：

```
1. 环境变量 API_BASE_URL
      ↓ (未找到)
2. 用户配置文件 config.json
      ↓ (未找到)
3. 打包内置配置 config.json
      ↓ (未找到)
4. 开发模式: http://localhost:5000
   生产模式: 警告并使用默认值
```

## 验证配置

启动应用后，打开开发者工具（macOS: Cmd+Option+I，Windows: Ctrl+Shift+I），在控制台中查看：

```
[Electron] API地址: https://your-domain.com
```

## 常见问题

### Q: 修改配置后不生效？

A: 请确保：
1. JSON格式正确（无语法错误）
2. URL格式正确（包含协议，无尾部斜杠）
3. 已重启应用

### Q: 提示"未配置API地址"？

A: 检查以下几点：
1. 配置文件路径是否正确
2. JSON格式是否有效
3. `apiBaseUrl` 字段是否存在

### Q: 如何测试配置是否正确？

A: 打开应用，进入账号管理页面，如果能看到账号列表，说明配置成功。

### Q: 能否配置多个服务器？

A: 目前不支持。如需切换服务器，请修改配置文件后重启应用。

---

## 配置示例

### 开发环境

```json
{
  "apiBaseUrl": "http://localhost:5000"
}
```

### 测试环境

```json
{
  "apiBaseUrl": "https://test.your-domain.com"
}
```

### 生产环境

```json
{
  "apiBaseUrl": "https://geo.your-domain.com"
}
```

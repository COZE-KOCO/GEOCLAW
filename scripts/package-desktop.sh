#!/bin/bash

# ============================================================================
# 桌面端完整打包脚本
# 用途：将桌面端构建所需的所有文件打包成 ZIP 文件
# 输出：geo-optimizer-desktop-build-{timestamp}.zip
# 包含：完整源码、配置文件、GitHub Actions 工作流
# ============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 输出目录
OUTPUT_DIR="$PROJECT_ROOT/desktop-build-package"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="geo-optimizer-desktop-build-${TIMESTAMP}.zip"
PACKAGE_DIR="$OUTPUT_DIR/geo-optimizer-desktop"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}GEO 优化工具 - 桌面端完整打包脚本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 清理旧的打包目录
echo -e "${YELLOW}[1/14] 清理旧打包目录...${NC}"
rm -rf "$OUTPUT_DIR"
mkdir -p "$PACKAGE_DIR"

# ============================================================================
# 1. Electron 源码文件
# ============================================================================
echo -e "${YELLOW}[2/14] 复制 Electron 源码文件...${NC}"

if [ -d "electron" ]; then
    mkdir -p "$PACKAGE_DIR/electron"
    cp -r electron/* "$PACKAGE_DIR/electron/"
    echo "  ✓ electron/ 目录已复制"
else
    echo -e "  ${RED}✗ electron/ 目录不存在！${NC}"
    exit 1
fi

# ============================================================================
# 2. 配置文件
# ============================================================================
echo -e "${YELLOW}[3/14] 复制配置文件...${NC}"

# TypeScript 配置
[ -f "tsconfig.json" ] && cp tsconfig.json "$PACKAGE_DIR/" && echo "  ✓ tsconfig.json"
[ -f "tsconfig.electron.json" ] && cp tsconfig.electron.json "$PACKAGE_DIR/" && echo "  ✓ tsconfig.electron.json"
[ -f "next.config.ts" ] && cp next.config.ts "$PACKAGE_DIR/" && echo "  ✓ next.config.ts"
[ -f "next-env.d.ts" ] && cp next-env.d.ts "$PACKAGE_DIR/" && echo "  ✓ next-env.d.ts"

# 其他配置
[ -f "drizzle.config.ts" ] && cp drizzle.config.ts "$PACKAGE_DIR/" && echo "  ✓ drizzle.config.ts"
[ -f "components.json" ] && cp components.json "$PACKAGE_DIR/" && echo "  ✓ components.json"
[ -f "postcss.config.mjs" ] && cp postcss.config.mjs "$PACKAGE_DIR/" && echo "  ✓ postcss.config.mjs"
[ -f "eslint.config.mjs" ] && cp eslint.config.mjs "$PACKAGE_DIR/" && echo "  ✓ eslint.config.mjs"
[ -f ".babelrc" ] && cp .babelrc "$PACKAGE_DIR/" && echo "  ✓ .babelrc"

# package.json 和 lock 文件
[ -f "package.json" ] && cp package.json "$PACKAGE_DIR/" && echo "  ✓ package.json"
[ -f "pnpm-lock.yaml" ] && cp pnpm-lock.yaml "$PACKAGE_DIR/" && echo "  ✓ pnpm-lock.yaml"
[ -f ".npmrc" ] && cp .npmrc "$PACKAGE_DIR/" && echo "  ✓ .npmrc"

# .gitignore（使用桌面端专用模板）
if [ -f "scripts/templates/desktop-gitignore" ]; then
    cp scripts/templates/desktop-gitignore "$PACKAGE_DIR/.gitignore"
    echo "  ✓ .gitignore (桌面端专用)"
fi

# ============================================================================
# 3. GitHub Actions 工作流（只保留一个）
# ============================================================================
echo -e "${YELLOW}[4/14] 创建 GitHub Actions 工作流...${NC}"

mkdir -p "$PACKAGE_DIR/.github/workflows"

# 创建单一的工作流文件
cat > "$PACKAGE_DIR/.github/workflows/build-desktop.yml" << 'WORKFLOW_EOF'
name: Build Windows EXE

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    permissions:
      contents: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build Next.js
        run: pnpm build
      
      - name: Build Electron
        run: pnpm electron:build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: windows-exe
          path: release/*.exe
          retention-days: 30
      
      - name: Release
        uses: softprops/action-gh-release@v2
        with:
          files: release/*.exe
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
WORKFLOW_EOF

echo "  ✓ .github/workflows/build-desktop.yml (已创建)"

# ============================================================================
# 4. 构建脚本
# ============================================================================
echo -e "${YELLOW}[5/14] 复制构建脚本...${NC}"

if [ -d "scripts" ]; then
    mkdir -p "$PACKAGE_DIR/scripts"
    
    # 复制构建相关脚本
    for script in build.sh dev.sh start.sh; do
        if [ -f "scripts/$script" ]; then
            cp "scripts/$script" "$PACKAGE_DIR/scripts/"
            echo "  ✓ scripts/$script"
        fi
    done
else
    echo -e "  ${YELLOW}⚠ scripts/ 目录不存在${NC}"
fi

# ============================================================================
# 5. 公共资源（仅必要文件）
# ============================================================================
echo -e "${YELLOW}[6/14] 复制公共资源...${NC}"

if [ -d "public" ]; then
    mkdir -p "$PACKAGE_DIR/public"
    
    # 只复制必要的资源文件
    for item in icon.png icon.svg logo.png favicon.ico; do
        if [ -f "public/$item" ]; then
            cp "public/$item" "$PACKAGE_DIR/public/"
            echo "  ✓ public/$item"
        fi
    done
    
    echo "  ✓ 公共资源已复制"
else
    echo -e "  ${YELLOW}⚠ public/ 目录不存在${NC}"
fi

# ============================================================================
# 6. 源码目录 - src/app (Next.js 应用)
# ============================================================================
echo -e "${YELLOW}[7/14] 复制 Next.js 应用源码 (src/app/)...${NC}"

if [ -d "src/app" ]; then
    mkdir -p "$PACKAGE_DIR/src/app"
    
    # 复制所有页面和 API 路由
    cp -r src/app/* "$PACKAGE_DIR/src/app/"
    
    # 排除不必要的文件（压缩包等）
    find "$PACKAGE_DIR/src/app" -name "*.zip" -delete 2>/dev/null || true
    find "$PACKAGE_DIR/src/app" -name "*.tar.gz" -delete 2>/dev/null || true
    find "$PACKAGE_DIR/src/app" -name "*.tgz" -delete 2>/dev/null || true
    
    # 统计文件数量
    APP_FILE_COUNT=$(find "$PACKAGE_DIR/src/app" -type f | wc -l)
    echo "  ✓ src/app/ 已复制 ($APP_FILE_COUNT 个文件)"
else
    echo -e "  ${RED}✗ src/app/ 目录不存在！${NC}"
    exit 1
fi

# ============================================================================
# 7. 源码目录 - src/lib (工具库)
# ============================================================================
echo -e "${YELLOW}[8/14] 复制工具库 (src/lib/)...${NC}"

if [ -d "src/lib" ]; then
    mkdir -p "$PACKAGE_DIR/src/lib"
    cp -r src/lib/* "$PACKAGE_DIR/src/lib/"
    
    LIB_FILE_COUNT=$(find "$PACKAGE_DIR/src/lib" -type f | wc -l)
    echo "  ✓ src/lib/ 已复制 ($LIB_FILE_COUNT 个文件)"
else
    echo -e "  ${RED}✗ src/lib/ 目录不存在！${NC}"
    exit 1
fi

# ============================================================================
# 8. 源码目录 - src/components (UI 组件)
# ============================================================================
echo -e "${YELLOW}[9/14] 复制 UI 组件 (src/components/)...${NC}"

if [ -d "src/components" ]; then
    mkdir -p "$PACKAGE_DIR/src/components"
    cp -r src/components/* "$PACKAGE_DIR/src/components/"
    
    COMP_FILE_COUNT=$(find "$PACKAGE_DIR/src/components" -type f | wc -l)
    echo "  ✓ src/components/ 已复制 ($COMP_FILE_COUNT 个文件)"
else
    echo -e "  ${YELLOW}⚠ src/components/ 目录不存在${NC}"
fi

# ============================================================================
# 9. 源码目录 - src/storage (存储层)
# ============================================================================
echo -e "${YELLOW}[10/14] 复制存储层 (src/storage/)...${NC}"

if [ -d "src/storage" ]; then
    mkdir -p "$PACKAGE_DIR/src/storage"
    cp -r src/storage/* "$PACKAGE_DIR/src/storage/"
    
    STORAGE_FILE_COUNT=$(find "$PACKAGE_DIR/src/storage" -type f | wc -l)
    echo "  ✓ src/storage/ 已复制 ($STORAGE_FILE_COUNT 个文件)"
else
    echo -e "  ${YELLOW}⚠ src/storage/ 目录不存在${NC}"
fi

# ============================================================================
# 10. 源码目录 - src/config (配置文件) - 之前缺失！
# ============================================================================
echo -e "${YELLOW}[11/14] 复制配置文件 (src/config/)...${NC}"

if [ -d "src/config" ]; then
    mkdir -p "$PACKAGE_DIR/src/config"
    cp -r src/config/* "$PACKAGE_DIR/src/config/"
    
    CONFIG_FILE_COUNT=$(find "$PACKAGE_DIR/src/config" -type f | wc -l)
    echo "  ✓ src/config/ 已复制 ($CONFIG_FILE_COUNT 个文件)"
else
    echo -e "  ${RED}✗ src/config/ 目录不存在！${NC}"
    exit 1
fi

# ============================================================================
# 11. 源码目录 - src/contexts (上下文) - 之前缺失！
# ============================================================================
echo -e "${YELLOW}[12/14] 复制上下文 (src/contexts/)...${NC}"

if [ -d "src/contexts" ]; then
    mkdir -p "$PACKAGE_DIR/src/contexts"
    cp -r src/contexts/* "$PACKAGE_DIR/src/contexts/"
    
    CONTEXT_FILE_COUNT=$(find "$PACKAGE_DIR/src/contexts" -type f | wc -l)
    echo "  ✓ src/contexts/ 已复制 ($CONTEXT_FILE_COUNT 个文件)"
else
    echo -e "  ${RED}✗ src/contexts/ 目录不存在！${NC}"
    exit 1
fi

# ============================================================================
# 12. 源码目录 - 其他
# ============================================================================
echo -e "${YELLOW}[13/14] 复制其他源码目录...${NC}"

# src/hooks
if [ -d "src/hooks" ]; then
    mkdir -p "$PACKAGE_DIR/src/hooks"
    cp -r src/hooks/* "$PACKAGE_DIR/src/hooks/"
    echo "  ✓ src/hooks/"
fi

# src/types (如果存在)
if [ -d "src/types" ]; then
    mkdir -p "$PACKAGE_DIR/src/types"
    cp -r src/types/* "$PACKAGE_DIR/src/types/"
    echo "  ✓ src/types/"
fi

# middleware.ts
if [ -f "src/middleware.ts" ]; then
    cp src/middleware.ts "$PACKAGE_DIR/src/"
    echo "  ✓ src/middleware.ts"
fi

# Supabase 数据库迁移
if [ -d "supabase" ]; then
    mkdir -p "$PACKAGE_DIR/supabase"
    cp -r supabase/* "$PACKAGE_DIR/supabase/"
    echo "  ✓ supabase/ 数据库迁移文件"
fi

# ============================================================================
# 13. 修改 package.json 的 publish 配置
# ============================================================================
echo -e "${YELLOW}[14/14] 更新 package.json 配置...${NC}"

# 使用 sed 更新 publish 配置
sed -i 's/"owner": "COZE-KOCO"/"owner": "COZE-KOCO"/g' "$PACKAGE_DIR/package.json"
sed -i 's/"repo": "geo-opt"/"repo": "GEOCLAW"/g' "$PACKAGE_DIR/package.json"
echo "  ✓ package.json publish 配置已更新"

# ============================================================================
# 创建文档文件
# ============================================================================
cat > "$PACKAGE_DIR/DESKTOP_BUILD.md" << 'EOF'
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
EOF
echo "  ✓ DESKTOP_BUILD.md"

# ============================================================================
# 打包成 ZIP
# ============================================================================
echo ""
echo -e "${YELLOW}正在打包...${NC}"

cd "$OUTPUT_DIR"
zip -rq "../$ZIP_NAME" geo-optimizer-desktop

# 获取 ZIP 文件大小
ZIP_SIZE=$(du -h "../$ZIP_NAME" | cut -f1)

# 统计文件数量
TOTAL_FILES=$(find "$PACKAGE_DIR" -type f | wc -l)

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✓ 打包完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}输出文件:${NC} $ZIP_NAME"
echo -e "${BLUE}文件大小:${NC} $ZIP_SIZE"
echo -e "${BLUE}文件数量:${NC} $TOTAL_FILES 个文件"
echo -e "${BLUE}输出路径:${NC} $PROJECT_ROOT/$ZIP_NAME"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo "  1. 下载 $ZIP_NAME"
echo "  2. 解压到你的 GEOCLAW 目录"
echo "  3. 执行: git add . && git commit -m 'fix: 完整打包' && git push --force"
echo "  4. 执行: git tag v1.0.5 && git push origin v1.0.5"
echo ""

# 清理临时目录
rm -rf "$OUTPUT_DIR"
echo -e "${GREEN}临时文件已清理${NC}"

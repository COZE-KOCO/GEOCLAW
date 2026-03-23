#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the project..."
npx next build

# 清理不需要的依赖以减小产物大小（Web 部署不需要 Electron 相关包）
echo "Cleaning up unnecessary dependencies for web deployment..."
# pnpm 的依赖存储在 .pnpm 目录下
find node_modules/.pnpm -maxdepth 1 -type d -name "electron@*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/.pnpm -maxdepth 1 -type d -name "electron-builder@*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/.pnpm -maxdepth 1 -type d -name "@electron*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/.pnpm -maxdepth 1 -type d -name "*electron-winstaller*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/.pnpm -maxdepth 1 -type d -name "app-builder-lib@*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/.pnpm -maxdepth 1 -type d -name "builder-util@*" -exec rm -rf {} + 2>/dev/null || true
find node_modules/.pnpm -maxdepth 1 -type d -name "dmg-builder@*" -exec rm -rf {} + 2>/dev/null || true

# 清理符号链接
rm -rf node_modules/electron 2>/dev/null || true
rm -rf node_modules/electron-builder 2>/dev/null || true
rm -rf node_modules/@electron 2>/dev/null || true
rm -rf node_modules/electron-updater 2>/dev/null || true
rm -rf node_modules/electron-store 2>/dev/null || true

# 清理构建缓存
rm -rf .next/cache 2>/dev/null || true

echo "Build completed successfully!"

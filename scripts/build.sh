#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Building the project..."
pnpm next build

# 注意：不再清理 Electron 依赖
# 桌面端构建需要这些依赖，Web 部署时 Next.js 会自动处理

# 清理构建缓存
rm -rf .next/cache 2>/dev/null || true

echo "Build completed successfully!"

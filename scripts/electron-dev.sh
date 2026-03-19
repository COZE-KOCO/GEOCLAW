#!/bin/bash

# Electron开发启动脚本

echo "🔨 编译Electron主进程..."
pnpm tsc -p tsconfig.electron.json

echo "🚀 启动Electron应用..."
# 设置环境变量
export NODE_ENV=development

# 启动Electron
electron . --no-sandbox

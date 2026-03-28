# 桌面版安装包目录

此目录用于存放桌面版安装包。

## 需要添加的文件

构建完成后，将以下文件放到此目录：

```
public/downloads/
├── geo-optimizer-1.0.0.dmg        # macOS安装包
├── geo-optimizer-1.0.0-setup.exe  # Windows安装包
└── geo-optimizer-1.0.0.AppImage   # Linux AppImage
```

## 如何构建安装包

请参考 `docs/BUILD_ELECTRON.md` 文档。

## 快速构建

```bash
# 1. 构建Next.js静态导出
pnpm build

# 2. 编译Electron主进程
pnpm tsc -p tsconfig.electron.json

# 3. 构建安装包
pnpm electron:build

# 4. 复制到public目录
cp release/mac/*.dmg public/downloads/
cp release/win/*.exe public/downloads/
cp release/linux/*.AppImage public/downloads/
```

## 更新下载链接

修改 `src/app/api/download/route.ts` 中的版本号和下载链接。

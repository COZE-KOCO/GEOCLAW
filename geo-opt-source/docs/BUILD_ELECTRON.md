# 构建桌面版安装包

## 前置要求

1. 安装 Node.js 18+
2. 安装 pnpm: `npm install -g pnpm`
3. 安装项目依赖: `pnpm install`

## 构建步骤

### 1. 构建Next.js静态导出

```bash
# 修改next.config.ts，启用静态导出
# output: 'export'

pnpm build
```

### 2. 编译Electron主进程

```bash
pnpm tsc -p tsconfig.electron.json
```

### 3. 构建安装包

```bash
# 构建所有平台（需要在对应平台上运行）
pnpm electron:build

# 或单独构建某平台
pnpm electron-builder --mac    # macOS
pnpm electron-builder --win    # Windows
pnpm electron-builder --linux  # Linux
```

## 构建产物

构建完成后，安装包位于 `release/` 目录：

```
release/
├── mac/
│   └── GEO优化工具平台-1.0.0.dmg     # macOS安装包
├── win/
│   └── GEO优化工具平台-1.0.0-setup.exe # Windows安装包
└── linux/
    └── GEO优化工具平台-1.0.0.AppImage  # Linux AppImage
```

## 分发方式

### 方式1: 静态文件服务

将 `release/` 目录中的文件放到 `public/downloads/` 目录：

```bash
mkdir -p public/downloads
cp release/mac/*.dmg public/downloads/
cp release/win/*.exe public/downloads/
cp release/linux/*.AppImage public/downloads/
```

然后更新 `src/app/api/download/route.ts` 中的下载链接。

### 方式2: 对象存储（推荐）

1. 将安装包上传到对象存储（如阿里云OSS、腾讯云COS）
2. 更新 `src/app/api/download/route.ts` 中的下载链接：

```typescript
const DOWNLOAD_CONFIG = {
  platforms: {
    darwin: {
      url: 'https://your-bucket.oss-cn-hangzhou.aliyuncs.com/downloads/geo-optimizer-1.0.0.dmg',
    },
    // ...
  },
};
```

### 方式3: GitHub Releases

1. 创建GitHub Release
2. 上传安装包作为Release Assets
3. 使用GitHub的Raw链接作为下载地址

## 自动化构建（CI/CD）

### GitHub Actions 示例

创建 `.github/workflows/build-electron.yml`：

```yaml
name: Build Electron App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build Next.js
        run: pnpm build
      
      - name: Build Electron
        run: |
          pnpm tsc -p tsconfig.electron.json
          pnpm electron-builder
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: release/

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v3
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            macos-latest-build/*
            windows-latest-build/*
            ubuntu-latest-build/*
```

## 更新版本号

1. 更新 `package.json` 中的 `version` 字段
2. 更新 `src/app/api/download/route.ts` 中的版本信息
3. 创建新的Git标签: `git tag v1.0.1`
4. 推送标签触发构建: `git push --tags`

## 代码签名（可选但推荐）

### macOS

```bash
# 需要Apple Developer账号
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
pnpm electron-builder --mac
```

### Windows

```bash
# 需要代码签名证书
export WIN_CSC_LINK=/path/to/certificate.pfx
export WIN_CSC_KEY_PASSWORD=your-password
pnpm electron-builder --win
```

## 常见问题

### Q: 构建时报错 "ENOENT: no such file or directory, open '.../out/index.html'"
A: 确保在 `next.config.ts` 中设置了 `output: 'export'`，并成功运行了 `pnpm build`。

### Q: macOS构建后无法打开，提示"已损坏"
A: 需要进行代码签名，或用户需要在系统偏好设置中允许运行。

### Q: Windows SmartScreen警告
A: 需要代码签名证书对安装包进行签名。

### Q: 如何减小安装包体积？
A: 
1. 使用 `asar: true` 打包
2. 排除不必要的依赖
3. 压缩静态资源

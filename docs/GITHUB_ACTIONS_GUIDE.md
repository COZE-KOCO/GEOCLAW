# GitHub Actions 快速入门指南

## 1. 推送代码到 GitHub

```bash
# 初始化 Git（如果还没有）
git init
git add .
git commit -m "feat: 添加 GitHub Actions 自动构建配置"

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 2. 更新 package.json

编辑 `package.json`，找到 `build.publish` 部分，更新为你的 GitHub 仓库信息：

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "COZE-KOCO",
      "repo": "geo-opt"
    }
  }
}
```

## 3. 触发构建

### 方式 A：创建版本标签（推荐）

```bash
# 更新 package.json 中的版本号
# "version": "1.0.0"

# 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

推送标签后，GitHub Actions 会自动开始构建。

### 方式 B：手动触发

1. 打开 GitHub 仓库
2. 点击「Actions」选项卡
3. 选择「Build Desktop Client」工作流
4. 点击「Run workflow」→「Run workflow」

## 4. 查看构建进度

1. 进入 GitHub 仓库的「Actions」页面
2. 点击正在运行的工作流查看实时日志
3. 构建约需 10-20 分钟

## 5. 获取下载链接

构建完成后：

1. 进入仓库的「Releases」页面
2. 找到对应版本（如 v1.0.0）
3. 展开「Assets」查看所有安装包
4. 右键复制下载链接

## 6. 配置扣子环境变量

在扣子平台配置以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `DESKTOP_DOWNLOAD_URL_MAC` | 从 Release 复制的 macOS 下载链接 |
| `DESKTOP_DOWNLOAD_URL_WIN` | 从 Release 复制的 Windows 下载链接 |
| `DESKTOP_DOWNLOAD_URL_LINUX` | 从 Release 复制的 Linux 下载链接 |
| `DESKTOP_VERSION` | 版本号（如 `1.0.0`） |
| `DESKTOP_RELEASE_DATE` | 发布日期（如 `2024-03-19`） |

## 7. 验证

重新部署后，访问下载页面验证链接是否正常：

```
https://你的域名.coze.site/download
```

## 常见问题

### Q: 构建失败怎么办？

1. 查看 Actions 日志定位错误
2. 常见原因：
   - 依赖安装失败：检查 `pnpm-lock.yaml`
   - 构建超时：检查项目是否有循环依赖
   - 找不到文件：检查 `tsconfig.electron.json` 配置

### Q: 如何更新版本？

```bash
# 1. 更新 package.json 中的版本号
# 2. 提交更改
git add .
git commit -m "chore: bump version to 1.1.0"

# 3. 创建新标签
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

### Q: 如何下载构建产物？

构建完成后，除了从 Release 下载，还可以：

1. 进入 Actions 页面
2. 点击已完成的工作流
3. 在「Artifacts」部分下载各平台的安装包

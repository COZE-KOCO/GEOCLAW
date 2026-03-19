'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientUploader } from '@/components/client-uploader';
import {
  Download,
  Apple,
  Monitor,
  MonitorSmartphone,
  CheckCircle2,
  Sparkles,
  Shield,
  Zap,
  RefreshCw,
  ArrowLeft,
  Loader2,
  RefreshCcwDot,
} from 'lucide-react';

interface DownloadInfo {
  version: string;
  releaseDate: string;
  platforms: {
    darwin: { name: string; url: string; size: string };
    win32: { name: string; url: string; size: string };
    linux: { name: string; url: string; size: string };
  };
  releaseNotes: string[];
}

const features = [
  {
    icon: Shield,
    title: '免OAuth配置',
    description: '无需申请OAuth凭证，直接登录即可绑定账号',
  },
  {
    icon: Zap,
    title: '自动提取凭证',
    description: '登录成功后自动提取Cookie并同步保存',
  },
  {
    icon: RefreshCcwDot,
    title: '数据互通',
    description: 'Web版和桌面版数据实时同步，随时随地访问',
  },
  {
    icon: Sparkles,
    title: '多平台支持',
    description: '支持微信公众号、知乎、微博、B站等7大平台',
  },
];

const supportedPlatforms = [
  { name: '微信公众号', icon: '💚' },
  { name: '知乎', icon: '💡' },
  { name: '微博', icon: '🔴' },
  { name: '今日头条', icon: '📰' },
  { name: 'B站', icon: '📺' },
  { name: '小红书', icon: '📕' },
  { name: '抖音', icon: '🎵' },
];

export function DownloadPage() {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/download')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDownloadInfo(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (platform: 'darwin' | 'win32' | 'linux') => {
    if (!downloadInfo) return;
    
    setDownloading(platform);
    const url = downloadInfo.platforms[platform].url;
    
    // 如果是相对路径，转换为完整URL
    if (url.startsWith('/')) {
      window.open(url, '_blank');
    } else {
      window.open(url, '_blank');
    }
    
    setTimeout(() => setDownloading(null), 1000);
  };

  const platforms = downloadInfo ? [
    {
      id: 'darwin' as const,
      name: 'macOS',
      icon: Apple,
      description: '支持 macOS 10.15 (Catalina) 及以上',
      downloadUrl: downloadInfo.platforms.darwin.url,
      fileSize: downloadInfo.platforms.darwin.size,
    },
    {
      id: 'win32' as const,
      name: 'Windows',
      icon: Monitor,
      description: '支持 Windows 10/11 (64位)',
      downloadUrl: downloadInfo.platforms.win32.url,
      fileSize: downloadInfo.platforms.win32.size,
    },
    {
      id: 'linux' as const,
      name: 'Linux',
      icon: MonitorSmartphone,
      description: '支持 Ubuntu 20.04+ / Debian 11+',
      downloadUrl: downloadInfo.platforms.linux.url,
      fileSize: downloadInfo.platforms.linux.size,
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">GEO优化平台</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            {loading ? '加载中...' : `桌面版 v${downloadInfo?.version || '1.0.0'}`}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            下载桌面版
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            无需配置OAuth凭证，内置登录窗口自动提取Cookie，账号管理更便捷
          </p>
          
          {/* 开发中提示 */}
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">桌面版安装包正在准备中，敬请期待！</span>
          </div>
          
          {/* 当前状态说明 */}
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            <p>桌面端安装包需要管理员在本地构建后上传。</p>
            <p className="mt-1">如果您是管理员，请参考下方的"部署指南"。</p>
          </div>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {loading ? (
            <div className="col-span-3 text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            </div>
          ) : (
            platforms.map((platform) => {
              const Icon = platform.icon;
              const isDownloading = downloading === platform.id;
              const isAvailable = !platform.downloadUrl.includes('#');
              
              return (
                <Card key={platform.name} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center mb-4">
                      <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-xl">{platform.name}</CardTitle>
                    <CardDescription>{platform.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {platform.fileSize}
                    </div>
                    <Button 
                      className="w-full gap-2" 
                      size="lg"
                      disabled={!isAvailable || isDownloading}
                      onClick={() => handleDownload(platform.id)}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {isAvailable ? `下载 ${platform.name} 版` : '即将推出'}
                    </Button>
                    <p className="text-xs text-gray-400 mt-3">
                      点击下载即表示同意服务条款
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Release Notes */}
        {downloadInfo?.releaseNotes && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
              更新日志
            </h2>
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-6">
                <ul className="space-y-2">
                  {downloadInfo.releaseNotes.map((note, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{note}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            为什么选择桌面版？
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center p-6 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="mx-auto w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supported Platforms */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            支持的平台
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {supportedPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <span className="text-xl">{platform.icon}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{platform.name}</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            使用流程
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col gap-6">
              {[
                { step: 1, title: '下载并安装', description: '根据您的操作系统下载对应版本，双击安装即可' },
                { step: 2, title: '打开应用', description: '启动应用后进入账号管理页面' },
                { step: 3, title: '点击平台图标', description: '选择要绑定的平台，系统会弹出登录窗口' },
                { step: 4, title: '正常登录', description: '在弹窗中使用扫码或账号密码登录' },
                { step: 5, title: '自动绑定', description: '登录成功后自动提取Cookie并保存，账号绑定完成' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Installation Guide */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            安装指南
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* macOS */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Apple className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <CardTitle className="text-lg">macOS 安装</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">1.</span>
                    <span>下载 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.dmg</code> 文件</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">2.</span>
                    <span>双击打开 DMG 文件</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">3.</span>
                    <span>将应用拖到 Applications 文件夹</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">4.</span>
                    <span>从启动台打开应用</span>
                  </li>
                </ol>
                
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>首次打开提示"已损坏"？</strong>
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    打开终端，运行：
                    <code className="block mt-1 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">
                      xattr -cr /Applications/GEO优化工具平台.app
                    </code>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Windows */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-lg">Windows 安装</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">1.</span>
                    <span>下载 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.exe</code> 安装文件</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">2.</span>
                    <span>双击运行安装程序</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">3.</span>
                    <span>选择安装位置，点击安装</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">4.</span>
                    <span>安装完成后启动应用</span>
                  </li>
                </ol>
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>SmartScreen 警告？</strong>
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    点击"更多信息" → "仍要运行"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Linux */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <MonitorSmartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-lg">Linux 安装</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">1.</span>
                    <span>下载 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.AppImage</code> 文件</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">2.</span>
                    <span>右键 → 属性 → 权限 → 允许执行</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">3.</span>
                    <span>双击运行</span>
                  </li>
                </ol>
                
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>命令行方式：</strong>
                  </p>
                  <code className="block mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                    chmod +x geo-optimizer-*.AppImage<br/>
                    ./geo-optimizer-*.AppImage
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 管理员上传入口 */}
          <div className="mt-8 max-w-3xl mx-auto">
            <ClientUploader />
          </div>

          {/* 配置服务器地址 */}
          <Card className="mt-8 max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">!</span>
                首次使用：配置服务器地址
              </CardTitle>
              <CardDescription>
                桌面版需要连接到服务器才能同步数据，首次使用请配置API地址
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  应用首次运行会在以下位置创建配置文件：
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm font-mono">
                  <div className="space-y-1">
                    <p><span className="text-gray-500">macOS:</span> ~/Library/Application Support/geo-optimizer/config.json</p>
                    <p><span className="text-gray-500">Windows:</span> %APPDATA%\geo-optimizer\config.json</p>
                    <p><span className="text-gray-500">Linux:</span> ~/.config/geo-optimizer/config.json</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  编辑配置文件，修改 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">apiBaseUrl</code> 为您的服务器地址：
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm font-mono">
                  <pre>{`{
  "apiBaseUrl": "https://your-domain.com"
}`}</pre>
                </div>
                <p className="text-xs text-gray-500">
                  详细配置说明请参考 <a href="https://github.com/your-repo/docs/PRODUCTION_CONFIG.md" className="text-blue-500 hover:underline" target="_blank" rel="noopener">生产环境配置指南</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            常见问题
          </h2>
          <Card className="max-w-3xl mx-auto">
            <CardContent className="divide-y divide-gray-200 dark:divide-gray-700">
              {[
                {
                  q: '桌面版需要付费吗？',
                  a: '桌面版完全免费，所有功能与Web版一致。',
                },
                {
                  q: '账号数据安全吗？',
                  a: '账号数据统一存储在云端数据库，与Web版共享。敏感凭证加密存储。',
                },
                {
                  q: '支持哪些操作系统？',
                  a: '支持 macOS 10.15+、Windows 10/11 (64位)、Ubuntu 20.04+/Debian 11+。',
                },
                {
                  q: '如何更新到最新版本？',
                  a: '应用会自动检测更新，也可以手动下载最新版本覆盖安装。',
                },
                {
                  q: '可以同时使用Web版和桌面版吗？',
                  a: '可以！Web版和桌面版数据完全互通，在任何一端操作都会同步到另一端。',
                },
                {
                  q: '数据存储在哪里？',
                  a: '账号数据统一存储在云端数据库，Web版和桌面版共享同一份数据，随时随地访问。',
                },
              ].map((item, index) => (
                <div key={index} className="py-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">{item.q}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Web版 vs 桌面版
          </h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-gray-600 dark:text-gray-400">功能</th>
                    <th className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">Web版</th>
                    <th className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">桌面版</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'OAuth凭证配置', web: '需要申请配置', desktop: '无需配置', highlight: true },
                    { feature: '账号绑定', web: '跳转第三方授权', desktop: '内置窗口登录' },
                    { feature: 'Cookie管理', web: '手动处理', desktop: '自动提取保存' },
                    { feature: '跨域限制', web: '有', desktop: '无' },
                    { feature: '数据存储', web: '云端数据库', desktop: '云端数据库（共享）', highlight: true },
                    { feature: '数据同步', web: '实时同步', desktop: '实时同步', highlight: true },
                  ].map((row, index) => (
                    <tr key={index} className={row.highlight ? 'bg-blue-50 dark:bg-blue-950' : ''}>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{row.feature}</td>
                      <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">{row.web}</td>
                      <td className={`px-6 py-4 text-center font-medium ${row.highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                        {row.desktop}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">立即下载体验</h2>
          <p className="mb-6 opacity-90">
            告别繁琐的OAuth配置，一键登录绑定所有平台账号
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button variant="secondary" size="lg" className="gap-2">
              <Apple className="h-5 w-5" />
              下载 macOS 版
            </Button>
            <Button variant="secondary" size="lg" className="gap-2">
              <Monitor className="h-5 w-5" />
              下载 Windows 版
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-gray-500 dark:text-gray-400">
        <p>© 2024 GEO优化工具平台. 保留所有权利.</p>
      </footer>
    </div>
  );
}

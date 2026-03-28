import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { ElectronProvider } from '@/components/electron-provider';
import { BusinessProvider } from '@/contexts/business-context';
import { UserProvider } from '@/contexts/user-context';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'GEO优化工具 | 让内容成为AI的首选答案',
    template: '%s | GEO优化',
  },
  description:
    '专业的GEO优化工具，基于"两大核心+四轮驱动"评分体系，帮助您的内容在ChatGPT、DeepSeek等AI引擎中获得更高引用率。提供Schema结构化数据生成、E-E-A-T评估、优化建议等功能。',
  keywords: [
    'GEO优化',
    '生成式引擎优化',
    'AI搜索优化',
    'Schema标记',
    '结构化数据',
    'E-E-A-T',
    '内容优化',
    'AI引用率',
    'ChatGPT优化',
    'DeepSeek优化',
  ],
  authors: [{ name: 'GEO Optimizer Team' }],
  generator: 'GEO Optimizer',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: '扣子编程 | 你的 AI 工程师已就位',
    description:
      '我正在使用扣子编程 Vibe Coding，让创意瞬间上线。告别拖拽，拥抱心流。',
    url: 'https://code.coze.cn',
    siteName: '扣子编程',
    locale: 'zh_CN',
    type: 'website',
    // images: [
    //   {
    //     url: '',
    //     width: 1200,
    //     height: 630,
    //     alt: '扣子编程 - 你的 AI 工程师',
    //   },
    // ],
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'Coze Code | Your AI Engineer is Here',
  //   description:
  //     'Build and deploy full-stack applications through AI conversation. No env setup, just flow.',
  //   // images: [''],
  // },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <ElectronProvider>
          <UserProvider>
            <BusinessProvider>
              {children}
            </BusinessProvider>
          </UserProvider>
        </ElectronProvider>
        <Toaster />
      </body>
    </html>
  );
}

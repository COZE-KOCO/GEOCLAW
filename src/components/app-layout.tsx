'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * 应用统一布局组件
 * - 左侧固定Sidebar导航
 * - 右侧内容区域
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* 左侧固定导航栏 */}
      <Sidebar />
      
      {/* 右侧主内容区 */}
      <main className="flex-1 ml-56 overflow-auto">
        {children}
      </main>
    </div>
  );
}

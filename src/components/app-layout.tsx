'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';
import { BusinessSelector } from '@/components/business-selector';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * 应用统一布局组件
 * - 左侧固定Sidebar导航
 * - 顶部全局工具栏（商家选择器等）
 * - 右侧内容区域
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* 左侧固定导航栏 */}
      <Sidebar />
      
      {/* 右侧主内容区 */}
      <main className="flex-1 ml-56 flex flex-col overflow-hidden">
        {/* 顶部工具栏 - 全局组件 */}
        <header className="h-12 flex items-center justify-end px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
          <BusinessSelector className="w-[200px]" placeholder="选择商家" />
        </header>
        
        {/* 内容区域 */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

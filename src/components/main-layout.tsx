'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* 左侧导航栏 */}
      <Sidebar />
      
      {/* 右侧主内容区 */}
      <main className="flex-1 ml-56 overflow-auto">
        {children}
      </main>
    </div>
  );
}

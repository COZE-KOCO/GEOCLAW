'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  BarChart3,
  Network,
  FileText,
  Monitor,
  Target,
  Download,
  Package,
  MessageSquare,
  Gift,
  User,
  Users,
  Calendar,
  Send,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 导航分组配置
const navGroups = [
  {
    title: '',
    items: [
      { href: '/dashboard', label: '工作台', icon: LayoutDashboard },
    ],
  },
  {
    title: '内容',
    items: [
      { href: '/matrix', label: '内容创作', icon: Sparkles },
      { href: '/projects', label: '内容管理', icon: FileText },
    ],
  },
  {
    title: '运营',
    items: [
      { href: '/publish-tasks', label: '自动发布', icon: Calendar },
      { href: '/accounts', label: '账号管理', icon: Users },
      { href: '/personas', label: '人设管理', icon: Network },
      { href: '/publish', label: '批量发布', icon: Send },
      { href: '/analytics', label: '数据分析', icon: BarChart3 },
    ],
  },
  {
    title: 'GEO优化',
    items: [
      { href: '/geo-analysis', label: 'GEO分析', icon: Network },
      { href: '/geo-tasks', label: 'GEO任务', icon: Target },
      { href: '/monitor', label: '数据监测', icon: Monitor },
    ],
  },
];

// 底部导航项
const bottomNavItems = [
  { href: '/plan', label: '我的套餐', icon: Package, highlight: true },
  { href: '/feedback', label: '提意见', icon: MessageSquare },
  { href: '/whats-new', label: '新功能', icon: Gift },
  { href: '/account', label: '账号信息', icon: User },
];

// 检测Electron环境
const isElectron = () => {
  if (typeof window === 'undefined') return false;
  return typeof window.electronAPI !== 'undefined';
};

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ className, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['内容', '运营', 'GEO优化']);
  const [inElectron, setInElectron] = useState(false);

  useState(() => {
    setInElectron(isElectron());
  });

  const toggleGroup = (title: string) => {
    if (!title) return;
    setExpandedGroups(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  return (
    <aside 
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-56',
        className
      )}
    >
      {/* Logo区域 */}
      <div className="h-14 flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-800 dark:text-white">
                GEO优化
              </span>
              {inElectron && (
                <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-1.5 py-0.5 rounded">
                  桌面版
                </span>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* 导航区域 */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        {navGroups.map((group) => (
          <div key={group.title || 'base'} className="mb-1">
            {/* 分组标题 */}
            {group.title && (
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  'w-full flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors',
                  collapsed && 'justify-center'
                )}
              >
                {!collapsed && (
                  <>
                    <ChevronDown 
                      className={cn(
                        'h-3 w-3 transition-transform',
                        !expandedGroups.includes(group.title) && '-rotate-90'
                      )} 
                    />
                    <span>{group.title}</span>
                  </>
                )}
              </button>
            )}
            
            {/* 分组内容 */}
            {(!group.title || expandedGroups.includes(group.title)) && (
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                        isActive 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 底部导航 */}
      <div className="border-t border-slate-200 dark:border-slate-800 py-3 px-2 space-y-0.5">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                item.highlight
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : isActive
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
        
        {/* 下载桌面版入口 - 仅Web版显示 */}
        {!inElectron && !collapsed && (
          <Link
            href="/download"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span>下载桌面版</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

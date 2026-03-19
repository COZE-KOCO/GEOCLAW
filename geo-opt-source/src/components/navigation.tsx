'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  Sparkles, 
  FolderOpen, 
  BarChart3, 
  Network,
  Menu,
  X,
  Download,
  Monitor,
  Apple,
  MonitorSmartphone,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { href: '/geo-analysis', label: 'GEO分析', icon: Network },
  { href: '/geo-tasks', label: '任务列表', icon: BarChart3 },
  { href: '/matrix', label: '内容创作', icon: Sparkles },
  { href: '/projects', label: '内容管理', icon: FolderOpen },
];

// 检测当前运行环境
const isElectron = () => {
  if (typeof window === 'undefined') return false;
  return typeof window.electronAPI !== 'undefined';
};

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inElectron, setInElectron] = useState(false);

  // 客户端检测Electron环境
  useState(() => {
    setInElectron(isElectron());
  });

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              GEO优化平台
            </span>
            {inElectron && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                桌面版
              </span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant={isActive ? 'default' : 'ghost'} 
                    size="sm" 
                    className={`gap-2 ${isActive ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right Side: Download Button */}
          <div className="hidden md:flex items-center gap-2">
            {!inElectron && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    下载桌面版
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>选择您的操作系统</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/download" className="cursor-pointer">
                      <Apple className="h-4 w-4 mr-2" />
                      macOS
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/download" className="cursor-pointer">
                      <Monitor className="h-4 w-4 mr-2" />
                      Windows
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/download" className="cursor-pointer">
                      <MonitorSmartphone className="h-4 w-4 mr-2" />
                      Linux
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/download" className="cursor-pointer text-blue-600">
                      查看所有版本 →
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={isActive ? 'default' : 'ghost'} 
                      size="sm" 
                      className={`w-full justify-start gap-2 ${isActive ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              {!inElectron && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                  <Link href="/download">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Download className="h-4 w-4" />
                      下载桌面版
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

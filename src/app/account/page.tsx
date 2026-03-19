'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { User, Mail, Calendar, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <User className="h-6 w-6" />
              账号信息
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              管理您的账号信息和安全设置
            </p>
          </div>

          {/* 基本信息 */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-white">基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                  U
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">用户</h3>
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">免费版</Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">邮箱</div>
                    <div className="text-sm text-slate-800 dark:text-white">user@example.com</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">注册时间</div>
                    <div className="text-sm text-slate-800 dark:text-white">2024-03-20</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">账号状态</div>
                    <div className="text-sm text-green-600 dark:text-green-400">正常</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 使用统计 */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-white">本月使用情况</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">3 / 10</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">AI创作次数</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-white">2 / 3</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">绑定平台数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-white">退出登录</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">退出当前账号</p>
                </div>
                <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut className="h-4 w-4" />
                  退出
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

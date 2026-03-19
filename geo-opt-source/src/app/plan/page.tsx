'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { Package, Crown, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlanPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Package className="h-6 w-6" />
              我的套餐
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              管理您的订阅套餐和权益
            </p>
          </div>

          {/* 当前套餐 */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-white">当前套餐</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">免费版</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">基础功能，适合个人使用</p>
                  </div>
                </div>
                <Button className="bg-purple-500 hover:bg-purple-600">
                  升级套餐
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 套餐对比 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 免费版 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-base text-slate-800 dark:text-white">免费版</CardTitle>
                <div className="text-2xl font-bold text-slate-800 dark:text-white">¥0<span className="text-sm font-normal text-slate-500">/月</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />每日10次AI创作</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />基础GEO分析</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />3个平台绑定</li>
                </ul>
              </CardContent>
            </Card>

            {/* 专业版 */}
            <Card className="bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-slate-800 dark:text-white">专业版</CardTitle>
                  <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded">推荐</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white">¥99<span className="text-sm font-normal text-slate-500">/月</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />无限AI创作</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />高级GEO分析</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />10个平台绑定</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />自动发布功能</li>
                </ul>
                <Button className="w-full mt-4 bg-purple-500 hover:bg-purple-600">立即订阅</Button>
              </CardContent>
            </Card>

            {/* 企业版 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-base text-slate-800 dark:text-white">企业版</CardTitle>
                <div className="text-2xl font-bold text-slate-800 dark:text-white">¥399<span className="text-sm font-normal text-slate-500">/月</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />专业版全部功能</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />无限平台绑定</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />团队协作</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />专属客服</li>
                </ul>
                <Button variant="outline" className="w-full mt-4">联系销售</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

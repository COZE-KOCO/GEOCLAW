'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AppLayout } from '@/components/app-layout';
import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessSelector } from '@/components/business-selector';
import { useBusiness } from '@/contexts/business-context';

export default function AnalyticsPage() {
  const { selectedBusiness } = useBusiness();
  const [dateRange, setDateRange] = useState<string>('7d');

  // 模拟数据
  const stats = [
    { label: '总阅读量', value: '125,430', icon: Eye, change: '+12.5%' },
    { label: '总点赞数', value: '8,234', icon: Heart, change: '+8.3%' },
    { label: '总评论数', value: '1,456', icon: MessageCircle, change: '+15.2%' },
    { label: '总分享数', value: '567', icon: Share2, change: '+5.7%' },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-500" />
              数据分析
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              查看各账号的内容表现与运营数据
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px] border-slate-200 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">近7天</SelectItem>
                <SelectItem value="30d">近30天</SelectItem>
                <SelectItem value="90d">近90天</SelectItem>
              </SelectContent>
            </Select>
            <BusinessSelector />
          </div>
        </div>

        {selectedBusiness ? (
          <>
            {/* 数据统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat, index) => (
                <Card key={index} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-green-500 mt-1">{stat.change}</p>
                      </div>
                      <stat.icon className="h-8 w-8 text-purple-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">内容表现趋势</CardTitle>
                  <CardDescription>阅读量、互动量变化趋势</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>图表加载中...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">平台数据对比</CardTitle>
                  <CardDescription>各平台账号数据表现</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>图表加载中...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">热门内容TOP10</CardTitle>
                  <CardDescription>表现最佳的内容排行</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <span className="text-sm font-bold text-slate-400 w-6">{i}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">热门内容标题 {i}</p>
                          <p className="text-xs text-slate-500">阅读 {Math.floor(Math.random() * 10000)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg">账号表现排行</CardTitle>
                  <CardDescription>各账号数据表现</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: '生活分享家', platform: '小红书', reads: 23456 },
                      { name: '美食探店', platform: '小红书', reads: 18765 },
                      { name: '日常vlog', platform: '抖音', reads: 15432 },
                    ].map((account, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <Users className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-slate-500">{account.platform}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{account.reads.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">阅读量</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">请先选择企业/商家</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { Gift, Sparkles, Zap, Target, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const updates = [
  {
    version: 'V1.0.0',
    date: '2024-03-20',
    type: 'major',
    title: 'GEO优化工具正式上线',
    description: '全新的GEO优化平台，助力您的内容在AI搜索时代脱颖而出',
    features: [
      { icon: Sparkles, text: 'AI内容创作引擎，智能生成高质量内容' },
      { icon: Target, text: 'GEO评分系统，精准评估内容优化效果' },
      { icon: Rocket, text: '多平台发布，一键同步主流媒体平台' },
      { icon: Zap, text: '实时数据监测，追踪内容表现' },
    ],
  },
  {
    version: 'V0.9.0',
    date: '2024-03-15',
    type: 'beta',
    title: '公测版本',
    description: '开放公测，收集用户反馈',
    features: [
      { icon: Sparkles, text: '基础内容创作功能' },
      { icon: Target, text: 'GEO评分系统预览版' },
    ],
  },
];

export default function WhatsNewPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Gift className="h-6 w-6" />
              新功能
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              了解GEO优化平台的最新更新和功能
            </p>
          </div>

          <div className="space-y-6">
            {updates.map((update, index) => (
              <Card key={index} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg text-slate-800 dark:text-white">{update.version}</CardTitle>
                      <Badge className={update.type === 'major' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}>
                        {update.type === 'major' ? '重大更新' : '测试版'}
                      </Badge>
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{update.date}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white mt-2">{update.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{update.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {update.features.map((feature, fIndex) => {
                      const Icon = feature.icon;
                      return (
                        <div key={fIndex} className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="text-slate-600 dark:text-slate-400">{feature.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

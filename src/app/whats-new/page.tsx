'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { Gift, Sparkles, Zap, Target, Rocket, Bug, Megaphone, Pin, ExternalLink, Calendar, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: 'feature' | 'update' | 'fix' | 'announcement';
  icon?: string;
  link?: string;
  publishAt: string;
  isPinned: boolean;
  viewCount: number;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  feature: { label: '新功能', icon: <Sparkles className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
  update: { label: '更新', icon: <Zap className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
  fix: { label: '修复', icon: <Bug className="h-4 w-4" />, color: 'bg-green-100 text-green-700' },
  announcement: { label: '公告', icon: <Megaphone className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700' },
};

const iconMap: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  rocket: <Rocket className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  bug: <Bug className="h-5 w-5" />,
  megaphone: <Megaphone className="h-5 w-5" />,
};

export default function WhatsNewPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    loadNotifications();
  }, [activeCategory]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const url = activeCategory === 'all' 
        ? '/api/user/notifications' 
        : `/api/user/notifications?category=${activeCategory}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderContent = (content: string) => {
    // 将换行符分隔的内容渲染为列表
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 1) {
      return <p className="text-slate-600">{lines[0]}</p>;
    }
    return (
      <ul className="space-y-2">
        {lines.map((line, index) => {
          // 移除列表前缀符号
          const cleanLine = line.replace(/^[-•·]\s*/, '');
          return (
            <li key={index} className="flex items-start gap-2 text-slate-600">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <span>{cleanLine}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 flex">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Gift className="h-5 w-5 text-white" />
              </div>
              新功能
            </h1>
            <p className="text-slate-500 mt-2 ml-13">了解GEO优化平台的最新更新和功能</p>
          </div>

          {/* 分类筛选 */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={activeCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory('all')}
              className={activeCategory === 'all' 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white' 
                : 'border-slate-200 text-slate-600'
              }
            >
              全部
            </Button>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={activeCategory === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(key)}
                className={activeCategory === key 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white' 
                  : 'border-slate-200 text-slate-600'
                }
              >
                <span className="mr-1">{config.icon}</span>
                {config.label}
              </Button>
            ))}
          </div>

          {/* 通知列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : notifications.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40">
              <CardContent className="py-16 text-center">
                <Gift className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">暂无更新通知</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const config = categoryConfig[notification.category] || categoryConfig.feature;
                return (
                  <Card 
                    key={notification.id} 
                    className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200/60"
                  >
                    {notification.isPinned && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            notification.category === 'feature' 
                              ? 'bg-gradient-to-br from-blue-100 to-blue-200' 
                              : notification.category === 'update'
                                ? 'bg-gradient-to-br from-purple-100 to-purple-200'
                                : notification.category === 'fix'
                                  ? 'bg-gradient-to-br from-green-100 to-green-200'
                                  : 'bg-gradient-to-br from-orange-100 to-orange-200'
                          }`}>
                            <span className="text-slate-700">
                              {notification.icon ? iconMap[notification.icon] : config.icon}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg text-slate-800">{notification.title}</CardTitle>
                              {notification.isPinned && (
                                <Pin className="h-4 w-4 text-amber-500" />
                              )}
                              <Badge className={`${config.color} border-0 text-xs`}>
                                {config.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(notification.publishAt)}
                            </div>
                          </div>
                        </div>
                        {notification.link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => window.open(notification.link, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            查看详情
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {notification.summary && (
                        <p className="text-slate-500 text-sm mb-3">{notification.summary}</p>
                      )}
                      {renderContent(notification.content)}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

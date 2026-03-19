'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/app-layout';
import { PlayCircle, FileText, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessSelector } from '@/components/business-selector';
import { useBusiness } from '@/contexts/business-context';

export default function PublishPage() {
  const { selectedBusiness } = useBusiness();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  // 临时数据
  const platforms = [
    { id: 'xiaohongshu', name: '小红书', icon: '📕' },
    { id: 'douyin', name: '抖音', icon: '🎵' },
    { id: 'kuaishou', name: '快手', icon: '⚡' },
    { id: 'weixin', name: '微信', icon: '💬' },
  ];

  const accounts = [
    { id: '1', platform: 'xiaohongshu', accountName: 'user1', displayName: '生活分享家', status: 'active' },
    { id: '2', platform: 'xiaohongshu', accountName: 'user2', displayName: '美食探店', status: 'active' },
    { id: '3', platform: 'douyin', accountName: 'user3', displayName: '日常vlog', status: 'active' },
  ];

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleBatchPublish = () => {
    if (selectedAccounts.length === 0) return;
    setIsPublishing(true);
    setPublishProgress(0);
    
    // 模拟发布过程
    const interval = setInterval(() => {
      setPublishProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPublishing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PlayCircle className="h-6 w-6 text-purple-500" />
              批量发布
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              一键发布内容到多个平台账号
            </p>
          </div>
          <BusinessSelector />
        </div>

        {selectedBusiness ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 内容选择 */}
            <div className="lg:col-span-2">
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle>选择发布内容</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>请先在"内容创作"中生成内容</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* 账号选择 */}
              <Card className="mt-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>选择发布账号</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAccounts(accounts.map(a => a.id))}
                      >
                        全选
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAccounts([])}
                      >
                        取消全选
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 按平台分组 */}
                  {platforms.map(platform => {
                    const platformAccounts = accounts.filter(a => a.platform === platform.id);
                    if (platformAccounts.length === 0) return null;
                    
                    return (
                      <div key={platform.id} className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span>{platform.icon}</span>
                          <span className="font-medium">{platform.name}</span>
                          <Badge variant="outline">{platformAccounts.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {platformAccounts.map(account => (
                            <div 
                              key={account.id}
                              className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                              onClick={() => toggleAccount(account.id)}
                            >
                              <Checkbox 
                                checked={selectedAccounts.includes(account.id)}
                                onCheckedChange={() => toggleAccount(account.id)}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{account.displayName}</p>
                                <p className="text-xs text-gray-500">@{account.accountName}</p>
                              </div>
                              <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                                {account.status === 'active' ? '活跃' : '未激活'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {accounts.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无可用账号</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* 发布配置 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle>发布配置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 发布统计 */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">已选账号</span>
                      <span className="font-semibold">{selectedAccounts.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">覆盖平台</span>
                      <span className="font-semibold">
                        {new Set(accounts.filter(a => selectedAccounts.includes(a.id)).map(a => a.platform)).size}
                      </span>
                    </div>
                  </div>
                  
                  {/* 发布时间 */}
                  <div className="space-y-2">
                    <Label>发布时间</Label>
                    <Select defaultValue="now">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="now">立即发布</SelectItem>
                        <SelectItem value="schedule">定时发布</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 发布进度 */}
                  {isPublishing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>发布进度</span>
                        <span>{Math.round(publishProgress)}%</span>
                      </div>
                      <Progress value={publishProgress} />
                    </div>
                  )}
                  
                  {/* 发布按钮 */}
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleBatchPublish}
                    disabled={isPublishing || selectedAccounts.length === 0}
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        发布中...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        一键发布到矩阵号
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    内容将同时发布到 {selectedAccounts.length} 个账号
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="py-12 text-center">
              <PlayCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">请先选择企业/商家</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

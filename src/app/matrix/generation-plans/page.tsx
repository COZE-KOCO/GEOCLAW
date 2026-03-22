'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBusiness } from '@/contexts/business-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Search,
  ListChecks,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// 生成计划状态配置
const statusConfig = {
  pending: { label: '等待中', color: 'bg-gray-100 text-gray-800', icon: Clock },
  processing: { label: '生成中', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  failed: { label: '失败', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

// 建表 SQL
const CREATE_GENERATION_PLANS_SQL = `
-- 生成计划表
CREATE TABLE IF NOT EXISTS generation_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 1,
  completed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  keywords JSONB DEFAULT '[]',
  draft_ids JSONB DEFAULT '[]',
  mode VARCHAR(20) NOT NULL DEFAULT 'article',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS generation_plans_business_id_idx ON generation_plans(business_id);
CREATE INDEX IF NOT EXISTS generation_plans_status_idx ON generation_plans(status);
CREATE INDEX IF NOT EXISTS generation_plans_created_at_idx ON generation_plans(created_at);
`;

// 生成计划类型
interface GenerationPlan {
  id: string;
  businessId: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalCount: number;
  completedCount: number;
  failedCount: number;
  mode: 'article' | 'image-text';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  draftIds: string[];
}

export default function GenerationPlansPage() {
  const { selectedBusiness } = useBusiness();
  const [plans, setPlans] = useState<GenerationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [needsInit, setNeedsInit] = useState(false);

  useEffect(() => {
    if (selectedBusiness) {
      loadPlans();
    }
  }, [selectedBusiness]);

  const loadPlans = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    setNeedsInit(false);
    try {
      const response = await fetch(`/api/generation-plans?businessId=${selectedBusiness}`);
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.plans || []);
      } else if (data.needsInit) {
        setNeedsInit(true);
        setPlans([]);
      } else {
        toast.error('加载失败');
      }
    } catch (error) {
      console.error('加载生成计划失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const response = await fetch(`/api/generation-plans/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('删除成功');
        loadPlans();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN');
  };

  const getProgress = (plan: GenerationPlan) => {
    if (plan.totalCount === 0) return 0;
    return Math.round(((plan.completedCount + plan.failedCount) / plan.totalCount) * 100);
  };

  const filteredPlans = plans.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">生成计划</h1>
              <p className="text-sm text-gray-500">管理内容生成任务</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link href="/matrix/batch/create">
              <Button size="sm" className="bg-purple-500 hover:bg-purple-600">
                <Sparkles className="h-4 w-4 mr-1" />
                创作文章
              </Button>
            </Link>
            <Link href="/matrix/image-text/create">
              <Button size="sm" variant="outline">
                <ImageIcon className="h-4 w-4 mr-1" />
                创作图文
              </Button>
            </Link>
          </div>
        </div>

        {/* 搜索和刷新 */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索计划..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadPlans}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>

        {/* 计划列表 */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
              加载中...
            </CardContent>
          </Card>
        ) : needsInit ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-medium text-amber-900">数据库表未初始化</h3>
                <p className="text-sm text-amber-700">请在 Supabase 控制台执行以下 SQL 创建表</p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-left text-xs font-mono overflow-auto max-h-60">
                  <pre>{CREATE_GENERATION_PLANS_SQL}</pre>
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(CREATE_GENERATION_PLANS_SQL);
                      toast.success('SQL 已复制到剪贴板');
                    }}
                  >
                    复制 SQL
                  </Button>
                  <Button
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    打开 Supabase
                  </Button>
                  <Button variant="outline" onClick={loadPlans}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    已完成初始化
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : filteredPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ListChecks className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">暂无生成计划</p>
              <p className="text-sm text-gray-400 mb-4">点击上方按钮开始创作内容</p>
              <Link href="/matrix/batch/create">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  开始创作
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const status = statusConfig[plan.status];
                const StatusIcon = status.icon;
                const progress = getProgress(plan);
                const ModeIcon = plan.mode === 'image-text' ? ImageIcon : Sparkles;
                
                return (
                  <Card key={plan.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            plan.mode === 'image-text' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            <ModeIcon className={`h-5 w-5 ${
                              plan.mode === 'image-text' ? 'text-purple-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {plan.name}
                              </h3>
                              <Badge className={status.color}>
                                {plan.status === 'processing' ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                )}
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {plan.mode === 'image-text' ? '图文创作' : '文章创作'} · 
                              共 {plan.totalCount} 篇
                            </p>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href="/projects">
                                <FileText className="h-4 w-4 mr-2" />
                                查看生成结果
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => deletePlan(plan.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除计划
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* 进度条 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">
                            进度: {plan.completedCount + plan.failedCount} / {plan.totalCount}
                          </span>
                          <span className="text-gray-500">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>
                            <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                            成功 {plan.completedCount}
                          </span>
                          {plan.failedCount > 0 && (
                            <span>
                              <XCircle className="h-3 w-3 inline mr-1 text-red-500" />
                              失败 {plan.failedCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 时间信息 */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          创建: {formatTime(plan.createdAt)}
                        </span>
                        {plan.completedAt && (
                          <span>
                            完成: {formatTime(plan.completedAt)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </AppLayout>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Repeat,
  FileText,
  Users,
  ChevronRight,
  Info,
  Zap,
  ExternalLink,
  Settings,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { PublishPlanCreator } from './publish-plan-creator';

// 类型定义
type PlanStatus = 'active' | 'paused' | 'completed' | 'cancelled';
type Frequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';

interface TargetPlatform {
  platform: string;
  accountId: string;
  accountName?: string;
}

interface PublishResult {
  platform: string;
  accountId: string;
  accountName?: string;
  status: 'success' | 'failed' | 'pending';
  publishedUrl?: string;
  error?: string;
  publishedAt?: string;
}

interface PlatformCheck {
  platform: string;
  accountName: string;
  canPublish: boolean;
  reason?: string;
}

interface PublishPlan {
  id: string;
  businessId: string;
  draftId?: string;
  planName: string;
  planType: string;
  status: PlanStatus;
  frequency: Frequency;
  scheduledTime: string;
  scheduledDays: number[];
  scheduledDates: number[];
  maxRuns: number;
  currentRuns: number;
  startDate?: Date;
  endDate?: Date;
  title: string;
  content: string;
  targetPlatforms: TargetPlatform[];
  priority: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface PublishTaskManagerProps {
  businessId: string;
}

// 状态颜色和标签
const statusConfig: Record<PlanStatus, { color: string; label: string; icon: any }> = {
  active: { color: 'bg-green-100 text-green-800', label: '运行中', icon: Play },
  paused: { color: 'bg-yellow-100 text-yellow-800', label: '已暂停', icon: Pause },
  completed: { color: 'bg-blue-100 text-blue-800', label: '已完成', icon: CheckCircle2 },
  cancelled: { color: 'bg-gray-100 text-gray-800', label: '已取消', icon: XCircle },
};

const frequencyLabels: Record<Frequency, string> = {
  once: '仅一次',
  hourly: '每小时',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
};

// 平台信息
const platformInfo: Record<string, { name: string; icon: string; autoType?: string }> = {
  zhihu: { name: '知乎', icon: '知', autoType: 'api' },
  xiaohongshu: { name: '小红书', icon: '红', autoType: 'automation' },
  wechat: { name: '微信公众号', icon: '微', autoType: 'api' },
  toutiao: { name: '今日头条', icon: '头', autoType: 'api' },
  baijiahao: { name: '百家号', icon: '百', autoType: 'api' },
  douyin: { name: '抖音', icon: '抖', autoType: 'automation' },
  weibo: { name: '微博', icon: '微', autoType: 'api' },
  bilibili: { name: 'B站', icon: 'B', autoType: 'api' },
};

// 星期名称
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function PublishTaskManager({ businessId }: PublishTaskManagerProps) {
  // 状态
  const [plans, setPlans] = useState<PublishPlan[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showPlanCreator, setShowPlanCreator] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  
  // 自动化发布状态
  const [executingPlanId, setExecutingPlanId] = useState<string | null>(null);
  const [executeProgress, setExecuteProgress] = useState(0);
  const [executeResults, setExecuteResults] = useState<PublishResult[]>([]);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [platformChecks, setPlatformChecks] = useState<PlatformCheck[]>([]);
  const [showCheckDialog, setShowCheckDialog] = useState(false);
  const [checkingPlanId, setCheckingPlanId] = useState<string | null>(null);

  // 加载发布计划列表
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, statsRes] = await Promise.all([
        fetch(`/api/publish-plans?businessId=${businessId}&limit=50`),
        fetch(`/api/publish-plans?businessId=${businessId}&stats=true`),
      ]);
      
      const plansData = await plansRes.json();
      const statsData = await statsRes.json();
      
      if (plansData.success) {
        setPlans(plansData.data || []);
      }
      
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('加载发布计划失败:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadPlans();
    
    // 每30秒刷新一次
    const interval = setInterval(loadPlans, 30000);
    return () => clearInterval(interval);
  }, [loadPlans]);

  // 检查计划是否可以自动发布
  const checkAutoPublish = async (planId: string) => {
    setCheckingPlanId(planId);
    try {
      const res = await fetch(`/api/publish-tasks/${planId}/execute`);
      const data = await res.json();
      
      if (data.success) {
        setPlatformChecks(data.data.platforms);
        setShowCheckDialog(true);
      }
    } catch (error) {
      console.error('检查发布能力失败:', error);
    } finally {
      setCheckingPlanId(null);
    }
  };

  // 执行发布
  const executePublish = async (planId: string) => {
    setExecutingPlanId(planId);
    setExecuteProgress(0);
    setExecuteResults([]);
    setShowCheckDialog(false);
    
    try {
      const res = await fetch(`/api/publish-tasks/${planId}/execute`, {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (data.success) {
        setExecuteProgress(100);
        setExecuteResults(data.data.results || []);
        setShowResultDialog(true);
        
        // 刷新列表
        loadPlans();
      } else {
        setExecuteResults([{
          platform: 'unknown',
          accountId: '',
          status: 'failed',
          error: data.error || '发布失败',
        }]);
        setShowResultDialog(true);
      }
    } catch (error: any) {
      setExecuteResults([{
        platform: 'unknown',
        accountId: '',
        status: 'failed',
        error: error.message || '请求失败',
      }]);
      setShowResultDialog(true);
    } finally {
      setExecutingPlanId(null);
    }
  };

  // 执行计划操作
  const handlePlanAction = async (planId: string, action: string) => {
    try {
      const response = await fetch('/api/publish-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data: { id: planId } }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        loadPlans();
      }
    } catch (error) {
      console.error(`计划操作失败 (${action}):`, error);
    }
  };

  // 删除计划
  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    
    try {
      const response = await fetch('/api/publish-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', data: { id: planToDelete } }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPlanToDelete(null);
        loadPlans();
      }
    } catch (error) {
      console.error('删除计划失败:', error);
    }
  };

  // 格式化下次执行时间
  const formatNextRun = (plan: PublishPlan) => {
    if (!plan.nextRunAt) return '-';
    
    const date = new Date(plan.nextRunAt);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return '即将执行';
    if (diff < 60000) return '1分钟内';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟后`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时后`;
    
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取频率描述
  const getFrequencyDesc = (plan: PublishPlan) => {
    switch (plan.frequency) {
      case 'once':
        return '仅执行一次';
      case 'hourly':
        return `每小时 ${plan.scheduledTime.split(':')[1]}分`;
      case 'daily':
        return `每天 ${plan.scheduledTime}`;
      case 'weekly':
        const days = plan.scheduledDays.map(d => WEEKDAY_NAMES[d]).join('、');
        return `每${days} ${plan.scheduledTime}`;
      case 'monthly':
        const dates = plan.scheduledDates.join('、') + '号';
        return `每月 ${dates} ${plan.scheduledTime}`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">发布计划</h3>
          <p className="text-sm text-gray-500">
            创建发布计划，支持即时发布和周期性自动发布
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPlans}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button size="sm" onClick={() => setShowPlanCreator(true)}>
            <Plus className="h-4 w-4 mr-1" />
            创建计划
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">总计划</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-500">运行中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
            <div className="text-sm text-gray-500">已暂停</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">已完成</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
            <div className="text-sm text-gray-500">已取消</div>
          </CardContent>
        </Card>
      </div>

      {/* 计划列表 */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-4 text-gray-500">加载中...</p>
          </CardContent>
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">暂无发布计划</p>
            <p className="text-sm mt-1">点击"创建计划"开始设置自动发布</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3 pr-4">
            {plans.map((plan) => {
              const config = statusConfig[plan.status];
              const StatusIcon = config.icon;
              const isExpanded = expandedPlan === plan.id;
              const isExecuting = executingPlanId === plan.id;
              
              return (
                <Card key={plan.id} className={`hover:shadow-md transition-shadow ${isExecuting ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardContent className="p-4">
                    {/* 头部 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{plan.planName}</h4>
                          <Badge className={config.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          <Badge variant="outline">
                            <Repeat className="h-3 w-3 mr-1" />
                            {frequencyLabels[plan.frequency]}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {plan.title.substring(0, 30)}...
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {plan.targetPlatforms.length} 个账号
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-gray-500">
                            {getFrequencyDesc(plan)}
                          </span>
                          {plan.maxRuns > 0 && (
                            <span className="text-gray-500">
                              已执行 {plan.currentRuns}/{plan.maxRuns} 次
                            </span>
                          )}
                          {plan.status === 'active' && plan.nextRunAt && (
                            <span className="text-green-600 font-medium">
                              下次: {formatNextRun(plan)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {isExecuting && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>发布中...</span>
                            <Progress value={executeProgress} className="w-20 h-2" />
                          </div>
                        )}
                        {plan.status === 'active' && !isExecuting && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                              onClick={() => checkAutoPublish(plan.id)}
                            >
                              <Zap className="h-4 w-4 mr-1" />
                              自动发布
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlanAction(plan.id, 'pause')}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              暂停
                            </Button>
                          </>
                        )}
                        {plan.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlanAction(plan.id, 'resume')}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            恢复
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* 展开详情 */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {/* 发布内容预览 */}
                        <div>
                          <h5 className="font-medium mb-2">发布内容</h5>
                          <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                            {plan.content.substring(0, 200)}...
                          </p>
                        </div>
                        
                        {/* 发布账号 */}
                        <div>
                          <h5 className="font-medium mb-2">发布账号</h5>
                          <div className="flex flex-wrap gap-2">
                            {plan.targetPlatforms.map((target, idx) => {
                              const info = platformInfo[target.platform] || { name: target.platform, icon: '?' };
                              return (
                                <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                                  <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs">
                                    {info.icon}
                                  </span>
                                  {info.name} - {target.accountName || '账号'}
                                  {info.autoType === 'api' && (
                                    <span title="支持API自动发布"><ShieldCheck className="h-3 w-3 text-green-500 ml-1" /></span>
                                  )}
                                  {info.autoType === 'automation' && (
                                    <span title="需要配置授权"><Settings className="h-3 w-3 text-yellow-500 ml-1" /></span>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* 执行历史 */}
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>
                            创建于: {new Date(plan.createdAt).toLocaleString('zh-CN')}
                          </span>
                          {plan.lastRunAt && (
                            <span>
                              上次执行: {new Date(plan.lastRunAt).toLocaleString('zh-CN')}
                            </span>
                          )}
                        </div>
                        
                        {/* 底部操作 */}
                        <div className="flex justify-end gap-2">
                          {plan.status !== 'cancelled' && plan.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlanAction(plan.id, 'cancel')}
                            >
                              取消计划
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setPlanToDelete(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* 创建计划对话框 */}
      <PublishPlanCreator
        open={showPlanCreator}
        onOpenChange={setShowPlanCreator}
        businessId={businessId}
        onSuccess={() => {
          setShowPlanCreator(false);
          loadPlans();
        }}
      />

      {/* 发布前检查对话框 */}
      <Dialog open={showCheckDialog} onOpenChange={setShowCheckDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              自动发布确认
            </DialogTitle>
            <DialogDescription>
              系统将自动发布到以下平台，请确认账号授权状态
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {platformChecks.map((check, idx) => {
              const info = platformInfo[check.platform] || { name: check.platform, icon: '?' };
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-medium">
                      {info.icon}
                    </span>
                    <div>
                      <p className="font-medium">{info.name}</p>
                      <p className="text-sm text-gray-500">{check.accountName}</p>
                    </div>
                  </div>
                  {check.canPublish ? (
                    <Badge className="bg-green-100 text-green-800">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      已授权
                    </Badge>
                  ) : (
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-800">
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        未授权
                      </Badge>
                      {check.reason && (
                        <p className="text-xs text-gray-500 mt-1">{check.reason}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={() => {
                const planId = checkingPlanId || plans.find(p => platformChecks.length > 0)?.id;
                if (planId) executePublish(planId);
              }}
              disabled={!platformChecks.every(c => c.canPublish) || executingPlanId !== null}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {executingPlanId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发布中...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  确认发布
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发布结果对话框 */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {executeResults.every(r => r.status === 'success') ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  发布成功
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  发布完成
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              发布任务已完成，以下是各平台的发布结果
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {executeResults.map((result, idx) => {
              const info = platformInfo[result.platform] || { name: result.platform, icon: '?' };
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-medium">
                      {info.icon}
                    </span>
                    <div>
                      <p className="font-medium">{info.name}</p>
                      <p className="text-sm text-gray-500">{result.accountName || '账号'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.status === 'success' ? (
                      <div>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          发布成功
                        </Badge>
                        {result.publishedUrl && (
                          <a 
                            href={result.publishedUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-500 hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3 inline mr-1" />
                            查看文章
                          </a>
                        )}
                      </div>
                    ) : result.status === 'pending' ? (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        待处理
                      </Badge>
                    ) : (
                      <div>
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          发布失败
                        </Badge>
                        {result.error && (
                          <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={result.error}>
                            {result.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，确定要删除这个发布计划吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

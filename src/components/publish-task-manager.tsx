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
  // 检测是否在 Electron 环境
  const [isElectron, setIsElectron] = useState(false);
  
  // 调度器状态（仅桌面端）
  const [schedulerStatus, setSchedulerStatus] = useState<{
    isRunning: boolean;
    currentTask: {
      taskId: string;
      taskName: string;
      status: string;
      progress: number;
      results: any[];
    } | null;
  } | null>(null);
  
  // 实时任务状态（桌面端）
  const [realtimeTask, setRealtimeTask] = useState<{
    taskId: string;
    taskName: string;
    status: 'running' | 'completed' | 'failed';
    progress?: number;
    results?: PublishResult[];
  } | null>(null);
  
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

  // 检测 Electron 环境
  useEffect(() => {
    const checkElectron = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.isElectron();
        setIsElectron(result);
        
        if (result) {
          // 获取调度器状态
          const status = await window.electronAPI.getSchedulerStatus();
          setSchedulerStatus(status);
        }
      }
    };
    checkElectron();
  }, []);

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

  // 监听调度器事件（桌面端）
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    // 任务开始
    const unsubStarted = window.electronAPI.onTaskStarted((data) => {
      setRealtimeTask({
        taskId: data.taskId,
        taskName: data.taskName,
        status: 'running',
      });
      // 刷新计划列表
      loadPlans();
    });

    // 任务完成
    const unsubCompleted = window.electronAPI.onTaskCompleted((data) => {
      setRealtimeTask({
        taskId: data.taskId,
        taskName: data.taskName,
        status: 'completed',
        results: data.results,
      });
      // 刷新计划列表
      loadPlans();
    });

    // 任务失败
    const unsubFailed = window.electronAPI.onTaskFailed((data) => {
      setRealtimeTask({
        taskId: data.taskId,
        taskName: data.taskName,
        status: 'failed',
      });
    });

    // 调度器状态变化
    const unsubStatus = window.electronAPI.onSchedulerStatus((data) => {
      console.log('[PublishTaskManager] 调度器状态:', data);
    });

    return () => {
      unsubStarted();
      unsubCompleted();
      unsubFailed();
      unsubStatus();
    };
  }, [isElectron, loadPlans]);

  // 立即执行发布（仅桌面端）
  const executeImmediately = async (planId: string) => {
    if (!isElectron || !window.electronAPI) {
      return;
    }
    
    setExecutingPlanId(planId);
    
    try {
      const result = await window.electronAPI.executeTaskImmediately(planId);
      
      if (result.success) {
        // 刷新列表
        loadPlans();
      } else {
        console.error('执行失败:', result.error);
      }
    } catch (error: any) {
      console.error('执行发布失败:', error);
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

      {/* 桌面端调度器状态（仅桌面端显示） */}
      {isElectron && (
        <Card className={`border-2 ${realtimeTask?.status === 'running' ? 'border-blue-500 animate-pulse' : 'border-transparent'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${schedulerStatus?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-medium">
                    {schedulerStatus?.isRunning ? '后台调度器运行中' : '后台调度器已停止'}
                  </p>
                  <p className="text-sm text-gray-500">
                    每60秒自动检查待执行任务
                  </p>
                </div>
              </div>
              
              {/* 实时任务状态 */}
              {realtimeTask && (
                <div className="flex items-center gap-3">
                  {realtimeTask.status === 'running' && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>正在执行: {realtimeTask.taskName}</span>
                    </div>
                  )}
                  {realtimeTask.status === 'completed' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>已完成: {realtimeTask.taskName}</span>
                    </div>
                  )}
                  {realtimeTask.status === 'failed' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>失败: {realtimeTask.taskName}</span>
                    </div>
                  )}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (window.electronAPI) {
                    await window.electronAPI.triggerSchedulerCheck();
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                立即检查
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                            <span>执行中...</span>
                          </div>
                        )}
                        {plan.status === 'active' && !isExecuting && (
                          <>
                            {isElectron && (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                onClick={() => executeImmediately(plan.id)}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                立即执行
                              </Button>
                            )}
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

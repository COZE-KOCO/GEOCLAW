'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBusiness } from '@/contexts/business-context';
import {
  ConfigModules,
  useGenerationConfig,
} from '@/components/creation-config';
import {
  PlatformAccountSelector,
  PublishStrategyConfig,
  WebPublishGuide,
} from '@/components/publish-config';
import type { GenerationConfig } from '@/lib/types/generation-config';
import { defaultGenerationConfig, AVAILABLE_MODELS } from '@/lib/types/generation-config';
import {
  Sparkles,
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  Trash2,
  Edit,
  Clock,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  Zap,
  Calendar,
  TrendingUp,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  getCreationPlansLocal,
  createCreationPlanLocal,
  updateCreationPlanLocal,
  deleteCreationPlanLocal,
  type CreationPlan,
  type AutoPublishConfig,
} from '@/lib/creation-plan-store';

import {
  getCreationTasksLocal,
  getTaskStats,
  type CreationTask,
} from '@/lib/creation-task-queue';

import type { KeywordLibrary } from '@/lib/keyword-store';

// 检测Electron环境
const isElectron = () => {
  if (typeof window === 'undefined') return false;
  return typeof window.electronAPI !== 'undefined';
};

// 已保存的规则（带完整配置）
interface SavedRule {
  id: string;
  name: string;
  description?: string;
  type: 'article' | 'image-text';
  config: Partial<GenerationConfig>;
}

// 默认发布配置
const defaultPublishConfig: AutoPublishConfig = {
  autoPublish: true,
  publishDelay: 5,
  targetPlatforms: [],
  publishStrategy: 'distributed',
  publishTimeSlots: ['09:00', '12:00', '18:00'],
};

export default function AutoPublishPage() {
  const { selectedBusiness } = useBusiness();
  const router = useRouter();
  
  const [plans, setPlans] = useState<CreationPlan[]>([]);
  const [tasks, setTasks] = useState<CreationTask[]>([]);
  const [taskStats, setTaskStats] = useState({ pending: 0, processing: 0, completed: 0, failed: 0 });
  const [keywordLibraries, setKeywordLibraries] = useState<KeywordLibrary[]>([]);
  const [savedRules, setSavedRules] = useState<SavedRule[]>([]);
  const [inElectron, setInElectron] = useState(false);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CreationPlan | null>(null);
  const [selectedRule, setSelectedRule] = useState<SavedRule | null>(null);
  
  // 基本表单数据
  const [basicForm, setBasicForm] = useState<{
    planName: string;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    articlesPerRun: number;
    scheduledTime: string;
    scheduledDays: number[];
    scheduledDates: number[];
    startDate: string;
    endDate: string;
    hasEndDate: boolean;
    publishConfig: typeof defaultPublishConfig;
  }>({
    planName: '',
    frequency: 'daily',
    articlesPerRun: 3,
    scheduledTime: '09:00',
    scheduledDays: [1, 2, 3, 4, 5],
    scheduledDates: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    hasEndDate: false,
    publishConfig: { ...defaultPublishConfig },
  });
  
  // 使用配置 Hook
  const {
    config,
    openModules,
    setOpenModules,
    updateConfig,
    resetConfig,
    loadConfig,
    toggleModule,
  } = useGenerationConfig();
  
  // 调度器状态（桌面端）- 与 Electron 主进程同步
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  
  // 同步 Electron 调度器状态
  useEffect(() => {
    if (!inElectron) return;
    
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;
    
    // 获取初始状态
    electronAPI.getCreationSchedulerStatus().then((status: { isRunning: boolean }) => {
      console.log('[AutoPublish] 调度器初始状态:', status);
      setSchedulerRunning(status.isRunning);
    }).catch((error: Error) => {
      console.error('[AutoPublish] 获取调度器状态失败:', error);
    });
    
    // 监听状态变化
    const unsubscribe = electronAPI.onCreationSchedulerStatus((status: { status: string }) => {
      console.log('[AutoPublish] 调度器状态变化:', status);
      setSchedulerRunning(status.status === 'running');
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [inElectron]);
  
  // 切换调度器状态
  const handleToggleScheduler = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) {
      console.error('[AutoPublish] Electron API 不可用');
      return;
    }
    
    try {
      const result = await electronAPI.toggleCreationScheduler(!schedulerRunning);
      console.log('[AutoPublish] 切换调度器结果:', result);
      if (result.success) {
        setSchedulerRunning(!schedulerRunning);
      }
    } catch (error) {
      console.error('[AutoPublish] 切换调度器失败:', error);
    }
  };
  
  // 迁移 localStorage 数据到数据库
  const migrateLocalPlans = async () => {
    if (!selectedBusiness) return;
    
    try {
      // 获取 localStorage 中的计划
      const localPlans = getCreationPlansLocal(selectedBusiness);
      
      if (localPlans.length === 0) return;
      
      // 检查数据库中是否已有数据
      const checkResponse = await fetch(`/api/migration/creation-plans?businessId=${selectedBusiness}`);
      const checkData = await checkResponse.json();
      
      if (!checkData.success || checkData.databaseCount > 0) {
        // 数据库中已有数据，不自动迁移
        return;
      }
      
      // 执行迁移
      const migrateResponse = await fetch('/api/migration/creation-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: localPlans }),
      });
      
      const migrateResult = await migrateResponse.json();
      
      if (migrateResult.success && migrateResult.summary.success > 0) {
        console.log(`[Migration] 成功迁移 ${migrateResult.summary.success} 个计划到数据库`);
      }
    } catch (error) {
      console.error('[Migration] 迁移失败:', error);
    }
  };
  
  // 加载数据
  useEffect(() => {
    setInElectron(isElectron());
    
    if (selectedBusiness) {
      // 先尝试迁移 localStorage 数据
      migrateLocalPlans().then(() => {
        // 迁移完成后再加载数据
        loadData();
      });
    }
  }, [selectedBusiness]);
  
  const loadData = async () => {
    if (!selectedBusiness) return;
    
    // 加载计划 - 从 API 获取
    try {
      const plansResponse = await fetch(`/api/creation-plans?businessId=${selectedBusiness}`);
      const plansData = await plansResponse.json();
      if (plansResponse.ok && plansData.success) {
        setPlans(plansData.data || []);
      } else {
        // 如果 API 失败，回退到 localStorage
        const loadedPlans = getCreationPlansLocal(selectedBusiness);
        setPlans(loadedPlans);
      }
    } catch (error) {
      console.error('加载计划失败:', error);
      // 回退到 localStorage
      const loadedPlans = getCreationPlansLocal(selectedBusiness);
      setPlans(loadedPlans);
    }
    
    // 加载任务
    const loadedTasks = getCreationTasksLocal(selectedBusiness);
    setTasks(loadedTasks);
    
    // 加载统计
    const stats = getTaskStats(selectedBusiness);
    setTaskStats(stats);
    
    // 加载关键词库
    try {
      const response = await fetch(`/api/keywords?businessId=${selectedBusiness}`);
      const data = await response.json();
      if (response.ok && data.libraries) {
        setKeywordLibraries(data.libraries);
      } else {
        setKeywordLibraries([]);
      }
    } catch (error) {
      console.error('加载关键词库失败:', error);
      setKeywordLibraries([]);
    }
    
    // 加载规则列表
    try {
      const rulesResponse = await fetch(`/api/creation-rules?businessId=${selectedBusiness}`);
      const rulesData = await rulesResponse.json();
      if (rulesResponse.ok && rulesData.rules) {
        // 转换规则数据格式
        const formattedRules: SavedRule[] = rulesData.rules.map((rule: any) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          type: rule.ruleType === 'image-text' ? 'image-text' : 'article',
          config: rule.config || {},
        }));
        setSavedRules(formattedRules);
      } else {
        setSavedRules([]);
      }
    } catch (error) {
      console.error('加载规则失败:', error);
      setSavedRules([]);
    }
  };
  
  // 加载规则配置
  const loadRuleConfig = (rule: SavedRule) => {
    setSelectedRule(rule);
    loadConfig({
      ruleId: rule.id,
      ...rule.config,
    });
    toast.success(`已加载规则: ${rule.name}`);
  };
  
  // 清除规则选择
  const clearRuleSelection = () => {
    setSelectedRule(null);
    resetConfig();
  };
  
  // 创建计划
  const handleCreatePlan = async () => {
    if (!selectedBusiness) return;
    if (!basicForm.planName.trim()) {
      toast.error('请输入计划名称');
      return;
    }
    
    try {
      console.log('[AutoPublish] 创建计划请求:', {
        businessId: selectedBusiness,
        planName: basicForm.planName,
        frequency: basicForm.frequency,
      });
      
      const response = await fetch('/api/creation-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          planName: basicForm.planName,
          frequency: basicForm.frequency,
          articlesPerRun: basicForm.articlesPerRun,
          scheduledTime: basicForm.scheduledTime,
          scheduledDays: basicForm.scheduledDays,
          scheduledDates: basicForm.scheduledDates,
          startDate: basicForm.startDate,
          endDate: basicForm.hasEndDate ? basicForm.endDate : undefined,
          contentConfig: {
            ...defaultGenerationConfig,
            ...config,
          },
          publishConfig: basicForm.publishConfig,
        }),
      });
      
      const result = await response.json();
      console.log('[AutoPublish] 创建计划响应:', result);
      
      if (response.ok && result.success) {
        toast.success('计划创建成功');
        setShowCreateDialog(false);
        resetForm();
        loadData();
      } else {
        console.error('[AutoPublish] 创建失败:', result);
        toast.error(result.error || '创建失败，请重试');
      }
    } catch (error) {
      console.error('[AutoPublish] 创建计划异常:', error);
      toast.error(`创建失败: ${error instanceof Error ? error.message : '网络错误'}`);
    }
  };
  
  // 更新计划状态
  const handleToggleStatus = async (plan: CreationPlan) => {
    const newStatus = plan.status === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch('/api/creation-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          status: newStatus,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success(newStatus === 'active' ? '计划已启用' : '计划已暂停');
        loadData();
      } else {
        toast.error(result.error || '更新失败');
      }
    } catch (error) {
      console.error('更新计划状态失败:', error);
      toast.error('更新失败');
    }
  };
  
  // 删除计划
  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    
    try {
      const response = await fetch(`/api/creation-plans?id=${selectedPlan.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('计划已删除');
        setShowDeleteDialog(false);
        setSelectedPlan(null);
        loadData();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除计划失败:', error);
      toast.error('删除失败');
    }
  };
  
  // 重置表单
  const resetForm = () => {
    setBasicForm({
      planName: '',
      frequency: 'daily',
      articlesPerRun: 3,
      scheduledTime: '09:00',
      scheduledDays: [1, 2, 3, 4, 5],
      scheduledDates: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      hasEndDate: false,
      publishConfig: { ...defaultPublishConfig },
    });
    setSelectedRule(null);
    resetConfig();
  };
  
  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '运行中';
      case 'paused': return '已暂停';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };
  
  // 获取频率文本
  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'daily': return '每天';
      case 'weekly': return '每周';
      case 'monthly': return '每月';
      case 'hourly': return '每小时';
      default: return frequency;
    }
  };
  
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">全自动创作发布</h1>
            <p className="text-gray-500 mt-1">配置自动化创作计划，实现内容从生成到发布的全流程自动化</p>
          </div>
          <Button 
            className="bg-purple-500 hover:bg-purple-600"
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            新建计划
          </Button>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">活跃计划</p>
                  <p className="text-2xl font-bold">{plans.filter(p => p.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">待执行任务</p>
                  <p className="text-2xl font-bold">{taskStats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">今日已创作</p>
                  <p className="text-2xl font-bold">{taskStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">今日已发布</p>
                  <p className="text-2xl font-bold">{taskStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 调度器状态（仅桌面端显示） */}
        {inElectron && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    schedulerRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  )} />
                  <div>
                    <p className="font-medium">
                      调度器状态: {schedulerRunning ? '运行中' : '已停止'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {schedulerRunning 
                        ? '调度器正在后台运行，自动执行创作和发布任务'
                        : '启动调度器以自动执行计划任务'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant={schedulerRunning ? 'destructive' : 'default'}
                  onClick={handleToggleScheduler}
                >
                  {schedulerRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      停止调度
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      启动调度
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 计划列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              创作计划
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">暂无创作计划</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个计划
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    className="border rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-lg">{plan.planName}</h3>
                          <Badge className={getStatusColor(plan.status)}>
                            {getStatusText(plan.status)}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getFrequencyText(plan.frequency)} {plan.scheduledTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            每次 {plan.articlesPerRun} 篇
                          </span>
                          <span className="flex items-center gap-1">
                            <Send className="h-4 w-4" />
                            {plan.publishConfig.autoPublish ? '自动发布' : '手动发布'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="text-gray-400">
                            已创作: <span className="text-gray-600 font-medium">{plan.stats.totalCreated}</span> 篇
                          </span>
                          <span className="text-gray-400">
                            已发布: <span className="text-gray-600 font-medium">{plan.stats.totalPublished}</span> 篇
                          </span>
                          <span className="text-gray-400">
                            成功率: <span className="text-gray-600 font-medium">{plan.stats.successRate}%</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(plan)}
                        >
                          {plan.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              暂停
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              启用
                            </>
                          )}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPlan(plan);
                              setShowEditDialog(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => {
                                setSelectedPlan(plan);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 任务队列 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              任务队列
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadData}>
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {/* 任务统计 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{taskStats.pending}</p>
                <p className="text-xs text-yellow-600">待执行</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{taskStats.processing}</p>
                <p className="text-xs text-blue-600">处理中</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                <p className="text-xs text-green-600">已完成</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{taskStats.failed}</p>
                <p className="text-xs text-red-600">失败</p>
              </div>
            </div>
            
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无任务记录</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {tasks.slice(0, 20).map(task => (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      task.status === 'processing' && "border-blue-200 bg-blue-50",
                      task.status === 'completed' && "border-green-200 bg-green-50",
                      task.status === 'failed' && "border-red-200 bg-red-50",
                      task.status === 'pending' && "border-yellow-200 bg-yellow-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        task.status === 'pending' && "bg-yellow-100",
                        task.status === 'processing' && "bg-blue-100",
                        task.status === 'completed' && "bg-green-100",
                        task.status === 'failed' && "bg-red-100"
                      )}>
                        {task.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                        {task.status === 'processing' && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                        {task.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {task.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">
                          {task.result?.title || task.params?.keyword || '待生成内容'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{new Date(task.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className={cn(
                      task.status === 'pending' && "border-yellow-300 text-yellow-700",
                      task.status === 'processing' && "border-blue-300 text-blue-700",
                      task.status === 'completed' && "border-green-300 text-green-700",
                      task.status === 'failed' && "border-red-300 text-red-700"
                    )}>
                      {task.status === 'pending' && '待执行'}
                      {task.status === 'processing' && '处理中'}
                      {task.status === 'completed' && '已完成'}
                      {task.status === 'failed' && '失败'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 创建计划对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
            <DialogTitle>创建创作计划</DialogTitle>
            <DialogDescription>
              配置自动化创作计划，系统将按计划自动生成并发布内容
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 overflow-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <div className="space-y-6 py-4 pr-4">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  基本配置
                </h4>
                
                <div className="space-y-2">
                  <Label>计划名称</Label>
                  <Input
                    placeholder="例如：每日科技资讯"
                    value={basicForm.planName}
                    onChange={(e) => setBasicForm({ ...basicForm, planName: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>执行频率</Label>
                    <Select 
                      value={basicForm.frequency}
                      onValueChange={(v: any) => setBasicForm({ ...basicForm, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">每小时</SelectItem>
                        <SelectItem value="daily">每天</SelectItem>
                        <SelectItem value="weekly">每周</SelectItem>
                        <SelectItem value="monthly">每月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>每次创作数量</Label>
                    <Select 
                      value={basicForm.articlesPerRun.toString()}
                      onValueChange={(v) => setBasicForm({ ...basicForm, articlesPerRun: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10, 20].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} 篇</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* 星期几选择 - 当频率为 weekly 时显示 */}
                {basicForm.frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>执行日期</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 0, label: '周日' },
                        { value: 1, label: '周一' },
                        { value: 2, label: '周二' },
                        { value: 3, label: '周三' },
                        { value: 4, label: '周四' },
                        { value: 5, label: '周五' },
                        { value: 6, label: '周六' },
                      ].map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const days = basicForm.scheduledDays.includes(day.value)
                              ? basicForm.scheduledDays.filter(d => d !== day.value)
                              : [...basicForm.scheduledDays, day.value];
                            setBasicForm({ ...basicForm, scheduledDays: days });
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                            basicForm.scheduledDays.includes(day.value)
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      已选择: {basicForm.scheduledDays.length > 0 
                        ? basicForm.scheduledDays.map(d => ['周日','周一','周二','周三','周四','周五','周六'][d]).join('、')
                        : '未选择'}
                    </p>
                  </div>
                )}
                
                {/* 每月日期选择 - 当频率为 monthly 时显示 */}
                {basicForm.frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>执行日期（每月）</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                        <button
                          key={date}
                          type="button"
                          onClick={() => {
                            const dates = basicForm.scheduledDates || [];
                            const newDates = dates.includes(date)
                              ? dates.filter(d => d !== date)
                              : [...dates, date];
                            setBasicForm({ ...basicForm, scheduledDates: newDates } as any);
                          }}
                          className={`w-8 h-8 rounded text-sm transition-colors ${
                            (basicForm.scheduledDates || []).includes(date)
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {date}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>执行时间</Label>
                    <Input
                      type="time"
                      value={basicForm.scheduledTime}
                      onChange={(e) => setBasicForm({ ...basicForm, scheduledTime: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>开始日期</Label>
                    <Input
                      type="date"
                      value={basicForm.startDate}
                      onChange={(e) => setBasicForm({ ...basicForm, startDate: e.target.value })}
                    />
                  </div>
                </div>
                
                {/* 终止日期配置 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasEndDate"
                      checked={basicForm.hasEndDate}
                      onChange={(e) => setBasicForm({ ...basicForm, hasEndDate: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="hasEndDate" className="font-normal">设置终止日期</Label>
                  </div>
                  
                  {basicForm.hasEndDate && (
                    <div className="pl-6">
                      <Input
                        type="date"
                        value={basicForm.endDate}
                        onChange={(e) => setBasicForm({ ...basicForm, endDate: e.target.value })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        计划将在终止日期后自动停止执行
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* 关联规则 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  关联文章规则
                </h4>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select 
                      value={config.ruleId || 'none'} 
                      onValueChange={(v) => {
                        if (v === 'none') {
                          clearRuleSelection();
                        } else {
                          const rule = savedRules.find(r => r.id === v);
                          if (rule) loadRuleConfig(rule);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择已有规则快速配置" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">自定义配置</SelectItem>
                        {savedRules.map(rule => (
                          <SelectItem key={rule.id} value={rule.id}>
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-blue-500" />
                              <span>{rule.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Link href="/matrix/batch" target="_blank">
                    <Button variant="outline" size="sm">
                      管理规则
                    </Button>
                  </Link>
                </div>
                
                {selectedRule && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-blue-900 dark:text-blue-100">{selectedRule.name}</h5>
                        {selectedRule.description && (
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{selectedRule.description}</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearRuleSelection}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* 内容配置 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  内容配置
                  {selectedRule && (
                    <Badge variant="outline" className="text-xs">继承自规则，可调整</Badge>
                  )}
                </h4>
                
                <div className="border rounded-lg">
                  <ConfigModules
                    config={config}
                    onChange={updateConfig}
                    openModules={openModules}
                    onToggleModule={toggleModule}
                    mode="article"
                    keywordLibraries={keywordLibraries}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* 发布配置 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  发布配置
                </h4>
                
                {inElectron ? (
                  /* 桌面端：显示完整的发布配置 */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>发布平台</Label>
                      <PlatformAccountSelector
                        value={basicForm.publishConfig.targetPlatforms}
                        onChange={(platforms) => 
                          setBasicForm(prev => ({
                            ...prev,
                            publishConfig: {
                              ...prev.publishConfig,
                              targetPlatforms: platforms,
                            },
                          }))
                        }
                        businessId={selectedBusiness}
                        disabled={false}
                      />
                    </div>
                    
                    <PublishStrategyConfig
                      value={{
                        autoPublish: basicForm.publishConfig.autoPublish,
                        publishDelay: basicForm.publishConfig.publishDelay,
                        publishStrategy: basicForm.publishConfig.publishStrategy,
                        publishTimeSlots: basicForm.publishConfig.publishTimeSlots,
                      }}
                      onChange={(cfg) =>
                        setBasicForm(prev => ({
                          ...prev,
                          publishConfig: {
                            ...prev.publishConfig,
                            ...cfg,
                          },
                        }))
                      }
                    />
                  </div>
                ) : (
                  /* Web端：显示引导提示 */
                  <WebPublishGuide />
                )}
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="px-6 py-4 border-t mt-0 bg-background">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreatePlan} disabled={!basicForm.planName.trim()}>
              创建计划
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除计划"{selectedPlan?.planName}"吗？此操作无法撤销。
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
    </AppLayout>
  );
}

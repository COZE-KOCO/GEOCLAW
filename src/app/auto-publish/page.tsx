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

// 计划执行进度状态
interface PlanProgressState {
  status: 'idle' | 'creating' | 'publishing' | 'completed' | 'failed';
  phase: 'creation' | 'publishing';
  current: number;
  total: number;
  keyword?: string;
  model?: string;
  message?: string;
  articleTitle?: string;
  platform?: string;
  publishTime?: string; // 定时发布的预计时间
}

// 默认发布配置
const defaultPublishConfig: AutoPublishConfig = {
  autoPublish: true,
  publishDelay: 5,
  targetPlatforms: [],
  publishStrategy: 'distributed',
  publishTimeSlots: ['09:00', '12:00', '18:00'],
  articleDistribution: 'broadcast',  // 默认广播模式
};

export default function AutoPublishPage() {
  const { selectedBusiness } = useBusiness();
  const router = useRouter();
  
  const [plans, setPlans] = useState<CreationPlan[]>([]);
  const [tasks, setTasks] = useState<CreationTask[]>([]);
  const [taskStats, setTaskStats] = useState({ pending: 0, processing: 0, completed: 0, failed: 0 });
  
  // 发布任务状态
  const [publishTasks, setPublishTasks] = useState<any[]>([]);
  const [publishTaskStats, setPublishTaskStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0 });
  const [showDeletePublishTaskDialog, setShowDeletePublishTaskDialog] = useState(false);
  const [selectedPublishTask, setSelectedPublishTask] = useState<any | null>(null);
  
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
    updateConfigBatch,
    resetConfig,
    loadConfig,
    toggleModule,
  } = useGenerationConfig();
  
  // 调度器状态（桌面端）- 与 Electron 主进程同步
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  
  // 计划执行进度状态（桌面端）
  const [planProgress, setPlanProgress] = useState<Record<string, PlanProgressState>>({});
  
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
  
  // 监听 Electron 创作进度事件
  useEffect(() => {
    if (!inElectron) return;
    
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;
    
    // 计划开始执行
    const unsubStart = electronAPI.onCreationPlanStarted((data: { planId: string; planName: string; totalCount: number }) => {
      console.log('[AutoPublish] 计划开始执行:', data);
      setPlanProgress(prev => ({
        ...prev,
        [data.planId]: {
          status: 'creating',
          phase: 'creation',
          current: 0,
          total: data.totalCount,
          message: '准备开始创作...',
        }
      }));
    });
    
    // 任务进度更新
    const unsubProgress = electronAPI.onCreationTaskProgress((data: { 
      planId: string; 
      current: number; 
      total: number; 
      keyword: string;
      selectedModel?: string;
    }) => {
      console.log('[AutoPublish] 任务进度:', data);
      setPlanProgress(prev => ({
        ...prev,
        [data.planId]: {
          ...prev[data.planId],
          status: 'creating',
          phase: 'creation',
          current: data.current,
          total: data.total,
          keyword: data.keyword,
          model: data.selectedModel,
          message: `正在生成第 ${data.current}/${data.total} 篇文章`,
        }
      }));
    });
    
    // 发布进度更新
    const unsubPublish = electronAPI.onPublishTaskProgress?.((data: {
      planId: string;
      current: number;
      total: number;
      articleTitle?: string;
      platform?: string;
      status: string;
      message?: string;
    }) => {
      console.log('[AutoPublish] 发布进度:', data);
      
      const isCompleted = data.status === 'completed';
      
      setPlanProgress(prev => ({
        ...prev,
        [data.planId]: {
          ...prev[data.planId],
          status: isCompleted ? 'completed' : 'publishing',
          phase: 'publishing',
          current: data.current,
          total: data.total,
          articleTitle: data.articleTitle,
          platform: data.platform,
          message: isCompleted 
            ? (data.message || `发布完成 (${data.current}/${data.total} 篇)`)
            : `正在发布第 ${data.current}/${data.total} 篇${data.platform ? `到 ${data.platform}` : ''}`,
        }
      }));
      
      // 发布完成后刷新数据并清除进度
      if (isCompleted) {
        setTimeout(() => {
          loadData();
        }, 1000);
        
        setTimeout(() => {
          setPlanProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[data.planId];
            return newProgress;
          });
        }, 3000);
      }
    });
    
    // 计划完成
    const unsubComplete = electronAPI.onCreationPlanCompleted((data: { 
      planId: string; 
      planName: string; 
      createdCount: number; 
      totalCount: number;
    }) => {
      console.log('[AutoPublish] 计划完成:', data);
      
      // 检查是否有发布配置
      const plan = plans.find(p => p.id === data.planId);
      const shouldPublish = plan?.publishConfig?.autoPublish;
      const publishStrategy = plan?.publishConfig?.publishStrategy;
      
      setPlanProgress(prev => {
        const currentProgress = prev[data.planId];
        
        // 如果是立即发布且已完成创作，需要显示发布进度
        if (shouldPublish && publishStrategy === 'immediate' && currentProgress?.phase === 'creation') {
          return {
            ...prev,
            [data.planId]: {
              ...currentProgress,
              status: 'publishing',
              phase: 'publishing',
              current: 0,
              total: data.createdCount,
              message: `已完成 ${data.createdCount} 篇文章创作，准备发布...`,
            }
          };
        }
        
        // 定时发布或延时发布
        if (shouldPublish && (publishStrategy === 'scheduled' || publishStrategy === 'distributed')) {
          const timeSlots = plan?.publishConfig?.publishTimeSlots || [];
          return {
            ...prev,
            [data.planId]: {
              ...currentProgress,
              status: 'completed',
              phase: 'creation',
              current: data.createdCount,
              total: data.totalCount,
              message: `已完成创作，已安排至 ${timeSlots.join('、')} 发布`,
              publishTime: timeSlots[0],
            }
          };
        }
        
        // 无自动发布或已完成发布
        return {
          ...prev,
          [data.planId]: {
            ...currentProgress,
            status: 'completed',
            phase: 'creation',
            current: data.createdCount,
            total: data.totalCount,
            message: `已完成 ${data.createdCount} 篇文章创作`,
          }
        };
      });
      
      // 刷新数据
      setTimeout(() => {
        loadData();
      }, 2000);
      
      // 5秒后清除进度显示
      setTimeout(() => {
        setPlanProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[data.planId];
          return newProgress;
        });
      }, 5000);
    });
    
    // 计划失败
    const unsubFailed = electronAPI.onCreationPlanFailed((data: { planId: string; planName: string; error: string }) => {
      console.log('[AutoPublish] 计划失败:', data);
      setPlanProgress(prev => ({
        ...prev,
        [data.planId]: {
          ...prev[data.planId],
          status: 'failed',
          message: `执行失败: ${data.error}`,
        }
      }));
      
      // 10秒后清除错误显示
      setTimeout(() => {
        setPlanProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[data.planId];
          return newProgress;
        });
      }, 10000);
    });
    
    return () => {
      if (unsubStart) unsubStart();
      if (unsubProgress) unsubProgress();
      if (unsubPublish) unsubPublish();
      if (unsubComplete) unsubComplete();
      if (unsubFailed) unsubFailed();
    };
  }, [inElectron, plans]);
  
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
  
  // 迁移 localStorage 数据到数据库（强制模式）
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'done'>('idle');
  
  const migrateLocalPlans = async (force: boolean = false) => {
    if (!selectedBusiness) return;
    
    const localPlans = getCreationPlansLocal(selectedBusiness);
    console.log('[AutoPublish] localStorage 中的计划:', localPlans.length);
    
    if (localPlans.length === 0) {
      console.log('[AutoPublish] 没有需要迁移的计划');
      return { success: true, migrated: 0 };
    }
    
    try {
      // 执行迁移
      const migrateResponse = await fetch('/api/migration/creation-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: localPlans, force }),
      });
      
      const migrateResult = await migrateResponse.json();
      console.log('[AutoPublish] 迁移结果:', migrateResult);
      
      if (migrateResult.success && migrateResult.summary.success > 0) {
        console.log(`[AutoPublish] 成功迁移 ${migrateResult.summary.success} 个计划到数据库`);
        return { success: true, migrated: migrateResult.summary.success };
      }
      
      return { success: false, migrated: 0, error: migrateResult.message };
    } catch (error) {
      console.error('[AutoPublish] 迁移失败:', error);
      return { success: false, migrated: 0, error: String(error) };
    }
  };
  
  // 手动触发迁移
  const handleForceMigration = async () => {
    if (!selectedBusiness) return;
    
    setMigrationStatus('migrating');
    toast.info('正在迁移数据...');
    
    const result = await migrateLocalPlans(true);
    
    if (result?.success && result.migrated > 0) {
      toast.success(`成功迁移 ${result.migrated} 个计划`);
      setMigrationStatus('done');
      loadData();
    } else if (result?.migrated === 0) {
      toast.info('没有需要迁移的计划');
      setMigrationStatus('idle');
    } else {
      toast.error(`迁移失败: ${result?.error || '未知错误'}`);
      setMigrationStatus('idle');
    }
  };
  
  // 加载数据
  useEffect(() => {
    setInElectron(isElectron());
    
    if (selectedBusiness) {
      // 自动尝试迁移 localStorage 数据（仅首次）
      migrateLocalPlans(false).then(() => {
        loadData();
      });
    }
  }, [selectedBusiness]);
  
  const loadData = async () => {
    if (!selectedBusiness) return;
    
    console.log('[AutoPublish] 加载数据, businessId:', selectedBusiness);
    
    // 加载计划 - 统一从 API 获取（数据库）
    try {
      const plansResponse = await fetch(`/api/creation-plans?businessId=${selectedBusiness}`);
      const plansData = await plansResponse.json();
      console.log('[AutoPublish] 计划数据:', plansData);
      if (plansResponse.ok && plansData.success) {
        setPlans(plansData.data || []);
      } else {
        console.error('[AutoPublish] 加载计划失败:', plansData.error);
        setPlans([]);
      }
    } catch (error) {
      console.error('[AutoPublish] 加载计划异常:', error);
      setPlans([]);
    }
    
    // 加载任务 - 统一从 API 获取（数据库）
    try {
      const tasksResponse = await fetch(`/api/creation-tasks?businessId=${selectedBusiness}`);
      const tasksData = await tasksResponse.json();
      console.log('[AutoPublish] 任务数据:', tasksData);
      if (tasksResponse.ok && tasksData.success) {
        setTasks(tasksData.data || []);
        setTaskStats(tasksData.stats || { pending: 0, processing: 0, completed: 0, failed: 0 });
      } else {
        console.error('[AutoPublish] 加载任务失败:', tasksData.error);
        setTasks([]);
        setTaskStats({ pending: 0, processing: 0, completed: 0, failed: 0 });
      }
    } catch (error) {
      console.error('[AutoPublish] 加载任务异常:', error);
      setTasks([]);
      setTaskStats({ pending: 0, processing: 0, completed: 0, failed: 0 });
    }
    
    // 加载发布任务
    try {
      const publishTasksResponse = await fetch(`/api/publish-tasks?businessId=${selectedBusiness}&limit=50`);
      const publishTasksData = await publishTasksResponse.json();
      console.log('[AutoPublish] 发布任务数据:', publishTasksData);
      if (publishTasksResponse.ok && publishTasksData.success) {
        setPublishTasks(publishTasksData.data || []);
        // 计算统计
        const tasks = publishTasksData.data || [];
        setPublishTaskStats({
          pending: tasks.filter((t: any) => t.status === 'pending').length,
          running: tasks.filter((t: any) => t.status === 'running' || t.status === 'queued').length,
          completed: tasks.filter((t: any) => t.status === 'completed').length,
          failed: tasks.filter((t: any) => t.status === 'failed').length,
        });
      } else {
        console.error('[AutoPublish] 加载发布任务失败:', publishTasksData.error);
        setPublishTasks([]);
        setPublishTaskStats({ pending: 0, running: 0, completed: 0, failed: 0 });
      }
    } catch (error) {
      console.error('[AutoPublish] 加载发布任务异常:', error);
      setPublishTasks([]);
      setPublishTaskStats({ pending: 0, running: 0, completed: 0, failed: 0 });
    }
    
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
      console.log('[AutoPublish] API 返回的规则数据:', rulesData);
      if (rulesResponse.ok && rulesData.rules) {
        // 转换规则数据格式
        const formattedRules: SavedRule[] = rulesData.rules.map((rule: any) => {
          console.log('[AutoPublish] 原始规则:', rule.id, rule.name, 'type:', rule.type);
          return {
            id: rule.id,
            name: rule.name,
            description: rule.description,
            type: rule.type === 'image-text' ? 'image-text' : 'article',
            config: rule.config || {},
          };
        });
        console.log('[AutoPublish] 格式化后的规则:', formattedRules);
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
    console.log('[AutoPublish] 加载规则配置:', rule);
    console.log('[AutoPublish] 规则类型:', rule.type);
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
  
  // 编辑计划时填充表单
  useEffect(() => {
    if (showEditDialog && selectedPlan) {
      // 填充基本信息
      setBasicForm({
        planName: selectedPlan.planName,
        frequency: selectedPlan.frequency,
        articlesPerRun: selectedPlan.articlesPerRun,
        scheduledTime: selectedPlan.scheduledTime,
        scheduledDays: selectedPlan.scheduledDays || [],
        scheduledDates: selectedPlan.scheduledDates || [],
        startDate: selectedPlan.startDate || new Date().toISOString().split('T')[0],
        endDate: selectedPlan.endDate || '',
        hasEndDate: !!selectedPlan.endDate,
        publishConfig: selectedPlan.publishConfig || { ...defaultPublishConfig },
      });
      
      // 填充内容配置
      if (selectedPlan.contentConfig) {
        updateConfigBatch(selectedPlan.contentConfig);
      }
    }
  }, [showEditDialog, selectedPlan]);
  
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
        // 如果有警告，提示用户
        if (result.warnings && result.warnings.length > 0) {
          toast.warning(result.warnings.join('\n'));
        }
        
        // 通知 Electron 调度器添加定时器
        if (typeof window !== 'undefined' && window.electronAPI && result.data) {
          try {
            // 计算下次执行时间
            const nextExecutionTime = result.data.stats?.nextRunAt || new Date().toISOString();
            const electronAPI = window.electronAPI as any;
            await electronAPI.notifyCreationPlanCreated(
              result.data.id,
              result.data.planName,
              nextExecutionTime
            );
            console.log('[AutoPublish] 已通知调度器添加计划:', result.data.id);
          } catch (e) {
            console.warn('[AutoPublish] 通知调度器失败:', e);
          }
        }
        
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
  
  // 编辑计划
  const handleEditPlan = async () => {
    if (!selectedPlan) return;
    if (!basicForm.planName.trim()) {
      toast.error('请输入计划名称');
      return;
    }
    
    try {
      console.log('[AutoPublish] 编辑计划请求:', {
        id: selectedPlan.id,
        planName: basicForm.planName,
      });
      
      const response = await fetch('/api/creation-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPlan.id,
          planName: basicForm.planName,
          frequency: basicForm.frequency,
          articlesPerRun: basicForm.articlesPerRun,
          scheduledTime: basicForm.scheduledTime,
          scheduledDays: basicForm.scheduledDays,
          scheduledDates: basicForm.scheduledDates,
          endDate: basicForm.hasEndDate ? basicForm.endDate : undefined,
          contentConfig: {
            ...defaultGenerationConfig,
            ...config,
          },
          publishConfig: basicForm.publishConfig,
        }),
      });
      
      const result = await response.json();
      console.log('[AutoPublish] 编辑计划响应:', result);
      
      if (response.ok && result.success) {
        // 如果计划是活跃状态，需要通知调度器更新定时器
        if (selectedPlan.status === 'active' && typeof window !== 'undefined' && window.electronAPI) {
          try {
            const electronAPI = window.electronAPI as any;
            // 先移除旧的定时器
            await electronAPI.notifyCreationPlanDeleted(selectedPlan.id);
            // 如果有下次执行时间，添加新的定时器
            if (result.data?.stats?.nextRunAt) {
              await electronAPI.notifyCreationPlanCreated(
                selectedPlan.id,
                basicForm.planName,
                result.data.stats.nextRunAt
              );
            }
            console.log('[AutoPublish] 已通知调度器更新计划:', selectedPlan.id);
          } catch (e) {
            console.warn('[AutoPublish] 通知调度器失败:', e);
          }
        }
        
        toast.success('计划更新成功');
        setShowEditDialog(false);
        setSelectedPlan(null);
        loadData();
      } else {
        console.error('[AutoPublish] 更新失败:', result);
        toast.error(result.error || '更新失败，请重试');
      }
    } catch (error) {
      console.error('[AutoPublish] 编辑计划异常:', error);
      toast.error(`更新失败: ${error instanceof Error ? error.message : '网络错误'}`);
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
        // 通知 Electron 调度器
        if (typeof window !== 'undefined' && window.electronAPI) {
          const electronAPI = window.electronAPI as any;
          try {
            if (newStatus === 'paused') {
              // 暂停：移除定时器
              await electronAPI.notifyCreationPlanDeleted(plan.id);
              console.log('[AutoPublish] 已通知调度器移除计划:', plan.id);
            } else if (newStatus === 'active' && result.data?.stats?.nextRunAt) {
              // 启用：添加定时器
              await electronAPI.notifyCreationPlanCreated(
                plan.id,
                plan.planName,
                result.data.stats.nextRunAt
              );
              console.log('[AutoPublish] 已通知调度器启用计划:', plan.id);
            }
          } catch (e) {
            console.warn('[AutoPublish] 通知调度器失败:', e);
          }
        }
        
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
    
    const planId = selectedPlan.id;
    const planName = selectedPlan.planName;
    
    try {
      const response = await fetch(`/api/creation-plans?id=${planId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // 通知 Electron 调度器移除定时器
        if (typeof window !== 'undefined' && window.electronAPI) {
          const electronAPI = window.electronAPI as any;
          try {
            await electronAPI.notifyCreationPlanDeleted(planId);
            console.log('[AutoPublish] 已通知调度器移除计划:', planId);
          } catch (e) {
            console.warn('[AutoPublish] 通知调度器失败:', e);
          }
        }
        
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
  
  // 删除发布任务
  const handleDeletePublishTask = async () => {
    console.log('[AutoPublish] 开始删除发布任务, selectedPublishTask:', selectedPublishTask);
    if (!selectedPublishTask) {
      console.log('[AutoPublish] 没有选中的发布任务');
      toast.error('请先选择要删除的任务');
      return;
    }
    
    try {
      // 使用 URL 参数而不是请求体，因为 DELETE 请求的 body 可能被某些环境丢弃
      const url = `/api/publish-tasks?id=${selectedPublishTask.id}`;
      console.log('[AutoPublish] 发送删除请求, url:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      console.log('[AutoPublish] 删除响应状态:', response.status);
      const result = await response.json();
      console.log('[AutoPublish] 删除结果:', result);
      
      if (response.ok && result.success) {
        // 通知 Electron 调度器移除定时器（仅在桌面端有效）
        if (typeof window !== 'undefined' && window.electronAPI) {
          const electronAPI = window.electronAPI as any;
          try {
            await electronAPI.notifyPublishTaskDeleted?.(selectedPublishTask.id);
            console.log('[AutoPublish] 已通知调度器移除发布任务:', selectedPublishTask.id);
          } catch (e) {
            console.warn('[AutoPublish] 通知调度器失败:', e);
          }
        }
        
        toast.success('发布任务已删除');
        setShowDeletePublishTaskDialog(false);
        setSelectedPublishTask(null);
        loadData();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('[AutoPublish] 删除发布任务失败:', error);
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
          <div className="flex items-center gap-2">
            <Link href="/auto-publish/selectors">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                选择器配置
              </Button>
            </Link>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleForceMigration}
              disabled={migrationStatus === 'migrating'}
            >
              {migrationStatus === 'migrating' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  同步中
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-1" />
                  同步数据
                </>
              )}
            </Button>
            <Button 
              size="sm"
              className="bg-purple-500 hover:bg-purple-600"
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              新建计划
            </Button>
          </div>
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
                        
                        {/* 执行进度展示 */}
                        {planProgress[plan.id] && planProgress[plan.id].status !== 'idle' && (
                          <div className={cn(
                            "mt-4 p-3 rounded-lg border",
                            planProgress[plan.id].status === 'creating' && "bg-blue-50 border-blue-200",
                            planProgress[plan.id].status === 'publishing' && "bg-purple-50 border-purple-200",
                            planProgress[plan.id].status === 'completed' && "bg-green-50 border-green-200",
                            planProgress[plan.id].status === 'failed' && "bg-red-50 border-red-200"
                          )}>
                            {/* 进度条 */}
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-300",
                                    planProgress[plan.id].status === 'creating' && "bg-blue-500",
                                    planProgress[plan.id].status === 'publishing' && "bg-purple-500",
                                    planProgress[plan.id].status === 'completed' && "bg-green-500",
                                    planProgress[plan.id].status === 'failed' && "bg-red-500"
                                  )}
                                  style={{ 
                                    width: planProgress[plan.id].total > 0 
                                      ? `${(planProgress[plan.id].current / planProgress[plan.id].total) * 100}%` 
                                      : '0%' 
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium min-w-[40px] text-right">
                                {planProgress[plan.id].total > 0 
                                  ? `${Math.round((planProgress[plan.id].current / planProgress[plan.id].total) * 100)}%` 
                                  : '0%'}
                              </span>
                            </div>
                            
                            {/* 状态信息 */}
                            <div className="flex items-center gap-2 text-sm">
                              {planProgress[plan.id].status === 'creating' && (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                  <span className="text-blue-700">{planProgress[plan.id].message}</span>
                                </>
                              )}
                              {planProgress[plan.id].status === 'publishing' && (
                                <>
                                  <Send className="h-4 w-4 animate-pulse text-purple-500" />
                                  <span className="text-purple-700">{planProgress[plan.id].message}</span>
                                </>
                              )}
                              {planProgress[plan.id].status === 'completed' && (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-green-700">{planProgress[plan.id].message}</span>
                                </>
                              )}
                              {planProgress[plan.id].status === 'failed' && (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-red-700">{planProgress[plan.id].message}</span>
                                </>
                              )}
                            </div>
                            
                            {/* 详细信息 */}
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                              {planProgress[plan.id].keyword && (
                                <span>关键词: <span className="font-medium text-gray-700">{planProgress[plan.id].keyword}</span></span>
                              )}
                              {planProgress[plan.id].model && (
                                <span>模型: <span className="font-medium text-gray-700">{planProgress[plan.id].model}</span></span>
                              )}
                              {planProgress[plan.id].articleTitle && (
                                <span>文章: <span className="font-medium text-gray-700">{planProgress[plan.id].articleTitle}</span></span>
                              )}
                              {planProgress[plan.id].platform && (
                                <span>平台: <span className="font-medium text-gray-700">{planProgress[plan.id].platform}</span></span>
                              )}
                            </div>
                            
                            {/* 定时发布时间提示 */}
                            {planProgress[plan.id].publishTime && planProgress[plan.id].status === 'completed' && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>预计发布时间: <span className="font-medium text-gray-700">{planProgress[plan.id].publishTime}</span></span>
                              </div>
                            )}
                          </div>
                        )}
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
        
        {/* 任务队列 - 发布任务 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              发布任务队列
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadData}>
              刷新
            </Button>
          </CardHeader>
          <CardContent>
            {/* 任务统计 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{publishTaskStats.pending}</p>
                <p className="text-xs text-yellow-600">待执行</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{publishTaskStats.running}</p>
                <p className="text-xs text-blue-600">执行中</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{publishTaskStats.completed}</p>
                <p className="text-xs text-green-600">已完成</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{publishTaskStats.failed}</p>
                <p className="text-xs text-red-600">失败</p>
              </div>
            </div>
            
            {publishTasks.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无发布任务</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {publishTasks.slice(0, 20).map(task => (
                  <div 
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      task.status === 'running' && "border-blue-200 bg-blue-50",
                      task.status === 'queued' && "border-blue-200 bg-blue-50",
                      task.status === 'completed' && "border-green-200 bg-green-50",
                      task.status === 'failed' && "border-red-200 bg-red-50",
                      task.status === 'pending' && "border-yellow-200 bg-yellow-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        task.status === 'pending' && "bg-yellow-100",
                        task.status === 'running' && "bg-blue-100",
                        task.status === 'queued' && "bg-blue-100",
                        task.status === 'completed' && "bg-green-100",
                        task.status === 'failed' && "bg-red-100"
                      )}>
                        {task.status === 'pending' && <Clock className="h-4 w-4 text-yellow-600" />}
                        {(task.status === 'running' || task.status === 'queued') && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                        {task.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {task.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium">
                          {task.title || task.taskName || '发布任务'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          {/* 显示计划来源 */}
                          {task.planId ? (
                            (() => {
                              const plan = plans.find(p => p.id === task.planId);
                              return plan ? (
                                <>
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-purple-50 border-purple-200 text-purple-700">
                                    <Layers className="h-3 w-3 mr-1" />
                                    {plan.planName}
                                  </Badge>
                                  <span>•</span>
                                </>
                              ) : (
                                <>
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-gray-50 border-gray-200 text-gray-500">
                                    <Layers className="h-3 w-3 mr-1" />
                                    计划已删除
                                  </Badge>
                                  <span>•</span>
                                </>
                              );
                            })()
                          ) : null}
                          <span>
                            {task.targetPlatforms?.map((p: any) => p.platform || p.accountName).join(', ') || '无平台'}
                          </span>
                          <span>•</span>
                          <span>{task.scheduledAt ? new Date(task.scheduledAt).toLocaleString() : new Date(task.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        task.status === 'pending' && "border-yellow-300 text-yellow-700",
                        (task.status === 'running' || task.status === 'queued') && "border-blue-300 text-blue-700",
                        task.status === 'completed' && "border-green-300 text-green-700",
                        task.status === 'failed' && "border-red-300 text-red-700"
                      )}>
                        {task.status === 'pending' && '待执行'}
                        {task.status === 'running' && '执行中'}
                        {task.status === 'queued' && '排队中'}
                        {task.status === 'completed' && '已完成'}
                        {task.status === 'failed' && '失败'}
                      </Badge>
                      
                      {/* 删除按钮 - 仅待执行和失败状态可删除 */}
                      {(task.status === 'pending' || task.status === 'failed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => {
                            setSelectedPublishTask(task);
                            setShowDeletePublishTaskDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
                    mode={(() => {
                      const mode = selectedRule?.type === 'image-text' ? 'image-text' : 'article';
                      console.log('[AutoPublish] ConfigModules mode 计算:', mode, 'selectedRule?.type:', selectedRule?.type);
                      return mode;
                    })()}
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
                        articleDistribution: basicForm.publishConfig.articleDistribution,
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
                      accountCount={basicForm.publishConfig.targetPlatforms.length}
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

      {/* 删除发布任务确认对话框 */}
      <AlertDialog open={showDeletePublishTaskDialog} onOpenChange={setShowDeletePublishTaskDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除发布任务</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除发布任务"{selectedPublishTask?.title || selectedPublishTask?.taskName}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button 
              onClick={handleDeletePublishTask}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑计划对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
            <DialogTitle>编辑创作计划</DialogTitle>
            <DialogDescription>
              修改创作计划配置，保存后将按新配置执行
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
                      disabled
                    />
                  </div>
                </div>
                
                {/* 终止日期配置 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasEndDateEdit"
                      checked={basicForm.hasEndDate}
                      onChange={(e) => setBasicForm({ ...basicForm, hasEndDate: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="hasEndDateEdit" className="font-normal">设置终止日期</Label>
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
              
              {/* 内容配置 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  内容配置
                </h4>
                
                <div className="border rounded-lg">
                  <ConfigModules
                    config={config}
                    onChange={updateConfig}
                    openModules={openModules}
                    onToggleModule={toggleModule}
                    mode={selectedRule?.type === 'image-text' ? 'image-text' : 'article'}
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
                        articleDistribution: basicForm.publishConfig.articleDistribution,
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
                      accountCount={basicForm.publishConfig.targetPlatforms.length}
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
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setSelectedPlan(null);
            }}>
              取消
            </Button>
            <Button onClick={handleEditPlan} disabled={!basicForm.planName.trim()}>
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

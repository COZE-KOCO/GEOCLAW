'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Calendar,
  Repeat,
  Play,
  Settings,
  ChevronRight,
  Info,
  FileText,
  Users,
  CheckCircle2,
  Search,
} from 'lucide-react';

// 类型定义
type Frequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';

interface ContentDraft {
  id: string;
  businessId: string;
  title: string;
  content: string;
  distillationWords: string[];
  seoScore: number;
  status: 'draft' | 'ready' | 'published';
  createdAt: string;
}

interface MatrixAccount {
  id: string;
  businessId: string;
  platform: string;
  accountName: string;
  displayName: string;
  followers: number;
  status: 'active' | 'inactive';
}

interface SelectedAccount {
  accountId: string;
  platform: string;
  accountName: string;
  displayName: string;
}

interface PublishPlanFormData {
  planName: string;
  
  // 发布频率
  frequency: Frequency;
  scheduledTime: string;
  scheduledDays: number[];
  scheduledDates: number[];
  
  // 运行次数
  maxRuns: number;
  
  // 时间范围
  startDate: string;
  endDate: string;
  
  // 文章选择
  selectedDraftId: string;
  selectedDraft: ContentDraft | null;
  
  // 发布账号
  selectedAccounts: SelectedAccount[];
  
  // 配置
  priority: number;
}

interface PublishPlanCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onSuccess?: (plan: any) => void;
}

// 星期名称
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 平台信息
const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  zhihu: { name: '知乎', icon: '知', color: 'bg-blue-500' },
  xiaohongshu: { name: '小红书', icon: '红', color: 'bg-red-500' },
  wechat: { name: '微信公众号', icon: '微', color: 'bg-green-500' },
  toutiao: { name: '今日头条', icon: '头', color: 'bg-orange-500' },
  baijiahao: { name: '百家号', icon: '百', color: 'bg-blue-600' },
  douyin: { name: '抖音', icon: '抖', color: 'bg-black' },
  weibo: { name: '微博', icon: '微', color: 'bg-red-600' },
  bilibili: { name: 'B站', icon: 'B', color: 'bg-pink-500' },
};

// 频率选项
const FREQUENCY_OPTIONS: { value: Frequency; label: string; description: string }[] = [
  { value: 'once', label: '仅一次', description: '只在指定时间执行一次' },
  { value: 'hourly', label: '每小时', description: '每小时执行一次' },
  { value: 'daily', label: '每天', description: '每天在指定时间执行' },
  { value: 'weekly', label: '每周', description: '每周在指定日期执行' },
  { value: 'monthly', label: '每月', description: '每月在指定日期执行' },
];

export function PublishPlanCreator({
  open,
  onOpenChange,
  businessId,
  onSuccess,
}: PublishPlanCreatorProps) {
  // 表单状态
  const [formData, setFormData] = useState<PublishPlanFormData>({
    planName: '',
    frequency: 'daily',
    scheduledTime: '09:00',
    scheduledDays: [1, 2, 3, 4, 5],
    scheduledDates: [1],
    maxRuns: 0,
    startDate: '',
    endDate: '',
    selectedDraftId: '',
    selectedDraft: null,
    selectedAccounts: [],
    priority: 5,
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  
  // 文章库和账号数据
  const [contentDrafts, setContentDrafts] = useState<ContentDraft[]>([]);
  const [accounts, setAccounts] = useState<MatrixAccount[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');

  // 加载文章库
  useEffect(() => {
    if (open && businessId) {
      loadContentDrafts();
      loadAccounts();
    }
  }, [open, businessId]);

  const loadContentDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await fetch(`/api/content-drafts?businessId=${businessId}&status=ready`);
      if (res.ok) {
        const data = await res.json();
        setContentDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('加载文章库失败:', error);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`/api/accounts?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts((data.accounts || []).filter((a: MatrixAccount) => a.status === 'active'));
      }
    } catch (error) {
      console.error('加载账号失败:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 更新表单字段
  const updateField = <K extends keyof PublishPlanFormData>(
    field: K,
    value: PublishPlanFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 选择文章
  const selectDraft = (draft: ContentDraft) => {
    setFormData(prev => ({
      ...prev,
      selectedDraftId: draft.id,
      selectedDraft: draft,
    }));
  };

  // 按平台分组账号
  const accountsByPlatform = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, MatrixAccount[]>);

  // 切换账号选择
  const toggleAccount = (account: MatrixAccount) => {
    setFormData(prev => {
      const isSelected = prev.selectedAccounts.some(a => a.accountId === account.id);
      if (isSelected) {
        return {
          ...prev,
          selectedAccounts: prev.selectedAccounts.filter(a => a.accountId !== account.id),
        };
      } else {
        return {
          ...prev,
          selectedAccounts: [
            ...prev.selectedAccounts,
            {
              accountId: account.id,
              platform: account.platform,
              accountName: account.accountName,
              displayName: account.displayName,
            },
          ],
        };
      }
    });
  };

  // 全选/取消选择某平台所有账号
  const togglePlatformAll = (platform: string) => {
    const platformAccounts = accountsByPlatform[platform] || [];
    const allSelected = platformAccounts.every(a => 
      formData.selectedAccounts.some(sa => sa.accountId === a.id)
    );

    setFormData(prev => {
      if (allSelected) {
        // 取消选择该平台所有账号
        return {
          ...prev,
          selectedAccounts: prev.selectedAccounts.filter(
            a => !platformAccounts.some(pa => pa.id === a.accountId)
          ),
        };
      } else {
        // 选择该平台所有账号
        const newAccounts = platformAccounts
          .filter(a => !prev.selectedAccounts.some(sa => sa.accountId === a.id))
          .map(a => ({
            accountId: a.id,
            platform: a.platform,
            accountName: a.accountName,
            displayName: a.displayName,
          }));
        return {
          ...prev,
          selectedAccounts: [...prev.selectedAccounts, ...newAccounts],
        };
      }
    });
  };

  // 切换星期选择
  const toggleWeekday = (day: number) => {
    const days = formData.scheduledDays.includes(day)
      ? formData.scheduledDays.filter(d => d !== day)
      : [...formData.scheduledDays, day];
    updateField('scheduledDays', days.sort());
  };

  // 切换日期选择
  const toggleDate = (date: number) => {
    const dates = formData.scheduledDates.includes(date)
      ? formData.scheduledDates.filter(d => d !== date)
      : [...formData.scheduledDates, date];
    updateField('scheduledDates', dates.sort((a, b) => a - b));
  };

  // 提交创建
  const handleSubmit = async () => {
    if (!formData.planName || !formData.selectedDraftId || formData.selectedAccounts.length === 0) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/publish-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: {
            businessId,
            planName: formData.planName,
            frequency: formData.frequency,
            scheduledTime: formData.scheduledTime,
            scheduledDays: formData.scheduledDays,
            scheduledDates: formData.scheduledDates,
            maxRuns: formData.maxRuns,
            startDate: formData.startDate || undefined,
            endDate: formData.endDate || undefined,
            draftId: formData.selectedDraftId,
            title: formData.selectedDraft?.title || '',
            content: formData.selectedDraft?.content || '',
            targetAccounts: formData.selectedAccounts,
            priority: formData.priority,
          },
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        onOpenChange(false);
        onSuccess?.(result.data);
        
        // 重置表单
        setFormData({
          planName: '',
          frequency: 'daily',
          scheduledTime: '09:00',
          scheduledDays: [1, 2, 3, 4, 5],
          scheduledDates: [1],
          maxRuns: 0,
          startDate: '',
          endDate: '',
          selectedDraftId: '',
          selectedDraft: null,
          selectedAccounts: [],
          priority: 5,
        });
      }
    } catch (error) {
      console.error('创建发布计划失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 计算下次执行时间描述
  const getNextRunDescription = () => {
    const time = formData.scheduledTime;
    
    switch (formData.frequency) {
      case 'once':
        return `将在 ${formData.startDate || '今天'} ${time} 执行一次`;
      case 'hourly':
        return `每小时 ${time.split(':')[1]}分 执行`;
      case 'daily':
        return `每天 ${time} 执行`;
      case 'weekly':
        const days = formData.scheduledDays.map(d => WEEKDAY_NAMES[d]).join('、');
        return `每${days} ${time} 执行`;
      case 'monthly':
        const dates = formData.scheduledDates.join('、') + '号';
        return `每月 ${dates} ${time} 执行`;
      default:
        return '';
    }
  };

  // 过滤文章
  const filteredDrafts = contentDrafts.filter(draft => 
    draft.title.toLowerCase().includes(searchDraft.toLowerCase())
  );

  // 验证是否可以提交
  const canSubmit = formData.planName && formData.selectedDraftId && formData.selectedAccounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            创建发布计划
          </DialogTitle>
          <DialogDescription>
            设置自动发布计划，从文章库选择内容，选择发布账号
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="schedule">
              <Clock className="h-4 w-4 mr-2" />
              发布时间
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-2" />
              文章选择
            </TabsTrigger>
            <TabsTrigger value="accounts">
              <Users className="h-4 w-4 mr-2" />
              发布账号
            </TabsTrigger>
          </TabsList>

          {/* 发布时间 Tab */}
          <TabsContent value="schedule" className="space-y-6 mt-4">
            {/* 计划名称 */}
            <div className="space-y-2">
              <Label>计划名称 *</Label>
              <Input
                value={formData.planName}
                onChange={(e) => updateField('planName', e.target.value)}
                placeholder="输入计划名称，如：每日产品推广"
              />
            </div>

            {/* 发布频率 */}
            <div className="space-y-3">
              <Label>发布频率</Label>
              <div className="grid grid-cols-5 gap-2">
                {FREQUENCY_OPTIONS.map(option => (
                  <div
                    key={option.value}
                    onClick={() => updateField('frequency', option.value)}
                    className={`
                      p-3 rounded-lg border-2 cursor-pointer transition-all text-center
                      ${formData.frequency === option.value 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 发布时间选择 */}
            <div className="space-y-3">
              <Label>发布时间</Label>
              <Input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => updateField('scheduledTime', e.target.value)}
                className="w-40"
              />
            </div>

            {/* 周几选择（仅周频率显示） */}
            {formData.frequency === 'weekly' && (
              <div className="space-y-3">
                <Label>发布日期（周几）</Label>
                <div className="flex gap-2">
                  {WEEKDAY_NAMES.map((name, index) => (
                    <div
                      key={index}
                      onClick={() => toggleWeekday(index)}
                      className={`
                        w-12 h-12 rounded-lg border-2 cursor-pointer flex items-center justify-center
                        transition-all font-medium
                        ${formData.scheduledDays.includes(index)
                          ? 'border-purple-500 bg-purple-500 text-white'
                          : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 月日期选择（仅月频率显示） */}
            {formData.frequency === 'monthly' && (
              <div className="space-y-3">
                <Label>发布日期（每月几号）</Label>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                    <div
                      key={date}
                      onClick={() => toggleDate(date)}
                      className={`
                        h-9 rounded border cursor-pointer flex items-center justify-center
                        text-sm transition-all
                        ${formData.scheduledDates.includes(date)
                          ? 'border-purple-500 bg-purple-500 text-white'
                          : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      {date}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 运行次数 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>运行次数限制</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="unlimited"
                    checked={formData.maxRuns === 0}
                    onCheckedChange={(checked) => {
                      updateField('maxRuns', checked ? 0 : 1);
                    }}
                  />
                  <label htmlFor="unlimited" className="text-sm cursor-pointer">
                    无限循环
                  </label>
                </div>
              </div>
              {formData.maxRuns > 0 && (
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={formData.maxRuns}
                    onChange={(e) => updateField('maxRuns', parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">次后自动停止</span>
                </div>
              )}
            </div>

            {/* 时间范围 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始日期（可选）</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>结束日期（可选）</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />
              </div>
            </div>

            {/* 执行预览 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    执行计划预览
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {getNextRunDescription()}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 文章选择 Tab */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>从文章库选择 *</Label>
              <p className="text-sm text-gray-500">
                选择已保存的文章（仅显示状态为"就绪"的文章）
              </p>
            </div>

            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索文章标题..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 已选择的文章 */}
            {formData.selectedDraft && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border-2 border-purple-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">已选择</span>
                    </div>
                    <p className="font-semibold mt-2">{formData.selectedDraft.title}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {formData.selectedDraft.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>SEO评分: {formData.selectedDraft.seoScore}</span>
                      <span>
                        创建于: {new Date(formData.selectedDraft.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateField('selectedDraftId', '');
                      updateField('selectedDraft', null);
                    }}
                  >
                    取消选择
                  </Button>
                </div>
              </div>
            )}

            {/* 文章列表 */}
            <ScrollArea className="h-[300px]">
              {loadingDrafts ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : filteredDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p>暂无可发布的文章</p>
                  <p className="text-sm mt-1">请先在内容创作中创建并保存文章</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDrafts.map(draft => (
                    <div
                      key={draft.id}
                      onClick={() => selectDraft(draft)}
                      className={`
                        p-4 rounded-lg border cursor-pointer transition-all
                        ${formData.selectedDraftId === draft.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{draft.title}</p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {draft.content.substring(0, 100)}...
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>SEO评分: {draft.seoScore}</span>
                            <span>
                              {new Date(draft.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {formData.selectedDraftId === draft.id && (
                          <CheckCircle2 className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 发布账号 Tab */}
          <TabsContent value="accounts" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>选择发布账号 *</Label>
              <p className="text-sm text-gray-500">
                选择要发布到的账号（按平台分组显示）
              </p>
            </div>

            {/* 已选择的账号 */}
            {formData.selectedAccounts.length > 0 && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="font-medium mb-2">
                  已选择 {formData.selectedAccounts.length} 个账号
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.selectedAccounts.map((account, index) => {
                    const info = PLATFORM_INFO[account.platform] || { name: account.platform, icon: '?' };
                    return (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {info.icon} {info.name} - {account.displayName}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 账号列表（按平台分组） */}
            <ScrollArea className="h-[300px]">
              {loadingAccounts ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">加载中...</p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Users className="h-12 w-12 mb-2 opacity-50" />
                  <p>暂无绑定的账号</p>
                  <p className="text-sm mt-1">请先在账号管理中绑定账号</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(accountsByPlatform).map(([platform, platformAccounts]) => {
                    const info = PLATFORM_INFO[platform] || { name: platform, icon: '?', color: 'bg-gray-500' };
                    const allSelected = platformAccounts.every(a => 
                      formData.selectedAccounts.some(sa => sa.accountId === a.id)
                    );
                    const someSelected = platformAccounts.some(a => 
                      formData.selectedAccounts.some(sa => sa.accountId === a.id)
                    );

                    return (
                      <div key={platform} className="border rounded-lg">
                        {/* 平台头部 */}
                        <div
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                          onClick={() => togglePlatformAll(platform)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-8 h-8 rounded ${info.color} text-white flex items-center justify-center text-sm font-bold`}>
                              {info.icon}
                            </span>
                            <span className="font-medium">{info.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {platformAccounts.length} 个账号
                            </Badge>
                          </div>
                          <Checkbox
                            checked={allSelected}
                            ref={(el) => {
                              if (el) {
                                (el as any).dataset.state = someSelected && !allSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked';
                              }
                            }}
                          />
                        </div>

                        {/* 账号列表 */}
                        <div className="divide-y">
                          {platformAccounts.map(account => {
                            const isSelected = formData.selectedAccounts.some(a => a.accountId === account.id);
                            return (
                              <div
                                key={account.id}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                                onClick={() => toggleAccount(account)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {account.displayName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium">{account.displayName}</p>
                                    <p className="text-sm text-gray-500">
                                      @{account.accountName} · {(account.followers / 1000).toFixed(1)}k 粉丝
                                    </p>
                                  </div>
                                </div>
                                <Checkbox checked={isSelected} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? '创建中...' : '创建计划'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

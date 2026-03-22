'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { CreationRecordMenu } from '@/components/creation-record-menu';
import {
  ConfigModules,
  useGenerationConfig,
} from '@/components/creation-config';
import type { GenerationConfig } from '@/lib/types/generation-config';
import { defaultGenerationConfig } from '@/lib/types/generation-config';
import type { KeywordLibrary } from '@/lib/keyword-store';
import {
  Layers,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Play,
  FileText,
  ImageIcon,
  Settings,
  Sparkles,
  Clock,
  Inbox,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// 规则类型定义
interface SavedRule {
  id: string;
  name: string;
  description?: string;
  type: 'article' | 'image-text';
  config: Partial<GenerationConfig>;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
}

const ruleTypeConfig = {
  keyword: { name: '关键词生成', icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-100' },
  title: { name: '标题生成', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  description: { name: '描述生成', icon: FileText, color: 'text-green-500', bgColor: 'bg-green-100' },
  'keyword-library': { name: '关键词库', icon: Layers, color: 'text-orange-500', bgColor: 'bg-orange-100' },
};

export default function RulesPage() {
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordLibraries, setKeywordLibraries] = useState<KeywordLibrary[]>([]);
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  
  // 对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<SavedRule | null>(null);
  
  // 规则类型
  const [ruleCategory, setRuleCategory] = useState<'article' | 'image-text'>('article');
  
  // 基础表单数据
  const [basicForm, setBasicForm] = useState({
    name: '',
    description: '',
  });
  
  // 使用配置 Hook
  const {
    config,
    setConfig,
    openModules,
    setOpenModules,
    updateConfig,
    resetConfig,
    loadConfig,
  } = useGenerationConfig();

  useEffect(() => {
    loadRules();
    loadKeywordLibraries();
  }, [selectedBusiness]);

  const loadKeywordLibraries = async () => {
    if (!selectedBusiness) {
      setKeywordLibraries([]);
      return;
    }
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
  };

  const loadRules = async () => {
    if (!selectedBusiness) {
      setRules([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/creation-rules?businessId=${selectedBusiness}`);
      const data = await response.json();
      
      if (response.ok && data.rules) {
        setRules(data.rules.map((rule: { id: string; name: string; description?: string; type: string; config: GenerationConfig; useCount: number; lastUsedAt?: string; createdAt: string; updatedAt: string }) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          type: rule.type as 'article' | 'image-text',
          config: rule.config,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
          lastUsedAt: rule.lastUsedAt ? new Date(rule.lastUsedAt) : undefined,
          usageCount: rule.useCount,
        })));
      } else {
        setRules([]);
      }
    } catch (error) {
      console.error('加载规则失败:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  // 创建规则
  const handleCreate = async () => {
    if (!basicForm.name.trim()) {
      return;
    }
    if (!selectedBusiness) {
      return;
    }

    try {
      const response = await fetch('/api/creation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          name: basicForm.name,
          description: basicForm.description,
          type: ruleCategory,
          config: config,
        }),
      });

      const data = await response.json();

      if (response.ok && data.rule) {
        setRules([{
          id: data.rule.id,
          name: data.rule.name,
          description: data.rule.description,
          type: data.rule.type,
          config: data.rule.config,
          createdAt: new Date(data.rule.createdAt),
          updatedAt: new Date(data.rule.updatedAt),
          usageCount: data.rule.useCount,
        }, ...rules]);
        setShowCreateDialog(false);
        resetCreateForm();
      }
    } catch (error) {
      console.error('创建规则失败:', error);
    }
  };

  // 更新规则
  const handleEdit = async () => {
    if (!selectedRule || !basicForm.name.trim()) return;

    try {
      const response = await fetch('/api/creation-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRule.id,
          name: basicForm.name,
          description: basicForm.description,
          config: config,
        }),
      });

      const data = await response.json();

      if (response.ok && data.rule) {
        setRules(rules.map(r =>
          r.id === selectedRule.id
            ? {
                ...r,
                name: data.rule.name,
                description: data.rule.description,
                config: data.rule.config,
                updatedAt: new Date(data.rule.updatedAt),
              }
            : r
        ));
        setShowEditDialog(false);
        setSelectedRule(null);
        resetCreateForm();
      }
    } catch (error) {
      console.error('更新规则失败:', error);
    }
  };

  // 删除规则
  const handleDelete = async () => {
    if (!selectedRule) return;
    
    try {
      const response = await fetch(`/api/creation-rules?id=${selectedRule.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRules(rules.filter(r => r.id !== selectedRule.id));
        setShowDeleteDialog(false);
        setSelectedRule(null);
      }
    } catch (error) {
      console.error('删除规则失败:', error);
    }
  };

  // 复制规则
  const handleDuplicate = async (rule: SavedRule) => {
    if (!selectedBusiness) return;
    
    try {
      const response = await fetch('/api/creation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          name: `${rule.name} (副本)`,
          description: rule.description,
          type: rule.type,
          config: rule.config,
        }),
      });

      const data = await response.json();

      if (response.ok && data.rule) {
        setRules([{
          id: data.rule.id,
          name: data.rule.name,
          description: data.rule.description,
          type: data.rule.type,
          config: data.rule.config,
          createdAt: new Date(data.rule.createdAt),
          updatedAt: new Date(data.rule.updatedAt),
          usageCount: data.rule.useCount,
        }, ...rules]);
      }
    } catch (error) {
      console.error('复制规则失败:', error);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (rule: SavedRule) => {
    setSelectedRule(rule);
    setRuleCategory(rule.type);
    setBasicForm({
      name: rule.name,
      description: rule.description || '',
    });
    loadConfig(rule.config);
    setShowEditDialog(true);
  };

  // 重置创建表单
  const resetCreateForm = () => {
    setBasicForm({ name: '', description: '' });
    resetConfig();
  };

  // 打开创建对话框
  const openCreateDialog = (type: 'article' | 'image-text') => {
    setRuleCategory(type);
    resetCreateForm();
    setShowCreateDialog(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRules = rules.filter(rule => {
    if (searchQuery && !rule.name.includes(searchQuery)) return false;
    if (filterType !== 'all' && rule.type !== filterType) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">生成规则</h1>
              <p className="text-sm text-gray-500">创建并管理生成规则，AI会根据规则配置创作内容</p>
            </div>
          </div>
          <CreationRecordMenu />
        </div>

        {/* 筛选区域 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="按名称筛选"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="所有类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有类型</SelectItem>
                  <SelectItem value="article">文章规则</SelectItem>
                  <SelectItem value="image-text">图文规则</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={loadRules}>
                查询
              </Button>
              
              <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterType('all'); }}>
                重置
              </Button>
              
              <div className="flex-1" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-1" />
                    新建规则
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => openCreateDialog('article')}>
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    新建文章规则
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog('image-text')}>
                    <ImageIcon className="h-4 w-4 mr-2 text-purple-500" />
                    新建图文规则
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* 数据列表 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-gray-500">加载中...</div>
            ) : filteredRules.length === 0 ? (
              <div className="py-16 text-center">
                <Inbox className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">暂无数据</p>
              </div>
            ) : (
              <div className="divide-y">
                {/* 表头 */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-500">
                  <div className="col-span-4">名称</div>
                  <div className="col-span-2">类型</div>
                  <div className="col-span-3">时间</div>
                  <div className="col-span-3 text-right">操作</div>
                </div>
                
                {/* 数据行 */}
                {filteredRules.map((rule) => {
                  const generateMethod = rule.config.generateMethod || 'keyword';
                  const typeConf = ruleTypeConfig[generateMethod] || ruleTypeConfig.keyword;
                  const TypeIcon = typeConf.icon;
                  
                  return (
                    <div
                      key={rule.id}
                      className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${typeConf.bgColor} flex items-center justify-center`}>
                            <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{rule.name}</p>
                            {rule.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[250px]">{rule.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary">{typeConf.name}</Badge>
                          {rule.type === 'image-text' && (
                            <Badge variant="outline" className="text-purple-600 border-purple-300">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              图文
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(rule.updatedAt)}
                        </div>
                        <p className="text-xs mt-1">使用 {rule.usageCount} 次</p>
                      </div>
                      
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <Link href={`/matrix/batch/create?ruleId=${rule.id}`}>
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            执行
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(rule)}>
                              <Copy className="h-4 w-4 mr-2" />
                              复制
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => { setSelectedRule(rule); setShowDeleteDialog(true); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 创建规则对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              {ruleCategory === 'image-text' ? (
                <>
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                  新建图文规则
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-blue-500" />
                  新建文章规则
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {ruleCategory === 'image-text' 
                ? '创建图文生成规则，配置完整的创作参数' 
                : '创建文章生成规则，配置完整的创作参数'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <div className="space-y-4 py-4 pr-4">
              {/* 基础信息 */}
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  基本信息
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>规则名称 *</Label>
                    <Input
                      placeholder="我的特别生成规则"
                      value={basicForm.name}
                      onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>规则描述</Label>
                    <Input
                      placeholder="简要描述该规则的用途"
                      value={basicForm.description}
                      onChange={(e) => setBasicForm({ ...basicForm, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              {/* 配置模块 */}
              <div className="border rounded-lg">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-b">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">创作配置</h4>
                  <p className="text-xs text-gray-500 mt-1">配置AI创作的各项参数</p>
                </div>
                <ConfigModules
                  config={config}
                  onChange={updateConfig}
                  openModules={openModules}
                  onToggleModule={(id) => {
                    setOpenModules(openModules.includes(id) 
                      ? openModules.filter(m => m !== id) 
                      : [...openModules, id]
                    );
                  }}
                  mode={ruleCategory === 'image-text' ? 'image-text' : 'article'}
                  keywordLibraries={keywordLibraries}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-background">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!basicForm.name.trim()}>
              创建规则
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑规则对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>编辑生成规则</DialogTitle>
            <DialogDescription>
              修改生成规则的配置信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            <div className="space-y-4 py-4 pr-4">
              {/* 基础信息 */}
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  基本信息
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>规则名称 *</Label>
                    <Input
                      placeholder="我的特别生成规则"
                      value={basicForm.name}
                      onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>规则描述</Label>
                    <Input
                      placeholder="简要描述该规则的用途"
                      value={basicForm.description}
                      onChange={(e) => setBasicForm({ ...basicForm, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              {/* 配置模块 */}
              <div className="border rounded-lg">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-b">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">创作配置</h4>
                  <p className="text-xs text-gray-500 mt-1">配置AI创作的各项参数</p>
                </div>
                <ConfigModules
                  config={config}
                  onChange={updateConfig}
                  openModules={openModules}
                  onToggleModule={(id) => {
                    setOpenModules(openModules.includes(id) 
                      ? openModules.filter(m => m !== id) 
                      : [...openModules, id]
                    );
                  }}
                  mode={ruleCategory === 'image-text' ? 'image-text' : 'article'}
                  keywordLibraries={keywordLibraries}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-background">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={!basicForm.name.trim()}>
              保存修改
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
              确定要删除规则"{selectedRule?.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

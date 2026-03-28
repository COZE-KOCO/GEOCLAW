'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { useBusiness } from '@/contexts/business-context';
import {
  ConfigModules,
  useGenerationConfig,
} from '@/components/creation-config';
import type { GenerationConfig } from '@/lib/types/generation-config';
import { defaultGenerationConfig, AVAILABLE_MODELS } from '@/lib/types/generation-config';
import type { KeywordLibrary } from '@/lib/keyword-store';
import {
  ChevronLeft,
  Play,
  Loader2,
  CheckCircle2,
  Settings,
  Zap,
  AlertCircle,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 已保存的规则（从规则管理页面获取）
interface SavedRule {
  id: string;
  name: string;
  description?: string;
  type: 'article' | 'image-text';
  config: Partial<GenerationConfig>;
}

export default function BatchCreatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <BatchCreateContent />
    </Suspense>
  );
}

function BatchCreateContent() {
  const { selectedBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ruleId = searchParams.get('ruleId');
  
  const [loading, setLoading] = useState(false);
  const [keywordLibraries, setKeywordLibraries] = useState<KeywordLibrary[]>([]);
  const [savedRules, setSavedRules] = useState<SavedRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<SavedRule | null>(null);
  
  // 使用配置 Hook
  const {
    config,
    setConfig,
    openModules,
    setOpenModules,
    updateConfig,
    resetConfig,
    loadConfig,
    toggleModule,
  } = useGenerationConfig();
  
  // 加载关键词库
  useEffect(() => {
    const loadLibraries = async () => {
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
    loadLibraries();
  }, [selectedBusiness]);
  
  // 加载规则列表
  useEffect(() => {
    const loadRules = async () => {
      if (!selectedBusiness) {
        setSavedRules([]);
        return;
      }
      try {
        const response = await fetch(`/api/creation-rules?businessId=${selectedBusiness}`);
        const data = await response.json();
        if (response.ok && data.rules) {
          // 转换规则数据格式
          const formattedRules: SavedRule[] = data.rules.map((rule: any) => ({
            id: rule.id,
            name: rule.name,
            description: rule.description,
            type: rule.type === 'image-text' ? 'image-text' : 'article',
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
    loadRules();
  }, [selectedBusiness]);
  
  // 文章规则（过滤）
  const articleRules = savedRules.filter(rule => rule.type === 'article');
  
  // 加载规则配置到表单
  const loadRule = (rule: SavedRule) => {
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
  
  // 从URL参数加载规则
  useEffect(() => {
    if (ruleId && !selectedRule) {
      const rule = articleRules.find(r => r.id === ruleId);
      if (rule) {
        loadRule(rule);
      }
    }
  }, [ruleId]);
  
  // 生成文章 - 创建生成计划
  const handleGenerate = async () => {
    // 验证
    if (config.generateMethod === 'keyword' && !config.keywords.trim()) {
      toast.error('请输入关键词');
      return;
    }
    if (config.generateMethod === 'keyword-library' && !config.keywordLibraryId) {
      toast.error('请选择关键词库');
      return;
    }
    if (config.generateMethod === 'title' && !config.keywords.trim()) {
      toast.error('请输入标题列表');
      return;
    }
    if (config.generateMethod === 'description' && !config.description.trim()) {
      toast.error('请输入文章描述');
      return;
    }
    if (!selectedBusiness) {
      toast.error('请先选择业务');
      return;
    }
    
    // 验证文章类型分布
    const dist = config.articleTypeDistribution;
    const total = dist.what + dist.how + dist.top + dist.normal;
    if (total !== 100) {
      toast.error('文章类型占比总和必须为100%');
      return;
    }
    
    setLoading(true);
    console.log('创建生成计划，配置:', config);
    
    try {
      const response = await fetch('/api/generation-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          config: config,
          mode: 'article',
        }),
      });
      
      const data = await response.json();
      console.log('生成计划响应:', data);
      
      if (!response.ok || !data.success) {
        // 如果需要初始化数据库表
        if (data.needsInit && data.sql) {
          // 使用 alert 显示初始化提示
          const confirmed = confirm(
            '数据库表 generation_plans 不存在！\n\n' +
            '请按以下步骤操作：\n' +
            '1. 点击"确定"复制 SQL 到剪贴板\n' +
            '2. 在 Supabase 控制台的 SQL Editor 中执行 SQL\n\n' +
            '提示：' + data.hint
          );
          if (confirmed) {
            navigator.clipboard.writeText(data.sql);
            toast.success('SQL 已复制到剪贴板，请在 Supabase 控制台执行');
          }
        } else {
          toast.error(data.error || '创建计划失败');
        }
        return;
      }
      
      toast.success('生成计划已创建，正在后台执行');
      // 跳转到生成计划页面
      router.push('/matrix/generation-plans');
    } catch (error: any) {
      console.error('生成失败:', error);
      toast.error(error.message || '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创作文章</h1>
            <p className="text-sm text-gray-500">填写下面生成规则，为您批量创作文章</p>
          </div>
        </div>

        {/* 步骤1：选择 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-medium">
                1
              </div>
              <span className="font-medium">选择</span>
              {selectedRule && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  已选择规则
                </Badge>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm text-gray-500 mb-2 block">选择已有规则</Label>
                  <Select 
                    value={config.ruleId || ''} 
                    onValueChange={(v) => {
                      if (v === 'none') {
                        clearRuleSelection();
                      } else {
                        const rule = articleRules.find(r => r.id === v);
                        if (rule) loadRule(rule);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择规则快速开始" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">自定义配置</SelectItem>
                      {articleRules.map(rule => (
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
                <Link href="/matrix/batch">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-1" />
                    管理规则
                  </Button>
                </Link>
              </div>
              
              {/* 选中规则的详情 */}
              {selectedRule && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">{selectedRule.name}</h4>
                      {selectedRule.description && (
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{selectedRule.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedRule.config.keywords?.split('\n').slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-white">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearRuleSelection}
                    >
                      取消选择
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 步骤2：设置 */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-medium">
                2
              </div>
              <span className="font-medium">设置</span>
              {selectedRule && (
                <span className="text-sm text-gray-500">（可根据需要调整规则配置）</span>
              )}
            </div>
            
            <ConfigModules
              config={config}
              onChange={updateConfig}
              openModules={openModules}
              onToggleModule={toggleModule}
              mode="article"
              keywordLibraries={keywordLibraries}
            />
          </CardContent>
        </Card>

        {/* 步骤3：生成 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-medium">
                3
              </div>
              <span className="font-medium">生成</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>选择模型</Label>
                <Select value={config.model} onValueChange={(v) => updateConfig('model', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {config.model === 'deepseek-r1-250528' && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    DeepSeek R1 是深度推理模型，生成时间较长
                  </p>
                )}
                {config.model === 'doubao-seed-2-0-pro-260215' && (
                  <p className="text-xs text-purple-500 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    旗舰模型，适合复杂推理和多步骤任务
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>生成数量</Label>
                <Select 
                  value={config.articleCount.toString()} 
                  onValueChange={(v) => updateConfig('articleCount', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10, 20, 50].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}篇文章</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              className="w-full bg-purple-500 hover:bg-purple-600"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  开始生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

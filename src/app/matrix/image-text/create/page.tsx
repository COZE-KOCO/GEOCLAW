'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Plus,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 已保存的图文规则
interface SavedRule {
  id: string;
  name: string;
  description?: string;
  type: 'image-text';
  config: Partial<GenerationConfig>;
}

// 图文规则列表 - 实际应从API或状态管理获取
const imageTextRules: SavedRule[] = [
  {
    id: 'it-1',
    name: '产品评测图文',
    description: '生成带产品配图的评测文章',
    type: 'image-text',
    config: {
      generateMethod: 'keyword',
      keywords: '产品评测\n使用体验\n优缺点分析',
      enableThumbnail: true,
      enableContentImages: true,
      imageCount: 5,
    },
  },
  {
    id: 'it-2',
    name: '生活方式图文',
    description: '生活方式类图文内容',
    type: 'image-text',
    config: {
      generateMethod: 'keyword',
      keywords: '生活方式\n健康生活\n品质生活',
      enableThumbnail: true,
      enableContentImages: true,
      imageCount: 3,
    },
  },
];

export default function ImageTextCreatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ImageTextCreateContent />
    </Suspense>
  );
}

function ImageTextCreateContent() {
  const { selectedBusiness } = useBusiness();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ruleIdFromUrl = searchParams.get('ruleId');
  
  const [loading, setLoading] = useState(false);
  const [keywordLibraries, setKeywordLibraries] = useState<KeywordLibrary[]>([]);
  const [selectedRule, setSelectedRule] = useState<SavedRule | null>(null);
  
  // 使用配置 Hook
  const {
    config,
    openModules,
    setOpenModules,
    updateConfig,
    resetConfig,
    loadConfig,
    toggleModule,
  } = useGenerationConfig({
    enableThumbnail: true,
    enableContentImages: true,
  });
  
  // 加载关键词库数据
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
    if (ruleIdFromUrl && !selectedRule) {
      const rule = imageTextRules.find(r => r.id === ruleIdFromUrl);
      if (rule) {
        loadRule(rule);
      }
    }
  }, [ruleIdFromUrl]);
  
  // 生成图文 - 创建生成计划
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
    console.log('创建图文生成计划，配置:', config);
    
    try {
      const response = await fetch('/api/generation-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          config: {
            ...config,
            // 图文模式默认启用缩略图和内容配图
            enableThumbnail: true,
            enableContentImages: true,
          },
          mode: 'image-text',
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
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创作图文</h1>
            <p className="text-sm text-gray-500">填写下面生成规则，为您批量创作图文内容</p>
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
                  <Label className="text-sm text-gray-500 mb-2 block">选择已有图文规则</Label>
                  <Select 
                    value={config.ruleId || ''} 
                    onValueChange={(v) => {
                      if (v === 'none') {
                        clearRuleSelection();
                      } else {
                        const rule = imageTextRules.find(r => r.id === v);
                        if (rule) loadRule(rule);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择规则快速开始" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">自定义配置</SelectItem>
                      {imageTextRules.map(rule => (
                        <SelectItem key={rule.id} value={rule.id}>
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-purple-500" />
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
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-purple-900 dark:text-purple-100">{selectedRule.name}</h4>
                      {selectedRule.description && (
                        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">{selectedRule.description}</p>
                      )}
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
              mode="image-text"
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
                    {[1, 2, 3, 5, 10, 20].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}篇图文</SelectItem>
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
                  开始生成图文
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

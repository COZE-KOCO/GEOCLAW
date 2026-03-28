'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
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
  ArrowLeft,
  Settings,
  Plus,
  Trash2,
  Loader2,
  Download,
  Upload,
  RefreshCw,
  Target,
  RotateCcw,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  SelectorConfigPanel,
} from '@/components/selector-config-panel';
import { 
  SelectorTypeDefinition,
  getPlatformSelectorTypes, 
  getSelectorTypeByKey 
} from '@/lib/selector-types';
import type { SelectorItem, PlatformSelectorConfig } from '@/lib/selector-defaults';

// 平台图标
const PLATFORM_ICONS: Record<string, string> = {
  toutiao: '📰',
  xiaohongshu: '📕',
  weibo: '🐦',
  bilibili: '📺',
  douyin: '🎵',
  zhihu: '📘',
  wechat: '💬',
};

/**
 * 将旧格式配置转换为新格式
 */
function convertToNewFormat(oldConfig: any): PlatformSelectorConfig {
  return {
    id: oldConfig.id,
    platform: oldConfig.platform,
    platformName: oldConfig.platformName,
    version: oldConfig.version || '2.0.0',
    publishUrl: oldConfig.publishUrl,
    selectorTypes: oldConfig.selectorTypes || Object.keys(oldConfig.selectors || {}),
    selectors: oldConfig.selectors || {},
    settings: oldConfig.settings || {},
    prepareScript: oldConfig.prepareScript,
    totalAttempts: oldConfig.totalAttempts || 0,
    successfulAttempts: oldConfig.successfulAttempts || 0,
    successRate: oldConfig.successRate || '0%',
    isActive: oldConfig.isActive ?? true,
    isDefault: oldConfig.isDefault ?? true,
    notes: oldConfig.notes,
    createdAt: oldConfig.createdAt,
    updatedAt: oldConfig.updatedAt,
  };
}

/**
 * 将新格式配置转换为旧格式（用于 API 兼容）
 */
function convertToOldFormat(newConfig: PlatformSelectorConfig): any {
  return {
    id: newConfig.id,
    platform: newConfig.platform,
    platformName: newConfig.platformName,
    version: newConfig.version,
    publishUrl: newConfig.publishUrl,
    selectorTypes: newConfig.selectorTypes,
    selectors: newConfig.selectors,
    settings: newConfig.settings,
    prepareScript: newConfig.prepareScript,
    totalAttempts: newConfig.totalAttempts,
    successfulAttempts: newConfig.successfulAttempts,
    successRate: newConfig.successRate,
    isActive: newConfig.isActive,
    isDefault: newConfig.isDefault,
    notes: newConfig.notes,
    createdAt: newConfig.createdAt,
    updatedAt: newConfig.updatedAt,
  };
}

export default function SelectorConfigPage() {
  const [configs, setConfigs] = useState<PlatformSelectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<PlatformSelectorConfig | null>(null);
  const [addPlatformDialogOpen, setAddPlatformDialogOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState({
    platform: '',
    platformName: '',
    publishUrl: '',
  });

  // 获取当前平台的选择器类型定义
  const selectorTypes = useMemo(() => {
    if (!selectedConfig) return [];
    
    // 从配置中获取 selectorTypes
    const typeKeys = selectedConfig.selectorTypes || [];
    
    // 根据 key 获取类型定义
    const types = typeKeys.map(key => {
      // 先从注册表中查找
      const registeredType = getSelectorTypeByKey(key);
      if (registeredType) return registeredType;
      
      // 如果是自定义类型，创建一个基本定义
      return {
        key,
        name: key,
        description: '自定义选择器',
        required: false,
        multiple: true,
        inputType: 'text' as const,
        icon: 'Settings',
        order: 100,
        category: 'metadata' as const,
      };
    });
    
    // 按 order 排序，确保发布按钮始终在最后
    return types.sort((a, b) => a.order - b.order);
  }, [selectedConfig]);

  // 加载配置
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/selectors');
      const result = await response.json();
      if (result.success) {
        const convertedConfigs = result.data.map(convertToNewFormat);
        setConfigs(convertedConfigs);
        if (convertedConfigs.length > 0 && !selectedPlatform) {
          setSelectedPlatform(convertedConfigs[0].platform);
          setSelectedConfig(convertedConfigs[0]);
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置为默认配置
  const resetToDefault = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/selectors/init', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast.success('已重置为默认配置');
        const convertedConfigs = result.data.map(convertToNewFormat);
        setConfigs(convertedConfigs);
        if (selectedPlatform) {
          const config = convertedConfigs.find((c: PlatformSelectorConfig) => c.platform === selectedPlatform);
          if (config) setSelectedConfig(config);
        }
      } else {
        toast.error(result.error || '重置失败');
      }
    } catch (error) {
      console.error('重置失败:', error);
      toast.error('重置失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置单个平台为默认
  const resetPlatformToDefault = async (platform: string) => {
    try {
      const response = await fetch(`/api/selectors/${platform}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('已恢复为默认配置');
        const convertedConfig = convertToNewFormat(result.data);
        setConfigs(prev => prev.map(c => c.platform === platform ? convertedConfig : c));
        if (selectedPlatform === platform) {
          setSelectedConfig(convertedConfig);
        }
      } else {
        toast.error(result.error || '重置失败');
      }
    } catch (error) {
      console.error('重置失败:', error);
      toast.error('重置失败');
    }
  };

  // 保存配置
  const saveConfig = async () => {
    if (!selectedConfig) return;
    
    try {
      setSaving(true);
      const oldFormatConfig = convertToOldFormat(selectedConfig);
      const response = await fetch(`/api/selectors/${selectedConfig.platform}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oldFormatConfig),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('保存成功');
        const convertedConfig = convertToNewFormat(result.data);
        setConfigs(prev => prev.map(c => c.platform === selectedConfig.platform ? convertedConfig : c));
        setSelectedConfig(convertedConfig);
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 测试配置
  const testConfig = async () => {
    if (!selectedConfig) return;
    
    try {
      setTesting(true);
      // 调用测试 API
      const response = await fetch(`/api/selectors/${selectedConfig.platform}/test`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`测试完成，成功率: ${result.successRate}`);
        // 更新统计数据
        if (result.stats) {
          setSelectedConfig(prev => prev ? {
            ...prev,
            totalAttempts: result.stats.totalAttempts,
            successfulAttempts: result.stats.successfulAttempts,
            successRate: result.stats.successRate,
          } : null);
        }
      } else {
        toast.error(result.error || '测试失败');
      }
    } catch (error) {
      console.error('测试失败:', error);
      toast.error('测试失败');
    } finally {
      setTesting(false);
    }
  };

  // 更新配置
  const updateConfig = (config: PlatformSelectorConfig) => {
    setSelectedConfig(config);
  };

  // 添加新平台
  const addPlatform = async () => {
    if (!newPlatform.platform || !newPlatform.platformName || !newPlatform.publishUrl) {
      toast.error('请填写完整信息');
      return;
    }

    if (configs.some(c => c.platform === newPlatform.platform)) {
      toast.error('平台标识已存在');
      return;
    }

    const platformTypes = getPlatformSelectorTypes(newPlatform.platform);
    const newConfig: PlatformSelectorConfig = {
      platform: newPlatform.platform,
      platformName: newPlatform.platformName,
      version: '2.0.0',
      publishUrl: newPlatform.publishUrl,
      selectorTypes: platformTypes.filter(t => t.required).map(t => t.key),
      selectors: {},
      settings: {
        waitForImageUpload: true,
        imageUploadWait: 5000,
        publishWait: 5000,
        pageLoadWait: 3000,
        retryCount: 3,
        retryDelay: 1000,
      },
      totalAttempts: 0,
      successfulAttempts: 0,
      successRate: '0%',
      isActive: true,
      isDefault: false,
    };

    // 初始化空选择器数组
    platformTypes.forEach(type => {
      newConfig.selectors[type.key] = [];
    });

    try {
      const response = await fetch('/api/selectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convertToOldFormat(newConfig)),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('添加成功');
        const convertedConfig = convertToNewFormat(result.data);
        setConfigs(prev => [...prev, convertedConfig]);
        setSelectedPlatform(newPlatform.platform);
        setSelectedConfig(convertedConfig);
        setAddPlatformDialogOpen(false);
        setNewPlatform({ platform: '', platformName: '', publishUrl: '' });
      } else {
        toast.error(result.error || '添加失败');
      }
    } catch (error) {
      console.error('添加失败:', error);
      toast.error('添加失败');
    }
  };

  // 导出配置
  const exportConfig = () => {
    if (!selectedConfig) return;
    const blob = new Blob([JSON.stringify(convertToOldFormat(selectedConfig), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selector-config-${selectedConfig.platform}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const importConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        const response = await fetch('/api/selectors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        const result = await response.json();
        if (result.success) {
          toast.success('导入成功');
          await loadConfigs();
        } else {
          toast.error(result.error || '导入失败');
        }
      } catch (error) {
        toast.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Link href="/auto-publish" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                选择器配置管理
              </h1>
              <p className="text-sm text-muted-foreground">
                管理各平台的发布选择器，支持可视化选择和热更新配置
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetToDefault} 
              disabled={saving || loading}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              重置为默认配置
            </Button>
            <Button variant="outline" size="sm" onClick={loadConfigs} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={exportConfig} disabled={!selectedConfig}>
              <Download className="h-4 w-4 mr-1" />
              导出
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  导入
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={importConfig}
              />
            </label>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧平台列表 */}
          <div className="w-64 border-r bg-muted/30">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">平台列表</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddPlatformDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : configs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无配置</p>
                  </div>
                ) : (
                  configs.map((config) => {
                    // 计算配置完成度
                    const requiredTypes = getPlatformSelectorTypes(config.platform).filter(t => t.required);
                    const configuredCount = requiredTypes.filter(t => {
                      const items = config.selectors[t.key];
                      return items && items.some((i: SelectorItem) => i.isEnabled);
                    }).length;
                    const isComplete = configuredCount >= requiredTypes.length;
                    
                    return (
                      <button
                        key={config.platform}
                        onClick={() => {
                          setSelectedPlatform(config.platform);
                          setSelectedConfig(config);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                          selectedPlatform === config.platform
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <span>{PLATFORM_ICONS[config.platform] || '🌐'}</span>
                        <span className="flex-1 text-left truncate">{config.platformName}</span>
                        {isComplete ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            已配置
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            {configuredCount}/{requiredTypes.length}
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧配置详情 */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : selectedConfig ? (
              <div className="p-4 space-y-4">
                {/* 基本信息 */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span>{PLATFORM_ICONS[selectedConfig.platform] || '🌐'}</span>
                          {selectedConfig.platformName}
                          {!selectedConfig.isDefault && (
                            <Badge variant="outline" className="ml-2">已修改</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {selectedConfig.publishUrl}
                        </CardDescription>
                      </div>
                      {!selectedConfig.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetPlatformToDefault(selectedConfig.platform)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          恢复默认
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{selectedConfig.totalAttempts}</div>
                        <div className="text-xs text-muted-foreground">总尝试</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{selectedConfig.successfulAttempts}</div>
                        <div className="text-xs text-muted-foreground">成功次数</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{selectedConfig.successRate}</div>
                        <div className="text-xs text-muted-foreground">成功率</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{Object.values(selectedConfig.selectors).flat().length}</div>
                        <div className="text-xs text-muted-foreground">选择器数量</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 选择器配置面板 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">选择器配置</CardTitle>
                    <CardDescription>
                      按优先级排序，系统会依次尝试每个选择器直到成功。点击"可视化选择"可在目标页面中点击元素自动生成选择器。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SelectorConfigPanel
                      config={selectedConfig}
                      selectorTypes={selectorTypes}
                      onUpdateConfig={updateConfig}
                      onSave={saveConfig}
                      onReset={() => resetPlatformToDefault(selectedConfig.platform)}
                      onTest={testConfig}
                      isSaving={saving}
                      isTesting={testing}
                    />
                  </CardContent>
                </Card>

                {/* 设置 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">发布设置</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">等待图片上传</Label>
                        <div className="mt-1">{selectedConfig.settings.waitForImageUpload ? '是' : '否'}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">图片上传等待</Label>
                        <div className="mt-1">{selectedConfig.settings.imageUploadWait}ms</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">发布等待</Label>
                        <div className="mt-1">{selectedConfig.settings.publishWait}ms</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">页面加载等待</Label>
                        <div className="mt-1">{selectedConfig.settings.pageLoadWait}ms</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">重试次数</Label>
                        <div className="mt-1">{selectedConfig.settings.retryCount}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">重试间隔</Label>
                        <div className="mt-1">{selectedConfig.settings.retryDelay}ms</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>请选择一个平台查看配置</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 添加平台对话框 */}
        <Dialog open={addPlatformDialogOpen} onOpenChange={setAddPlatformDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加平台配置</DialogTitle>
              <DialogDescription>
                添加新的平台选择器配置
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>平台标识</Label>
                <Input
                  value={newPlatform.platform}
                  onChange={(e) => setNewPlatform({ ...newPlatform, platform: e.target.value })}
                  placeholder="例如: toutiao, xiaohongshu"
                />
              </div>
              <div>
                <Label>平台名称</Label>
                <Input
                  value={newPlatform.platformName}
                  onChange={(e) => setNewPlatform({ ...newPlatform, platformName: e.target.value })}
                  placeholder="例如: 今日头条"
                />
              </div>
              <div>
                <Label>发布页面URL</Label>
                <Input
                  value={newPlatform.publishUrl}
                  onChange={(e) => setNewPlatform({ ...newPlatform, publishUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddPlatformDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={addPlatform} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

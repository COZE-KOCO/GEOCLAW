'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, X, Shuffle, Scale, Pin, Check } from 'lucide-react';
import type { ModuleProps } from '../types';
import { AVAILABLE_MODELS, type ModelSelectionMode as ModelSelectionModeType } from '@/lib/types/generation-config';

// 模型类型定义
interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: string;
  warning?: string;
}

// 选择模式选项
const selectionModes = [
  {
    value: 'fixed' as ModelSelectionModeType,
    label: '固定模型',
    description: '始终使用同一模型生成',
    icon: Pin,
  },
  {
    value: 'random' as ModelSelectionModeType,
    label: '随机选择',
    description: '从模型池中随机选择',
    icon: Shuffle,
  },
  {
    value: 'weighted' as ModelSelectionModeType,
    label: '加权选择',
    description: '按权重比例随机选择',
    icon: Scale,
  },
];

/**
 * 模型选择模式配置模块
 * 
 * 包含：
 * - 选择模式（固定/随机/加权）
 * - 模型池配置（随机/加权模式）
 * - 权重配置（加权模式）
 */
export function ModelSelectionMode({ 
  config, 
  onChange, 
  disabled 
}: ModuleProps) {
  const currentMode = config.modelSelectionMode || 'fixed';
  const modelPool = config.modelPool || [];
  const modelWeights = config.modelWeights || {};

  // 按提供商分组
  const groupedModels = AVAILABLE_MODELS.reduce<Record<string, readonly ModelInfo[]>>((acc, model) => {
    const provider = model.provider || 'other';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider] = [...acc[provider], model as ModelInfo];
    return acc;
  }, {});

  // 添加模型到池
  const addModelToPool = (modelId: string) => {
    if (!modelPool.includes(modelId)) {
      onChange('modelPool', [...modelPool, modelId]);
    }
  };

  // 从池中移除模型
  const removeModelFromPool = (modelId: string) => {
    const newPool = modelPool.filter(id => id !== modelId);
    onChange('modelPool', newPool);
    // 同时移除权重
    const newWeights = { ...modelWeights };
    delete newWeights[modelId];
    onChange('modelWeights', newWeights);
  };

  // 更新权重
  const updateWeight = (modelId: string, weight: number) => {
    onChange('modelWeights', {
      ...modelWeights,
      [modelId]: weight,
    });
  };

  // 获取模型信息
  const getModelInfo = (modelId: string): ModelInfo | undefined => {
    return AVAILABLE_MODELS.find(m => m.id === modelId) as ModelInfo | undefined;
  };

  return (
    <div className="space-y-6">
      {/* 选择模式 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">模型选择模式</Label>
        <p className="text-sm text-muted-foreground">
          选择如何为每篇文章分配模型
        </p>
        
        <div className="grid gap-3">
          {selectionModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = currentMode === mode.value;
            
            return (
              <div
                key={mode.value}
                onClick={() => !disabled && onChange('modelSelectionMode', mode.value)}
                className={`
                  relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                  ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{mode.label}</span>
                    {isSelected && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        已选择
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                </div>
                
                {isSelected && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 固定模式：模型选择 */}
      {currentMode === 'fixed' && (
        <div className="space-y-2">
          <Label>选择模型</Label>
          <Select
            value={config.model}
            onValueChange={(v) => onChange('model', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择AI模型" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {provider}
                  </div>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <span>{model.name}</span>
                        {model.warning && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            {model.warning}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 随机/加权模式：模型池配置 */}
      {(currentMode === 'random' || currentMode === 'weighted') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>模型池</Label>
              <p className="text-xs text-muted-foreground mt-1">
                添加多个模型到池中，系统将{currentMode === 'random' ? '随机' : '按权重'}选择
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加模型
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                {Object.entries(groupedModels).map(([provider, models], groupIndex) => {
                  const availableModels = models.filter(m => !modelPool.includes(m.id));
                  if (availableModels.length === 0) return null;
                  
                  return (
                    <div key={provider}>
                      {groupIndex > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {provider}
                      </DropdownMenuLabel>
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => addModelToPool(model.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            {model.warning && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 ml-2">
                                {model.warning}
                              </Badge>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  );
                })}
                {Object.values(groupedModels).every(models => 
                  models.every(m => modelPool.includes(m.id))
                ) && (
                  <DropdownMenuItem disabled>
                    所有模型已添加
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 已添加的模型列表 */}
          {modelPool.length > 0 ? (
            <div className="space-y-2">
              {modelPool.map((modelId) => {
                const modelInfo = getModelInfo(modelId);
                if (!modelInfo) return null;

                return (
                  <div
                    key={modelId}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{modelInfo.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {modelInfo.provider}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {modelInfo.description}
                      </p>
                    </div>

                    {/* 加权模式：显示权重输入 */}
                    {currentMode === 'weighted' && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">权重:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={modelWeights[modelId] || 50}
                          onChange={(e) => updateWeight(modelId, parseInt(e.target.value) || 50)}
                          className="w-20 h-8"
                          disabled={disabled}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeModelFromPool(modelId)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">尚未添加模型</p>
              <p className="text-xs mt-1">点击上方"添加模型"按钮选择模型</p>
            </div>
          )}

          {/* 加权模式：权重总和提示 */}
          {currentMode === 'weighted' && modelPool.length > 0 && (
            <div className="text-xs text-muted-foreground">
              权重总和: {Object.values(modelWeights).reduce((sum, w) => sum + w, 0)}%
              {Object.values(modelWeights).reduce((sum, w) => sum + w, 0) !== 100 && (
                <span className="text-amber-600 ml-2">(建议总和为100%)</span>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {currentMode === 'fixed' 
          ? '所有文章将使用同一模型生成'
          : currentMode === 'random'
          ? '每篇文章将从模型池中随机选择一个模型，增加内容多样性'
          : '每篇文章将按权重比例随机选择模型，权重越高被选中概率越大'
        }
      </p>
    </div>
  );
}

'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { ModuleProps } from '../types';
import { AVAILABLE_MODELS } from '@/lib/types/generation-config';

// 模型类型定义
interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: string;
  warning?: string;
}

// 提供商中文名
const providerNames: Record<string, string> = {
  doubao: '豆包',
  deepseek: 'DeepSeek',
  kimi: 'Kimi',
  glm: '智谱',
  other: '其他',
};

/**
 * 生成模型选择模块
 * 
 * 包含：
 * - AI模型选择
 * - 模型说明
 * - 警告提示
 */
export function ModelSelector({ 
  config, 
  onChange, 
  disabled 
}: ModuleProps) {
  // 按提供商分组
  const groupedModels = AVAILABLE_MODELS.reduce<Record<string, readonly ModelInfo[]>>((acc, model) => {
    const provider = model.provider || 'other';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider] = [...acc[provider], model as ModelInfo];
    return acc;
  }, {});

  // 当前选中的模型
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === config.model) as ModelInfo | undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>AI生成模型</Label>
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
                  {providerNames[provider] || provider}
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

      {/* 模型说明 */}
      {selectedModel && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="font-medium text-sm">{selectedModel.name}</span>
            <span className="text-sm text-muted-foreground">- {selectedModel.description}</span>
          </div>
          {selectedModel.warning && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{selectedModel.warning}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        选择用于内容生成的AI模型，不同模型生成的质量和速度有所差异
      </p>
    </div>
  );
}

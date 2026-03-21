'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ModuleProps } from '../types';
import type { GenerationConfig } from '@/lib/types/generation-config';

/**
 * 内容格式模块
 * 
 * 包含：
 * - 粗体
 * - 斜体
 * - 表格
 * - 引文
 */
export function ContentFormat({ config, onChange, disabled }: ModuleProps) {
  const formatOptions = [
    { key: 'enableBold', label: '粗体', desc: '我们会在您的文章中加粗重要的关键词' },
    { key: 'enableItalic', label: '斜体', desc: '在你的文章中，我们将用斜体来做一些简单的强调' },
    { key: 'enableTable', label: '表格', desc: '如果合适，我们将在您的文章中包括表格' },
    { key: 'enableQuote', label: '引文', desc: '我们会在合适的地方,加一些引用提示或者推荐内容' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {formatOptions.map((item) => (
          <div key={item.key} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>{item.label}</Label>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
            <Switch
              checked={config[item.key as keyof GenerationConfig] as boolean}
              onCheckedChange={(v) => onChange(item.key as keyof GenerationConfig, v)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

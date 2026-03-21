'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModuleProps } from '../types';
import type { GenerationConfig } from '@/lib/types/generation-config';

/**
 * 文章结构模块
 * 
 * 包含：
 * - 引导点击URL
 * - 内容概要
 * - 结论总结
 * - 常见问题
 * - 文章大小
 * - 自动设置标题
 * - 自定义标题
 */
export function ArticleStructure({ config, onChange, disabled }: ModuleProps) {
  const structureOptions = [
    { key: 'enableSummary', label: '内容概要', desc: '我们将在每篇文章的开头添加这一部分' },
    { key: 'enableConclusion', label: '结论总结', desc: '我们将在每篇文章的结尾添加这一部分' },
    { key: 'enableFaq', label: '常见问题', desc: '我们将在每篇文章的结尾添加这一部分' },
  ];

  return (
    <div className="space-y-4">
      {/* 引导点击 */}
      <div className="space-y-2">
        <Label>引导点击</Label>
        <Input
          placeholder="http://mywebsite.com/"
          value={config.ctaUrl}
          onChange={(e) => onChange('ctaUrl', e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          我们将在您的文章中添加额外的h3,并引导用户点击这个链接，比如"请点击这里"
        </p>
      </div>

      {/* 结构选项 */}
      <div className="grid grid-cols-3 gap-4">
        {structureOptions.map((item) => (
          <div key={item.key} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm">{item.label}</Label>
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

      {/* 文章大小 */}
      <div className="space-y-2">
        <Label>文章大小</Label>
        <Select
          value={config.articleSize}
          onValueChange={(v) => onChange('articleSize', v as 'short' | 'medium' | 'long' | 'custom')}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short">小 (3-5个小标题)</SelectItem>
            <SelectItem value="medium">中 (5-8个小标题)</SelectItem>
            <SelectItem value="long">大 (8-12个小标题)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 自动设置标题 */}
      <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <Label>自动设置标题</Label>
          <p className="text-xs text-gray-500 mt-1">开启后可自定义标题模板</p>
        </div>
        <Switch
          checked={config.enableAutoTitle}
          onCheckedChange={(v) => onChange('enableAutoTitle', v)}
          disabled={disabled}
        />
      </div>

      {/* 自定义标题 */}
      {config.enableAutoTitle && (
        <div className="space-y-2">
          <Label>标题</Label>
          <Input
            placeholder="输入自定义标题模板"
            value={config.customTitle}
            onChange={(e) => onChange('customTitle', e.target.value)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

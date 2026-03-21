'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Replace } from 'lucide-react';
import type { ModuleProps } from '../types';
import type { ReplacementRule } from '@/lib/types/generation-config';

/**
 * 全文替换模块
 * 
 * 包含：
 * - 查找和替换规则列表
 * - 添加/删除规则
 */
export function ReplacementSettings({ config, onChange, disabled }: ModuleProps) {
  const addReplacement = () => {
    onChange('replacements', [...config.replacements, { find: '', replace: '' }]);
  };

  const updateReplacement = (index: number, field: 'find' | 'replace', value: string) => {
    const newReplacements = [...config.replacements];
    newReplacements[index] = { ...newReplacements[index], [field]: value };
    onChange('replacements', newReplacements);
  };

  const removeReplacement = (index: number) => {
    const newReplacements = config.replacements.filter((_, i) => i !== index);
    onChange('replacements', newReplacements);
  };

  return (
    <div className="space-y-4">
      {config.replacements.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="查找"
            value={item.find}
            onChange={(e) => updateReplacement(index, 'find', e.target.value)}
            disabled={disabled}
          />
          <Replace className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="替换"
            value={item.replace}
            onChange={(e) => updateReplacement(index, 'replace', e.target.value)}
            disabled={disabled}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeReplacement(index)}
            disabled={disabled}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addReplacement}
        disabled={disabled}
      >
        + 添加
      </Button>
      {config.replacements.length === 0 && (
        <p className="text-xs text-gray-500">
          添加查找替换规则，可以在生成后自动替换文章中的内容
        </p>
      )}
    </div>
  );
}

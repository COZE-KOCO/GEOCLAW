'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { ModuleProps } from '../types';
import type { ExternalLink } from '@/lib/types/generation-config';

/**
 * 外部链接模块
 * 
 * 包含：
 * - 外部链接列表（URL + 锚文本）
 * - 自动外部链接开关
 */
export function ExternalLinks({ config, onChange, disabled }: ModuleProps) {
  const addLink = () => {
    onChange('externalLinks', [...config.externalLinks, { url: '', anchor: '' }]);
  };

  const updateLink = (index: number, field: 'url' | 'anchor', value: string) => {
    const newLinks = [...config.externalLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange('externalLinks', newLinks);
  };

  const removeLink = (index: number) => {
    const newLinks = config.externalLinks.filter((_, i) => i !== index);
    onChange('externalLinks', newLinks);
  };

  return (
    <div className="space-y-4">
      {/* 额外链接 */}
      <div className="space-y-2">
        <Label>额外链接</Label>
        {config.externalLinks.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="URL"
              value={link.url}
              onChange={(e) => updateLink(index, 'url', e.target.value)}
              className="flex-1"
              disabled={disabled}
            />
            <Input
              placeholder="锚文本"
              value={link.anchor}
              onChange={(e) => updateLink(index, 'anchor', e.target.value)}
              className="w-32"
              disabled={disabled}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeLink(index)}
              disabled={disabled}
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={addLink}
          disabled={disabled}
        >
          + 添加链接
        </Button>
        <p className="text-xs text-gray-500">
          我们将随机选择每个段落最多1个链接
        </p>
      </div>

      {/* 自动外部链接 */}
      <div className="flex items-center justify-between">
        <div>
          <Label>自动外部链接</Label>
          <p className="text-xs text-gray-500 mt-1">自动搜索并插入相关的外部链接</p>
        </div>
        <Switch
          checked={config.enableAutoExternalLinks}
          onCheckedChange={(v) => onChange('enableAutoExternalLinks', v)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { ModuleProps } from '../types';

/**
 * 内部链接模块
 * 
 * 包含：
 * - 网站地图URL列表
 * - 过滤模式
 * - 排除模式
 * - 每个H2部分内链数量
 */
export function InternalLinks({ config, onChange, disabled }: ModuleProps) {
  const addSitemap = () => {
    onChange('sitemaps', [...config.sitemaps, '']);
  };

  const updateSitemap = (index: number, value: string) => {
    const newSitemaps = [...config.sitemaps];
    newSitemaps[index] = value;
    onChange('sitemaps', newSitemaps);
  };

  const removeSitemap = (index: number) => {
    const newSitemaps = config.sitemaps.filter((_, i) => i !== index);
    onChange('sitemaps', newSitemaps);
  };

  return (
    <div className="space-y-4">
      {/* 网站地图 */}
      <div className="space-y-2">
        <Label>网站地图</Label>
        {config.sitemaps.map((sitemap, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="https://example.com/sitemap.xml"
              value={sitemap}
              onChange={(e) => updateSitemap(index, e.target.value)}
              disabled={disabled}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeSitemap(index)}
              disabled={disabled}
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={addSitemap}
          disabled={disabled}
        >
          + 添加站点地图
        </Button>
      </div>

      {/* 过滤和排除模式 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>过滤模式</Label>
          <Input
            placeholder="包含的URL模式"
            value={config.filterMode}
            onChange={(e) => onChange('filterMode', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>排除模式</Label>
          <Input
            placeholder="排除的URL模式"
            value={config.excludeMode}
            onChange={(e) => onChange('excludeMode', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 测试和预览 */}
      <Button variant="outline" size="sm" disabled={disabled}>
        测试和预览链接
      </Button>

      {/* 每个H2部分内链数量 */}
      <div className="space-y-2">
        <Label>每个H2部分内链的数量</Label>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">没有链接</span>
          <Slider
            value={[config.internalLinksPerH2]}
            onValueChange={([v]) => onChange('internalLinksPerH2', v)}
            max={6}
            className="flex-1"
            disabled={disabled}
          />
          <span className="text-xs text-gray-500">每个H2最多6个链接</span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModuleProps } from '../types';
import type { GenerationConfig } from '@/lib/types/generation-config';

/** 图片来源选项 */
const IMAGE_SOURCE_OPTIONS = [
  { value: 'stock', label: '素材库图片', description: '从素材库随机选择图片' },
  { value: 'ai', label: 'AI生成图片', description: '使用AI生成配图' },
  { value: 'upload', label: '本地上传', description: '使用已上传的图片' },
  { value: 'none', label: '不使用图片', description: '文章不包含配图' },
];

/** 素材库图片类型过滤选项 */
const IMAGE_FILTER_OPTIONS = [
  { value: 'all', label: '全部（不限制类型）' },
  { value: 'nature', label: '自然风景' },
  { value: 'business', label: '商业办公' },
  { value: 'technology', label: '科技数码' },
  { value: 'people', label: '人物' },
  { value: 'food', label: '美食餐饮' },
  { value: 'travel', label: '旅游度假' },
  { value: 'education', label: '教育培训' },
  { value: 'health', label: '健康医疗' },
  { value: 'finance', label: '金融财务' },
  { value: 'lifestyle', label: '生活方式' },
];

/**
 * 图片设置模块
 * 
 * 包含：
 * - 图片来源选择（素材库/AI生成/本地上传/不使用）
 * - 素材库过滤（按类型筛选）
 * - 图片数量
 */
export function ImageSettings({ config, onChange, disabled }: ModuleProps) {
  // 根据图片来源自动设置相关配置
  const handleImageSourceChange = (value: string) => {
    const source = value as GenerationConfig['imageSource'];
    onChange('imageSource', source);
    
    // 如果选择不使用图片，自动关闭缩略图和内容配图
    if (source === 'none') {
      onChange('enableThumbnail', false);
      onChange('enableContentImages', false);
    } else {
      // 其他选项默认开启缩略图和内容配图
      onChange('enableThumbnail', true);
      onChange('enableContentImages', true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 图片来源 */}
      <div className="space-y-2">
        <Label>图片(插图)来源</Label>
        <Select
          value={config.imageSource || 'stock'}
          onValueChange={handleImageSourceChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择图片来源" />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_SOURCE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {config.imageSource && config.imageSource !== 'none' && (
          <p className="text-xs text-gray-500">
            {IMAGE_SOURCE_OPTIONS.find(o => o.value === config.imageSource)?.description}
          </p>
        )}
      </div>

      {/* 素材库过滤 - 仅在选择素材库图片时显示 */}
      {config.imageSource === 'stock' && (
        <div className="space-y-2">
          <Label>过滤素材库图像</Label>
          <Select
            value={config.imageFilter || 'all'}
            onValueChange={(v) => onChange('imageFilter', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择图片类型" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_FILTER_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">从素材库里面随机选择</p>
        </div>
      )}

      {/* AI生成图片提示 */}
      {config.imageSource === 'ai' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            AI将根据文章内容自动生成配图，生成时间可能较长。
          </p>
        </div>
      )}

      {/* 本地上传提示 */}
      {config.imageSource === 'upload' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            请在发布前上传图片素材，系统将从已上传的图片中随机选择。
          </p>
        </div>
      )}

      {/* 图片数量 - 仅在需要图片时显示 */}
      {config.imageSource && config.imageSource !== 'none' && (
        <div className="space-y-2">
          <Label>图片数量</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={config.imageCount || 3}
            onChange={(e) => onChange('imageCount', parseInt(e.target.value) || 3)}
            disabled={disabled}
          />
          <p className="text-xs text-gray-500">
            文章中插入的图片数量（不包含缩略图）
          </p>
        </div>
      )}
    </div>
  );
}

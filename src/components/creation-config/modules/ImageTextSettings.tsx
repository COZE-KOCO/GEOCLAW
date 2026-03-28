'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModuleProps } from '../types';

/** 目标平台选项 */
const TARGET_PLATFORMS = [
  { 
    value: 'xiaohongshu', 
    label: '小红书', 
    icon: '📕',
    description: '种草分享、生活方式',
    maxTitle: 20,
    maxContent: 1000,
  },
  { 
    value: 'douyin', 
    label: '抖音', 
    icon: '🎵',
    description: '短视频平台图文内容',
    maxTitle: 55,
    maxContent: 500,
  },
];

/** Emoji密度选项 */
const EMOJI_DENSITY_OPTIONS = [
  { value: 'none', label: '不使用', description: '纯文本，无emoji' },
  { value: 'low', label: '少量', description: '偶尔使用，点睛之笔' },
  { value: 'medium', label: '适中', description: '每段1-2个emoji' },
  { value: 'high', label: '丰富', description: '频繁使用，活泼生动' },
];

/** 段落风格选项 */
const PARAGRAPH_STYLE_OPTIONS = [
  { value: 'short', label: '短句优先', description: '每句10-20字，适合移动端阅读' },
  { value: 'medium', label: '中长句', description: '每句20-40字，信息量适中' },
];

/**
 * 图文笔记专属设置模块
 * 
 * 仅在 mode="image-text" 时使用
 * 包含：
 * - 目标发布平台（小红书/抖音）
 * - Emoji密度
 * - 话题标签数量
 * - 段落风格
 * - 开头钩子
 * - 结尾引导
 */
export function ImageTextSettings({ config, onChange, disabled }: ModuleProps) {
  // 处理平台选择（单选，切换时更新）
  const handlePlatformChange = (platform: string) => {
    // 单选模式：选择后替换
    onChange('targetPlatforms', [platform]);
  };

  // 当前选中的平台
  const selectedPlatform = config.targetPlatforms?.[0] || '';
  
  // 获取平台信息
  const platformInfo = TARGET_PLATFORMS.find(p => p.value === selectedPlatform);

  return (
    <div className="space-y-5">
      {/* 目标发布平台 */}
      <div className="space-y-3">
        <Label>目标发布平台</Label>
        <div className="grid grid-cols-2 gap-3">
          {TARGET_PLATFORMS.map(platform => (
            <button
              key={platform.value}
              type="button"
              onClick={() => handlePlatformChange(platform.value)}
              disabled={disabled}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${selectedPlatform === platform.value 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{platform.icon}</span>
                <span className="font-medium">{platform.label}</span>
              </div>
              <p className="text-xs text-gray-500">{platform.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                标题≤{platform.maxTitle}字 | 正文≤{platform.maxContent}字
              </p>
            </button>
          ))}
        </div>
        {!selectedPlatform && (
          <p className="text-xs text-amber-600">请选择目标平台，系统将根据平台风格生成内容</p>
        )}
      </div>

      {/* Emoji密度 */}
      <div className="space-y-2">
        <Label>Emoji表情密度</Label>
        <Select
          value={config.emojiDensity || 'medium'}
          onValueChange={(v) => onChange('emojiDensity', v as 'none' | 'low' | 'medium' | 'high')}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择emoji密度" />
          </SelectTrigger>
          <SelectContent>
            {EMOJI_DENSITY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <span>{option.label}</span>
                  <span className="text-gray-400 text-xs ml-2">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 话题标签数量 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>话题标签数量</Label>
          <span className="text-sm font-medium text-purple-600">{config.hashtagCount || 5}个</span>
        </div>
        <Slider
          value={[config.hashtagCount || 5]}
          onValueChange={([v]) => onChange('hashtagCount', v)}
          min={3}
          max={10}
          step={1}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">自动生成相关话题标签，如 #好物推荐 #测评分享</p>
      </div>

      {/* 段落风格 */}
      <div className="space-y-2">
        <Label>段落风格</Label>
        <Select
          value={config.paragraphStyle || 'short'}
          onValueChange={(v) => onChange('paragraphStyle', v as 'short' | 'medium')}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择段落风格" />
          </SelectTrigger>
          <SelectContent>
            {PARAGRAPH_STYLE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <span>{option.label}</span>
                  <span className="text-gray-400 text-xs ml-2">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 开头钩子和结尾引导 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <Label className="text-sm">开头钩子</Label>
            <p className="text-xs text-gray-500 mt-1">吸引注意力的开场</p>
          </div>
          <Switch
            checked={config.enableHook ?? true}
            onCheckedChange={(v) => onChange('enableHook', v)}
            disabled={disabled}
          />
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <Label className="text-sm">结尾引导</Label>
            <p className="text-xs text-gray-500 mt-1">引导互动和关注</p>
          </div>
          <Switch
            checked={config.enableCTA ?? true}
            onCheckedChange={(v) => onChange('enableCTA', v)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 平台风格提示 */}
      {selectedPlatform && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            <strong>{platformInfo?.label}风格提示：</strong>
            {selectedPlatform === 'xiaohongshu' && (
              <> 真实亲切、种草感强、多用emoji、话题标签明确</>
            )}
            {selectedPlatform === 'douyin' && (
              <> 轻松有趣、节奏感强、口语化表达、引导互动</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

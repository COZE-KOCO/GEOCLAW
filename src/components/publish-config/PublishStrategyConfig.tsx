'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Clock, Plus, X, Radio, Share2 } from 'lucide-react';
import type { ArticleDistributionStrategy } from '@/lib/creation-plan-store';

interface PublishStrategyConfigProps {
  value: {
    autoPublish: boolean;
    publishDelay: number;
    publishStrategy: 'immediate' | 'scheduled' | 'distributed';
    publishTimeSlots: string[];
    articleDistribution: ArticleDistributionStrategy;
  };
  onChange: (value: PublishStrategyConfigProps['value']) => void;
  disabled?: boolean;
  accountCount?: number;  // 已选账号数量，用于显示提示
}

const strategyOptions = [
  { 
    value: 'immediate', 
    label: '立即发布', 
    description: '创作完成后立即发布' 
  },
  { 
    value: 'scheduled', 
    label: '定时发布', 
    description: '在指定时间发布' 
  },
  { 
    value: 'distributed', 
    label: '分散发布', 
    description: '在多个时间段分散发布，避免集中' 
  },
];

const distributionOptions = [
  { 
    value: 'broadcast', 
    label: '广播模式', 
    description: '每篇文章发布到所有账号',
    icon: Radio,
    example: '例：10篇文章 × 3账号 = 30次发布'
  },
  { 
    value: 'distribute', 
    label: '分发模式', 
    description: '每篇文章只发布到一个账号，轮换分配',
    icon: Share2,
    example: '例：10篇文章 × 3账号 = 10次发布（每账号约3-4篇）'
  },
];

/**
 * 发布策略配置组件
 * 
 * 包含两部分：
 * 1. 发布时间策略：immediate/scheduled/distributed
 * 2. 文章分发策略：broadcast/distribute
 */
export function PublishStrategyConfig({
  value,
  onChange,
  disabled,
  accountCount = 0,
}: PublishStrategyConfigProps) {
  // 添加时间段
  const addTimeSlot = () => {
    onChange({
      ...value,
      publishTimeSlots: [...value.publishTimeSlots, '09:00'],
    });
  };

  // 删除时间段
  const removeTimeSlot = (index: number) => {
    onChange({
      ...value,
      publishTimeSlots: value.publishTimeSlots.filter((_, i) => i !== index),
    });
  };

  // 更新时间段
  const updateTimeSlot = (index: number, time: string) => {
    const newSlots = [...value.publishTimeSlots];
    newSlots[index] = time;
    onChange({
      ...value,
      publishTimeSlots: newSlots,
    });
  };

  return (
    <div className="space-y-6">
      {/* 文章分发策略 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">文章分发策略</Label>
        <p className="text-sm text-muted-foreground">
          决定文章如何分配到各账号
        </p>
        
        <div className="grid gap-3">
          {distributionOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = value.articleDistribution === option.value;
            
            return (
              <div
                key={option.value}
                onClick={() => !disabled && onChange({ 
                  ...value, 
                  articleDistribution: option.value as ArticleDistributionStrategy 
                })}
                className={`
                  relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                  ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {isSelected && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                        已选择
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {option.example}
                  </p>
                </div>
                
                {isSelected && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
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
        
        {accountCount > 1 && value.articleDistribution === 'broadcast' && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            广播模式下，每篇文章将发布到所有 {accountCount} 个账号
          </p>
        )}
      </div>

      {/* 分隔线 */}
      <div className="border-t" />

      {/* 发布时间策略 */}
      <div className="space-y-3">
        <Label className="text-base font-medium">发布时间策略</Label>
        <p className="text-sm text-muted-foreground">
          决定文章发布的时机
        </p>
        
        <Select
          value={value.publishStrategy}
          onValueChange={(v: 'immediate' | 'scheduled' | 'distributed') => 
            onChange({ ...value, publishStrategy: v })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {strategyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {option.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 发布延迟（立即发布模式） */}
      {value.publishStrategy === 'immediate' && (
        <div className="space-y-2">
          <Label>发布延迟（分钟）</Label>
          <Input
            type="number"
            min={0}
            max={60}
            value={value.publishDelay}
            onChange={(e) => 
              onChange({ 
                ...value, 
                publishDelay: parseInt(e.target.value) || 0 
              })
            }
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            创作完成后等待指定时间再发布，避免频率过高
          </p>
        </div>
      )}

      {/* 发布时间段（分散发布模式） */}
      {value.publishStrategy === 'distributed' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>发布时间段</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTimeSlot}
              disabled={disabled || value.publishTimeSlots.length >= 10}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加时段
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {value.publishTimeSlots.map((slot, index) => (
              <div key={index} className="flex items-center gap-1">
                <div className="relative">
                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={slot}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    className="pl-8 w-28"
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeTimeSlot(index)}
                  disabled={disabled || value.publishTimeSlots.length <= 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground">
            系统将在此时间段内随机选择时间发布，避免集中发布被平台检测
          </p>
        </div>
      )}

      {/* 定时发布模式 */}
      {value.publishStrategy === 'scheduled' && (
        <div className="space-y-2">
          <Label>发布时间</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={value.publishTimeSlots[0] || '09:00'}
              onChange={(e) => 
                onChange({ 
                  ...value, 
                  publishTimeSlots: [e.target.value] 
                })
              }
              className="pl-9"
              disabled={disabled}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            所有内容将在指定时间统一发布
          </p>
        </div>
      )}
    </div>
  );
}

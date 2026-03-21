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
import { Clock, Plus, X } from 'lucide-react';

interface PublishStrategyConfigProps {
  value: {
    autoPublish: boolean;
    publishDelay: number;
    publishStrategy: 'immediate' | 'scheduled' | 'distributed';
    publishTimeSlots: string[];
  };
  onChange: (value: PublishStrategyConfigProps['value']) => void;
  disabled?: boolean;
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

/**
 * 发布策略配置组件
 */
export function PublishStrategyConfig({
  value,
  onChange,
  disabled,
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
    <div className="space-y-4">
      {/* 发布策略选择 */}
      <div className="space-y-2">
        <Label>发布策略</Label>
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

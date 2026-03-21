'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ModuleProps } from '../types';
import type { GenerationConfig, ArticleTypeDistribution } from '@/lib/types/generation-config';

/**
 * 创作类型模块
 * 
 * 包含：
 * - 文章类型分布配置（什么是/如何/TOP排行/常规类型）
 * - TOP排行设置（产品名称、介绍、排名展现、竞品）
 */
export function ArticleTypeModule({ config, onChange, disabled }: ModuleProps) {
  const articleTypes = [
    { id: 'what', label: '什么是(What)', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { id: 'how', label: '如何(How)', color: 'text-green-600', bgColor: 'bg-green-100' },
    { id: 'top', label: 'TOP排行', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ];

  const distribution = config.articleTypeDistribution;
  
  // 计算常规类型占比（自动计算）
  const manualTotal = distribution.what + distribution.how + distribution.top;
  const normalRatio = Math.max(0, 100 - manualTotal);
  
  // 判断是否有效（总和不超过100%）
  const isValid = manualTotal <= 100;
  const remaining = 100 - manualTotal;

  // 更新某个类型的占比（仅用于 what/how/top）
  const updateDistribution = (type: 'what' | 'how' | 'top', value: number) => {
    // 计算其他两个类型的总和
    const otherTypes = ['what', 'how', 'top'].filter(t => t !== type) as ('what' | 'how' | 'top')[];
    const otherTotal = otherTypes.reduce((sum, t) => sum + distribution[t], 0);
    
    // 限制最大值，确保不超过 100%
    const maxValue = 100 - otherTotal;
    const clampedValue = Math.min(value, maxValue);
    
    const newDistribution: ArticleTypeDistribution = {
      ...distribution,
      [type]: clampedValue,
      normal: Math.max(0, 100 - clampedValue - otherTotal),
    };
    
    onChange('articleTypeDistribution', newDistribution);
  };

  // 自动均衡（将非零类型平均分配）
  const autoBalance = () => {
    // 默认四种类型各 25%
    const newDistribution: ArticleTypeDistribution = {
      what: 25,
      how: 25,
      top: 25,
      normal: 25,
    };
    onChange('articleTypeDistribution', newDistribution);
  };

  // 全部设为常规类型
  const allNormal = () => {
    onChange('articleTypeDistribution', {
      what: 0,
      how: 0,
      top: 0,
      normal: 100,
    });
  };

  return (
    <div className="space-y-4">
      {/* 类型分布配置 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>文章类型分布</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={autoBalance}
              disabled={disabled}
            >
              平均分配
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={allNormal}
              disabled={disabled}
            >
              全部常规
            </Button>
          </div>
        </div>

        {/* 可配置类型占比卡片 */}
        <div className="grid grid-cols-3 gap-3">
          {articleTypes.map((type) => {
            const value = distribution[type.id as keyof ArticleTypeDistribution];
            // 计算其他两个类型的总和，用于限制最大值
            const otherTypes = articleTypes.filter(t => t.id !== type.id);
            const otherTotal = otherTypes.reduce((sum, t) => sum + distribution[t.id as keyof ArticleTypeDistribution], 0);
            const maxValue = 100 - otherTotal;
            
            return (
              <div
                key={type.id}
                className={cn(
                  'p-3 rounded-lg border-2 transition-colors',
                  value > 0 ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('font-medium text-sm', type.color)}>{type.label}</span>
                  <span className="text-lg font-bold">{value}%</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => updateDistribution(type.id as 'what' | 'how' | 'top', v)}
                  max={maxValue}
                  step={5}
                  disabled={disabled}
                />
                <p className="text-xs text-gray-400 mt-1">最大 {maxValue}%</p>
              </div>
            );
          })}
        </div>

        {/* 常规类型（自动计算，只读显示） */}
        <div className="p-3 rounded-lg border-2 border-gray-300 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-600">常规类型</span>
              <span className="text-xs text-gray-400 ml-2">(自动计算)</span>
            </div>
            <span className="text-lg font-bold text-gray-600">{normalRatio}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            剩余比例自动分配给常规类型
          </p>
        </div>

        {/* 总计提示 */}
        <div className={cn(
          'flex items-center justify-between p-2 rounded text-sm',
          isValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          <span>
            已分配: {manualTotal}% | 常规类型: {normalRatio}%
          </span>
          {isValid ? (
            <span>✓ 配置有效</span>
          ) : (
            <span>⚠ 总和超过 100%</span>
          )}
        </div>
      </div>

      {/* 类型说明 */}
      {distribution.what > 0 && (
        <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
          <strong>什么是(What):</strong> 根据创作文章的条件，来解释"什么是……"，比如说创作的规则中，包含了"物业管理系统"的关键词，创作的文章将会解释一下什么是物业管理系统。
        </p>
      )}

      {distribution.how > 0 && (
        <p className="text-sm text-gray-600 bg-green-50 p-3 rounded border border-green-200">
          <strong>如何(How):</strong> 根据创作文章的条件，来解释"如何……"，比如说创作的规则中，包含了"减肥"的关键词，创作的文章将会解释一下如何让自己快速减肥。
        </p>
      )}

      {/* TOP排行设置 */}
      {distribution.top > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-orange-600 font-medium">TOP排行设置</Label>
          
          <div className="space-y-2">
            <Label>产品名称</Label>
            <Input
              placeholder="请输入产品名称"
              value={config.productName}
              onChange={(e) => onChange('productName', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>产品介绍</Label>
            <Textarea
              placeholder="请输入产品介绍"
              value={config.productDescription}
              onChange={(e) => onChange('productDescription', e.target.value)}
              rows={3}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>排名展现</Label>
            <Select
              value={config.rankingDisplay}
              onValueChange={(v) => onChange('rankingDisplay', v as GenerationConfig['rankingDisplay'])}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">全部随机</SelectItem>
                <SelectItem value="sequential">顺序排列</SelectItem>
                <SelectItem value="reverse">倒序排列</SelectItem>
                <SelectItem value="grouped">分组展示</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>竞品有哪些(多行,每行一个)</Label>
            <Textarea
              placeholder="请输入竞品名称，每行一个"
              value={config.competitors}
              onChange={(e) => onChange('competitors', e.target.value)}
              rows={4}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

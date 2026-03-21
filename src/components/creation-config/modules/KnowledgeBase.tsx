'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModuleProps } from '../types';

/**
 * 知识库模块
 * 
 * 包含：
 * - 联网搜索开关
 * - 知识库选择
 */
export function KnowledgeBaseModule({ config, onChange, disabled }: ModuleProps) {
  return (
    <div className="space-y-4">
      {/* 联网搜索 */}
      <div className="flex items-center justify-between">
        <div>
          <Label>连接到网络</Label>
          <p className="text-xs text-gray-500 mt-1">联网搜索最新内容辅助生成</p>
        </div>
        <Switch
          checked={config.enableWebSearch}
          onCheckedChange={(v) => onChange('enableWebSearch', v)}
          disabled={disabled}
        />
      </div>

      {/* 知识库选择 */}
      <div className="space-y-2">
        <Label>知识库</Label>
        <div className="flex items-center gap-2">
          <Select
            value={config.knowledgeBaseId || ''}
            onValueChange={(v) => onChange('knowledgeBaseId', v)}
            disabled={disabled}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="没有具体知识库" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kb1">产品知识库</SelectItem>
              <SelectItem value="kb2">行业知识库</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={disabled}>
            + 创建知识库
          </Button>
        </div>
        <p className="text-xs text-gray-500">我们将在知识库的基础上生成内容</p>
      </div>
    </div>
  );
}

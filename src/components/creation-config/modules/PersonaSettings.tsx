'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModuleProps } from '../types';

/**
 * 拟人化设置模块
 * 
 * 包含：
 * - 拟人化风格选择
 */
export function PersonaSettings({ config, onChange, disabled }: ModuleProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>请选择拟人化设置</Label>
        <Select
          value={config.personaId || ''}
          onValueChange={(v) => onChange('personaId', v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择拟人化风格" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expert">行业专家</SelectItem>
            <SelectItem value="enthusiast">热情爱好者</SelectItem>
            <SelectItem value="teacher">教育者</SelectItem>
            <SelectItem value="storyteller">故事讲述者</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          选择拟人化风格可以让文章更具个性
        </p>
      </div>
    </div>
  );
}

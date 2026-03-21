'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { ModuleProps } from '../types';

/**
 * 固定开头结尾模块
 * 
 * 包含：
 * - 固定开头内容和开关
 * - 固定结尾内容和开关
 */
export function FixedIntroOutro({ config, onChange, disabled }: ModuleProps) {
  return (
    <div className="space-y-4">
      {/* 固定开头 */}
      <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex-1 mr-4">
          <Label>固定开头</Label>
          <Textarea
            placeholder="输入固定的开头内容"
            value={config.fixedIntro}
            onChange={(e) => onChange('fixedIntro', e.target.value)}
            rows={3}
            disabled={disabled || !config.enableFixedIntro}
          />
        </div>
        <Switch
          checked={config.enableFixedIntro}
          onCheckedChange={(v) => onChange('enableFixedIntro', v)}
          disabled={disabled}
        />
      </div>

      {/* 固定结尾 */}
      <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex-1 mr-4">
          <Label>固定结尾</Label>
          <Textarea
            placeholder="输入固定的结尾内容"
            value={config.fixedOutro}
            onChange={(e) => onChange('fixedOutro', e.target.value)}
            rows={3}
            disabled={disabled || !config.enableFixedOutro}
          />
        </div>
        <Switch
          checked={config.enableFixedOutro}
          onCheckedChange={(v) => onChange('enableFixedOutro', v)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

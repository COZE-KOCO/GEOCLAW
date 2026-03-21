'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModuleProps } from '../types';
import type { GenerationConfig } from '@/lib/types/generation-config';

/**
 * 内容要求模块
 * 
 * 包含：
 * - 语言选择
 * - 目标国家/地区
 * - 创意程度
 * - 文章语气风格
 * - 人称角度
 * - 形式
 * - 自定义指令
 * - 内容包含关键词
 */
export function ContentRequirements({ config, onChange, disabled }: ModuleProps) {
  return (
    <div className="space-y-4">
      {/* 语言和目标国家 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>语言</Label>
          <Select
            value={config.language}
            onValueChange={(v) => onChange('language', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh-CN">中文(简体)</SelectItem>
              <SelectItem value="zh-TW">中文(繁体)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>目标国家/地区</Label>
          <Select
            value={config.targetCountry}
            onValueChange={(v) => onChange('targetCountry', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CN">中国</SelectItem>
              <SelectItem value="US">美国</SelectItem>
              <SelectItem value="JP">日本</SelectItem>
              <SelectItem value="UK">英国</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">生成特定于位置的内容</p>
        </div>
      </div>

      {/* 创意程度 */}
      <div className="space-y-2">
        <Label>创意程度</Label>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">恰当的/实事求是</span>
          <Slider
            value={[config.creativityLevel]}
            onValueChange={([v]) => onChange('creativityLevel', v)}
            max={100}
            className="flex-1"
            disabled={disabled}
          />
          <span className="text-xs text-gray-500">创造性/创意独到</span>
        </div>
      </div>

      {/* 语气、人称、形式 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>文章语气风格</Label>
          <Select
            value={config.tone}
            onValueChange={(v) => onChange('tone', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neutral">中立的</SelectItem>
              <SelectItem value="humorous">幽默的</SelectItem>
              <SelectItem value="informal">非正式的</SelectItem>
              <SelectItem value="academic">学术的</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>人称角度</Label>
          <Select
            value={config.perspective}
            onValueChange={(v) => onChange('perspective', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动的</SelectItem>
              <SelectItem value="first">第一人称</SelectItem>
              <SelectItem value="second">第二人称</SelectItem>
              <SelectItem value="third">第三人称</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>形式</Label>
          <Select
            value={config.formality}
            onValueChange={(v) => onChange('formality', v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动的</SelectItem>
              <SelectItem value="formal">正式</SelectItem>
              <SelectItem value="informal">非正式</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">内容是否正式</p>
        </div>
      </div>

      {/* 自定义指令 */}
      <div className="space-y-2">
        <Label>自定义指令</Label>
        <Textarea
          placeholder="使用准确简短的生成要求指令，可以生成更优质的文章"
          value={config.customInstructions}
          onChange={(e) => onChange('customInstructions', e.target.value)}
          rows={3}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          我们将使用这些指令来生成每个段落；这些指令不影响标题；误用此功能可能会导致错误或重复的内容
        </p>
      </div>

      {/* 内容包含关键词 */}
      <div className="space-y-2">
        <Label>包括关键词 (每行1个)</Label>
        <Textarea
          placeholder="如何烘焙面包"
          value={config.contentIncludeKeywords}
          onChange={(e) => onChange('contentIncludeKeywords', e.target.value)}
          rows={3}
          disabled={disabled}
        />
        <p className="text-xs text-gray-500">
          我们会将这些关键词 <strong>强制添加</strong> 到文章中
        </p>
      </div>
    </div>
  );
}

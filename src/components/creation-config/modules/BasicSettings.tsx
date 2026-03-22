'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { ModuleProps } from '../types';
import type { GenerationConfig } from '@/lib/types/generation-config';
import type { KeywordLibrary } from '@/lib/keyword-store';

export interface BasicSettingsProps extends ModuleProps {
  keywordLibraries?: KeywordLibrary[];
}

/**
 * 基础设置模块
 * 
 * 包含：
 * - 生成方式选择（关键词/关键词库/标题/描述）
 * - 关键词输入
 * - 关键词库选择
 * - 包含关键词
 */
export function BasicSettings({ 
  config, 
  onChange, 
  disabled,
  keywordLibraries = [] 
}: BasicSettingsProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* 生成方式选择 */}
      <div className="space-y-2">
        <Label>通过什么生成</Label>
        <Select
          value={config.generateMethod}
          onValueChange={(v) => onChange('generateMethod', v as GenerationConfig['generateMethod'])}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">关键词</SelectItem>
            <SelectItem value="keyword-library">关键词库</SelectItem>
            <SelectItem value="title">标题</SelectItem>
            <SelectItem value="description">描述</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">选择通过什么方式创作文章</p>
      </div>

      {/* 关键词方式 */}
      {config.generateMethod === 'keyword' && (
        <>
          <div className="space-y-2">
            <Label>关键词 (每行一篇，每行多关键词用","分割)</Label>
            <Textarea
              placeholder="如何生成内容"
              value={config.keywords}
              onChange={(e) => {
                const value = e.target.value;
                onChange('keywords', value);
                // 自动计算行数并更新文章数量
                const lines = value.split('\n').filter(line => line.trim() !== '');
                onChange('articleCount', lines.length || 1);
              }}
              rows={4}
              disabled={disabled}
            />
            <p className="text-xs text-gray-500">
              我们将为每行关键词生成一篇文章（当前: {config.keywords.split('\n').filter(l => l.trim()).length || 0} 篇）
            </p>
          </div>

          <div className="space-y-2">
            <Label>包括关键词 (每行1个)</Label>
            <Textarea
              placeholder="如何烘焙面包"
              value={config.includeKeywords}
              onChange={(e) => onChange('includeKeywords', e.target.value)}
              rows={3}
              disabled={disabled}
            />
            <p className="text-xs text-gray-500">
              我们会将这些关键词 <strong>强制添加</strong> 到标题中
            </p>
          </div>
        </>
      )}

      {/* 关键词库方式 */}
      {config.generateMethod === 'keyword-library' && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>关键词库</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-purple-600 border-purple-600 hover:bg-purple-50"
                onClick={() => router.push('/keywords')}
              >
                + 新关键词库
              </Button>
            </div>
            <Select
              value={config.keywordLibraryId ? config.keywordLibraryId : undefined}
              onValueChange={(v) => onChange('keywordLibraryId', v === '__none__' ? '' : v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择关键词库" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不使用关键词库</SelectItem>
                {keywordLibraries.map((lib) => (
                  <SelectItem key={lib.id} value={lib.id}>
                    {lib.name} ({lib.keywords.length}个关键词)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">我们将使用这个关键词库来提取相关关键词。</p>
          </div>

          <div className="space-y-2">
            <Label>选择关键词库关键词</Label>
            <Select
              value={config.keywordSelectMode}
              onValueChange={(v) => onChange('keywordSelectMode', v as GenerationConfig['keywordSelectMode'])}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top5">Top 5</SelectItem>
                <SelectItem value="top10">Top 10</SelectItem>
                <SelectItem value="top20">Top 20</SelectItem>
                <SelectItem value="top50">Top 50</SelectItem>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="random">随机</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">我们将为关键词库中的每个关键词生成一篇文章。</p>
          </div>

          <div className="space-y-2">
            <Label>关键词数量</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={config.keywordCount}
              onChange={(e) => onChange('keywordCount', parseInt(e.target.value) || 1)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>包括关键词</Label>
            <Textarea
              placeholder="如何烘焙面包"
              value={config.includeKeywords}
              onChange={(e) => onChange('includeKeywords', e.target.value)}
              rows={3}
              disabled={disabled}
            />
            <p className="text-xs text-gray-500">
              我们会将这些关键词 <strong>强制添加</strong> 到标题中。
            </p>
          </div>
        </>
      )}

      {/* 标题方式 */}
      {config.generateMethod === 'title' && (
        <div className="space-y-2">
          <Label>标题列表 (每行一个标题)</Label>
          <Textarea
            placeholder="输入标题，每行一个"
            value={config.keywords}
            onChange={(e) => {
              const value = e.target.value;
              onChange('keywords', value);
              // 自动计算行数并更新文章数量
              const lines = value.split('\n').filter(line => line.trim() !== '');
              onChange('articleCount', lines.length || 1);
            }}
            rows={4}
            disabled={disabled}
          />
          <p className="text-xs text-gray-500">
            我们将为每个标题生成一篇文章（当前: {config.keywords.split('\n').filter(l => l.trim()).length || 0} 篇）
          </p>
        </div>
      )}

      {/* 描述方式 */}
      {config.generateMethod === 'description' && (
        <div className="space-y-2">
          <Label>文章描述</Label>
          <Textarea
            placeholder="描述你想要生成的文章内容、风格、主题等..."
            value={config.description}
            onChange={(e) => onChange('description', e.target.value)}
            rows={6}
            disabled={disabled}
          />
          <p className="text-xs text-gray-500">根据描述生成符合要求的文章</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import type { ModuleProps } from '../types';

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  tableName: string;
  documentCount: number;
  status: string;
}

/**
 * 知识库模块
 * 
 * 包含：
 * - 联网搜索开关
 * - 知识库选择（从数据库加载）
 */
export function KnowledgeBaseModule({ config, onChange, disabled }: ModuleProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载知识库列表
  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      // 客户端检查，避免 SSR 时访问 localStorage
      if (typeof window === 'undefined') {
        return;
      }
      
      // 从 localStorage 获取当前 businessId
      const businessId = localStorage.getItem('currentBusinessId');
      if (!businessId) {
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/knowledge-bases?businessId=${businessId}`);
        const result = await response.json();
        if (result.success) {
          setKnowledgeBases(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch knowledge bases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKnowledgeBases();
  }, []);

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
            value={config.knowledgeBaseId || 'none'}
            onValueChange={(v) => onChange('knowledgeBaseId', v === 'none' ? '' : v)}
            disabled={disabled || loading}
          >
            <SelectTrigger className="flex-1">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : (
                <SelectValue placeholder="没有具体知识库" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不使用知识库</SelectItem>
              {knowledgeBases.map((kb) => (
                <SelectItem key={kb.id} value={kb.tableName}>
                  <div className="flex flex-col">
                    <span>{kb.name}</span>
                    {kb.description && (
                      <span className="text-xs text-gray-500">{kb.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={disabled} type="button">
            + 创建知识库
          </Button>
        </div>
        {knowledgeBases.length === 0 && !loading && (
          <p className="text-xs text-gray-500">暂无知识库，请先创建知识库</p>
        )}
        {knowledgeBases.length > 0 && (
          <p className="text-xs text-gray-500">我们将在知识库的基础上生成内容</p>
        )}
      </div>
    </div>
  );
}

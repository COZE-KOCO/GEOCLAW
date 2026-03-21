'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModuleId } from '../types';

export interface ModuleWrapperProps {
  moduleId: ModuleId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** 折叠时显示的摘要信息 */
  summary?: string;
  /** 是否显示配置状态指示 */
  hasConfig?: boolean;
  disabled?: boolean;
}

/**
 * 配置模块包装器组件
 * 
 * 提供可折叠的模块容器，包含标题、图标和展开/收起功能
 */
export function ModuleWrapper({
  moduleId,
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
  summary,
  hasConfig,
  disabled,
}: ModuleWrapperProps) {
  return (
    <Collapsible open={isOpen} disabled={disabled}>
      <CollapsibleTrigger
        onClick={onToggle}
        className="flex items-center justify-between w-full py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-purple-500" />
          <span className="font-medium">{title}</span>
          {!isOpen && summary && (
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {summary}
            </span>
          )}
          {!isOpen && hasConfig === false && (
            <span className="text-xs text-gray-400">未配置</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-0 space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

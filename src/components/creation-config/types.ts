/**
 * 创作配置组件类型定义
 * 
 * 复用 src/lib/types/generation-config.ts 中的 GenerationConfig 类型
 */

import type { GenerationConfig } from '@/lib/types/generation-config';

// 重新导出 GenerationConfig 以便统一引用
export type { GenerationConfig } from '@/lib/types/generation-config';

/** 配置模块ID */
export type ModuleId = 
  | 'basic' 
  | 'model'
  | 'type' 
  | 'image' 
  | 'content' 
  | 'replace' 
  | 'knowledge' 
  | 'format' 
  | 'structure' 
  | 'internal' 
  | 'external' 
  | 'fixed';

/** 配置模块定义 */
export interface ConfigModule {
  id: ModuleId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen: boolean;
  description?: string;
}

/** 模块配置列表 */
export const CONFIG_MODULES: ConfigModule[] = [
  { id: 'basic', title: '基础设置', icon: () => null, defaultOpen: true },
  { id: 'type', title: '创作类型', icon: () => null, defaultOpen: true },
  { id: 'image', title: '图片', icon: () => null, defaultOpen: false },
  { id: 'content', title: '内容要求', icon: () => null, defaultOpen: false },
  { id: 'replace', title: '全文替换', icon: () => null, defaultOpen: false },
  { id: 'knowledge', title: '知识库', icon: () => null, defaultOpen: false },
  { id: 'format', title: '内容格式', icon: () => null, defaultOpen: false },
  { id: 'structure', title: '文章结构', icon: () => null, defaultOpen: false },
  { id: 'internal', title: '内部链接', icon: () => null, defaultOpen: false },
  { id: 'external', title: '外部链接', icon: () => null, defaultOpen: false },
  { id: 'fixed', title: '固定开头结尾', icon: () => null, defaultOpen: false },
];

/** 配置模块组件的公共Props */
export interface ModuleProps {
  config: GenerationConfig;
  onChange: <K extends keyof GenerationConfig>(key: K, value: GenerationConfig[K]) => void;
  disabled?: boolean;
}

/** 配置模块集合组件Props */
export interface ConfigModulesProps {
  config: GenerationConfig;
  onChange: <K extends keyof GenerationConfig>(key: K, value: GenerationConfig[K]) => void;
  openModules: ModuleId[];
  onToggleModule: (moduleId: ModuleId) => void;
  disabled?: boolean;
  /** 模式：article(文章) | image-text(图文) */
  mode?: 'article' | 'image-text';
  /** 隐藏的模块 */
  hiddenModules?: ModuleId[];
}

/** 关键词库类型 */
export interface KeywordLibrary {
  id: string;
  name: string;
  keywords: string[];
  createdAt?: string;
  updatedAt?: string;
}

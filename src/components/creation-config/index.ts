/**
 * 创作配置组件统一导出
 * 
 * 提供可复用的配置模块组件，用于：
 * - 规则创建/编辑页面
 * - 批量创作页面
 * - 图文创作页面
 * - 全自动创作发布页面
 */

// 类型导出
export type {
  GenerationConfig,
  ModuleId,
  ConfigModule,
  ConfigModulesProps,
  ModuleProps,
  KeywordLibrary,
} from './types';

export { CONFIG_MODULES } from './types';

// 组件导出
export { ModuleWrapper } from './shared/ModuleWrapper';
export type { ModuleWrapperProps } from './shared/ModuleWrapper';

// 配置模块组件
export { BasicSettings } from './modules/BasicSettings';
export { ModelSelector } from './modules/ModelSelector';
export { ModelSelectionMode } from './modules/ModelSelectionMode';
export { ArticleTypeModule } from './modules/ArticleTypeModule';
export { ImageSettings } from './modules/ImageSettings';
export { ContentRequirements } from './modules/ContentRequirements';
export { ReplacementSettings } from './modules/ReplacementSettings';
export { KnowledgeBaseModule } from './modules/KnowledgeBase';
export { ContentFormat } from './modules/ContentFormat';
export { ArticleStructure } from './modules/ArticleStructure';
export { InternalLinks } from './modules/InternalLinks';
export { ExternalLinks } from './modules/ExternalLinks';
export { FixedIntroOutro } from './modules/FixedIntroOutro';

// 集合组件
export { ConfigModules } from './ConfigModules';

// Hook
export { useGenerationConfig } from './hooks/useGenerationConfig';

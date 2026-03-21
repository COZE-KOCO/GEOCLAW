'use client';

import { Settings, Sparkles, Image, FileText, User, Replace, Database, FileCode, Link2, ExternalLink, Cpu } from 'lucide-react';
import { ModuleWrapper } from './shared/ModuleWrapper';
import { BasicSettings } from './modules/BasicSettings';
import { ModelSelector } from './modules/ModelSelector';
import { ArticleTypeModule } from './modules/ArticleTypeModule';
import { ImageSettings } from './modules/ImageSettings';
import { ContentRequirements } from './modules/ContentRequirements';
import { PersonaSettings } from './modules/PersonaSettings';
import { ReplacementSettings } from './modules/ReplacementSettings';
import { KnowledgeBaseModule } from './modules/KnowledgeBase';
import { ContentFormat } from './modules/ContentFormat';
import { ArticleStructure } from './modules/ArticleStructure';
import { InternalLinks } from './modules/InternalLinks';
import { ExternalLinks } from './modules/ExternalLinks';
import { FixedIntroOutro } from './modules/FixedIntroOutro';
import type { ConfigModulesProps, ModuleId } from './types';
import type { KeywordLibrary } from '@/lib/keyword-store';
import { AVAILABLE_MODELS } from '@/lib/types/generation-config';

// 模块配置
const MODULE_CONFIG: {
  id: ModuleId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'basic', title: '基础设置', icon: Settings },
  { id: 'type', title: '创作类型', icon: Sparkles },
  { id: 'image', title: '图片', icon: Image },
  { id: 'content', title: '内容要求', icon: FileText },
  { id: 'persona', title: '拟人化', icon: User },
  { id: 'replace', title: '全文替换', icon: Replace },
  { id: 'knowledge', title: '知识库', icon: Database },
  { id: 'format', title: '内容格式', icon: FileCode },
  { id: 'structure', title: '文章结构', icon: FileText },
  { id: 'internal', title: '内部链接', icon: Link2 },
  { id: 'external', title: '外部链接', icon: ExternalLink },
  { id: 'fixed', title: '固定开头结尾', icon: FileText },
  { id: 'model', title: '生成模型', icon: Cpu },
];

export interface ConfigModulesPropsExtended extends ConfigModulesProps {
  keywordLibraries?: KeywordLibrary[];
}

/**
 * 配置模块集合组件
 * 
 * 整合所有配置模块，提供统一的配置界面
 */
export function ConfigModules({
  config,
  onChange,
  openModules,
  onToggleModule,
  disabled,
  mode = 'article',
  hiddenModules = [],
  keywordLibraries = [],
}: ConfigModulesPropsExtended) {
  // 获取模块摘要信息
  const getModuleSummary = (moduleId: ModuleId): string | undefined => {
    switch (moduleId) {
      case 'basic':
        if (config.generateMethod === 'keyword' && config.keywords) {
          const count = config.keywords.split('\n').filter(l => l.trim()).length;
          return `关键词: ${count}条`;
        }
        if (config.generateMethod === 'keyword-library' && config.keywordLibraryId) {
          return '关键词库模式';
        }
        if (config.generateMethod === 'title') {
          return '标题模式';
        }
        if (config.generateMethod === 'description') {
          return '描述模式';
        }
        return undefined;
      case 'model':
        const model = AVAILABLE_MODELS.find(m => m.id === config.model);
        return model?.name || '默认模型';
      case 'type':
        const dist = config.articleTypeDistribution;
        const types: string[] = [];
        if (dist.what > 0) types.push(`什么是${dist.what}%`);
        if (dist.how > 0) types.push(`如何${dist.how}%`);
        if (dist.top > 0) types.push(`TOP${dist.top}%`);
        if (dist.normal > 0) types.push(`常规${dist.normal}%`);
        return types.length > 0 ? types.join(' | ') : '未设置';
      case 'image':
        const sourceMap: Record<string, string> = {
          'stock': '素材库',
          'ai': 'AI生成',
          'upload': '本地上传',
          'none': '无',
        };
        const imageSource = sourceMap[config.imageSource || 'stock'] || '素材库';
        if (config.imageSource === 'none') {
          return '不使用图片';
        }
        return `${imageSource}${config.imageCount ? ` ${config.imageCount}张` : ''}`;
      case 'content':
        return config.language === 'zh-CN' ? '中文' : config.language;
      case 'persona':
        return config.personaId ? '已设置' : '未设置';
      case 'replace':
        return config.replacements.length > 0 ? `${config.replacements.length}条规则` : '无';
      case 'knowledge':
        return config.enableWebSearch ? '联网搜索' : '未启用';
      case 'format':
        const formats: string[] = [];
        if (config.enableBold) formats.push('粗体');
        if (config.enableItalic) formats.push('斜体');
        if (config.enableTable) formats.push('表格');
        if (config.enableQuote) formats.push('引文');
        return formats.length > 0 ? formats.join('、') : '默认';
      case 'structure':
        return config.articleSize === 'short' ? '小' : config.articleSize === 'long' ? '大' : '中';
      case 'internal':
        return config.sitemaps.length > 0 ? `${config.sitemaps.length}个站点地图` : '未设置';
      case 'external':
        return config.externalLinks.length > 0 ? `${config.externalLinks.length}个链接` : '未设置';
      case 'fixed':
        const fixed: string[] = [];
        if (config.enableFixedIntro) fixed.push('开头');
        if (config.enableFixedOutro) fixed.push('结尾');
        return fixed.length > 0 ? fixed.join(' + ') : '未设置';
      default:
        return undefined;
    }
  };

  // 检查模块是否有配置
  const hasModuleConfig = (moduleId: ModuleId): boolean => {
    switch (moduleId) {
      case 'basic':
        return !!(config.keywords || config.keywordLibraryId || config.description);
      case 'model':
        return !!config.model;
      case 'type':
        return true;
      case 'image':
        return config.imageSource !== 'none' && (config.enableThumbnail || config.enableContentImages || config.imageCount > 0);
      case 'content':
        return true;
      case 'persona':
        return !!config.personaId;
      case 'replace':
        return config.replacements.length > 0;
      case 'knowledge':
        return config.enableWebSearch || !!config.knowledgeBaseId;
      case 'format':
        return true;
      case 'structure':
        return true;
      case 'internal':
        return config.sitemaps.length > 0;
      case 'external':
        return config.externalLinks.length > 0 || config.enableAutoExternalLinks;
      case 'fixed':
        return config.enableFixedIntro || config.enableFixedOutro;
      default:
        return false;
    }
  };

  // 图文模式隐藏的模块
  const imageTextHiddenModules: ModuleId[] = mode === 'image-text' 
    ? ['persona', 'replace', 'knowledge', 'internal', 'external', 'fixed'] 
    : [];

  const allHiddenModules = [...hiddenModules, ...imageTextHiddenModules];

  return (
    <div className="divide-y">
      {MODULE_CONFIG.map((module) => {
        // 跳过隐藏的模块
        if (allHiddenModules.includes(module.id)) {
          return null;
        }

        const isOpen = openModules.includes(module.id);
        const Icon = module.icon;
        const summary = getModuleSummary(module.id);
        const hasConfig = hasModuleConfig(module.id);

        return (
          <ModuleWrapper
            key={module.id}
            moduleId={module.id}
            title={module.title}
            icon={Icon}
            isOpen={isOpen}
            onToggle={() => onToggleModule(module.id)}
            summary={summary}
            hasConfig={hasConfig}
            disabled={disabled}
          >
            {module.id === 'basic' && (
              <BasicSettings
                config={config}
                onChange={onChange}
                disabled={disabled}
                keywordLibraries={keywordLibraries}
              />
            )}
            {module.id === 'model' && (
              <ModelSelector
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'type' && (
              <ArticleTypeModule
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'image' && (
              <ImageSettings
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'content' && (
              <ContentRequirements
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'persona' && (
              <PersonaSettings
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'replace' && (
              <ReplacementSettings
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'knowledge' && (
              <KnowledgeBaseModule
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'format' && (
              <ContentFormat
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'structure' && (
              <ArticleStructure
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'internal' && (
              <InternalLinks
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'external' && (
              <ExternalLinks
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
            {module.id === 'fixed' && (
              <FixedIntroOutro
                config={config}
                onChange={onChange}
                disabled={disabled}
              />
            )}
          </ModuleWrapper>
        );
      })}
    </div>
  );
}

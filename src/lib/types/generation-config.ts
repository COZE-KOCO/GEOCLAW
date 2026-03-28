/**
 * 批量创作配置类型定义
 * 
 * 该类型用于：
 * - 批量创作页面 (/matrix/batch/create)
 * - 全自动创作发布 (/auto-publish)
 * - 内容生成 API (/api/content/generate)
 * 
 * 统一配置类型，确保各模块配置一致性
 */

// ==================== 生成方式类型 ====================

/** 生成方式 */
export type GenerateMethod = 'keyword' | 'keyword-library' | 'title' | 'description';

/** 关键词选择模式 */
export type KeywordSelectMode = 'top5' | 'top10' | 'top20' | 'top50' | 'all' | 'random';

/** 文章类型 */
export type ArticleType = 'what' | 'how' | 'top' | 'normal';

/** 排名显示方式 */
export type RankingDisplay = 'random' | 'sequential' | 'reverse' | 'grouped';

/** 图片来源 */
export type ImageSource = 'stock' | 'ai' | 'upload' | 'none';

/** 模型选择模式 */
export type ModelSelectionMode = 'fixed' | 'random' | 'weighted';

// ==================== 子配置类型 ====================

/** 全文替换规则 */
export interface ReplacementRule {
  find: string;
  replace: string;
}

/** 外部链接 */
export interface ExternalLink {
  url: string;
  anchor: string;
}

/** 文章类型分布 */
export interface ArticleTypeDistribution {
  what: number;      // 什么是(What) 占比
  how: number;       // 如何(How) 占比
  top: number;       // TOP排行 占比
  normal: number;    // 常规类型 占比
}

// ==================== 主配置类型 ====================

/**
 * 批量创作配置
 * 
 * 包含从关键词/标题/描述生成文章所需的全部配置项
 * 覆盖12个模块：基础设置、创作类型、图片、内容要求、拟人化、
 * 全文替换、知识库、内容格式、文章结构、内部链接、外部链接、固定开头结尾
 */
export interface GenerationConfig {
  // ========== 基础设置 ==========
  
  /** 关联规则ID（如果使用已保存的规则） */
  ruleId?: string;
  
  /** 生成方式 */
  generateMethod: GenerateMethod;
  
  /** 关键词列表（每行一个，用于关键词方式） */
  keywords: string;
  
  /** 包含关键词（强制添加到标题中） */
  includeKeywords: string;
  
  // ========== 关键词库设置 ==========
  
  /** 关键词库ID */
  keywordLibraryId: string;
  
  /** 关键词选择模式 */
  keywordSelectMode: KeywordSelectMode;
  
  /** 关键词数量 */
  keywordCount: number;
  
  // ========== 描述设置 ==========
  
  /** 文章描述（用于描述方式生成） */
  description: string;
  
  // ========== 创作类型 ==========
  
  /**
   * 文章类型分布（批量创作时使用）
   * 各类型占比总和应为 100
   */
  articleTypeDistribution: ArticleTypeDistribution;
  
  // ========== TOP排行设置 ==========
  
  /** 产品名称（TOP排行类型使用） */
  productName: string;
  
  /** 产品描述 */
  productDescription: string;
  
  /** 排名显示方式 */
  rankingDisplay: RankingDisplay;
  
  /** 竞争对手列表 */
  competitors: string;
  
  // ========== 图片设置 ==========
  
  /** 图片来源 */
  imageSource: ImageSource;
  
  /** 素材库过滤类型 */
  imageFilter: string;
  
  /** 启用缩略图 */
  enableThumbnail: boolean;
  
  /** 启用内容配图 */
  enableContentImages: boolean;
  
  /** 配图数量 */
  imageCount: number;
  
  // ========== 内容要求 ==========
  
  /** 语言 */
  language: string;
  
  /** 目标国家/地区 */
  targetCountry: string;
  
  /** 创意程度 (0-100) */
  creativityLevel: number;
  
  /** 文章语气风格 */
  tone: string;
  
  /** 人称角度 */
  perspective: string;
  
  /** 形式 */
  formality: string;
  
  /** 自定义指令 */
  customInstructions: string;
  
  /** 内容包含关键词 */
  contentIncludeKeywords: string;
  
  // ========== 全文替换 ==========
  
  /** 全文替换规则列表 */
  replacements: ReplacementRule[];
  
  // ========== 知识库 ==========
  
  /** 启用联网搜索 */
  enableWebSearch: boolean;
  
  /** 知识库ID */
  knowledgeBaseId?: string;
  
  // ========== 内容格式 ==========
  
  /** 启用粗体 */
  enableBold: boolean;
  
  /** 启用斜体 */
  enableItalic: boolean;
  
  /** 启用表格 */
  enableTable: boolean;
  
  /** 启用引文 */
  enableQuote: boolean;
  
  // ========== 文章结构 ==========
  
  /** 引导点击URL */
  ctaUrl: string;
  
  /** 启用内容概要 */
  enableSummary: boolean;
  
  /** 启用结论总结 */
  enableConclusion: boolean;
  
  /** 启用常见问题 */
  enableFaq: boolean;
  
  /** 文章篇幅 */
  articleSize: 'short' | 'medium' | 'long' | 'custom';
  
  /** 启用自动标题 */
  enableAutoTitle: boolean;
  
  /** 自定义标题 */
  customTitle: string;
  
  // ========== 内部链接 ==========
  
  /** 站点地图URL列表 */
  sitemaps: string[];
  
  /** 过滤模式 */
  filterMode: string;
  
  /** 排除模式 */
  excludeMode: string;
  
  /** 每个H2部分内链数量 */
  internalLinksPerH2: number;
  
  // ========== 外部链接 ==========
  
  /** 外部链接列表 */
  externalLinks: ExternalLink[];
  
  /** 启用自动外部链接 */
  enableAutoExternalLinks: boolean;
  
  // ========== 固定开头结尾 ==========
  
  /** 启用固定开头 */
  enableFixedIntro: boolean;
  
  /** 固定开头内容 */
  fixedIntro: string;
  
  /** 启用固定结尾 */
  enableFixedOutro: boolean;
  
  /** 固定结尾内容 */
  fixedOutro: string;
  
  // ========== 生成设置 ==========
  
  /** AI模型（固定模式时使用） */
  model: string;
  
  /** 模型选择模式 */
  modelSelectionMode: ModelSelectionMode;
  
  /** 模型池（随机/加权模式时使用） */
  modelPool: string[];
  
  /** 模型权重（加权模式时使用，key 为模型ID，value 为权重百分比） */
  modelWeights: Record<string, number>;
  
  /** 生成文章数量 */
  articleCount: number;
}

// ==================== 默认配置 ====================

/**
 * 批量创作默认配置
 * 
 * 用于初始化创作配置表单
 */
export const defaultGenerationConfig: GenerationConfig = {
  // 基础设置
  ruleId: '',
  generateMethod: 'keyword',
  keywords: '',
  includeKeywords: '',
  
  // 关键词库设置
  keywordLibraryId: '',
  keywordSelectMode: 'top5',
  keywordCount: 1,
  
  // 描述设置
  description: '',
  
  // 创作类型 - 文章类型分布
  articleTypeDistribution: {
    what: 0,
    how: 0,
    top: 0,
    normal: 100,
  },
  
  // TOP排行设置
  productName: '',
  productDescription: '',
  rankingDisplay: 'random',
  competitors: '',
  
  // 图片设置
  imageSource: 'none',
  imageFilter: 'all',
  enableThumbnail: false,
  enableContentImages: false,
  imageCount: 3,
  
  // 内容要求
  language: 'zh-CN',
  targetCountry: 'CN',
  creativityLevel: 50,
  tone: 'neutral',
  perspective: 'auto',
  formality: 'auto',
  customInstructions: '',
  contentIncludeKeywords: '',
  
  // 全文替换
  replacements: [],
  
  // 知识库
  enableWebSearch: true,
  knowledgeBaseId: undefined,
  
  // 内容格式
  enableBold: true,
  enableItalic: false,
  enableTable: true,
  enableQuote: false,
  
  // 文章结构
  ctaUrl: '',
  enableSummary: true,
  enableConclusion: true,
  enableFaq: false,
  articleSize: 'short',
  enableAutoTitle: true,
  customTitle: '',
  
  // 内部链接
  sitemaps: [],
  filterMode: '',
  excludeMode: '',
  internalLinksPerH2: 2,
  
  // 外部链接
  externalLinks: [],
  enableAutoExternalLinks: false,
  
  // 固定开头结尾
  enableFixedIntro: false,
  fixedIntro: '',
  enableFixedOutro: false,
  fixedOutro: '',
  
  // 生成设置
  model: 'doubao-seed-1-8-251228',
  modelSelectionMode: 'fixed',
  modelPool: ['doubao-seed-1-8-251228', 'doubao-seed-2-0-lite-260215'],
  modelWeights: {
    'doubao-seed-1-8-251228': 70,
    'doubao-seed-2-0-lite-260215': 30,
  },
  articleCount: 1,
};

// ==================== 可用模型列表 ====================

/**
 * 支持的AI模型列表
 */
export const AVAILABLE_MODELS = [
  { 
    id: 'doubao-seed-1-8-251228', 
    name: '豆包 Seed-1.8', 
    description: '默认模型，性价比高',
    provider: 'doubao',
  },
  { 
    id: 'doubao-seed-2-0-pro-260215', 
    name: '豆包 Seed-2.0 Pro', 
    description: '旗舰模型，适合复杂推理',
    provider: 'doubao',
  },
  { 
    id: 'doubao-seed-2-0-lite-260215', 
    name: '豆包 Seed-2.0 Lite', 
    description: '轻量模型，速度快',
    provider: 'doubao',
  },
  { 
    id: 'doubao-seed-2-0-mini-260215', 
    name: '豆包 Seed-2.0 Mini', 
    description: '迷你模型，极致速度',
    provider: 'doubao',
  },
  { 
    id: 'deepseek-r1-250528', 
    name: 'DeepSeek R1', 
    description: '深度推理模型',
    provider: 'deepseek',
    warning: '生成时间较长',
  },
  { 
    id: 'deepseek-v3-2-251201', 
    name: 'DeepSeek V3.2', 
    description: '通用大模型',
    provider: 'deepseek',
  },
  { 
    id: 'kimi-k2-5-260127', 
    name: 'Kimi K2.5', 
    description: '擅长长文本',
    provider: 'kimi',
  },
  { 
    id: 'kimi-k2-250905', 
    name: 'Kimi K2', 
    description: '通用模型',
    provider: 'kimi',
  },
  { 
    id: 'glm-4-7-251222', 
    name: 'GLM-4-7', 
    description: '智谱AI模型',
    provider: 'glm',
  },
] as const;

// ==================== 工具函数 ====================

/**
 * 合并配置（用于规则覆盖）
 * 
 * @param baseConfig 基础配置
 * @param overrideConfig 覆盖配置
 * @returns 合并后的配置
 */
export function mergeGenerationConfig(
  baseConfig: GenerationConfig,
  overrideConfig: Partial<GenerationConfig>
): GenerationConfig {
  return {
    ...baseConfig,
    ...overrideConfig,
  };
}

/**
 * 验证配置是否完整
 * 
 * @param config 配置对象
 * @param strict 是否严格验证（默认 false，创建计划时不强制验证关键词）
 * @returns 验证结果
 */
export function validateGenerationConfig(
  config: GenerationConfig,
  strict: boolean = false
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 辅助函数：检查关键词是否有效
  const hasValidKeywords = (keywords: unknown): boolean => {
    if (!keywords) return false;
    if (typeof keywords === 'string') return keywords.trim().length > 0;
    if (Array.isArray(keywords)) return keywords.length > 0;
    return false;
  };
  
  // 根据生成方式验证必填项
  // 非严格模式下，只返回警告，不阻止保存
  switch (config.generateMethod) {
    case 'keyword':
      if (!hasValidKeywords(config.keywords)) {
        if (strict) {
          errors.push('关键词方式需要输入关键词');
        } else {
          warnings.push('尚未配置关键词，计划创建后需要添加关键词才能生成内容');
        }
      }
      break;
    case 'keyword-library':
      if (!config.keywordLibraryId) {
        if (strict) {
          errors.push('关键词库方式需要选择关键词库');
        } else {
          warnings.push('尚未选择关键词库，计划创建后需要选择才能生成内容');
        }
      }
      break;
    case 'title':
      if (!hasValidKeywords(config.keywords)) {
        if (strict) {
          errors.push('标题方式需要输入标题列表');
        } else {
          warnings.push('尚未配置标题列表，计划创建后需要添加才能生成内容');
        }
      }
      break;
    case 'description':
      if (!config.description?.trim()) {
        if (strict) {
          errors.push('描述方式需要输入文章描述');
        } else {
          warnings.push('尚未配置文章描述，计划创建后需要添加才能生成内容');
        }
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 根据模型选择模式获取要使用的模型
 * 
 * @param config 生成配置
 * @param articleIndex 文章索引（用于随机模式的一致性）
 * @returns 模型ID
 */
export function selectModel(
  config: Pick<GenerationConfig, 'model' | 'modelSelectionMode' | 'modelPool' | 'modelWeights'>,
  articleIndex?: number
): string {
  const { model, modelSelectionMode, modelPool, modelWeights } = config;
  
  switch (modelSelectionMode) {
    case 'fixed':
      // 固定模式：始终使用指定模型
      return model;
      
    case 'random':
      // 随机模式：从模型池随机选择
      if (modelPool && modelPool.length > 0) {
        const randomIndex = articleIndex !== undefined
          ? (articleIndex + Math.floor(Math.random() * 1000)) % modelPool.length
          : Math.floor(Math.random() * modelPool.length);
        return modelPool[randomIndex];
      }
      return model;
      
    case 'weighted':
      // 加权模式：按权重随机选择
      if (modelWeights && Object.keys(modelWeights).length > 0) {
        const entries = Object.entries(modelWeights);
        const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [modelId, weight] of entries) {
          random -= weight;
          if (random <= 0) {
            return modelId;
          }
        }
        return entries[0][0];
      }
      return model;
      
    default:
      return model;
  }
}

/**
 * GEO优化评分系统
 * 基于"两大核心+四轮驱动"评分体系
 * 总分满分10分
 */

export interface GEOScore {
  total: number;
  breakdown: {
    humanizedGeo: number; // 人性化GEO (权重2.5分)
    crossValidation: number; // 内容交叉验证 (权重2.5分)
    eeat: number; // E-E-A-T原则 (权重1.5分)
    preciseCitation: number; // 文献/数据精准引用 (权重1.5分)
    structuredContent: number; // 结构化内容 (权重1.0分)
    seoKeywords: number; // SEO关键词规则 (权重1.0分)
  };
  suggestions: string[];
}

export interface ContentAnalysis {
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  references?: string[];
  keywords?: string[];
  hasSchema?: boolean;
  hasFAQ?: boolean;
  hasImages?: boolean;
  wordCount: number;
}

/**
 * 计算人性化GEO得分 (满分2.5分)
 * 评估内容是否真正解决用户问题，是否符合人类化写作风格
 */
function calculateHumanizedGeo(analysis: ContentAnalysis): number {
  let score = 0;
  const factors: number[] = [];

  // 1. 用户意图覆盖度 (0.5分)
  if (analysis.content.includes('如何') || analysis.content.includes('怎么') || analysis.content.includes('为什么')) {
    factors.push(0.5);
  } else {
    factors.push(0.2);
  }

  // 2. 内容真实性和透明度 (0.5分)
  const hasRealExamples = analysis.content.includes('案例') || 
                          analysis.content.includes('实践') || 
                          analysis.content.includes('经验');
  if (hasRealExamples) {
    factors.push(0.5);
  } else {
    factors.push(0.2);
  }

  // 3. 情感共鸣和用户体验 (0.5分)
  const hasHumanVoice = analysis.content.includes('我们') || 
                        analysis.content.includes('你') || 
                        analysis.content.includes('建议');
  if (hasHumanVoice) {
    factors.push(0.5);
  } else {
    factors.push(0.2);
  }

  // 4. 避免夸大和误导 (0.5分)
  const noExaggeration = !analysis.content.includes('最好') && 
                         !analysis.content.includes('第一') && 
                         !analysis.content.includes('绝对');
  if (noExaggeration) {
    factors.push(0.5);
  } else {
    factors.push(0.2);
  }

  // 5. 内容深度 (0.5分)
  if (analysis.wordCount > 1000) {
    factors.push(0.5);
  } else if (analysis.wordCount > 500) {
    factors.push(0.3);
  } else {
    factors.push(0.1);
  }

  score = factors.reduce((sum, val) => sum + val, 0);
  return Math.min(2.5, score);
}

/**
 * 计算内容交叉验证得分 (满分2.5分)
 * 评估内容的权威性和可验证性
 */
function calculateCrossValidation(analysis: ContentAnalysis): number {
  let score = 0;

  // 1. 引用来源数量 (1.0分)
  const refCount = analysis.references?.length || 0;
  if (refCount >= 3) {
    score += 1.0;
  } else if (refCount >= 2) {
    score += 0.7;
  } else if (refCount >= 1) {
    score += 0.4;
  }

  // 2. 权威来源引用 (0.8分)
  const authoritativeSources = [
    '.gov', '.edu', '.org', 
    '研究报告', '论文', '数据',
    '标准', '规范', '认证'
  ];
  const hasAuthoritative = analysis.references?.some(ref => 
    authoritativeSources.some(source => ref.includes(source))
  ) || analysis.content.includes('根据') && analysis.content.includes('显示');
  if (hasAuthoritative) {
    score += 0.8;
  } else {
    score += 0.3;
  }

  // 3. 数据准确性 (0.7分)
  const hasNumbers = /\d+(\.\d+)?%/.test(analysis.content);
  const hasSpecificData = /\d{4}年|\d{1,2}月|\d+万|\d+亿/.test(analysis.content);
  if (hasNumbers && hasSpecificData) {
    score += 0.7;
  } else if (hasNumbers || hasSpecificData) {
    score += 0.4;
  }

  return Math.min(2.5, score);
}

/**
 * 计算E-E-A-T得分 (满分1.5分)
 * 经验(Experience)、专业性(Expertise)、权威性(Authoritativeness)、可信度(Trustworthiness)
 */
function calculateEEAT(analysis: ContentAnalysis): number {
  let score = 0;

  // 1. 经验展示 (0.4分)
  const hasExperience = analysis.content.includes('经验') || 
                        analysis.content.includes('实践') || 
                        analysis.content.includes('案例');
  if (hasExperience) {
    score += 0.4;
  } else {
    score += 0.1;
  }

  // 2. 专业性 (0.4分)
  const hasExpertise = analysis.author !== undefined && analysis.author.length > 0;
  if (hasExpertise) {
    score += 0.4;
  } else {
    score += 0.1;
  }

  // 3. 权威性 (0.4分)
  const hasAuthority = analysis.content.includes('认证') || 
                       analysis.content.includes('资质') || 
                       analysis.content.includes('专利') ||
                       analysis.content.includes('奖项');
  if (hasAuthority) {
    score += 0.4;
  } else {
    score += 0.1;
  }

  // 4. 可信度 (0.3分)
  const hasTrust = analysis.publishDate !== undefined;
  if (hasTrust) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  return Math.min(1.5, score);
}

/**
 * 计算文献/数据精准引用得分 (满分1.5分)
 */
function calculatePreciseCitation(analysis: ContentAnalysis): number {
  let score = 0;

  // 1. 引用格式规范性 (0.5分)
  const hasCitations = analysis.content.includes('[') && analysis.content.includes(']');
  if (hasCitations) {
    score += 0.5;
  } else {
    score += 0.1;
  }

  // 2. 数据精确性 (0.5分)
  const hasPreciseData = /\d{1,3}(,\d{3})*(\.\d+)?/.test(analysis.content);
  if (hasPreciseData) {
    score += 0.5;
  } else {
    score += 0.1;
  }

  // 3. 来源可追溯性 (0.5分)
  const hasTraceability = analysis.references && analysis.references.length > 0;
  if (hasTraceability) {
    score += 0.5;
  } else {
    score += 0.1;
  }

  return Math.min(1.5, score);
}

/**
 * 计算结构化内容得分 (满分1.0分)
 */
function calculateStructuredContent(analysis: ContentAnalysis): number {
  let score = 0;

  // 1. Schema标记 (0.4分)
  if (analysis.hasSchema) {
    score += 0.4;
  } else {
    score += 0.1;
  }

  // 2. FAQ模块 (0.3分)
  if (analysis.hasFAQ) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  // 3. 清晰的层级结构 (0.3分)
  const hasHeadings = analysis.content.includes('#') || 
                      analysis.content.includes('一、') || 
                      analysis.content.includes('二、') ||
                      analysis.content.includes('1.') ||
                      analysis.content.includes('2.');
  if (hasHeadings) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  return Math.min(1.0, score);
}

/**
 * 计算SEO关键词规则得分 (满分1.0分)
 */
function calculateSEOKeywords(analysis: ContentAnalysis): number {
  let score = 0;

  // 1. 核心关键词在标题中 (0.4分)
  const keywords = analysis.keywords || [];
  const hasKeywordsInTitle = keywords.some(keyword => 
    analysis.title.toLowerCase().includes(keyword.toLowerCase())
  );
  if (hasKeywordsInTitle) {
    score += 0.4;
  } else {
    score += 0.1;
  }

  // 2. 关键词自然分布 (0.3分)
  const keywordDensity = keywords.length > 0 
    ? keywords.filter(k => analysis.content.toLowerCase().includes(k.toLowerCase())).length / keywords.length
    : 0;
  if (keywordDensity >= 0.8) {
    score += 0.3;
  } else if (keywordDensity >= 0.5) {
    score += 0.2;
  } else {
    score += 0.1;
  }

  // 3. 长尾关键词覆盖 (0.3分)
  if (keywords.length >= 3) {
    score += 0.3;
  } else if (keywords.length >= 1) {
    score += 0.2;
  } else {
    score += 0.1;
  }

  return Math.min(1.0, score);
}

/**
 * 生成优化建议
 */
function generateSuggestions(score: GEOScore): string[] {
  const suggestions: string[] = [];

  if (score.breakdown.humanizedGeo < 2.0) {
    suggestions.push('💡 增加真实案例和实践经验分享，使用更人性化的语言风格');
    suggestions.push('💡 明确回答用户的核心疑问，提供可操作的解决方案');
  }

  if (score.breakdown.crossValidation < 2.0) {
    suggestions.push('📊 引用至少3个权威来源（如.gov、.edu域名或行业报告）');
    suggestions.push('📊 提供具体的数据支撑，如百分比、年份、数量等');
  }

  if (score.breakdown.eeat < 1.2) {
    suggestions.push('👤 标明作者身份和专业背景');
    suggestions.push('👤 展示相关资质认证、专利或奖项');
  }

  if (score.breakdown.preciseCitation < 1.2) {
    suggestions.push('📝 使用规范的引用格式，如[1]、[2]标注');
    suggestions.push('📝 确保所有数据和引用都可追溯');
  }

  if (score.breakdown.structuredContent < 0.8) {
    suggestions.push('🏗️ 添加Schema.org结构化数据标记（JSON-LD格式）');
    suggestions.push('🏗️ 创建FAQ模块，直接回答常见问题');
    suggestions.push('🏗️ 使用清晰的标题层级（H1-H6）');
  }

  if (score.breakdown.seoKeywords < 0.8) {
    suggestions.push('🔑 确保核心关键词出现在标题中');
    suggestions.push('🔑 覆盖更多长尾关键词');
  }

  return suggestions;
}

/**
 * 主评分函数
 */
export function calculateGEOScore(analysis: ContentAnalysis): GEOScore {
  const breakdown = {
    humanizedGeo: calculateHumanizedGeo(analysis),
    crossValidation: calculateCrossValidation(analysis),
    eeat: calculateEEAT(analysis),
    preciseCitation: calculatePreciseCitation(analysis),
    structuredContent: calculateStructuredContent(analysis),
    seoKeywords: calculateSEOKeywords(analysis),
  };

  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  const score: GEOScore = {
    total: Math.round(total * 10) / 10,
    breakdown,
    suggestions: [],
  };

  score.suggestions = generateSuggestions(score);

  return score;
}

/**
 * 获取评分等级
 */
export function getGrade(total: number): { grade: string; color: string; description: string } {
  if (total >= 9.0) {
    return { grade: 'A+', color: 'text-green-600', description: '优秀 - 极高的AI引用潜力' };
  } else if (total >= 8.0) {
    return { grade: 'A', color: 'text-green-500', description: '良好 - 高AI引用率' };
  } else if (total >= 7.0) {
    return { grade: 'B+', color: 'text-blue-600', description: '中等偏上 - 较好AI引用率' };
  } else if (total >= 6.0) {
    return { grade: 'B', color: 'text-blue-500', description: '中等 - 一般AI引用率' };
  } else if (total >= 5.0) {
    return { grade: 'C', color: 'text-yellow-600', description: '及格 - 需要优化' };
  } else {
    return { grade: 'D', color: 'text-red-600', description: '不及格 - 急需优化' };
  }
}

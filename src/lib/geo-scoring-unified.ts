/**
 * GEO优化评分系统 - 统一版
 * 合并 V1 和 V2 的全部优势
 * 
 * 维度设计（总分10分）：
 * 1. 问题导向 (1.5分) - V2核心 + V1用户意图
 * 2. AI识别友好 (1.5分) - V2
 * 3. 人性化表达 (1.5分) - V1独立维度
 * 4. 内容质量 (1.5分) - V2 + V1数据准确性
 * 5. 信任权威 (1.5分) - V2 + V1 E-E-A-T
 * 6. 精准引用 (1.0分) - V1独立维度
 * 7. 结构化数据 (0.75分) - V2
 * 8. 多平台适配 (0.5分) - V2
 * 9. SEO关键词 (0.25分) - V2降权 + V1关键词密度
 */

// ==================== 类型定义 ====================

export interface GEOScoreUnified {
  total: number;  // 总分 0-10
  
  breakdown: {
    problemOriented: number;     // 问题导向 (1.5)
    aiRecognition: number;       // AI识别友好 (1.5)
    humanizedExpression: number; // 人性化表达 (1.5)
    contentQuality: number;      // 内容质量 (1.5)
    trustAuthority: number;      // 信任权威 (1.5)
    preciseCitation: number;     // 精准引用 (1.0)
    structuredData: number;      // 结构化数据 (0.75)
    multiPlatform: number;       // 多平台适配 (0.5)
    seoKeywords: number;         // SEO关键词 (0.25)
  };
  
  // 详细分析
  analysis: {
    questionPatterns: string[];    // 识别到的问题模式
    contentTemplate: {
      type: 'qna' | 'comparison' | 'guide' | 'case' | 'report' | 'unknown';
      confidence: number;
      improvements: string[];
    };
    wordCount: number;
    hasImages: boolean;
    hasSchema: boolean;
    hasFAQ: boolean;
    keywordsInTitle: boolean;
    keywordDensity: number;
    hasExaggeration: boolean;      // 是否有夸大词
    citationFormat: boolean;       // 是否有引用格式
    hasAuthorInfo: boolean;        // 是否有作者信息
  };
  
  suggestions: string[];           // 优化建议
  quickWins: string[];             // 快速提升建议
}

export interface ContentAnalysisUnified {
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
  targetQuestion?: string;  // 目标问题
  industry?: string;        // 行业领域
}

export interface GEOGrade {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  description: string;
  aiReferenceRate: string;
}

// 等级配置
export const GRADE_CONFIG: Record<string, GEOGrade> = {
  'A+': { grade: 'A+', color: 'text-green-600', description: '优秀', aiReferenceRate: '80%+' },
  'A':  { grade: 'A', color: 'text-green-500', description: '良好', aiReferenceRate: '60-80%' },
  'B':  { grade: 'B', color: 'text-blue-500', description: '中等', aiReferenceRate: '40-60%' },
  'C':  { grade: 'C', color: 'text-yellow-500', description: '及格', aiReferenceRate: '20-40%' },
  'D':  { grade: 'D', color: 'text-orange-500', description: '需改进', aiReferenceRate: '10-20%' },
  'F':  { grade: 'F', color: 'text-red-500', description: '不及格', aiReferenceRate: '<10%' },
};

// 维度配置（用于显示）
export const DIMENSION_CONFIG = {
  problemOriented: {
    name: '问题导向',
    max: 1.5,
    description: '内容是否围绕用户问题展开',
    icon: 'Target',
  },
  aiRecognition: {
    name: 'AI识别友好',
    max: 1.5,
    description: '内容是否易于AI抓取理解',
    icon: 'Brain',
  },
  humanizedExpression: {
    name: '人性化表达',
    max: 1.5,
    description: '内容是否有人性化语言风格',
    icon: 'Heart',
  },
  contentQuality: {
    name: '内容质量',
    max: 1.5,
    description: '内容深度、数据和案例',
    icon: 'FileCheck',
  },
  trustAuthority: {
    name: '信任权威',
    max: 1.5,
    description: '权威性和E-E-A-T评分',
    icon: 'Shield',
  },
  preciseCitation: {
    name: '精准引用',
    max: 1.0,
    description: '引用格式规范性和可追溯性',
    icon: 'Quote',
  },
  structuredData: {
    name: '结构化数据',
    max: 0.75,
    description: 'Schema标记和表格结构',
    icon: 'Database',
  },
  multiPlatform: {
    name: '多平台适配',
    max: 0.5,
    description: '适合多平台分发',
    icon: 'Share2',
  },
  seoKeywords: {
    name: 'SEO关键词',
    max: 0.25,
    description: '关键词覆盖和分布',
    icon: 'Search',
  },
};

// ==================== 核心评分函数 ====================

/**
 * 1. 问题导向评分 (满分1.5分)
 * V2核心 + V1用户意图覆盖
 */
function calculateProblemOriented(analysis: ContentAnalysisUnified): {
  score: number;
  questionPatterns: string[];
  suggestions: string[];
} {
  let score = 0;
  const questionPatterns: string[] = [];
  const suggestions: string[] = [];

  // 问题模式识别
  const questionIndicators = [
    { pattern: /如何|怎么/g, type: '操作指导类' },
    { pattern: /哪个|哪个好|推荐/g, type: '对比选择类' },
    { pattern: /什么是|区别|对比/g, type: '概念解释类' },
    { pattern: /为什么|原因/g, type: '原因分析类' },
    { pattern: /多少钱|价格|成本/g, type: '价格咨询类' },
    { pattern: /哪家|品牌|供应商/g, type: '供应商推荐类' },
  ];

  let matchedTypes = 0;
  for (const indicator of questionIndicators) {
    if (indicator.pattern.test(analysis.title) || indicator.pattern.test(analysis.content)) {
      questionPatterns.push(indicator.type);
      matchedTypes++;
    }
  }

  // 1. 标题为问题形式 (0.4分)
  const isQuestionTitle = /^(如何|怎么|哪个|什么|为什么|哪家)/.test(analysis.title);
  if (isQuestionTitle) {
    score += 0.4;
  } else {
    suggestions.push('📌 标题改为问句形式，如"如何选择合适的激光切割机？"');
  }

  // 2. 开门见山给出结论 (0.3分)
  const firstParagraph = analysis.content.substring(0, 500);
  const hasDirectAnswer = firstParagraph.includes('：') || 
                          firstParagraph.includes('如下') ||
                          firstParagraph.includes('包括') ||
                          /\d个要点|\d个方面/.test(firstParagraph);
  if (hasDirectAnswer) {
    score += 0.3;
  } else {
    suggestions.push('📌 第一段开门见山给出核心结论，AI更爱引用');
  }

  // 3. 问题覆盖度 (0.4分)
  if (matchedTypes >= 2) {
    score += 0.4;
  } else if (matchedTypes >= 1) {
    score += 0.25;
    suggestions.push('📌 内容覆盖更多用户关心的问题类型');
  }

  // 4. 用户意图直接回答 (0.4分) [V1合并]
  const hasIntentAnswer = analysis.content.includes('如何') || 
                          analysis.content.includes('怎么') ||
                          (analysis.content.includes('建议') && analysis.wordCount >= 1500);
  if (hasIntentAnswer && analysis.wordCount >= 2000) {
    score += 0.4;
  } else if (hasIntentAnswer) {
    score += 0.2;
    suggestions.push('📌 内容需要更深入，建议2000字以上');
  }

  return {
    score: Math.min(1.5, score),
    questionPatterns,
    suggestions,
  };
}

/**
 * 2. AI识别友好评分 (满分1.5分)
 * 来自 V2
 */
function calculateAIRecognition(analysis: ContentAnalysisUnified): number {
  let score = 0;

  // 1. 清晰的标题层级 (0.4分)
  const headingCount = (analysis.content.match(/^#{1,3}\s/gm) || []).length;
  if (headingCount >= 5) {
    score += 0.4;
  } else if (headingCount >= 3) {
    score += 0.3;
  } else if (headingCount >= 1) {
    score += 0.15;
  }

  // 2. 列表和表格结构 (0.4分)
  const hasLists = analysis.content.includes('- ') || 
                   analysis.content.includes('1. ') ||
                   analysis.content.includes('•');
  const hasTable = analysis.content.includes('|') && analysis.content.includes('---');
  if (hasTable) {
    score += 0.4;
  } else if (hasLists) {
    score += 0.3;
  }

  // 3. Schema结构化标记 (0.4分)
  if (analysis.hasSchema) {
    score += 0.4;
  } else if (analysis.hasFAQ) {
    score += 0.25;
  }

  // 4. 内容可抓取性 - 段落结构 (0.3分)
  const paragraphs = analysis.content.split('\n\n').filter(p => p.trim()).length;
  if (paragraphs >= 8) {
    score += 0.3;
  } else if (paragraphs >= 5) {
    score += 0.2;
  } else if (paragraphs >= 3) {
    score += 0.1;
  }

  return Math.min(1.5, score);
}

/**
 * 3. 人性化表达评分 (满分1.5分)
 * V1独立维度 - V1人性化GEO
 */
function calculateHumanizedExpression(analysis: ContentAnalysisUnified): {
  score: number;
  hasExaggeration: boolean;
} {
  let score = 0;
  let hasExaggeration = false;

  // 1. 用户意图覆盖 (0.3分)
  const hasIntentCoverage = analysis.content.includes('如何') || 
                            analysis.content.includes('怎么') || 
                            analysis.content.includes('为什么');
  if (hasIntentCoverage) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  // 2. 真实案例/实践展示 (0.3分)
  const hasRealExamples = analysis.content.includes('案例') || 
                          analysis.content.includes('实践') || 
                          analysis.content.includes('经验') ||
                          analysis.content.includes('客户') ||
                          analysis.content.includes('用户');
  if (hasRealExamples) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  // 3. 情感共鸣 - 人性化语言 (0.3分)
  const hasHumanVoice = analysis.content.includes('我们') || 
                        analysis.content.includes('你') || 
                        analysis.content.includes('建议') ||
                        analysis.content.includes('推荐');
  if (hasHumanVoice) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  // 4. 避免夸大和误导 (0.3分) [V1独有]
  const exaggerationWords = ['最好', '第一', '绝对', '最强', '唯一', '顶级', '终极'];
  hasExaggeration = exaggerationWords.some(word => analysis.content.includes(word));
  if (!hasExaggeration) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  // 5. 内容深度 (0.3分)
  if (analysis.wordCount > 3000) {
    score += 0.3;
  } else if (analysis.wordCount > 1500) {
    score += 0.2;
  } else if (analysis.wordCount > 800) {
    score += 0.1;
  }

  return { score: Math.min(1.5, score), hasExaggeration };
}

/**
 * 4. 内容质量评分 (满分1.5分)
 * V2 + V1数据准确性检测
 */
function calculateContentQuality(analysis: ContentAnalysisUnified): number {
  let score = 0;

  // 1. 内容深度 (0.4分) [V2]
  if (analysis.wordCount >= 4000) {
    score += 0.4;
  } else if (analysis.wordCount >= 2500) {
    score += 0.3;
  } else if (analysis.wordCount >= 1500) {
    score += 0.2;
  } else if (analysis.wordCount >= 800) {
    score += 0.1;
  }

  // 2. 数据支撑丰富度 (0.4分) [V2增强]
  const dataPatterns = [
    /\d+(\.\d+)?%/,           // 百分比
    /\d{4}年/,                // 年份
    /\d+万/,                  // 万级数字
    /\d+亿/,                  // 亿级数字
    /\d+(\.\d+)?倍/,          // 倍数
    /提升|增长|降低|减少/,    // 变化词
  ];
  const matchedPatterns = dataPatterns.filter(p => p.test(analysis.content)).length;
  if (matchedPatterns >= 5) {
    score += 0.4;
  } else if (matchedPatterns >= 3) {
    score += 0.3;
  } else if (matchedPatterns >= 1) {
    score += 0.15;
  }

  // 3. 真实案例 (0.3分) [V2]
  const hasRealCases = analysis.content.includes('案例') ||
                       analysis.content.includes('实践') ||
                       analysis.content.includes('客户') ||
                       analysis.content.includes('用户');
  if (hasRealCases) {
    score += 0.3;
  } else {
    score += 0.05;
  }

  // 4. 数据准确性 - 精确数字 (0.4分) [V1独有]
  const hasPreciseNumbers = /\d{1,3}(,\d{3})*(\.\d+)?/.test(analysis.content);
  const hasSpecificTime = /\d{4}年\d{1,2}月/.test(analysis.content);
  const hasExactQuantity = /\d+(万|亿|个|家|种)/.test(analysis.content);
  
  if (hasPreciseNumbers && hasSpecificTime) {
    score += 0.4;
  } else if (hasPreciseNumbers || hasExactQuantity) {
    score += 0.25;
  } else {
    score += 0.05;
  }

  return Math.min(1.5, score);
}

/**
 * 5. 信任权威评分 (满分1.5分)
 * V2 + V1 E-E-A-T 四维评分
 */
function calculateTrustAuthority(analysis: ContentAnalysisUnified): {
  score: number;
  hasAuthorInfo: boolean;
} {
  let score = 0;
  const hasAuthorInfo = !!analysis.author && analysis.author.length > 0;

  // ===== E-E-A-T 四维评分 (0.8分) [V1独有优势] =====
  
  // 1. Experience 经验展示 (0.2分)
  const hasExperience = analysis.content.includes('经验') || 
                        analysis.content.includes('实践') || 
                        analysis.content.includes('案例') ||
                        analysis.content.includes('我们');
  if (hasExperience) {
    score += 0.2;
  } else {
    score += 0.05;
  }

  // 2. Expertise 专业性 (0.2分)
  if (hasAuthorInfo) {
    score += 0.2;
  } else {
    score += 0.05;
  }

  // 3. Authoritativeness 权威性 (0.2分)
  const hasAuthority = analysis.content.includes('认证') || 
                       analysis.content.includes('资质') || 
                       analysis.content.includes('专利') ||
                       analysis.content.includes('奖项') ||
                       analysis.content.includes('标准');
  if (hasAuthority) {
    score += 0.2;
  } else {
    score += 0.05;
  }

  // 4. Trustworthiness 可信度 (0.2分)
  if (analysis.publishDate) {
    score += 0.2;
  } else {
    score += 0.05;
  }

  // ===== 权威来源引用 (0.4分) [V2] =====
  const authoritativeSources = ['.gov', '.edu', '.org', '报告', '研究', '标准', '认证', '论文'];
  const hasAuthoritative = authoritativeSources.some(source => 
    analysis.references?.some(ref => ref.includes(source)) || analysis.content.includes(source)
  );
  if (hasAuthoritative) {
    score += 0.4;
  } else {
    score += 0.1;
  }

  // ===== 第三方验证 (0.3分) [V2] =====
  const hasThirdParty = analysis.content.includes('评价') ||
                        analysis.content.includes('用户反馈') ||
                        analysis.content.includes('客户见证') ||
                        analysis.content.includes('口碑');
  if (hasThirdParty) {
    score += 0.3;
  } else {
    score += 0.05;
  }

  return { score: Math.min(1.5, score), hasAuthorInfo };
}

/**
 * 6. 精准引用评分 (满分1.0分)
 * V1独立维度
 */
function calculatePreciseCitation(analysis: ContentAnalysisUnified): {
  score: number;
  citationFormat: boolean;
} {
  let score = 0;

  // 1. 引用格式规范性 (0.35分) [V1独有]
  const citationFormat = /\[\d+\]|\[\d+,-\d+\]/.test(analysis.content) || 
                         analysis.content.includes('引用') ||
                         analysis.content.includes('来源');
  if (citationFormat) {
    score += 0.35;
  } else {
    score += 0.05;
  }

  // 2. 数据精确性 (0.35分) [V1独有]
  const hasPreciseData = /\d{1,3}(,\d{3})*(\.\d+)?/.test(analysis.content);
  if (hasPreciseData) {
    score += 0.35;
  } else {
    score += 0.05;
  }

  // 3. 来源可追溯性 (0.3分) [V1独有]
  const hasTraceability = (analysis.references && analysis.references.length > 0) ||
                          analysis.content.includes('来源') ||
                          analysis.content.includes('参考') ||
                          analysis.content.includes('转载');
  if (hasTraceability) {
    score += 0.3;
  } else {
    score += 0.05;
  }

  return { score: Math.min(1.0, score), citationFormat };
}

/**
 * 7. 结构化数据评分 (满分0.75分)
 * 来自 V2
 */
function calculateStructuredData(analysis: ContentAnalysisUnified): number {
  let score = 0;

  // Schema标记 (0.3分)
  if (analysis.hasSchema) {
    score += 0.3;
  }

  // FAQ模块 (0.25分)
  if (analysis.hasFAQ) {
    score += 0.25;
  }

  // 表格结构 (0.2分)
  if (analysis.content.includes('|') && analysis.content.includes('---')) {
    score += 0.2;
  } else if (analysis.content.includes('对比') || analysis.content.includes('表格')) {
    score += 0.1;
  }

  return Math.min(0.75, score);
}

/**
 * 8. 多平台适配评分 (满分0.5分)
 * 来自 V2
 */
function calculateMultiPlatform(analysis: ContentAnalysisUnified): number {
  let score = 0;

  // 1. 内容长度适中 (0.15分)
  if (analysis.wordCount >= 2000 && analysis.wordCount <= 6000) {
    score += 0.15;
  } else if (analysis.wordCount >= 1000) {
    score += 0.1;
  }

  // 2. 清晰段落结构 (0.15分)
  const paragraphs = analysis.content.split('\n\n').filter(p => p.trim()).length;
  if (paragraphs >= 6) {
    score += 0.15;
  } else if (paragraphs >= 4) {
    score += 0.1;
  }

  // 3. 标题适合分享 (0.1分)
  if (analysis.title.length >= 15 && analysis.title.length <= 40) {
    score += 0.1;
  } else {
    score += 0.05;
  }

  // 4. 分享元素 (0.1分)
  const shareableElements = [
    /\d+%/.test(analysis.content),
    analysis.content.includes('案例'),
    analysis.content.includes('数据'),
    analysis.content.includes('对比'),
  ];
  if (shareableElements.filter(Boolean).length >= 2) {
    score += 0.1;
  }

  return Math.min(0.5, score);
}

/**
 * 9. SEO关键词评分 (满分0.25分)
 * V2降权 + V1关键词密度
 */
function calculateSEOKeywords(analysis: ContentAnalysisUnified): {
  score: number;
  keywordsInTitle: boolean;
  keywordDensity: number;
} {
  let score = 0;
  const keywords = analysis.keywords || [];

  // 1. 核心关键词在标题中 (0.1分)
  const keywordsInTitle = keywords.some(k => 
    analysis.title.toLowerCase().includes(k.toLowerCase())
  );
  if (keywordsInTitle) {
    score += 0.1;
  }

  // 2. 关键词密度 (0.1分) [V1独有]
  let keywordDensity = 0;
  if (keywords.length > 0) {
    keywordDensity = keywords.filter(k => 
      analysis.content.toLowerCase().includes(k.toLowerCase())
    ).length / keywords.length;
    
    if (keywordDensity >= 0.8) {
      score += 0.1;
    } else if (keywordDensity >= 0.5) {
      score += 0.05;
    }
  }

  // 3. 长尾关键词覆盖 (0.05分) [V1独有]
  if (keywords.length >= 5) {
    score += 0.05;
  } else if (keywords.length >= 3) {
    score += 0.03;
  }

  return { score: Math.min(0.25, score), keywordsInTitle, keywordDensity };
}

// ==================== 辅助函数 ====================

/**
 * 识别内容模板类型
 */
function identifyContentTemplate(content: string, title: string): {
  type: 'qna' | 'comparison' | 'guide' | 'case' | 'report' | 'unknown';
  confidence: number;
  improvements: string[];
} {
  const improvements: string[] = [];
  
  // 问答型
  if (/^(如何|怎么|为什么|什么是)/.test(title)) {
    if (content.split('\n\n').length >= 5) {
      return {
        type: 'qna',
        confidence: 0.8,
        improvements: content.length < 3000 ? ['增加更多细节和案例支撑'] : [],
      };
    }
  }

  // 对比型
  if (title.includes('对比') || title.includes('VS') || title.includes('哪个好')) {
    if (content.includes('|') || content.includes('优势')) {
      return {
        type: 'comparison',
        confidence: 0.85,
        improvements: !content.includes('|') ? ['添加横向对比表格，AI更爱引用表格数据'] : [],
      };
    }
  }

  // 指南型
  if (title.includes('指南') || title.includes('教程') || title.includes('步骤')) {
    if (/\d+\./.test(content)) {
      return {
        type: 'guide',
        confidence: 0.8,
        improvements: [],
      };
    }
  }

  // 案例型
  if (title.includes('案例') || title.includes('实践')) {
    if (content.includes('客户') || content.includes('效果')) {
      return {
        type: 'case',
        confidence: 0.75,
        improvements: !/\d+%/.test(content) ? ['添加具体的数据指标'] : [],
      };
    }
  }

  // 报告型
  if (title.includes('报告') || title.includes('趋势')) {
    if (content.includes('增长') || content.includes('市场')) {
      return {
        type: 'report',
        confidence: 0.8,
        improvements: [],
      };
    }
  }

  return {
    type: 'unknown',
    confidence: 0.3,
    improvements: ['明确内容定位，选择问答、对比、指南等类型'],
  };
}

/**
 * 生成优化建议
 */
function generateSuggestions(
  breakdown: GEOScoreUnified['breakdown'],
  problemOriented: { questionPatterns: string[]; suggestions: string[] },
  hasExaggeration: boolean,
  hasAuthorInfo: boolean
): string[] {
  const suggestions: string[] = [];

  // 问题导向建议
  if (breakdown.problemOriented < 1.2) {
    suggestions.push(...problemOriented.suggestions);
  }

  // AI识别友好建议
  if (breakdown.aiRecognition < 1.0) {
    suggestions.push('🏗️ 使用清晰的标题层级（H1-H6），至少3个标题');
    suggestions.push('🏗️ 添加列表或表格结构，便于AI解析');
  }

  // 人性化表达建议
  if (breakdown.humanizedExpression < 1.0) {
    if (hasExaggeration) {
      suggestions.push('💬 避免使用"最好"、"第一"、"绝对"等夸大词汇');
    }
    suggestions.push('💬 增加真实案例和实践经验分享');
    suggestions.push('💬 使用"我们"、"你"等人性化语言');
  }

  // 内容质量建议
  if (breakdown.contentQuality < 1.0) {
    suggestions.push('📊 添加具体数据支撑，如百分比、年份、数量');
    suggestions.push('📊 内容深度扩展至2500字以上');
  }

  // 信任权威建议
  if (breakdown.trustAuthority < 1.0) {
    if (!hasAuthorInfo) {
      suggestions.push('👤 标明作者身份和专业背景');
    }
    suggestions.push('👤 引用权威来源（.gov/.edu/行业报告）');
    suggestions.push('👤 展示资质认证、专利或奖项');
  }

  // 精准引用建议
  if (breakdown.preciseCitation < 0.7) {
    suggestions.push('📝 使用规范的引用格式，如[1]、[2]标注');
    suggestions.push('📝 确保数据来源可追溯');
  }

  // 结构化数据建议
  if (breakdown.structuredData < 0.5) {
    suggestions.push('🗂️ 添加FAQ模块，直接回答常见问题');
    suggestions.push('🗂️ 使用表格呈现对比数据');
  }

  return suggestions;
}

/**
 * 生成快速提升建议
 */
function generateQuickWins(analysis: ContentAnalysisUnified): string[] {
  const quickWins: string[] = [];

  // 标题优化
  if (!/^(如何|怎么|哪个|什么)/.test(analysis.title)) {
    quickWins.push('将标题改为问句形式');
  }

  // 添加FAQ
  if (!analysis.hasFAQ) {
    quickWins.push('在文末添加3-5个FAQ问答');
  }

  // 添加数据
  if (!/\d+%/.test(analysis.content)) {
    quickWins.push('添加至少3个百分比数据');
  }

  // 添加案例
  if (!analysis.content.includes('案例')) {
    quickWins.push('添加1-2个真实案例');
  }

  // 添加对比表格
  if (!analysis.content.includes('|')) {
    quickWins.push('添加横向对比表格');
  }

  return quickWins.slice(0, 5);
}

// ==================== 主评分函数 ====================

/**
 * 计算 GEO 评分（统一版）
 */
export function calculateGEOScore(analysis: ContentAnalysisUnified): GEOScoreUnified {
  // 1. 问题导向
  const problemOrientedResult = calculateProblemOriented(analysis);
  
  // 2. AI识别友好
  const aiRecognition = calculateAIRecognition(analysis);
  
  // 3. 人性化表达
  const humanizedResult = calculateHumanizedExpression(analysis);
  
  // 4. 内容质量
  const contentQuality = calculateContentQuality(analysis);
  
  // 5. 信任权威
  const trustAuthorityResult = calculateTrustAuthority(analysis);
  
  // 6. 精准引用
  const citationResult = calculatePreciseCitation(analysis);
  
  // 7. 结构化数据
  const structuredData = calculateStructuredData(analysis);
  
  // 8. 多平台适配
  const multiPlatform = calculateMultiPlatform(analysis);
  
  // 9. SEO关键词
  const seoResult = calculateSEOKeywords(analysis);

  // 构建评分结果
  const breakdown: GEOScoreUnified['breakdown'] = {
    problemOriented: problemOrientedResult.score,
    aiRecognition,
    humanizedExpression: humanizedResult.score,
    contentQuality,
    trustAuthority: trustAuthorityResult.score,
    preciseCitation: citationResult.score,
    structuredData,
    multiPlatform,
    seoKeywords: seoResult.score,
  };

  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  // 识别内容模板
  const contentTemplate = identifyContentTemplate(analysis.content, analysis.title);

  // 生成建议
  const suggestions = generateSuggestions(
    breakdown,
    { questionPatterns: problemOrientedResult.questionPatterns, suggestions: problemOrientedResult.suggestions },
    humanizedResult.hasExaggeration,
    trustAuthorityResult.hasAuthorInfo
  );

  // 生成快速提升建议
  const quickWins = generateQuickWins(analysis);

  return {
    total: Math.round(total * 100) / 100,
    breakdown,
    analysis: {
      questionPatterns: problemOrientedResult.questionPatterns,
      contentTemplate,
      wordCount: analysis.wordCount,
      hasImages: analysis.hasImages || false,
      hasSchema: analysis.hasSchema || false,
      hasFAQ: analysis.hasFAQ || false,
      keywordsInTitle: seoResult.keywordsInTitle,
      keywordDensity: seoResult.keywordDensity,
      hasExaggeration: humanizedResult.hasExaggeration,
      citationFormat: citationResult.citationFormat,
      hasAuthorInfo: trustAuthorityResult.hasAuthorInfo,
    },
    suggestions,
    quickWins,
  };
}

/**
 * 获取评分等级
 */
export function getGrade(total: number): GEOGrade {
  if (total >= 9.0) return GRADE_CONFIG['A+'];
  if (total >= 8.0) return GRADE_CONFIG['A'];
  if (total >= 6.5) return GRADE_CONFIG['B'];
  if (total >= 5.0) return GRADE_CONFIG['C'];
  if (total >= 3.0) return GRADE_CONFIG['D'];
  return GRADE_CONFIG['F'];
}

// ==================== 向后兼容导出 ====================

// 兼容旧类型
export type { ContentAnalysisUnified as ContentAnalysis };
export type { GEOScoreUnified as GEOScore };

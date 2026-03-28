/**
 * GEO优化评分系统 V2.0
 * 基于阿里云GEO优化落地指南的全面升级版
 * 增加问题导向、AI识别、多平台适配等维度
 */

export interface GEOScoreV2 {
  total: number;
  breakdown: {
    // 核心维度（文章重点强调）
    problemOriented: number;      // 问题导向 (权重2.0分) - 是否围绕用户问题
    aiRecognition: number;        // AI识别友好 (权重2.0分) - 是否易于AI抓取理解
    contentQuality: number;       // 内容质量 (权重2.0分) - 深度、数据、案例
    trustBuilding: number;        // 信任建立 (权重1.5分) - 权威性、第三方验证
    structuredData: number;       // 结构化数据 (权重1.0分) - Schema标记、表格
    multiPlatform: number;        // 多平台适配 (权重1.0分) - 适合多平台分发
    seakeywords: number;          // SEO关键词 (权重0.5分) - 关键词覆盖
  };
  problemAnalysis: {
    questionPatterns: string[];   // 识别到的问题模式
    questionScore: number;        // 问题匹配度
    suggestions: string[];        // 问题优化建议
  };
  contentTemplate?: {
    type: 'qna' | 'comparison' | 'guide' | 'case' | 'report' | 'unknown';
    confidence: number;
    improvements: string[];
  };
  platformSuggestions: {
    primary: string[];    // 主推平台
    secondary: string[];  // 次要平台
    reasons: string[];    // 推荐理由
  };
  suggestions: string[];
  quickWins: string[];   // 快速提升建议
}

export interface ContentAnalysisV2 {
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

/**
 * 问题导向评分 (满分2.0分)
 * 评估内容是否围绕用户问题展开
 */
function calculateProblemOriented(analysis: ContentAnalysisV2): {
  score: number;
  questionPatterns: string[];
  questionScore: number;
  suggestions: string[];
} {
  let score = 0;
  const questionPatterns: string[] = [];
  const suggestions: string[] = [];

  // 识别问题模式
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

  // 1. 标题是否为问题形式 (0.5分)
  const isQuestionTitle = /^(如何|怎么|哪个|什么|为什么|哪家)/.test(analysis.title);
  if (isQuestionTitle) {
    score += 0.5;
  } else {
    suggestions.push('📌 标题改为问句形式，如"如何选择合适的激光切割机？"');
  }

  // 2. 开门见山给出结论 (0.5分)
  const firstParagraph = analysis.content.substring(0, 500);
  const hasDirectAnswer = firstParagraph.includes('：') || 
                          firstParagraph.includes('如下') ||
                          firstParagraph.includes('包括') ||
                          /\d个要点|\d个方面/.test(firstParagraph);
  if (hasDirectAnswer) {
    score += 0.5;
  } else {
    suggestions.push('📌 第一段开门见山给出核心结论，AI更爱引用');
  }

  // 3. 问题覆盖度 (0.5分)
  if (matchedTypes >= 2) {
    score += 0.5;
  } else if (matchedTypes >= 1) {
    score += 0.3;
    suggestions.push('📌 内容覆盖更多用户关心的问题类型');
  }

  // 4. 内容是否完整回答问题 (0.5分)
  const hasCompleteAnswer = analysis.wordCount >= 2000 && 
                            (analysis.content.includes('总结') || 
                             analysis.content.includes('结论') ||
                             analysis.content.includes('建议'));
  if (hasCompleteAnswer) {
    score += 0.5;
  } else {
    suggestions.push('📌 内容需要更深入，建议2000字以上，包含总结建议');
  }

  return {
    score: Math.min(2.0, score),
    questionPatterns,
    questionScore: matchedTypes * 25,
    suggestions,
  };
}

/**
 * AI识别友好评分 (满分2.0分)
 * 评估内容是否易于AI抓取和理解
 */
function calculateAIRecognition(analysis: ContentAnalysisV2): number {
  let score = 0;

  // 1. 清晰的标题层级 (0.5分)
  const hasClearHeadings = (analysis.content.match(/^#{1,3}\s/gm) || []).length >= 3;
  if (hasClearHeadings) {
    score += 0.5;
  } else {
    score += 0.2;
  }

  // 2. 列表和表格结构 (0.5分)
  const hasLists = analysis.content.includes('- ') || 
                   analysis.content.includes('1. ') ||
                   analysis.content.includes('|');
  if (hasLists) {
    score += 0.5;
  } else {
    score += 0.2;
  }

  // 3. 避免纯JS渲染内容（模拟判断）(0.5分)
  // 假设所有提交的内容都是可渲染的
  score += 0.5;

  // 4. Schema结构化标记 (0.5分)
  if (analysis.hasSchema) {
    score += 0.5;
  } else if (analysis.hasFAQ) {
    score += 0.3;
  } else {
    score += 0.1;
  }

  return Math.min(2.0, score);
}

/**
 * 内容质量评分 (满分2.0分)
 * 基于文章"爆款公式"的评估
 */
function calculateContentQuality(analysis: ContentAnalysisV2): number {
  let score = 0;

  // 1. 内容深度 - 5000字左右最佳 (0.5分)
  if (analysis.wordCount >= 4000) {
    score += 0.5;
  } else if (analysis.wordCount >= 2000) {
    score += 0.4;
  } else if (analysis.wordCount >= 1000) {
    score += 0.2;
  }

  // 2. 具体数据支撑 (0.5分)
  const dataPatterns = [
    /\d+(\.\d+)?%/,           // 百分比
    /\d{4}年/,                // 年份
    /\d+万/,                  // 万级数字
    /\d+亿/,                  // 亿级数字
    /\d+(\.\d+)?倍/,          // 倍数
    /提升|增长|降低|减少/,    // 变化词
  ];
  const matchedPatterns = dataPatterns.filter(p => p.test(analysis.content)).length;
  if (matchedPatterns >= 4) {
    score += 0.5;
  } else if (matchedPatterns >= 2) {
    score += 0.3;
  }

  // 3. 真实案例 (0.5分)
  const hasRealCases = analysis.content.includes('案例') ||
                       analysis.content.includes('实践') ||
                       analysis.content.includes('客户') ||
                       analysis.content.includes('用户');
  if (hasRealCases) {
    score += 0.5;
  } else {
    score += 0.1;
  }

  // 4. 避免空话套话 (0.5分)
  const emptyPhrases = ['行业领先', '匠心品质', '技术领先', '品质保证'];
  const hasEmptyPhrases = emptyPhrases.some(phrase => analysis.content.includes(phrase));
  if (!hasEmptyPhrases) {
    score += 0.5;
  } else {
    score += 0.2;
  }

  return Math.min(2.0, score);
}

/**
 * 信任建立评分 (满分1.5分)
 * 基于文章"AI不相信你"的分析
 */
function calculateTrustBuilding(analysis: ContentAnalysisV2): number {
  let score = 0;

  // 1. 权威来源引用 (0.5分)
  const authoritativeSources = ['.gov', '.edu', '.org', '报告', '研究', '标准', '认证'];
  const hasAuthoritative = authoritativeSources.some(source => 
    analysis.references?.some(ref => ref.includes(source)) || analysis.content.includes(source)
  );
  if (hasAuthoritative) {
    score += 0.5;
  } else {
    score += 0.1;
  }

  // 2. 第三方验证 (0.5分)
  const hasThirdParty = analysis.content.includes('评价') ||
                        analysis.content.includes('用户反馈') ||
                        analysis.content.includes('客户见证') ||
                        analysis.content.includes('认证');
  if (hasThirdParty) {
    score += 0.5;
  } else {
    score += 0.1;
  }

  // 3. 作者身份透明 (0.5分)
  if (analysis.author && analysis.author.length > 0) {
    score += 0.5;
  } else {
    score += 0.1;
  }

  return Math.min(1.5, score);
}

/**
 * 结构化数据评分 (满分1.0分)
 */
function calculateStructuredData(analysis: ContentAnalysisV2): number {
  let score = 0;

  // Schema标记 (0.4分)
  if (analysis.hasSchema) {
    score += 0.4;
  }

  // FAQ模块 (0.3分)
  if (analysis.hasFAQ) {
    score += 0.3;
  }

  // 表格结构 (0.3分)
  if (analysis.content.includes('|') && analysis.content.includes('---')) {
    score += 0.3;
  } else if (analysis.content.includes('对比') || analysis.content.includes('表格')) {
    score += 0.1;
  }

  return Math.min(1.0, score);
}

/**
 * 多平台适配评分 (满分1.0分)
 * 评估内容是否适合多平台分发
 */
function calculateMultiPlatform(analysis: ContentAnalysisV2): number {
  let score = 0;

  // 1. 内容长度适中（适合多平台）(0.3分)
  if (analysis.wordCount >= 2000 && analysis.wordCount <= 6000) {
    score += 0.3;
  } else if (analysis.wordCount >= 1000) {
    score += 0.2;
  }

  // 2. 有清晰的段落结构 (0.3分)
  const paragraphs = analysis.content.split('\n\n').length;
  if (paragraphs >= 5) {
    score += 0.3;
  } else if (paragraphs >= 3) {
    score += 0.2;
  }

  // 3. 标题适合作为分享标题 (0.2分)
  if (analysis.title.length >= 15 && analysis.title.length <= 40) {
    score += 0.2;
  } else {
    score += 0.1;
  }

  // 4. 包含分享元素（数据、案例等）(0.2分)
  const shareableElements = [
    /\d+%/.test(analysis.content),
    analysis.content.includes('案例'),
    analysis.content.includes('数据'),
    analysis.content.includes('对比'),
  ];
  if (shareableElements.filter(Boolean).length >= 2) {
    score += 0.2;
  }

  return Math.min(1.0, score);
}

/**
 * SEO关键词评分 (满分0.5分)
 */
function calculateSEOKeywords(analysis: ContentAnalysisV2): number {
  let score = 0;
  const keywords = analysis.keywords || [];

  // 关键词在标题中 (0.3分)
  const hasKeywordsInTitle = keywords.some(k => 
    analysis.title.toLowerCase().includes(k.toLowerCase())
  );
  if (hasKeywordsInTitle) {
    score += 0.3;
  }

  // 关键词数量 (0.2分)
  if (keywords.length >= 5) {
    score += 0.2;
  } else if (keywords.length >= 3) {
    score += 0.1;
  }

  return Math.min(0.5, score);
}

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
  if (/^(如何|怎么|为什么|什么是)/.test(title) || content.includes('?') || content.includes('？')) {
    if (content.includes('答：') || content.includes('回答：') || content.split('\n\n').length >= 5) {
      return {
        type: 'qna',
        confidence: 0.8,
        improvements: content.length < 3000 ? ['增加更多细节和案例支撑'] : [],
      };
    }
  }

  // 对比型
  if (title.includes('对比') || title.includes('VS') || title.includes('vs') || title.includes('哪个好')) {
    if (content.includes('|') || content.includes('表格') || content.includes('优势')) {
      return {
        type: 'comparison',
        confidence: 0.85,
        improvements: !content.includes('|') ? ['添加横向对比表格，AI更爱引用表格数据'] : [],
      };
    }
  }

  // 指南型
  if (title.includes('指南') || title.includes('教程') || title.includes('步骤')) {
    if (content.includes('步骤') || content.includes('第一步') || /\d+\./.test(content)) {
      return {
        type: 'guide',
        confidence: 0.8,
        improvements: !content.includes('步骤') ? ['添加明确的步骤编号和说明'] : [],
      };
    }
  }

  // 案例型
  if (title.includes('案例') || title.includes('故事') || title.includes('实践')) {
    if (content.includes('客户') || content.includes('用户') || content.includes('效果')) {
      return {
        type: 'case',
        confidence: 0.75,
        improvements: !/\d+%/.test(content) ? ['添加具体的数据指标，如提升百分比'] : [],
      };
    }
  }

  // 报告型
  if (title.includes('报告') || title.includes('趋势') || title.includes('分析')) {
    if (content.includes('年') && (content.includes('增长') || content.includes('市场'))) {
      return {
        type: 'report',
        confidence: 0.8,
        improvements: !content.includes('数据来源') ? ['添加数据来源标注，提升可信度'] : [],
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
 * 生成平台发布建议
 */
function generatePlatformSuggestions(analysis: ContentAnalysisV2): {
  primary: string[];
  secondary: string[];
  reasons: string[];
} {
  const reasons: string[] = [];
  const primary: string[] = [];
  const secondary: string[] = [];

  // 基于内容特征推荐平台
  const isProfessional = analysis.content.includes('技术') || 
                        analysis.content.includes('专业') ||
                        analysis.content.includes('参数');
  const isHowTo = analysis.title.includes('如何') || analysis.title.includes('怎么');
  const hasData = /\d+%/.test(analysis.content) || analysis.content.includes('数据');

  if (isProfessional) {
    primary.push('知乎专栏');
    primary.push('百度百家号');
    reasons.push('专业内容在知乎和百家号引用率高');
  }

  if (isHowTo) {
    primary.push('知乎专栏');
    primary.push('搜狐号');
    reasons.push('操作指南类内容适合知乎问答形式');
  }

  if (hasData) {
    primary.push('百度百家号');
    primary.push('今日头条');
    reasons.push('数据丰富的内容容易被AI引用');
  }

  // 默认推荐
  if (primary.length === 0) {
    primary.push('知乎专栏', '搜狐号', '百度百家号');
  }

  secondary.push('今日头条', '微信公众号');
  reasons.push('多平台分发可提升内容曝光率');

  return { primary: [...new Set(primary)], secondary, reasons };
}

/**
 * 生成优化建议
 */
function generateSuggestionsV2(score: GEOScoreV2, problemOriented: any): string[] {
  const suggestions: string[] = [];

  // 问题导向建议
  if (score.breakdown.problemOriented < 1.5) {
    suggestions.push('🎯 标题改为问题形式，如"如何选择...""哪个品牌好..."');
    suggestions.push('🎯 第一段直接给出核心结论，AI更爱引用开门见山的内容');
    if (problemOriented.questionPatterns.length < 2) {
      suggestions.push('🎯 覆盖更多用户问题：操作指导、对比选择、价格咨询等');
    }
  }

  // 内容质量建议
  if (score.breakdown.contentQuality < 1.5) {
    if (score.breakdown.contentQuality < 1.0) {
      suggestions.push('📝 内容深度不足，建议扩展至3000-5000字');
    }
    suggestions.push('📝 添加具体数据：百分比、倍数、具体数字');
    suggestions.push('📝 补充真实案例：客户故事、使用效果');
  }

  // 信任建立建议
  if (score.breakdown.trustBuilding < 1.0) {
    suggestions.push('✅ 引用权威来源：政府网站(.gov)、教育机构(.edu)、行业报告');
    suggestions.push('✅ 添加第三方验证：用户评价、行业认证、媒体报道');
  }

  // AI识别建议
  if (score.breakdown.aiRecognition < 1.5) {
    suggestions.push('🔍 使用清晰的标题层级(H2/H3)');
    suggestions.push('🔍 添加表格和列表，便于AI提取信息');
  }

  // 结构化建议
  if (score.breakdown.structuredData < 0.7) {
    suggestions.push('📊 添加Schema.org结构化标记');
    suggestions.push('📊 创建FAQ模块直接回答常见问题');
  }

  return suggestions;
}

/**
 * 生成快速提升建议
 */
function generateQuickWins(analysis: ContentAnalysisV2): string[] {
  const quickWins: string[] = [];

  // 快速可实现的优化
  if (!analysis.title.includes('?') && !analysis.title.includes('？')) {
    quickWins.push('⚡ 5分钟：标题改为问句形式');
  }

  if (analysis.wordCount < 2000) {
    quickWins.push('⚡ 30分钟：补充案例和数据，扩展至2000字以上');
  }

  if (!analysis.references || analysis.references.length < 3) {
    quickWins.push('⚡ 10分钟：添加3个以上权威参考来源');
  }

  if (!analysis.content.includes('|') && analysis.content.includes('对比')) {
    quickWins.push('⚡ 15分钟：添加横向对比表格');
  }

  if (!analysis.author) {
    quickWins.push('⚡ 1分钟：添加作者信息，提升可信度');
  }

  return quickWins.slice(0, 5); // 最多5条快速建议
}

/**
 * 主评分函数 V2.0
 */
export function calculateGEOScoreV2(analysis: ContentAnalysisV2): GEOScoreV2 {
  // 计算各维度得分
  const problemOrientedResult = calculateProblemOriented(analysis);
  
  const breakdown = {
    problemOriented: problemOrientedResult.score,
    aiRecognition: calculateAIRecognition(analysis),
    contentQuality: calculateContentQuality(analysis),
    trustBuilding: calculateTrustBuilding(analysis),
    structuredData: calculateStructuredData(analysis),
    multiPlatform: calculateMultiPlatform(analysis),
    seakeywords: calculateSEOKeywords(analysis),
  };

  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  const result: GEOScoreV2 = {
    total: Math.round(total * 10) / 10,
    breakdown,
    problemAnalysis: {
      questionPatterns: problemOrientedResult.questionPatterns,
      questionScore: problemOrientedResult.questionScore,
      suggestions: problemOrientedResult.suggestions,
    },
    contentTemplate: identifyContentTemplate(analysis.content, analysis.title),
    platformSuggestions: generatePlatformSuggestions(analysis),
    suggestions: [],
    quickWins: [],
  };

  result.suggestions = generateSuggestionsV2(result, problemOrientedResult);
  result.quickWins = generateQuickWins(analysis);

  return result;
}

/**
 * 获取评分等级 V2.0
 */
export function getGradeV2(total: number): { grade: string; color: string; description: string; aiReferenceRate: string } {
  if (total >= 9.0) {
    return { 
      grade: 'A+', 
      color: 'text-green-600', 
      description: '优秀 - 极高的AI引用潜力',
      aiReferenceRate: '预计80%+的AI引用率'
    };
  } else if (total >= 8.0) {
    return { 
      grade: 'A', 
      color: 'text-green-500', 
      description: '良好 - 高AI引用率',
      aiReferenceRate: '预计60-80%的AI引用率'
    };
  } else if (total >= 7.0) {
    return { 
      grade: 'B+', 
      color: 'text-blue-600', 
      description: '中等偏上 - 较好AI引用率',
      aiReferenceRate: '预计40-60%的AI引用率'
    };
  } else if (total >= 6.0) {
    return { 
      grade: 'B', 
      color: 'text-blue-500', 
      description: '中等 - 一般AI引用率',
      aiReferenceRate: '预计20-40%的AI引用率'
    };
  } else if (total >= 5.0) {
    return { 
      grade: 'C', 
      color: 'text-yellow-600', 
      description: '及格 - 需要优化',
      aiReferenceRate: '预计10-20%的AI引用率'
    };
  } else {
    return { 
      grade: 'D', 
      color: 'text-red-600', 
      description: '不及格 - 急需优化',
      aiReferenceRate: '预计<10%的AI引用率'
    };
  }
}

/**
 * 导出统一版本（兼容旧版本接口）
 * 注意：现在统一版本取代了 V1 和 V2
 */
export { calculateGEOScore, getGrade } from './geo-scoring-unified';
export type { GEOScoreUnified, ContentAnalysisUnified } from './geo-scoring-unified';
// 兼容旧类型名称
export type { GEOScoreUnified as GEOScore, ContentAnalysisUnified as ContentAnalysis } from './geo-scoring-unified';

/**
 * 账号人设管理系统
 * 支持个性化选题推送、专属创作风格
 */

export interface Persona {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  industry: string;
  expertise: string[];
  tone: 'professional' | 'friendly' | 'academic' | 'casual';
  writingStyle: {
    sentenceLength: 'short' | 'medium' | 'long';
    paragraphStyle: 'concise' | 'detailed';
    useEmoji: boolean;
    useBold: boolean;
    useList: boolean;
  };
  contentPreferences: {
    preferredTypes: string[];
    targetAudience: string[];
    keywords: string[];
    avoidTopics: string[];
  };
  postingSchedule: {
    preferredTimes: string[];
    frequency: 'daily' | 'weekly' | 'biweekly';
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 选题推荐
 */
export interface TopicRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'trending' | 'evergreen' | 'seasonal' | 'newsjacking';
  relevanceScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedEngagement: number;
  suggestedOutline: string[];
  relatedKeywords: string[];
  platforms: string[];
  reason: string;
}

/**
 * 预设人设模板
 */
export const personaTemplates: Record<string, Partial<Persona>> = {
  'tech-expert': {
    name: '技术专家',
    description: '深耕行业多年的技术专家，擅长用通俗易懂的方式解读技术',
    tone: 'professional',
    writingStyle: {
      sentenceLength: 'medium',
      paragraphStyle: 'detailed',
      useEmoji: false,
      useBold: true,
      useList: true,
    },
    contentPreferences: {
      preferredTypes: ['技术解析', '产品评测', '行业洞察'],
      targetAudience: ['工程师', '技术决策者', '采购负责人'],
      keywords: ['技术', '创新', '性能', '效率'],
      avoidTopics: ['八卦', '娱乐'],
    },
  },
  'industry-analyst': {
    name: '行业分析师',
    description: '专注行业趋势分析，用数据说话的理性分析师',
    tone: 'academic',
    writingStyle: {
      sentenceLength: 'long',
      paragraphStyle: 'detailed',
      useEmoji: false,
      useBold: true,
      useList: true,
    },
    contentPreferences: {
      preferredTypes: ['市场分析', '趋势预测', '竞品对比'],
      targetAudience: ['管理层', '投资者', '行业从业者'],
      keywords: ['市场', '趋势', '数据', '分析'],
      avoidTopics: ['个人情感', '主观臆断'],
    },
  },
  'practitioner': {
    name: '实战派',
    description: '一线从业者，分享真实经验和实操技巧',
    tone: 'friendly',
    writingStyle: {
      sentenceLength: 'short',
      paragraphStyle: 'concise',
      useEmoji: true,
      useBold: true,
      useList: true,
    },
    contentPreferences: {
      preferredTypes: ['实操指南', '经验分享', '避坑指南'],
      targetAudience: ['同行', '新人', '学习者'],
      keywords: ['实操', '经验', '技巧', '案例'],
      avoidTopics: ['纯理论'],
    },
  },
  'brand-ambassador': {
    name: '品牌代言人',
    description: '品牌形象代表，传递品牌价值和理念',
    tone: 'friendly',
    writingStyle: {
      sentenceLength: 'medium',
      paragraphStyle: 'concise',
      useEmoji: true,
      useBold: false,
      useList: true,
    },
    contentPreferences: {
      preferredTypes: ['品牌故事', '用户案例', '产品介绍'],
      targetAudience: ['潜在客户', '合作伙伴'],
      keywords: ['品牌', '价值', '服务', '品质'],
      avoidTopics: ['负面话题', '竞品'],
    },
  },
  'newbie-friendly': {
    name: '新手导师',
    description: '从零开始教起，帮助新手快速入门',
    tone: 'casual',
    writingStyle: {
      sentenceLength: 'short',
      paragraphStyle: 'concise',
      useEmoji: true,
      useBold: true,
      useList: true,
    },
    contentPreferences: {
      preferredTypes: ['入门指南', '基础教程', '常见问题'],
      targetAudience: ['新手', '入门者', '小白'],
      keywords: ['入门', '基础', '教程', '指南'],
      avoidTopics: ['高级话题', '专业术语'],
    },
  },
};

/**
 * 选题推荐引擎
 */
export function recommendTopics(
  persona: Persona,
  industryKeywords: string[],
  trendingTopics: string[] = []
): TopicRecommendation[] {
  const recommendations: TopicRecommendation[] = [];

  // 1. 基于人设专长领域推荐
  persona.expertise.forEach((exp, index) => {
    const keywords = industryKeywords.filter(k => k.includes(exp));
    keywords.forEach((keyword, kIndex) => {
      recommendations.push({
        id: `expertise-${index}-${kIndex}`,
        title: generateTitle(keyword, persona.contentPreferences.preferredTypes[0]),
        description: `基于您在${exp}领域的专业背景推荐`,
        type: 'evergreen',
        relevanceScore: 90 + Math.random() * 10,
        difficulty: persona.tone === 'professional' ? 'medium' : 'easy',
        estimatedEngagement: Math.floor(Math.random() * 500) + 300,
        suggestedOutline: generateOutline(keyword, persona),
        relatedKeywords: keywords.slice(0, 5),
        platforms: ['知乎', '微信公众号'],
        reason: '与您的专业领域高度相关',
      });
    });
  });

  // 2. 基于热点话题推荐
  trendingTopics.slice(0, 5).forEach((topic, index) => {
    if (!persona.contentPreferences.avoidTopics.some(a => topic.includes(a))) {
      recommendations.push({
        id: `trending-${index}`,
        title: generateTitle(topic, '热点解读'),
        description: `${topic}相关热点话题`,
        type: 'trending',
        relevanceScore: 70 + Math.random() * 20,
        difficulty: 'medium',
        estimatedEngagement: Math.floor(Math.random() * 1000) + 500,
        suggestedOutline: generateOutline(topic, persona),
        relatedKeywords: [topic],
        platforms: ['微博', '今日头条'],
        reason: '当前热点，高曝光潜力',
      });
    }
  });

  // 3. 基于目标受众推荐
  persona.contentPreferences.targetAudience.forEach((audience, index) => {
    const title = `给${audience}的${persona.expertise[0] || '专业'}指南`;
    recommendations.push({
      id: `audience-${index}`,
      title,
      description: `针对${audience}群体创作的定向内容`,
      type: 'evergreen',
      relevanceScore: 85 + Math.random() * 15,
      difficulty: 'easy',
      estimatedEngagement: Math.floor(Math.random() * 400) + 200,
      suggestedOutline: generateOutline(title, persona),
      relatedKeywords: persona.contentPreferences.keywords,
      platforms: getPlatformsForAudience(audience),
      reason: `精准触达${audience}群体`,
    });
  });

  // 按相关性排序并去重
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

/**
 * 生成标题
 */
function generateTitle(keyword: string, type: string): string {
  const templates: Record<string, string[]> = {
    '技术解析': [
      `${keyword}技术深度解析：原理与应用`,
      `一文读懂${keyword}核心技术`,
      `${keyword}技术演进与未来趋势`,
    ],
    '实操指南': [
      `${keyword}实操指南：从入门到精通`,
      `如何正确使用${keyword}？`,
      `${keyword}操作手册：避坑指南`,
    ],
    '产品评测': [
      `${keyword}评测：性能与性价比分析`,
      `${keyword}选购指南：如何挑选最适合的`,
      `${keyword}横向对比：哪款更值得买？`,
    ],
    '入门指南': [
      `${keyword}入门：新手必看指南`,
      `从零开始学习${keyword}`,
      `${keyword}基础知识大全`,
    ],
    '热点解读': [
      `${keyword}热点事件深度解读`,
      `${keyword}背后的故事与影响`,
      `为什么${keyword}成为热点？`,
    ],
  };

  const typeTemplates = templates[type] || templates['技术解析'];
  return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
}

/**
 * 生成大纲
 */
function generateOutline(topic: string, persona: Persona): string[] {
  const baseOutline = [
    `引言：${topic}的重要性和背景`,
    `核心概念：什么是${topic}`,
    `详细解析：${topic}的关键要素`,
    `实践应用：如何在实际中运用`,
    `总结与建议`,
  ];

  // 根据人设风格调整
  if (persona.writingStyle.paragraphStyle === 'concise') {
    return baseOutline.slice(0, 4);
  }

  if (persona.contentPreferences.preferredTypes.includes('案例')) {
    baseOutline.splice(3, 0, '案例分析：真实应用场景');
  }

  return baseOutline;
}

/**
 * 获取适合的平台
 */
function getPlatformsForAudience(audience: string): string[] {
  const mapping: Record<string, string[]> = {
    '工程师': ['知乎', 'CSDN', '掘金'],
    '管理层': ['微信公众号', '领英'],
    '投资者': ['雪球', '微信公众号'],
    '新手': ['小红书', '知乎', 'B站'],
    '同行': ['知乎', '微信公众号', '行业垂直平台'],
  };
  return mapping[audience] || ['知乎', '微信公众号'];
}

/**
 * 人设内容适配器
 */
export function adaptContentForPersona(
  content: string,
  persona: Persona
): {
  adaptedContent: string;
  changes: string[];
} {
  const changes: string[] = [];
  let adaptedContent = content;

  // 句子长度调整
  if (persona.writingStyle.sentenceLength === 'short') {
    // 将长句拆分
    adaptedContent = adaptedContent.replace(/([^。！？]{50，})[，、]/g, '$1。\n');
    changes.push('已将长句拆分为短句');
  }

  // 段落风格调整
  if (persona.writingStyle.paragraphStyle === 'concise') {
    // 精简段落
    adaptedContent = adaptedContent.replace(/\n{2,}/g, '\n\n');
    changes.push('已精简段落结构');
  }

  // 表情符号
  if (persona.writingStyle.useEmoji) {
    adaptedContent = adaptedContent
      .replace(/✓/g, '✅')
      .replace(/×/g, '❌')
      .replace(/重要/g, '⚠️ 重要');
    changes.push('已添加表情符号');
  }

  // 加粗处理
  if (persona.writingStyle.useBold) {
    // 为关键词加粗
    persona.contentPreferences.keywords.forEach(keyword => {
      adaptedContent = adaptedContent.replace(
        new RegExp(keyword, 'g'),
        `**${keyword}**`
      );
    });
    changes.push('已为关键词添加加粗');
  }

  // 列表处理
  if (persona.writingStyle.useList) {
    adaptedContent = adaptedContent.replace(
      /(\d+)[.、]/g,
      '\n$1. '
    );
    changes.push('已优化列表格式');
  }

  return { adaptedContent, changes };
}

/**
 * 创作风格分析
 */
export function analyzeWritingStyle(content: string): {
  avgSentenceLength: number;
  avgParagraphLength: number;
  emojiUsage: number;
  boldUsage: number;
  listUsage: number;
  suggestedPersona: string;
} {
  const sentences = content.split(/[。！？\n]/).filter(s => s.trim());
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    : 0;

  const avgParagraphLength = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
    : 0;

  const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  const boldCount = (content.match(/\*\*[^*]+\*\*/g) || []).length;
  const listCount = (content.match(/^[\d]+[.、]/gm) || []).length;

  // 推荐人设
  let suggestedPersona = 'tech-expert';
  if (emojiCount > 5 && avgSentenceLength < 30) {
    suggestedPersona = 'newbie-friendly';
  } else if (avgSentenceLength > 50 && avgParagraphLength > 200) {
    suggestedPersona = 'industry-analyst';
  } else if (listCount > 3) {
    suggestedPersona = 'practitioner';
  }

  return {
    avgSentenceLength: Math.round(avgSentenceLength),
    avgParagraphLength: Math.round(avgParagraphLength),
    emojiUsage: emojiCount,
    boldUsage: boldCount,
    listUsage: listCount,
    suggestedPersona,
  };
}

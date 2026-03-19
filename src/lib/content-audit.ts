/**
 * 内容审核与敏感词检测系统
 * 支持多维度内容合规检测
 */

export interface AuditResult {
  passed: boolean;
  score: number;
  issues: AuditIssue[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditIssue {
  type: 'sensitive' | 'advertising' | 'quality' | 'format' | 'legal';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  position?: {
    start: number;
    end: number;
  };
  suggestion?: string;
}

/**
 * 敏感词库
 */
export const sensitiveWords = {
  // 政治敏感词
  political: [
    // 实际使用时需从合规词库加载
  ],
  
  // 虚假宣传词
  advertising: [
    '最好',
    '第一',
    '唯一',
    '绝对',
    '100%',
    '永久',
    '零风险',
    '包治',
    '根治',
    '特效',
    '神效',
    '立竿见影',
    '药到病除',
    '无副作用',
    '纯天然无添加',
    '国家级',
    '世界级',
    '最高级',
    '最佳',
    '顶级',
    '极品',
    '独家',
    '首创',
    '驰名',
    '至尊',
    '巅峰',
    '万能',
    '史无前例',
    '前无古人',
  ],

  // 低质量内容特征
  lowQuality: [
    '转载',
    '抄送',
    '复制',
    '如侵删',
    '侵删',
    '图片来源网络',
    '免责声明',
    '仅供娱乐',
  ],

  // 医疗健康风险词
  medical: [
    '治愈率',
    '有效率',
    '康复率',
    '无依赖',
    '不反弹',
    '瘦身',
    '减肥',
    '丰胸',
    '壮阳',
    '延时',
    '增高',
    '美白祛斑',
    '抗衰老',
  ],

  // 金融风险词
  financial: [
    '保本',
    '保收益',
    '稳赚',
    '暴利',
    '躺赚',
    '年化收益',
    '投资回报',
    '财富自由',
    '快速致富',
  ],
};

/**
 * 行业合规词库
 */
export const industryCompliance: Record<string, {
  requiredDisclosures: string[];
  prohibitedClaims: string[];
  requiredQualifications: string[];
}> = {
  '医疗健康': {
    requiredDisclosures: ['本内容不作为医疗诊断依据', '请在专业医师指导下使用'],
    prohibitedClaims: ['治愈', '根除', '无副作用', '替代药物'],
    requiredQualifications: ['医疗机构执业许可证', '医疗器械注册证'],
  },
  '金融理财': {
    requiredDisclosures: ['投资有风险，入市需谨慎', '过往业绩不代表未来表现'],
    prohibitedClaims: ['保本保息', '无风险收益', '稳赚不赔'],
    requiredQualifications: ['金融牌照', '基金销售资格'],
  },
  '教育培训': {
    requiredDisclosures: ['效果因人而异', '学习成果取决于个人努力'],
    prohibitedClaims: ['包过', '必过', '100%通过率', '不过退款'],
    requiredQualifications: ['办学许可证', '教师资质'],
  },
  '食品保健': {
    requiredDisclosures: ['保健食品不能替代药物', '本品不能替代特殊医学用途配方食品'],
    prohibitedClaims: ['治疗功效', '预防疾病', '替代药物'],
    requiredQualifications: ['食品经营许可证', '保健食品备案'],
  },
};

/**
 * 内容审核主函数
 */
export function auditContent(
  content: string,
  options?: {
    industry?: string;
    platform?: string;
    strictMode?: boolean;
  }
): AuditResult {
  const issues: AuditIssue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 1. 敏感词检测
  const sensitiveIssues = detectSensitiveWords(content);
  issues.push(...sensitiveIssues);
  score -= sensitiveIssues.length * 10;

  // 2. 虚假宣传检测
  const adIssues = detectAdvertisingClaims(content);
  issues.push(...adIssues);
  score -= adIssues.length * 15;

  // 3. 内容质量检测
  const qualityIssues = detectQualityIssues(content);
  issues.push(...qualityIssues);
  score -= qualityIssues.length * 5;

  // 4. 格式规范检测
  const formatIssues = detectFormatIssues(content);
  issues.push(...formatIssues);
  score -= formatIssues.length * 3;

  // 5. 行业合规检测
  if (options?.industry) {
    const complianceIssues = detectIndustryCompliance(content, options.industry);
    issues.push(...complianceIssues);
    score -= complianceIssues.length * 20;
  }

  // 6. 平台规范检测
  if (options?.platform) {
    const platformIssues = detectPlatformCompliance(content, options.platform);
    issues.push(...platformIssues);
    score -= platformIssues.length * 5;
  }

  // 计算风险等级
  const riskLevel = calculateRiskLevel(issues, score);

  // 生成建议
  if (issues.length === 0) {
    suggestions.push('✅ 内容审核通过，可以发布');
  } else {
    suggestions.push('📝 建议修改以下问题后发布');
    issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.push(`• ${issue.suggestion}`);
      }
    });
  }

  return {
    passed: score >= 60 && !issues.some(i => i.severity === 'critical'),
    score: Math.max(0, score),
    issues,
    suggestions,
    riskLevel,
  };
}

/**
 * 敏感词检测
 */
function detectSensitiveWords(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  Object.entries(sensitiveWords).forEach(([category, words]) => {
    words.forEach(word => {
      const index = content.indexOf(word);
      if (index !== -1) {
        issues.push({
          type: 'sensitive',
          severity: category === 'political' ? 'critical' : 'error',
          message: `检测到敏感词"${word}"`,
          position: { start: index, end: index + word.length },
          suggestion: `建议将"${word}"替换为更中性的表述`,
        });
      }
    });
  });

  return issues;
}

/**
 * 虚假宣传检测
 */
function detectAdvertisingClaims(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const adWords = sensitiveWords.advertising;

  adWords.forEach(word => {
    const regex = new RegExp(word, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      issues.push({
        type: 'advertising',
        severity: 'warning',
        message: `检测到可能违规的宣传用语"${match[0]}"`,
        position: { start: match.index, end: match.index + match[0].length },
        suggestion: `建议使用具体数据替代"${match[0]}"，如"市场占有率XX%"`,
      });
    }
  });

  // 检测夸张表达
  const exaggerationPatterns = [
    /真的是?太?好[了吧]/g,
    /简直(是)?(完美|无敌|神了)/g,
    /必须(要)?(买|冲|入)/g,
  ];

  exaggerationPatterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      issues.push({
        type: 'advertising',
        severity: 'warning',
        message: `检测到夸张表达"${match[0]}"`,
        position: { start: match.index!, end: match.index! + match[0].length },
        suggestion: '建议使用客观描述替代夸张表达',
      });
    }
  });

  return issues;
}

/**
 * 内容质量检测
 */
function detectQualityIssues(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 检测低质量特征
  sensitiveWords.lowQuality.forEach(phrase => {
    const index = content.indexOf(phrase);
    if (index !== -1) {
      issues.push({
        type: 'quality',
        severity: 'warning',
        message: `检测到低质量内容特征"${phrase}"`,
        position: { start: index, end: index + phrase.length },
        suggestion: '建议删除或替换为原创内容',
      });
    }
  });

  // 检测内容长度
  if (content.length < 300) {
    issues.push({
      type: 'quality',
      severity: 'warning',
      message: '内容过短，建议至少300字',
      suggestion: '增加内容深度和细节',
    });
  }

  // 检测段落结构
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length < 3 && content.length > 500) {
    issues.push({
      type: 'quality',
      severity: 'warning',
      message: '段落结构不够清晰',
      suggestion: '建议使用更多段落分隔提升可读性',
    });
  }

  // 检测标题层级
  const hasHeaders = /^#{1,6}\s/m.test(content);
  if (!hasHeaders && content.length > 1000) {
    issues.push({
      type: 'quality',
      severity: 'warning',
      message: '长内容缺少标题层级',
      suggestion: '建议添加H2/H3标题提升结构清晰度',
    });
  }

  return issues;
}

/**
 * 格式规范检测
 */
function detectFormatIssues(content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 检测过多连续标点
  const excessivePunctuation = /[!！?？]{3,}/g;
  let match;
  while ((match = excessivePunctuation.exec(content)) !== null) {
    issues.push({
      type: 'format',
      severity: 'warning',
      message: '检测到过多连续标点符号',
      position: { start: match.index, end: match.index + match[0].length },
      suggestion: '建议使用标准标点符号',
    });
  }

  // 检测中英文混排空格
  const mixedSpacing = /([a-zA-Z])([\u4e00-\u9fa5])|([\u4e00-\u9fa5])([a-zA-Z])/g;
  while ((match = mixedSpacing.exec(content)) !== null) {
    // 这是一个建议，不是错误
  }

  // 检测过长段落
  const paragraphs = content.split(/\n+/);
  paragraphs.forEach((p, index) => {
    if (p.length > 500) {
      issues.push({
        type: 'format',
        severity: 'warning',
        message: `第${index + 1}段过长(${p.length}字)`,
        suggestion: '建议将长段落拆分为多个短段落',
      });
    }
  });

  return issues;
}

/**
 * 行业合规检测
 */
function detectIndustryCompliance(content: string, industry: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const compliance = industryCompliance[industry];

  if (!compliance) return issues;

  // 检测禁止声明
  compliance.prohibitedClaims.forEach(claim => {
    const index = content.indexOf(claim);
    if (index !== -1) {
      issues.push({
        type: 'legal',
        severity: 'critical',
        message: `检测到${industry}行业禁止使用的声明"${claim}"`,
        position: { start: index, end: index + claim.length },
        suggestion: `根据${industry}行业规范，该声明违规，必须删除或修改`,
      });
    }
  });

  // 检测必需披露
  const hasRequiredDisclosure = compliance.requiredDisclosures.some(d => 
    content.includes(d)
  );
  if (!hasRequiredDisclosure) {
    issues.push({
      type: 'legal',
      severity: 'error',
      message: `缺少${industry}行业必需的风险提示`,
      suggestion: `建议添加：${compliance.requiredDisclosures.join(' 或 ')}`,
    });
  }

  return issues;
}

/**
 * 平台规范检测
 */
function detectPlatformCompliance(content: string, platform: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 平台特定规则
  const platformRules: Record<string, { maxLinks: number; maxHashtags: number }> = {
    'xiaohongshu': { maxLinks: 0, maxHashtags: 15 },
    'weibo': { maxLinks: 2, maxHashtags: 3 },
    'zhihu': { maxLinks: 5, maxHashtags: 5 },
  };

  const rule = platformRules[platform.toLowerCase()];
  if (rule) {
    // 检测链接数量
    const links = content.match(/https?:\/\/[^\s]+/g) || [];
    if (links.length > rule.maxLinks) {
      issues.push({
        type: 'format',
        severity: 'warning',
        message: `${platform}平台链接数量超限(${links.length}/${rule.maxLinks})`,
        suggestion: `建议减少外链数量`,
      });
    }

    // 检测话题标签数量
    const hashtags = content.match(/#[^#\s]+#/g) || [];
    if (hashtags.length > rule.maxHashtags) {
      issues.push({
        type: 'format',
        severity: 'warning',
        message: `${platform}平台话题标签数量超限(${hashtags.length}/${rule.maxHashtags})`,
        suggestion: `建议精简话题标签`,
      });
    }
  }

  return issues;
}

/**
 * 计算风险等级
 */
function calculateRiskLevel(issues: AuditIssue[], score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (issues.some(i => i.severity === 'critical') || score < 40) {
    return 'critical';
  }
  if (issues.some(i => i.severity === 'error') || score < 60) {
    return 'high';
  }
  if (issues.some(i => i.severity === 'warning') || score < 80) {
    return 'medium';
  }
  return 'low';
}

/**
 * 快速敏感词过滤
 */
export function filterSensitiveWords(content: string): {
  filtered: string;
  count: number;
  replaced: { original: string; replacement: string }[];
} {
  let filtered = content;
  const replaced: { original: string; replacement: string }[] = [];

  Object.values(sensitiveWords).flat().forEach(word => {
    if (content.includes(word)) {
      const replacement = word[0] + '*'.repeat(word.length - 1);
      filtered = filtered.split(word).join(replacement);
      replaced.push({ original: word, replacement });
    }
  });

  return {
    filtered,
    count: replaced.length,
    replaced,
  };
}

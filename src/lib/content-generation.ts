/**
 * 内容生成服务
 * 整合蒸馏词分析与内容创作，基于LLM生成文章或大纲
 * 自动整合GEO评分标准，生成后自动评分
 * 支持平台风格适配
 */

import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { calculateGEOScore, getGrade, type ContentAnalysis } from './geo-scoring';
import { 
  getPlatformConfig, 
  getPlatformStylePrompt, 
  type ContentType,
  type PlatformConfig 
} from './platform-config';

// AI模型类型
export type AIModel = 'doubao' | 'deepseek' | 'qwen' | 'kimi';

// 文章类型
export type ArticleType = 
  | 'technical'      // 技术解析
  | 'product-review' // 产品评测
  | 'industry-insight' // 行业洞察
  | 'guide'          // 实操指南
  | 'comparison'     // 竞品对比
  | 'case-study'     // 案例分析
  | 'faq'            // 常见问题
  | 'news';          // 行业资讯

// 生成模式
export type GenerateMode = 'article' | 'outline';

// 内容创作请求
export interface ContentCreationRequest {
  targetModel: AIModel;           // 目标AI模型
  targetQuestion: string;         // 目标问题/行业/业务类型
  articleType: ArticleType;       // 文章类型
  length: 'short' | 'medium' | 'long' | 'custom'; // 篇幅
  customLength?: number;          // 自定义字数
  generateMode: GenerateMode;     // 生成模式
  additionalKeywords?: string[];  // 额外关键词
  tone?: 'professional' | 'friendly' | 'academic' | 'casual' | 'neutral'; // 语气
  brandInfo?: string;             // 品牌信息
  avoidTopics?: string[];         // 避免话题
  mediaFiles?: Array<{            // 媒体文件
    key: string;
    url: string;
    type: 'image' | 'video';
    filename: string;
    description?: string;         // 媒体描述（用于生成图片说明）
  }>;
  // 平台相关参数
  targetPlatforms?: string[];     // 目标发布平台（支持多平台）
  contentFormat?: ContentType;    // 内容格式（图文/视频等）
  
  // ========== 扩展配置（来自 GenerationConfig）==========
  
  // 图片设置
  enableThumbnail?: boolean;      // 启用缩略图
  enableContentImages?: boolean;  // 启用内容配图
  imageCount?: number;            // 配图数量
  
  // TOP排行设置
  productName?: string;           // 产品名称（TOP排行类型使用）
  productDescription?: string;    // 产品描述
  rankingDisplay?: 'random' | 'sequential' | 'reverse' | 'grouped'; // 排名显示方式
  competitors?: string[];         // 竞争对手列表
  
  // 内容格式
  enableBold?: boolean;           // 启用粗体
  enableItalic?: boolean;         // 启用斜体
  enableTable?: boolean;          // 启用表格
  enableQuote?: boolean;          // 启用引文
  
  // 文章结构
  ctaUrl?: string;                // 引导点击URL
  enableSummary?: boolean;        // 启用内容概要
  enableConclusion?: boolean;     // 启用结论总结
  enableFaq?: boolean;            // 启用常见问题
  enableAutoTitle?: boolean;      // 启用自动标题
  customTitle?: string;           // 自定义标题
  
  // 内部链接
  sitemaps?: string[];            // 站点地图URL列表
  internalLinksPerH2?: number;    // 每个H2部分内链数量
  
  // 外部链接
  externalLinks?: Array<{ url: string; anchor: string }>; // 外部链接列表
  enableAutoExternalLinks?: boolean; // 启用自动外部链接
  
  // 固定开头结尾
  enableFixedIntro?: boolean;     // 启用固定开头
  fixedIntro?: string;            // 固定开头内容
  enableFixedOutro?: boolean;     // 启用固定结尾
  fixedOutro?: string;            // 固定结尾内容
  
  // 其他
  language?: string;              // 语言
  targetCountry?: string;         // 目标国家/地区
  creativityLevel?: number;       // 创意程度 (0-100)
  perspective?: string;           // 人称角度
  formality?: string;             // 形式
  personaId?: string;             // 拟人化设置ID
  replacements?: Array<{ find: string; replace: string }>; // 全文替换规则
  enableWebSearch?: boolean;      // 启用联网搜索
  knowledgeBaseId?: string;       // 知识库ID
  includeKeywords?: string;       // 包含关键词（强制添加到标题中）
}

// 蒸馏词分析结果
export interface DistillationResult {
  keywords: Array<{
    word: string;
    category: 'core' | 'longtail' | 'question' | 'brand';
    importance: number;
    reasoning: string;
  }>;
  coreMessage: string;            // 核心信息
  userIntent: string;             // 用户意图分析
  competitorGaps: string[];       // 竞争对手空白点
}

// 生成的内容
export interface GeneratedContent {
  title: string;
  content: string;
  outline?: string[];
  distillationWords: string[];
  schema?: string;                // 结构化数据
  videoScript?: string;           // 视频脚本（视频内容格式时）
  seoScore: number;
  suggestions: string[];
  geoScore?: {                    // GEO评分
    total: number;
    grade: string;
    gradeColor: string;
    gradeDescription: string;
    breakdown: {
      humanizedGeo: number;
      crossValidation: number;
      eeat: number;
      preciseCitation: number;
      structuredContent: number;
      seoKeywords: number;
    };
    suggestions: string[];
  };
}

// 完整的创作结果
export interface ContentCreationResult {
  request: ContentCreationRequest;
  distillation: DistillationResult;
  generated: GeneratedContent;
  createdAt: Date;
}

/**
 * 步骤1：分析目标问题，提取蒸馏词
 */
export async function analyzeTargetQuestion(
  request: ContentCreationRequest,
  customHeaders?: Record<string, string>
): Promise<DistillationResult> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const modelNames: Record<AIModel, string> = {
    doubao: '豆包',
    deepseek: 'DeepSeek',
    qwen: '千问',
    kimi: 'Kimi',
  };

  const articleTypeNames: Record<ArticleType, string> = {
    'technical': '技术解析',
    'product-review': '产品评测',
    'industry-insight': '行业洞察',
    'guide': '实操指南',
    'comparison': '竞品对比',
    'case-study': '案例分析',
    'faq': '常见问题',
    'news': '行业资讯',
  };

  const systemPrompt = `你是一个GEO（生成引擎优化）专家。你的任务是分析用户的问题，提取AI搜索引擎在回答该问题时会引用的关键"蒸馏词"。

目标AI模型：${modelNames[request.targetModel]}
文章类型：${articleTypeNames[request.articleType]}

请分析：
1. 用户提问的真实意图
2. ${modelNames[request.targetModel]}回答此类问题的核心信息点
3. 必然会提及的关键词
4. 长尾机会词
5. 竞争对手可能忽略的角度

返回JSON格式：
{
  "keywords": [
    {
      "word": "关键词",
      "category": "core|longtail|question|brand",
      "importance": 0-100,
      "reasoning": "为什么这个词重要"
    }
  ],
  "coreMessage": "核心信息摘要",
  "userIntent": "用户真实意图分析",
  "competitorGaps": ["竞争空白点1", "竞争空白点2"]
}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `请分析以下目标问题/行业场景：

"${request.targetQuestion}"

${request.additionalKeywords?.length ? `额外需包含的关键词：${request.additionalKeywords.join('、')}` : ''}
${request.brandInfo ? `品牌信息：${request.brandInfo}` : ''}

请提取蒸馏词并分析。` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.3 });
    return JSON.parse(response.content);
  } catch (error) {
    console.error('蒸馏词分析失败:', error);
    return {
      keywords: [],
      coreMessage: '',
      userIntent: '',
      competitorGaps: [],
    };
  }
}

/**
 * 步骤2：生成内容大纲
 */
export async function generateOutline(
  request: ContentCreationRequest,
  distillation: DistillationResult,
  customHeaders?: Record<string, string>
): Promise<string[]> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const articleTypeNames: Record<ArticleType, string> = {
    'technical': '技术解析',
    'product-review': '产品评测',
    'industry-insight': '行业洞察',
    'guide': '实操指南',
    'comparison': '竞品对比',
    'case-study': '案例分析',
    'faq': '常见问题',
    'news': '行业资讯',
  };

  const systemPrompt = `你是一个专业的GEO内容策划师。你需要基于蒸馏词分析结果，生成一份能被AI搜索引擎高引用的内容大纲。

文章类型：${articleTypeNames[request.articleType]}
目标：在AI搜索结果中获得高曝光和高引用

大纲要求：
1. 每个章节标题要包含蒸馏词
2. 结构清晰，符合${articleTypeNames[request.articleType]}的逻辑
3. 每个章节要有明确的信息增量
4. 标题要有吸引力，能引发用户点击

返回JSON数组格式：["章节1标题", "章节2标题", ...]`;

  const keywords = distillation.keywords.map(k => k.word).join('、');
  
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `蒸馏词：${keywords}

核心信息：${distillation.coreMessage}

用户意图：${distillation.userIntent}

${request.brandInfo ? `品牌信息：${request.brandInfo}` : ''}

请生成内容大纲。` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.7 });
    return JSON.parse(response.content);
  } catch (error) {
    console.error('大纲生成失败:', error);
    return [];
  }
}

/**
 * 步骤3：生成完整文章
 */
export async function generateArticle(
  request: ContentCreationRequest,
  distillation: DistillationResult,
  outline: string[],
  customHeaders?: Record<string, string>
): Promise<GeneratedContent> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  // 获取平台配置
  const primaryPlatform = request.targetPlatforms?.[0];
  const platformConfig = primaryPlatform ? getPlatformConfig(primaryPlatform) : null;
  
  // 根据平台调整篇幅限制
  let maxLength = request.length;
  if (platformConfig) {
    const maxContent = platformConfig.features.maxContentLength;
    if (maxContent < 2000) {
      maxLength = 'short';
    } else if (maxContent < 5000) {
      maxLength = request.length === 'long' ? 'medium' : request.length;
    }
  }

  const lengthGuide = {
    short: '800-1500字',
    medium: '1500-3000字',
    long: '3000-5000字',
    custom: `${request.customLength || 2000}字`,
  };

  const toneGuide: Record<string, string> = {
    professional: '专业严谨，数据支撑',
    friendly: '亲切易懂，接地气',
    academic: '学术严谨，引用规范',
    casual: '轻松活泼，口语化',
    neutral: '中性客观，平衡呈现',
  };

  const articleTypeNames: Record<ArticleType, string> = {
    'technical': '技术解析',
    'product-review': '产品评测',
    'industry-insight': '行业洞察',
    'guide': '实操指南',
    'comparison': '竞品对比',
    'case-study': '案例分析',
    'faq': '常见问题',
    'news': '行业资讯',
  };

  // 内容格式适配
  const formatGuide = getFormatGuide(request.contentFormat, platformConfig);
  
  // 平台风格提示词
  const platformPrompt = platformConfig && primaryPlatform ? getPlatformStylePrompt(primaryPlatform) : '';

  // 构建文章结构要求
  const structureRequirements: string[] = [];
  if (request.enableSummary) structureRequirements.push('必须在文章开头包含"内容概要"部分');
  if (request.enableConclusion) structureRequirements.push('必须在文章结尾包含"总结"部分');
  if (request.enableFaq) structureRequirements.push('必须包含"常见问题解答"部分');
  if (request.ctaUrl) structureRequirements.push(`必须在适当位置添加引导点击链接：${request.ctaUrl}`);
  
  // 构建格式要求
  const formatRequirements: string[] = [];
  if (request.enableBold === false) formatRequirements.push('禁止使用粗体');
  if (request.enableItalic === false) formatRequirements.push('禁止使用斜体');
  if (request.enableTable === false) formatRequirements.push('禁止使用表格');
  if (request.enableQuote === false) formatRequirements.push('禁止使用引用块');
  if (request.enableBold) formatRequirements.push('适当使用**粗体**强调重点');
  if (request.enableTable) formatRequirements.push('对于对比类内容使用表格呈现');

  // 构建链接要求
  const linkRequirements: string[] = [];
  if (request.sitemaps?.length) {
    linkRequirements.push(`内部链接：请在内容中适当引用以下站内链接（每个H2部分至少${request.internalLinksPerH2 || 2}个）`);
  }
  if (request.externalLinks?.length) {
    linkRequirements.push(`外部链接：请在内容中引用以下权威来源`);
    request.externalLinks.forEach(link => {
      linkRequirements.push(`- [${link.anchor}](${link.url})`);
    });
  }
  if (request.enableAutoExternalLinks) {
    linkRequirements.push('自动外链：请自行搜索并引用相关的权威来源（.gov/.edu/行业报告）');
  }

  // 构建固定内容
  const fixedContent: string[] = [];
  if (request.enableFixedIntro && request.fixedIntro) {
    fixedContent.push(`【固定开头 - 必须放在文章最前面】\n${request.fixedIntro}`);
  }
  if (request.enableFixedOutro && request.fixedOutro) {
    fixedContent.push(`【固定结尾 - 必须放在文章最后】\n${request.fixedOutro}`);
  }

  // TOP排行特殊要求
  let topRankingPrompt = '';
  if (request.articleType === 'product-review' && request.productName) {
    topRankingPrompt = `
【TOP排行特殊要求】
- 产品名称：${request.productName}
${request.productDescription ? `- 产品描述：${request.productDescription}` : ''}
- 排名显示方式：${request.rankingDisplay === 'random' ? '随机排列' : request.rankingDisplay === 'sequential' ? '按顺序排列' : request.rankingDisplay === 'reverse' ? '倒序排列' : '分组展示'}
${request.competitors?.length ? `- 竞争对手：${request.competitors.join('、')}` : ''}
`;
  }

  const systemPrompt = `你是一个专业的GEO内容创作者。你需要基于蒸馏词和大纲，创作一篇能在AI搜索引擎中获得高引用的文章。

文章类型：${articleTypeNames[request.articleType]}
目标篇幅：${lengthGuide[maxLength]}
写作风格：${request.tone ? toneGuide[request.tone] : '专业严谨'}
${request.language ? `语言：${request.language}` : ''}
${request.targetCountry ? `目标地区：${request.targetCountry}` : ''}
${request.creativityLevel !== undefined ? `创意程度：${request.creativityLevel}%（0=严谨 factual，100=高度创意）` : ''}
${request.perspective ? `人称角度：${request.perspective === 'first' ? '第一人称（我/我们）' : request.perspective === 'second' ? '第二人称（你）' : request.perspective === 'third' ? '第三人称' : '自动选择'}` : ''}

${platformPrompt ? `【平台风格要求】\n${platformPrompt}\n` : ''}
${formatGuide ? `【内容格式要求】\n${formatGuide}\n` : ''}
${topRankingPrompt}
${structureRequirements.length > 0 ? `【文章结构要求】\n${structureRequirements.join('\n')}\n` : ''}
${formatRequirements.length > 0 ? `【格式要求】\n${formatRequirements.join('\n')}\n` : ''}
${linkRequirements.length > 0 ? `【链接要求】\n${linkRequirements.join('\n')}\n` : ''}
${fixedContent.length > 0 ? `【固定内容】\n${fixedContent.join('\n\n')}\n` : ''}
【GEO评分标准 - 必须严格遵守】
你的文章将按以下六大维度评分（满分10分）：

1. 人性化GEO (2.5分)：
   - 直接回答用户问题，不绕弯子
   - 包含真实案例和实践经验
   - 使用"我们"、"你"等人性化语言
   - 避免夸大（如"最好"、"第一"、"绝对"）

2. 内容交叉验证 (2.5分)：
   - 引用至少3个权威来源（.gov/.edu/行业报告）
   - 提供具体数据（百分比、年份、数量）
   - 数据可追溯、可验证

3. E-E-A-T原则 (1.5分)：
   - 展示专业经验和实践案例
   - 提及资质认证、专利、奖项
   - 标明作者身份

4. 精准引用 (1.5分)：
   - 使用规范的引用格式 [1]、[2]
   - 所有数据有明确来源
   - 信息可追溯

5. 结构化内容 (1.0分)：
   - ${platformConfig?.features.supportsMarkdown ? '使用Markdown格式' : '使用纯文本格式，用数字编号代替标题'}
   - ${platformConfig?.id === 'xiaohongshu' ? '使用大量emoji表情增加亲和力' : '适当使用emoji'}
   - 清晰的段落结构

6. SEO关键词 (1.0分)：
   - 核心关键词出现在标题中
   - 关键词自然分布在正文中
   - 覆盖长尾关键词

【创作要求】
1. 自然融入蒸馏词，避免堆砌
2. 每个段落都要有明确的信息增量
3. 数据、案例要具体真实
4. 结构清晰，便于AI理解和引用
${request.enableFaq !== false ? '5. 必须包含常见问题解答部分' : '5. 可选包含常见问题解答'}

返回JSON格式：
{
  "title": "文章标题（${request.customTitle || '包含核心关键词，20-30字'}）",
  "content": "文章正文（${platformConfig?.features.supportsMarkdown ? 'Markdown格式' : '纯文本格式'}）",
  ${request.contentFormat === 'video' ? '"script": "视频脚本（口语化，适合朗读）",' : ''}
  "schema": "JSON-LD格式的结构化数据（如有）",
  "seoScore": 0-100的SEO评分,
  "suggestions": ["优化建议1", "优化建议2"]
}`;

  const keywords = distillation.keywords.map(k => k.word);
  const outlineText = outline.map((o, i) => `${i + 1}. ${o}`).join('\n');
  
  // 媒体文件信息
  const mediaInfo = request.mediaFiles?.map((m, i) => 
    `[${m.type === 'image' ? '图片' : '视频'}${i + 1}] ${m.filename}${m.description ? ` - ${m.description}` : ''}`
  ).join('\n') || '';
  
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `请创作文章：

目标问题：${request.targetQuestion}

蒸馏词（必须自然融入）：
- 核心词：${distillation.keywords.filter(k => k.category === 'core').map(k => k.word).join('、')}
- 长尾词：${distillation.keywords.filter(k => k.category === 'longtail').map(k => k.word).join('、')}
- 问题词：${distillation.keywords.filter(k => k.category === 'question').map(k => k.word).join('、')}

内容大纲：
${outlineText}

核心信息点：${distillation.coreMessage}

${request.brandInfo ? `品牌信息：${request.brandInfo}` : ''}
${request.avoidTopics?.length ? `避免提及：${request.avoidTopics.join('、')}` : ''}
${mediaInfo ? `\n可用媒体素材（请在合适位置插入）：
${mediaInfo}

注意：在内容中，使用以下格式插入媒体：
- 图片：![图片描述](图片URL)
- 视频：[视频: ${request.mediaFiles?.[0]?.filename || '视频'}]` : ''}

请开始创作。` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.7 });
    
    // 尝试解析 JSON 响应
    let result;
    try {
      // 清理响应内容，移除可能的 markdown 代码块标记
      let content = response.content.trim();
      if (content.startsWith('```json')) {
        content = content.slice(7);
      } else if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }
      content = content.trim();
      
      // 尝试找到 JSON 对象的边界
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        content = content.slice(jsonStart, jsonEnd + 1);
      }
      
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON 解析失败:', parseError);
      console.error('原始响应内容:', response.content.substring(0, 500));
      
      // 尝试从响应中提取标题和内容（兜底方案）
      const rawContent = response.content;
      
      // 提取标题
      const titleMatch = rawContent.match(/"title"\s*:\s*"([^"]+)"/);
      
      // 提取内容 - 使用更健壮的方式
      let extractedContent = '';
      const contentStartMatch = rawContent.match(/"content"\s*:\s*"/);
      if (contentStartMatch) {
        const startIndex = contentStartMatch.index! + contentStartMatch[0].length;
        // 查找内容的结束位置（下一个字段的引号）
        let endIndex = startIndex;
        let inEscape = false;
        while (endIndex < rawContent.length) {
          const char = rawContent[endIndex];
          if (inEscape) {
            inEscape = false;
          } else if (char === '\\') {
            inEscape = true;
          } else if (char === '"' && rawContent[endIndex + 1] === ',') {
            break;
          }
          endIndex++;
        }
        extractedContent = rawContent.slice(startIndex, endIndex);
        // 解码转义字符
        extractedContent = extractedContent
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\t/g, '\t');
      }
      
      if (titleMatch || extractedContent) {
        result = {
          title: titleMatch ? titleMatch[1] : '未命名文章',
          content: extractedContent || rawContent,
        };
        console.log('使用兜底解析方案提取内容，标题:', result.title);
      } else {
        // 最后的兜底：使用整个响应作为内容
        result = {
          title: 'AI 生成内容',
          content: rawContent,
        };
        console.log('使用最终兜底方案，将整个响应作为内容');
      }
    }
    
    // 验证必要字段，如果为空则使用默认值
    if (!result.title || result.title.trim() === '') {
      result.title = 'AI 生成内容';
      console.log('标题为空，使用默认标题');
    }
    if (!result.content || result.content.trim() === '') {
      // 如果内容仍然为空，说明提取失败，使用原始响应
      result.content = response.content;
      console.log('内容为空，使用原始响应');
    }
    
    // 自动计算GEO评分
    const geoAnalysis: ContentAnalysis = {
      title: result.title,
      content: result.content,
      keywords: keywords,
      references: [],
      hasSchema: !!result.schema,
      hasFAQ: result.content.includes('常见问题') || result.content.includes('FAQ'),
      wordCount: result.content.length,
    };
    
    const geoScoreResult = calculateGEOScore(geoAnalysis);
    const gradeInfo = getGrade(geoScoreResult.total);
    
    return {
      title: result.title,
      content: result.content,
      outline: outline,
      distillationWords: keywords,
      schema: result.schema,
      seoScore: Math.round(geoScoreResult.total * 10), // 转换为100分制
      suggestions: [...(result.suggestions || []), ...geoScoreResult.suggestions],
      videoScript: result.script, // 视频脚本
      geoScore: {
        total: geoScoreResult.total,
        grade: gradeInfo.grade,
        gradeColor: gradeInfo.color,
        gradeDescription: gradeInfo.description,
        breakdown: geoScoreResult.breakdown,
        suggestions: geoScoreResult.suggestions,
      },
    };
  } catch (error) {
    console.error('文章生成失败:', error);
    return {
      title: '',
      content: '',
      outline: outline,
      distillationWords: keywords,
      seoScore: 0,
      suggestions: ['生成失败，请重试'],
    };
  }
}

/**
 * 获取内容格式指南
 */
function getFormatGuide(format?: ContentType, platformConfig?: PlatformConfig | null): string {
  if (!format) return '';
  
  const guides: Record<ContentType, string> = {
    article: `
- 使用清晰的标题层级（H1-H6）
- 段落结构完整，每段一个主题
- 包含开头、正文、结尾三个部分`,
    
    'image-text': `
- ${platformConfig?.id === 'xiaohongshu' ? '标题要吸睛，使用数字或疑问句' : '标题简洁有力'}
- 正文简洁，配合图片说明
- 多用短句，便于阅读
- ${platformConfig?.features.supportsEmoji ? '适当使用emoji增加可读性' : ''}
- ${platformConfig?.features.supportsHashtag ? '在文末添加相关话题标签' : ''}`,
    
    video: `
- 开头3秒要有吸引力，抛出问题或悬念
- 内容口语化，适合朗读
- 控制语速，每分钟150-180字
- 结尾要有互动引导
- 同时生成视频脚本（口语化版本）`,
    
    link: `
- 内容简短，突出链接价值
- 引导用户点击链接获取完整内容
- 说明点击后能看到什么`,
    
    jump: `
- 内容极简，突出跳转价值
- 明确告知用户跳转后的内容
- 提供搜索关键词或具体指引
- 例如："在小红书搜索XXX，查看完整攻略"`,
  };
  
  return guides[format] || '';
}

/**
 * 完整的内容创作流程
 */
export async function createContent(
  request: ContentCreationRequest,
  customHeaders?: Record<string, string>
): Promise<ContentCreationResult> {
  // 步骤1：分析蒸馏词
  const distillation = await analyzeTargetQuestion(request, customHeaders);
  
  // 步骤2：生成大纲
  const outline = await generateOutline(request, distillation, customHeaders);
  
  // 步骤3：根据模式生成内容
  let generated: GeneratedContent;
  
  if (request.generateMode === 'outline') {
    // 仅生成大纲模式 - 仍然计算初步GEO评分
    const outlineContent = outline.map((o, i) => `## ${i + 1}. ${o}\n\n（待填充内容）`).join('\n\n');
    const keywords = distillation.keywords.map(k => k.word);
    
    const geoAnalysis: ContentAnalysis = {
      title: request.targetQuestion,
      content: outlineContent,
      keywords: keywords,
      references: [],
      hasSchema: false,
      hasFAQ: false,
      wordCount: outlineContent.length,
    };
    
    const geoScoreResult = calculateGEOScore(geoAnalysis);
    const gradeInfo = getGrade(geoScoreResult.total);
    
    generated = {
      title: `${request.targetQuestion} - ${outline[0] || '内容大纲'}`,
      content: outlineContent,
      outline: outline,
      distillationWords: keywords,
      seoScore: Math.round(geoScoreResult.total * 10),
      suggestions: ['大纲已生成，可进一步生成完整内容', ...geoScoreResult.suggestions],
      geoScore: {
        total: geoScoreResult.total,
        grade: gradeInfo.grade,
        gradeColor: gradeInfo.color,
        gradeDescription: gradeInfo.description,
        breakdown: geoScoreResult.breakdown,
        suggestions: geoScoreResult.suggestions,
      },
    };
  } else {
    // 生成完整文章模式
    generated = await generateArticle(request, distillation, outline, customHeaders);
  }

  return {
    request,
    distillation,
    generated,
    createdAt: new Date(),
  };
}

/**
 * AI辅助写作 - 内容润色
 */
export async function polishContent(
  content: string,
  options: {
    tone?: 'professional' | 'friendly' | 'academic' | 'casual';
    focusKeywords?: string[];
  },
  customHeaders?: Record<string, string>
): Promise<string> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const toneGuide = {
    professional: '专业严谨',
    friendly: '亲切易懂',
    academic: '学术规范',
    casual: '轻松活泼',
  };

  const systemPrompt = `你是一个专业的内容编辑。请润色以下内容，使其更加${options.tone ? toneGuide[options.tone] : '专业流畅'}。

要求：
1. 保持原意，优化表达
2. 提升可读性
3. 自然融入关键词
4. 符合SEO最佳实践

只返回润色后的内容，不要包含任何解释。`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `${options.focusKeywords?.length ? `关键词：${options.focusKeywords.join('、')}\n\n` : ''}${content}` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.5 });
    return response.content;
  } catch (error) {
    console.error('内容润色失败:', error);
    return content;
  }
}

/**
 * AI辅助写作 - 内容扩写
 */
export async function expandContent(
  content: string,
  targetLength: number,
  focusKeywords?: string[],
  customHeaders?: Record<string, string>
): Promise<string> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个专业的内容创作者。请扩写以下内容，使其达到约${targetLength}字。

要求：
1. 保持原有风格和结构
2. 增加具体细节、案例或数据
3. 自然融入关键词
4. 信息增量明确，避免注水

只返回扩写后的内容。`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `${focusKeywords?.length ? `关键词：${focusKeywords.join('、')}\n\n` : ''}${content}` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.7 });
    return response.content;
  } catch (error) {
    console.error('内容扩写失败:', error);
    return content;
  }
}
